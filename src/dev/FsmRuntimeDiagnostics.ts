import type { EntityStore } from "../engine/ecs/EntityStore";
import type { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { getFsmDebugSnapshot } from "../game/enemies/fsm";

export const FSM_RUNTIME_DIAGNOSTICS_VERSION = "A1.1";
export type FsmRuntimeDiagnosticKind = "single" | "group-anchor" | "group-member";

export type FsmRuntimeDiagnosticSnapshot = {
  kind: FsmRuntimeDiagnosticKind;
  authoritative: boolean;
  entityId?: number;
  groupId?: number;
  presetId: string | null;
  stateId: string | null;
  movementPresetId: string | null;
  worldX: number | null;
  worldY: number | null;
  scrollX: number | null;
  screenX: number | null;
  velocityX: number | null;
  velocityY: number | null;
  stateAge: number | null;
  lastTransition?: { from: string; to: string; reason?: string } | null;
  movementSuppressed: boolean;
  memberCount?: number;
  followDelay?: number | null;
  historySamples?: number | null;
  maxTrailDelay?: number | null;
  baseSpeed?: number | null;
  speedMultiplier?: number | null;
  effectiveSpeed?: number | null;
  movementPresetReferenceSpeed?: number | null;
  rawVelocityX?: number | null;
  rawVelocityY?: number | null;
  finalVelocityX?: number | null;
  finalVelocityY?: number | null;
  integratedDeltaX?: number | null;
  integratedDeltaY?: number | null;
  worldSpeedMagnitude?: number | null;
  screenVelocityX?: number | null;
  screenVelocityY?: number | null;
  screenDeltaX?: number | null;
  screenDeltaY?: number | null;
  screenSpeedMagnitude?: number | null;
  memberSlot?: number | null;
  memberFollowDelay?: number | null;
  memberDistanceToTarget?: number | null;
  memberCorrectionVelocityX?: number | null;
  memberCorrectionVelocityY?: number | null;
  memberCorrectionSpeed?: number | null;
  memberCatchUpCap?: number | null;
  memberSaturated?: boolean | null;
  memberOvershootPrevented?: boolean | null;
  anchorSpeed?: number | null;
  maxMemberTargetDistance?: number | null;
  maxMemberCorrectionSpeed?: number | null;
  saturatedMembersCount?: number | null;
  elasticity?: number | null;
};

export type FsmRuntimeDiagnosticsBundle = {
  version: typeof FSM_RUNTIME_DIAGNOSTICS_VERSION;
  primary: FsmRuntimeDiagnosticSnapshot | null;
  member: FsmRuntimeDiagnosticSnapshot | null;
};

const finite = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const screenX = (worldX: number | null, scrollX: number | null): number | null => worldX === null || scrollX === null ? null : worldX - scrollX;

function speedFields(runtime: any): Partial<FsmRuntimeDiagnosticSnapshot> {
  const d = runtime?.speedDiagnostics;
  if (!d || typeof d !== "object") return {};
  return {
    baseSpeed: finite(d.baseSpeed),
    speedMultiplier: finite(d.speedMultiplier),
    effectiveSpeed: finite(d.effectiveSpeed),
    movementPresetReferenceSpeed: finite(d.movementPresetReferenceSpeed),
    rawVelocityX: finite(d.rawVelocityX),
    rawVelocityY: finite(d.rawVelocityY),
    finalVelocityX: finite(d.finalVelocityX),
    finalVelocityY: finite(d.finalVelocityY),
    integratedDeltaX: finite(d.integratedDeltaX),
    integratedDeltaY: finite(d.integratedDeltaY),
    worldSpeedMagnitude: finite(d.worldSpeedMagnitude),
    screenVelocityX: finite(d.screenVelocityX),
    screenVelocityY: finite(d.screenVelocityY),
    screenDeltaX: finite(d.screenDeltaX),
    screenDeltaY: finite(d.screenDeltaY),
    screenSpeedMagnitude: finite(d.screenSpeedMagnitude),
  };
}

function memberCohesionFields(ent: any): Partial<FsmRuntimeDiagnosticSnapshot> {
  const d = ent?.groupCohesionDiagnostics;
  if (!d || typeof d !== "object") return {};
  return {
    memberSlot: finite(d.slotIndex),
    memberFollowDelay: finite(d.followDelay),
    memberDistanceToTarget: finite(d.distanceToTarget),
    memberCorrectionVelocityX: finite(d.correctionVelocityX),
    memberCorrectionVelocityY: finite(d.correctionVelocityY),
    memberCorrectionSpeed: finite(d.correctionSpeed),
    memberCatchUpCap: finite(d.catchUpCap),
    memberSaturated: d.saturated === true,
    memberOvershootPrevented: d.overshootPrevented === true,
    anchorSpeed: finite(d.anchorSpeed),
  };
}

function groupCohesionFields(group: any): Partial<FsmRuntimeDiagnosticSnapshot> {
  const d = group?.cohesionDiagnostics;
  if (!d || typeof d !== "object") return {};
  return {
    anchorSpeed: finite(d.anchorSpeed),
    maxMemberTargetDistance: finite(d.maxMemberTargetDistance),
    maxMemberCorrectionSpeed: finite(d.maxMemberCorrectionSpeed),
    saturatedMembersCount: finite(d.saturatedMembersCount),
    elasticity: finite(d.elasticity),
  };
}

function lastTransition(runtime: any): FsmRuntimeDiagnosticSnapshot["lastTransition"] {
  const t = runtime?.lastTransition;
  if (!t || typeof t !== "object") return null;
  const from = String(t.from ?? "");
  const to = String(t.to ?? "");
  if (!from && !to) return null;
  return { from, to, ...(typeof t.reason === "string" && t.reason ? { reason: t.reason } : {}) };
}

export function createSingleFsmRuntimeDiagnostic(ent: any, scrollXValue: unknown): FsmRuntimeDiagnosticSnapshot | null {
  const fsm = getFsmDebugSnapshot(ent);
  if (!fsm) return null;
  const worldX = finite(ent?.pos?.x);
  const sx = finite(scrollXValue) ?? 0;
  return Object.freeze({
    kind: "single",
    authoritative: true,
    entityId: finite(ent?.id ?? ent?.slot) ?? undefined,
    presetId: fsm.presetId || null,
    stateId: fsm.stateId || null,
    movementPresetId: fsm.movementPresetId,
    worldX,
    worldY: finite(ent?.pos?.y),
    scrollX: sx,
    screenX: screenX(worldX, sx),
    velocityX: finite(ent?.vel?.x),
    velocityY: finite(ent?.vel?.y),
    stateAge: finite(fsm.stateAge),
    lastTransition: lastTransition(ent?.fsm),
    movementSuppressed: fsm.movementSuppressed === true,
    ...speedFields(ent?.fsm),
  });
}

export function createGroupAnchorFsmRuntimeDiagnostic(group: any, scrollXValue?: unknown): FsmRuntimeDiagnosticSnapshot | null {
  if (!group?.fsm) return null;
  const state = group.fsm.preset?.states?.[group.fsm.stateIndex] ?? group.fsm.preset?.states?.[group.fsm.preset?.initialStateIndex];
  const worldX = finite(group.anchor?.x);
  const sx = finite(group.fsmLastScrollX ?? scrollXValue ?? 0) ?? 0;
  return Object.freeze({
    kind: "group-anchor",
    authoritative: true,
    groupId: finite(group.id) ?? undefined,
    presetId: String(group.fsm.preset?.id ?? "") || null,
    stateId: String(state?.id ?? "") || null,
    movementPresetId: typeof group.fsm.movement?.base?.presetId === "string" ? group.fsm.movement.base.presetId : null,
    worldX,
    worldY: finite(group.anchor?.y),
    scrollX: sx,
    screenX: screenX(worldX, sx),
    velocityX: finite(group.vel?.x),
    velocityY: finite(group.vel?.y),
    stateAge: finite(group.fsm.age),
    lastTransition: lastTransition(group.fsm),
    movementSuppressed: false,
    memberCount: Array.isArray(group.members) ? group.members.length : 0,
    followDelay: finite(group.followDelay),
    historySamples: finite(group.anchorHistoryCount),
    maxTrailDelay: finite((group.followDelay ?? 0) * Math.max(0, (Array.isArray(group.members) ? group.members.length : 0) - 1)),
    ...speedFields(group.fsm),
    ...groupCohesionFields(group),
  });
}

export function createGroupMemberFsmRuntimeDiagnostic(ent: any, scrollXValue: unknown): FsmRuntimeDiagnosticSnapshot | null {
  const base = createSingleFsmRuntimeDiagnostic(ent, scrollXValue);
  if (!base) return null;
  return Object.freeze({
    ...base,
    kind: "group-member" as const,
    authoritative: false,
    groupId: finite(ent?.group?.groupId) ?? undefined,
    movementSuppressed: true,
    ...memberCohesionFields(ent),
  });
}

export function findLatestFsmRuntimeDiagnostics(input: { store?: EntityStore<any> | null; groups?: EnemyGroupRegistry | null; latestManualSpawnId?: number; scrollX?: number }): FsmRuntimeDiagnosticsBundle {
  const store: any = input.store;
  const groups: any = input.groups;
  const scrollXValue = finite(input.scrollX) ?? 0;
  if (!store || typeof store.debugForEachAlive !== "function") return Object.freeze({ version: FSM_RUNTIME_DIAGNOSTICS_VERSION, primary: null, member: null });

  let selected: any = null;
  store.debugForEachAlive((_ref: any, ent: any) => {
    if (!ent || ent.kind !== "enemy" || ent.pendingKill || !ent.fsm?.preset) return;
    if (!selected) selected = ent;
    if (input.latestManualSpawnId && ent.devManualSpawnId === input.latestManualSpawnId) selected = ent;
  });
  if (!selected) return Object.freeze({ version: FSM_RUNTIME_DIAGNOSTICS_VERSION, primary: null, member: null });

  const groupId = selected.group?.groupId;
  if ((typeof groupId === "number" || typeof groupId === "string") && groups && typeof groups.get === "function") {
    const group = groups.get(Number(groupId));
    const anchor = createGroupAnchorFsmRuntimeDiagnostic(group, scrollXValue);
    const member = createGroupMemberFsmRuntimeDiagnostic(selected, scrollXValue);
    if (anchor) return Object.freeze({ version: FSM_RUNTIME_DIAGNOSTICS_VERSION, primary: anchor, member });
  }
  return Object.freeze({ version: FSM_RUNTIME_DIAGNOSTICS_VERSION, primary: createSingleFsmRuntimeDiagnostic(selected, scrollXValue), member: null });
}

export function renderFsmRuntimeDiagnosticsText(bundle: FsmRuntimeDiagnosticsBundle): string {
  const primary = bundle.primary;
  if (!primary) return `Diagnostics version: ${bundle.version}\nNo FSM runtime spawned`;
  const fmt = (n: number | null | undefined, d = 0) => Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "?";
  const transition = (s: FsmRuntimeDiagnosticSnapshot) => s.lastTransition ? `${s.lastTransition.from} → ${s.lastTransition.to}${s.lastTransition.reason ? ` (${s.lastTransition.reason})` : ""}` : "—";
  const header = primary.kind === "group-anchor" ? "GROUP ANCHOR — AUTHORITATIVE" : "SINGLE — AUTHORITATIVE";
  const xLabel = primary.kind === "group-anchor" ? "Anchor X world/screen" : "X world/screen";
  const lines = [
    `Diagnostics version: ${bundle.version}`,
    header,
    `Preset: ${primary.presetId ?? "none"}`,
    `State: ${primary.stateId ?? "none"}`,
    `Movement: ${primary.movementPresetId ?? "none"}`,
    `${xLabel}: ${fmt(primary.worldX)} / ${fmt(primary.screenX)}`,
    `scrollX: ${fmt(primary.scrollX)}`,
    `Velocity: ${fmt(primary.velocityX, 1)}, ${fmt(primary.velocityY, 1)}`,
    `baseSpeed: ${fmt(primary.baseSpeed, 1)}`,
    `speedMultiplier: ${fmt(primary.speedMultiplier, 2)}`,
    `effectiveSpeed: ${fmt(primary.effectiveSpeed, 1)}`,
    `Raw movement velocity: ${fmt(primary.rawVelocityX, 1)}, ${fmt(primary.rawVelocityY, 1)}`,
    `Final world velocity: ${fmt(primary.finalVelocityX, 1)}, ${fmt(primary.finalVelocityY, 1)}`,
    `World delta/frame: ${fmt(primary.integratedDeltaX, 2)}, ${fmt(primary.integratedDeltaY, 2)}`,
    `World speed: ${fmt(primary.worldSpeedMagnitude, 1)}`,
    `Screen velocity: ${fmt(primary.screenVelocityX, 1)}, ${fmt(primary.screenVelocityY, 1)}`,
    `Screen delta/frame: ${fmt(primary.screenDeltaX, 2)}, ${fmt(primary.screenDeltaY, 2)}`,
    `Screen speed: ${fmt(primary.screenSpeedMagnitude, 1)}`,
    `Movement reference speed: ${fmt(primary.movementPresetReferenceSpeed, 1)}`,
    `State age: ${fmt(primary.stateAge, 2)}`,
    `Last transition: ${transition(primary)}`,
    `Suppressed: ${primary.movementSuppressed ? "yes" : "no"}`,
  ];
  if (typeof primary.memberCount === "number") lines.push(`Member count: ${primary.memberCount}`);
  if (primary.kind === "group-anchor") lines.push(`Follow: ${fmt(primary.followDelay, 2)} s/member`, `Elasticity: ${fmt(primary.elasticity)}`, `History samples: ${fmt(primary.historySamples)}`, `Max trail delay: ${fmt(primary.maxTrailDelay, 2)} s`, `Anchor speed: ${fmt(primary.anchorSpeed, 1)}`, `Max member target distance: ${fmt(primary.maxMemberTargetDistance, 1)}`, `Max member correction speed: ${fmt(primary.maxMemberCorrectionSpeed, 1)}`, `Saturated members: ${fmt(primary.saturatedMembersCount)}`);
  if (bundle.member) {
    const m = bundle.member;
    lines.push("", "MEMBER — NON-AUTHORITATIVE MOVEMENT", `Preset: ${m.presetId ?? "none"}`, `State: ${m.stateId ?? "none"}`, `Movement: ${m.movementPresetId ?? "none"}`, `Member slot: ${fmt(m.memberSlot)}`, `Follow delay: ${fmt(m.memberFollowDelay, 2)} s`, `Member X world/screen: ${fmt(m.worldX)} / ${fmt(m.screenX)}`, `Velocity: ${fmt(m.velocityX, 1)}, ${fmt(m.velocityY, 1)}`, `Distance to target: ${fmt(m.memberDistanceToTarget, 2)}`, `Correction velocity: ${fmt(m.memberCorrectionVelocityX, 1)}, ${fmt(m.memberCorrectionVelocityY, 1)}`, `Correction speed: ${fmt(m.memberCorrectionSpeed, 1)}`, `Catch-up cap: ${fmt(m.memberCatchUpCap, 1)}`, `Saturated: ${m.memberSaturated ? "yes" : "no"}`, `Overshoot prevented: ${m.memberOvershootPrevented ? "yes" : "no"}`, `Suppressed: ${m.movementSuppressed ? "yes" : "no"}`);
  }
  return lines.join("\n");
}
