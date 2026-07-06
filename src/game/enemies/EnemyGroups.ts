import type { EntityRef } from "../../engine/ecs/EntityRef";
import type { EntityStore } from "../../engine/ecs/EntityStore";
import { EnemyBehaviorDB } from "./EnemyBehaviorDB";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";
import { resolveMovementCullReferenceX } from "./EnemyCullReference";
import { createFsmRuntimeSnapshot, executeFsmMovement, fsmBaseSpeed, fsmEffectiveSpeed, fsmMovementReferenceSpeed, fsmSpeedMultiplier, getFsmMovementCullReferenceX, getFsmRuntimeState, updateResolvedFsm, velocityFromFsmTarget, type FsmRuntimeSnapshot } from "./fsm";
import type { ResolvedFsmPreset } from "./fsm/resolve";

type Vec2 = { x: number; y: number };
type AnchorHistorySample = { time: number; x: number; y: number };
export type GroupId = number;
export type FormationId = typeof ENEMY_GROUP_FORMATION_IDS[number];
export type CohesionId = "rigid" | "elastic";
export type GroupFormationFacing = "left" | "right";

export type EnemyGroupMembership = { groupId: GroupId; slotIndex: number };

export type EnemyGroupParams = {
  formation?: {
    spacing?: number;
    depth?: number;
    radius?: number;
    angle?: number;
    facing?: string;
    startAngle?: number;
  };
  cohesion?: {
    response?: number;
    maxCatchupSpeed?: number;
  };
};

export type NormalizedEnemyGroupParams = {
  formation: { spacing: number; depth: number; radius: number; angle: number; facing: GroupFormationFacing; startAngle: number };
  cohesion: { response: number; maxCatchupSpeed: number };
};

export type EnemyGroupSpawnRequest = {
  enemyTypeId: string;
  count: number;
  anchor: Vec2;
  formationId: string;
  movementPresetId: string;
  cohesionId: string;
  fsmPreset?: ResolvedFsmPreset;
  inheritedAttackProfileId?: string | null;
  /** Legacy compatibility alias for formation.spacing. */
  spacing?: number;
  params?: EnemyGroupParams;
};

type Member = { ref: EntityRef; slotIndex: number; offset: Vec2 };
type Group = {
  id: GroupId;
  anchor: Vec2;
  movementPresetId: string;
  behaviorId: string;
  behavior: Record<string, unknown>;
  bState: Record<string, unknown> & { t: number };
  vel: Vec2;
  fsm?: FsmRuntimeSnapshot;
  fsmLastScrollX?: number;
  fsmEnt?: { pos: Vec2; vel: Vec2; bState: Record<string, unknown>; hp: number; maxHp: number };
  inheritedAttackProfileId?: string | null;
  formationId: FormationId;
  cohesionId: CohesionId;
  params: NormalizedEnemyGroupParams;
  followDelay: number;
  historyTime: number;
  anchorHistory: AnchorHistorySample[];
  anchorHistoryStart: number;
  anchorHistoryCount: number;
  anchorHistoryCapacity: number;
  slotCount: number;
  members: Member[];
};

export const ENEMY_GROUP_FORMATION_IDS = ["line.horizontal", "wedge", "column.vertical", "arc.forward", "ring"] as const;
export const ENEMY_GROUP_COHESION_IDS = ["rigid", "elastic"] as const;
const FORMATIONS = new Set<string>(ENEMY_GROUP_FORMATION_IDS);
const COHESION = new Set<string>(ENEMY_GROUP_COHESION_IDS);
const finite = (n: unknown, fallback = 0) => typeof n === "number" && Number.isFinite(n) ? n : fallback;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const ENEMY_GROUP_FOLLOW_DELAY_LIMITS = { min: 0, max: 0.5, default: 0, step: 0.01 } as const;
const ANCHOR_HISTORY_SAMPLE_RATE = 60;
const ANCHOR_HISTORY_SAFETY_SECONDS = 0.5;
const ANCHOR_HISTORY_MIN_CAPACITY = 8;

export const ENEMY_GROUP_PARAM_LIMITS = {
  formation: {
    spacing: { min: 16, max: 96, default: 18, step: 4 },
    depth: { min: 8, max: 80, default: 18, step: 4 },
    radius: { min: 12, max: 140, default: 48, step: 4 },
    angle: { min: 20, max: 180, default: 100, step: 10 },
  },
  cohesion: {
    response: { min: 1, max: 20, default: 7, step: 1 },
    maxCatchupSpeed: { min: 80, max: 600, rigidDefault: 480, elasticDefault: 260, step: 20 },
  },
} as const;

function finiteClamped(value: unknown, fallback: number, min: number, max: number): number {
  return clamp(finite(value, fallback), min, max);
}

export function normalizeGroupFormationFacing(value: unknown): GroupFormationFacing {
  return value === "right" ? "right" : "left";
}

export function normalizeGroupFormationStartAngle(value: unknown): number {
  const raw = finite(value, 0);
  return ((raw % 360) + 360) % 360;
}

export function normalizeEnemyGroupParams(input: EnemyGroupParams | undefined, cohesionId: CohesionId, legacySpacing?: number): NormalizedEnemyGroupParams {
  const spacingInput = input?.formation?.spacing ?? legacySpacing;
  const depthInput = input?.formation?.depth ?? legacySpacing;
  const catchupDefault = cohesionId === "rigid"
    ? ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed.rigidDefault
    : ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed.elasticDefault;
  return {
    formation: {
      spacing: finiteClamped(spacingInput, ENEMY_GROUP_PARAM_LIMITS.formation.spacing.default, ENEMY_GROUP_PARAM_LIMITS.formation.spacing.min, ENEMY_GROUP_PARAM_LIMITS.formation.spacing.max),
      depth: finiteClamped(depthInput, ENEMY_GROUP_PARAM_LIMITS.formation.depth.default, ENEMY_GROUP_PARAM_LIMITS.formation.depth.min, ENEMY_GROUP_PARAM_LIMITS.formation.depth.max),
      radius: finiteClamped(input?.formation?.radius, ENEMY_GROUP_PARAM_LIMITS.formation.radius.default, ENEMY_GROUP_PARAM_LIMITS.formation.radius.min, ENEMY_GROUP_PARAM_LIMITS.formation.radius.max),
      angle: finiteClamped(input?.formation?.angle, ENEMY_GROUP_PARAM_LIMITS.formation.angle.default, ENEMY_GROUP_PARAM_LIMITS.formation.angle.min, ENEMY_GROUP_PARAM_LIMITS.formation.angle.max),
      facing: normalizeGroupFormationFacing(input?.formation?.facing),
      startAngle: normalizeGroupFormationStartAngle(input?.formation?.startAngle),
    },
    cohesion: {
      response: finiteClamped(input?.cohesion?.response, ENEMY_GROUP_PARAM_LIMITS.cohesion.response.default, ENEMY_GROUP_PARAM_LIMITS.cohesion.response.min, ENEMY_GROUP_PARAM_LIMITS.cohesion.response.max),
      maxCatchupSpeed: finiteClamped(input?.cohesion?.maxCatchupSpeed, catchupDefault, ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed.min, ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed.max),
    },
  };
}

export function normalizeFormationId(id: string): FormationId {
  return FORMATIONS.has(id) ? id as FormationId : "line.horizontal";
}

export function normalizeCohesionId(id: string): CohesionId {
  return COHESION.has(id) ? id as CohesionId : "rigid";
}

export function formationOffset(id: FormationId, slotIndex: number, slotCount: number, paramsOrSpacing: NormalizedEnemyGroupParams | number = ENEMY_GROUP_PARAM_LIMITS.formation.spacing.default): Vec2 {
  const count = Math.max(1, Math.floor(slotCount));
  const slot = Math.max(0, Math.floor(slotIndex));
  const params = typeof paramsOrSpacing === "number"
    ? normalizeEnemyGroupParams(undefined, "rigid", paramsOrSpacing)
    : paramsOrSpacing;
  const spacing = params.formation.spacing;
  const depth = params.formation.depth;
  if (id === "wedge") {
    if (slot === 0) return { x: 0, y: 0 };
    const pair = Math.ceil(slot / 2);
    const side = slot % 2 === 1 ? -1 : 1;
    const x = pair * depth;
    return { x: params.formation.facing === "right" ? -x : x, y: side * pair * spacing };
  }
  if (id === "column.vertical") {
    return { x: 0, y: (slot - (count - 1) / 2) * spacing };
  }
  if (id === "arc.forward") {
    if (count === 1) return { x: 0, y: 0 };
    const u = count === 1 ? 0 : (slot / (count - 1)) * 2 - 1;
    const theta = u * (params.formation.angle * Math.PI / 180) / 2;
    return {
      // Positive X trails the center for right-to-left enemy travel; the center slot is forward-most.
      x: (params.formation.facing === "right" ? -1 : 1) * params.formation.radius * (1 - Math.cos(theta)),
      y: params.formation.radius * Math.sin(theta),
    };
  }
  if (id === "ring") {
    if (count === 1) return { x: 0, y: 0 };
    const theta = params.formation.startAngle * Math.PI / 180 + slot * Math.PI * 2 / count;
    return { x: Math.cos(theta) * params.formation.radius, y: Math.sin(theta) * params.formation.radius };
  }
  return { x: (slot - (count - 1) / 2) * spacing, y: 0 };
}


export function normalizeGroupFollowDelay(value: unknown, fallback = ENEMY_GROUP_FOLLOW_DELAY_LIMITS.default): number {
  return finiteClamped(value, fallback, ENEMY_GROUP_FOLLOW_DELAY_LIMITS.min, ENEMY_GROUP_FOLLOW_DELAY_LIMITS.max);
}

function stateFormationParams(state: unknown): { formationId: FormationId; params: NormalizedEnemyGroupParams; cohesionId: CohesionId; followDelay: number | null } | null {
  const raw: any = state;
  const legacy = raw?.formationOverride && typeof raw.formationOverride === "object" ? raw.formationOverride : {};
  const formationRaw = raw?.formationId ?? legacy.shape;
  const followRaw = raw?.followDelay ?? legacy.followDelay;
  const hasAny = formationRaw !== undefined || raw?.spacing !== undefined || legacy.spacing !== undefined || raw?.elasticity !== undefined || legacy.elasticity !== undefined || followRaw !== undefined;
  if (!hasAny) return null;
  const formationId = normalizeFormationId(String(formationRaw ?? "line.horizontal"));
  const spacing = finite(raw?.spacing ?? legacy.spacing, ENEMY_GROUP_PARAM_LIMITS.formation.spacing.default);
  const elasticity = clamp(Math.floor(finite(raw?.elasticity ?? legacy.elasticity, 0)), 0, 10);
  const cohesionId: CohesionId = elasticity === 0 ? "rigid" : "elastic";
  const catchLimits = ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed;
  const responseLimits = ENEMY_GROUP_PARAM_LIMITS.cohesion.response;
  const t = elasticity / 10;
  const response = elasticity === 0 ? responseLimits.default : Math.round(responseLimits.max - (responseLimits.max - responseLimits.min) * t);
  const maxCatchupSpeed = elasticity === 0 ? catchLimits.rigidDefault : Math.round((catchLimits.rigidDefault - (catchLimits.rigidDefault - catchLimits.min) * t) / catchLimits.step) * catchLimits.step;
  const formation = formationId === "arc.forward" || formationId === "ring" ? { spacing, radius: spacing } : { spacing, depth: spacing };
  return { formationId, cohesionId, followDelay: followRaw === undefined ? null : normalizeGroupFollowDelay(followRaw), params: normalizeEnemyGroupParams({ formation, cohesion: { response, maxCatchupSpeed } }, cohesionId) };
}

function applyStateFormation(group: Group): void {
  if (!group.fsm) return;
  const next = stateFormationParams(getFsmRuntimeState(group.fsm));
  if (!next) return;
  group.formationId = next.formationId;
  group.cohesionId = next.cohesionId;
  group.followDelay = next.followDelay ?? normalizeGroupFollowDelay((group.fsm.preset?.definition as any)?.basicSetup?.followDelay);
  group.params = next.params;
  for (const member of group.members) member.offset = formationOffset(group.formationId, member.slotIndex, group.slotCount, group.params);
}

function anchorHistoryCapacity(followDelay: number, slotCount: number): number {
  const maxDelay = Math.max(0, followDelay) * Math.max(0, slotCount - 1);
  return Math.max(ANCHOR_HISTORY_MIN_CAPACITY, Math.ceil((maxDelay + ANCHOR_HISTORY_SAFETY_SECONDS) * ANCHOR_HISTORY_SAMPLE_RATE) + 2);
}

function resetAnchorHistory(group: Group): void {
  group.anchorHistoryCapacity = anchorHistoryCapacity(group.followDelay, group.slotCount);
  group.anchorHistory = Array.from({ length: group.anchorHistoryCapacity }, () => ({ time: group.historyTime, x: group.anchor.x, y: group.anchor.y }));
  group.anchorHistoryStart = 0;
  group.anchorHistoryCount = 1;
  group.anchorHistory[0] = { time: group.historyTime, x: group.anchor.x, y: group.anchor.y };
}

function ensureAnchorHistoryCapacity(group: Group): void {
  const nextCapacity = anchorHistoryCapacity(group.followDelay, group.slotCount);
  if (nextCapacity <= group.anchorHistoryCapacity) return;
  const samples = anchorHistorySamples(group);
  group.anchorHistoryCapacity = nextCapacity;
  group.anchorHistory = Array.from({ length: nextCapacity }, (_, i) => samples[i] ?? samples[samples.length - 1] ?? { time: group.historyTime, x: group.anchor.x, y: group.anchor.y });
  group.anchorHistoryStart = 0;
  group.anchorHistoryCount = samples.length;
}

function anchorHistorySamples(group: Group): AnchorHistorySample[] {
  const samples: AnchorHistorySample[] = [];
  for (let i = 0; i < group.anchorHistoryCount; i++) samples.push(group.anchorHistory[(group.anchorHistoryStart + i) % group.anchorHistoryCapacity]);
  return samples;
}

function pushAnchorHistory(group: Group): void {
  ensureAnchorHistoryCapacity(group);
  const sample = { time: group.historyTime, x: group.anchor.x, y: group.anchor.y };
  if (group.anchorHistoryCount < group.anchorHistoryCapacity) {
    group.anchorHistory[(group.anchorHistoryStart + group.anchorHistoryCount) % group.anchorHistoryCapacity] = sample;
    group.anchorHistoryCount += 1;
    return;
  }
  group.anchorHistory[group.anchorHistoryStart] = sample;
  group.anchorHistoryStart = (group.anchorHistoryStart + 1) % group.anchorHistoryCapacity;
}

export function sampleAnchorHistoryForGroup(group: any, delaySeconds: number): Vec2 & { sampleAge: number } {
  const count = group.anchorHistoryCount;
  if (count <= 0) return { x: group.anchor.x, y: group.anchor.y, sampleAge: 0 };
  const targetTime = group.historyTime - Math.max(0, delaySeconds);
  const at = (i: number) => group.anchorHistory[(group.anchorHistoryStart + i) % group.anchorHistoryCapacity];
  const first = at(0);
  const last = at(count - 1);
  if (targetTime <= first.time) return { x: first.x, y: first.y, sampleAge: Math.max(0, group.historyTime - first.time) };
  if (targetTime >= last.time) return { x: last.x, y: last.y, sampleAge: Math.max(0, group.historyTime - last.time) };
  for (let i = 1; i < count; i++) {
    const a = at(i - 1);
    const b = at(i);
    if (targetTime <= b.time) {
      const span = b.time - a.time;
      const t = span > 0 ? (targetTime - a.time) / span : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, sampleAge: Math.max(0, group.historyTime - targetTime) };
    }
  }
  return { x: last.x, y: last.y, sampleAge: Math.max(0, group.historyTime - last.time) };
}
export class EnemyGroupRegistry {
  private nextId = 1;
  private groups = new Map<GroupId, Group>();

  create(req: EnemyGroupSpawnRequest): GroupId {
    const preset = EnemyBehaviorPresets[req.movementPresetId] ?? EnemyBehaviorPresets["none.hold"];
    const behaviorId = preset?.behaviorId ?? "none";
    const cohesionId = normalizeCohesionId(req.cohesionId);
    const params = normalizeEnemyGroupParams(req.params, cohesionId, req.spacing);
    const group: Group = {
      id: this.nextId++,
      anchor: { x: finite(req.anchor?.x), y: finite(req.anchor?.y) },
      movementPresetId: preset?.id ?? "none.hold",
      behaviorId,
      behavior: { ...(preset?.params ?? {}) },
      bState: { t: 0 },
      vel: { x: 0, y: 0 },
      formationId: normalizeFormationId(req.formationId),
      cohesionId,
      params,
      followDelay: normalizeGroupFollowDelay((req.fsmPreset?.definition as any)?.basicSetup?.followDelay),
      historyTime: 0,
      anchorHistory: [],
      anchorHistoryStart: 0,
      anchorHistoryCount: 0,
      anchorHistoryCapacity: 0,
      slotCount: Math.max(0, Math.floor(finite(req.count, 0))),
      members: [],
    };
    resetAnchorHistory(group);
    if (req.fsmPreset) {
      group.fsmEnt = { pos: group.anchor, vel: group.vel, bState: { t: 0 }, hp: 1, maxHp: 1 };
      group.fsm = createFsmRuntimeSnapshot(req.fsmPreset, {}, group.fsmEnt, { inheritedAttackProfileId: req.inheritedAttackProfileId ?? null, lifecycle: { markKill: () => {}, isKilled: () => false } });
      group.inheritedAttackProfileId = req.inheritedAttackProfileId ?? null;
    }
    EnemyBehaviorDB[behaviorId as keyof typeof EnemyBehaviorDB]?.init?.({ pos: group.anchor, vel: group.vel, behavior: group.behavior, bState: group.bState, spawnOrdinal: group.id } as any);
    this.groups.set(group.id, group);
    return group.id;
  }

  addMember(groupId: GroupId, ref: EntityRef, slotIndex: number): EnemyGroupMembership | null {
    const group = this.groups.get(groupId);
    if (!group) return null;
    const slot = Math.max(0, Math.floor(slotIndex));
    const offset = formationOffset(group.formationId, slot, group.slotCount, group.params);
    group.members.push({ ref: { slot: ref.slot, gen: ref.gen }, slotIndex: slot, offset });
    return { groupId, slotIndex: slot };
  }

  updateAnchors(dt: number, ctx: { playerPos: Vec2 | null; logicW: number; logicH: number; scrollX: number }): void {
    if (!(dt > 0)) return;
    for (const group of this.groups.values()) {
      const behaviorCtx = { dt, playerPos: ctx.playerPos, logicW: ctx.logicW, logicH: ctx.logicH };
      if (group.fsm && group.fsmEnt) {
        group.fsmEnt.pos = group.anchor;
        group.fsmEnt.vel = group.vel;
        group.fsmLastScrollX = finite(ctx.scrollX);
        updateResolvedFsm(group.fsmEnt, group.fsm, {
          scrollX: group.fsmLastScrollX,
          logicW: ctx.logicW,
          dt,
          inheritedAttackProfileId: group.inheritedAttackProfileId ?? null,
          lifecycle: { markKill: () => {}, isKilled: () => false },
        });
        applyStateFormation(group);
        const target = executeFsmMovement(group.fsm.movement, group.fsmEnt, behaviorCtx);
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
          const state = getFsmRuntimeState(group.fsm);
          const speed = fsmEffectiveSpeed(group.fsm.preset as any, state);
          const referenceSpeed = fsmMovementReferenceSpeed(group.fsm.movement);
          const rawVel = velocityFromFsmTarget(group.fsmEnt, target, dt, null);
          const vel = velocityFromFsmTarget(group.fsmEnt, target, dt, speed, referenceSpeed);
          (group.fsm as any).speedDiagnostics = { baseSpeed: fsmBaseSpeed(group.fsm.preset as any), speedMultiplier: fsmSpeedMultiplier(state), effectiveSpeed: speed, movementPresetReferenceSpeed: referenceSpeed, rawVelocityX: rawVel.x, rawVelocityY: rawVel.y, finalVelocityX: vel.x, finalVelocityY: vel.y, integratedDeltaX: vel.x * dt, integratedDeltaY: vel.y * dt };
          group.vel.x = vel.x;
          group.vel.y = vel.y;
        } else {
          group.vel.x = finite(group.fsmEnt.vel?.x);
          group.vel.y = finite(group.fsmEnt.vel?.y);
        }
      } else {
        const behavior = EnemyBehaviorDB[group.behaviorId as keyof typeof EnemyBehaviorDB] ?? EnemyBehaviorDB.none;
        const ent = { pos: group.anchor, vel: group.vel, behavior: group.behavior, bState: group.bState, spawnOrdinal: group.id };
        behavior.update?.(ent, behaviorCtx as any);
        const target = behavior.getTarget?.(ent, behaviorCtx as any);
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
          group.vel.x = (target.x - group.anchor.x) / dt;
          group.vel.y = (target.y - group.anchor.y) / dt;
        } else {
          group.vel.x = finite(ent.vel?.x);
          group.vel.y = finite(ent.vel?.y);
        }
      }
      group.anchor.x += group.vel.x * dt;
      group.anchor.y += group.vel.y * dt;
      group.historyTime += dt;
      pushAnchorHistory(group);
    }
  }

  applyMemberCohesion(ent: any, membership: EnemyGroupMembership, dt: number): boolean {
    const group = this.groups.get(membership.groupId);
    if (!group || !(dt > 0)) return false;
    const member = group.members.find((m) => m.slotIndex === membership.slotIndex);
    const offset = member?.offset ?? formationOffset(group.formationId, membership.slotIndex, group.slotCount, group.params);
    const sample = group.followDelay > 0 ? sampleAnchorHistoryForGroup(group, membership.slotIndex * group.followDelay) : { x: group.anchor.x, y: group.anchor.y };
    const target = { x: sample.x + offset.x, y: sample.y + offset.y };
    ent.vel = ent.vel ?? { x: 0, y: 0 };
    if (group.cohesionId === "rigid") {
      let vx = (target.x - finite(ent.pos?.x)) / dt;
      let vy = (target.y - finite(ent.pos?.y)) / dt;
      const speed = Math.hypot(vx, vy);
      const maxSpeed = group.params.cohesion.maxCatchupSpeed;
      if (speed > maxSpeed) {
        vx = vx / speed * maxSpeed;
        vy = vy / speed * maxSpeed;
      }
      ent.vel.x = vx;
      ent.vel.y = vy;
      return true;
    }
    const maxSpeed = group.params.cohesion.maxCatchupSpeed;
    const response = group.params.cohesion.response;
    const dx = target.x - finite(ent.pos?.x);
    const dy = target.y - finite(ent.pos?.y);
    let vx = dx * response;
    let vy = dy * response;
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) { vx = vx / speed * maxSpeed; vy = vy / speed * maxSpeed; }
    ent.vel.x = vx;
    ent.vel.y = vy;
    return true;
  }

  reconcile(store: EntityStore<any>): void {
    for (const [id, group] of this.groups) {
      group.members = group.members.filter((m) => {
        const ent = store.get(m.ref);
        return !!ent && ent.kind === "enemy" && !ent.pendingKill && ent.group?.groupId === id && ent.group.slotIndex === m.slotIndex;
      });
      if (group.members.length === 0) this.groups.delete(id);
    }
  }

  remove(id: GroupId): void { this.groups.delete(id); }
  resolveCullReferenceX(id: GroupId, fallbackX: unknown): number {
    const group = this.groups.get(id);
    if (!group) return finite(fallbackX);
    return group.fsm ? getFsmMovementCullReferenceX(group.fsm.movement, { pos: group.anchor }) : resolveMovementCullReferenceX(group.behaviorId, group.bState, group.anchor.x);
  }
  markMembersForKill(id: GroupId, store: EntityStore<any>): void {
    const group = this.groups.get(id);
    if (!group) return;
    for (const member of group.members) {
      store.markKill(member.ref);
    }
  }
  reset(): void { this.groups.clear(); this.nextId = 1; }
  get(id: GroupId): Readonly<Group> | undefined { return this.groups.get(id); }
  size(): number { return this.groups.size; }
  snapshot(): Array<{ id: GroupId; anchor: Vec2; members: Array<{ slotIndex: number; ref: EntityRef }> }> {
    return [...this.groups.values()].map((g) => ({ id: g.id, anchor: { ...g.anchor }, members: g.members.map((m) => ({ slotIndex: m.slotIndex, ref: { ...m.ref } })) }));
  }
}
