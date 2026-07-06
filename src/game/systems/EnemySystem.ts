// src/game/systems/EnemySystem.ts
import type { EntityStore } from "../../engine/ecs/EntityStore";
import type { TickContext } from "../../engine/core/Loop";
import { EnemyBehaviorDB } from "../enemies/EnemyBehaviorDB";
import { createFsmMovementRuntime, executeFsmMovement, fsmBaseSpeed, fsmEffectiveSpeed, fsmMovementReferenceSpeed, fsmSpeedMultiplier, getFsmMovementCullReferenceX, getFsmRuntimeStateLabel, isFsmIndividualMovementSuppressed, updateResolvedFsm, velocityFromFsmTarget } from "../enemies/fsm";
import { isEnemyBehaviorId } from "../enemies/EnemyBehaviorTypes";
import type { EnemyBehaviorId } from "../enemies/EnemyBehaviorTypes";
import { ENEMY_DEFS, getAttackProfile } from "../defs/EnemyDefs";
import { updateAttack } from "../enemies/AttackController";
import type { EnemyGroupRegistry } from "../enemies/EnemyGroups";
import { resolveMovementCullReferenceX } from "../enemies/EnemyCullReference";

const DEV = Boolean((globalThis as any).__DEV__);

const isFiniteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const safeNum = (n: unknown, fallback = 0) => (isFiniteNum(n) ? n : fallback);

function smoothTo(cur: number, target: number, easeSec: number, dt: number): number {
  // exponential smoothing: alpha = 1 - exp(-dt / tau)
  const tau = Math.max(0.0001, Number.isFinite(easeSec) ? easeSec : 0.12);
  const a = 1 - Math.exp(-dt / tau);
  const c = Number.isFinite(cur) ? cur : 0;
  const t = Number.isFinite(target) ? target : c;
  return c + (t - c) * a;
}

export class EnemySystem {
  constructor(
    private readonly store: EntityStore<any>,
    private readonly logicW: number,
    private readonly logicH: number,
    private readonly world: { scrollY: number },
    private readonly groups?: EnemyGroupRegistry,
  ) {}

  update(ctx: TickContext): void {
    const dt = safeNum((ctx as any).dt, 0);
    if (dt <= 0) return;
    const W = this.logicW;
    const H = this.logicH;

    let playerPos: { x: number; y: number } | null = null;
    this.store.debugForEachAlive((_ref, e: any) => {
      if (e?.kind !== "player" || e.pendingKill || !e.pos) return;
      const x = Number(e.pos.x);
      const y = Number(e.pos.y);
      if (Number.isFinite(x) && Number.isFinite(y)) playerPos = { x, y };
    });

    const scrollX = safeNum((this.world as any)?.scrollX, 0);

    this.groups?.updateAnchors(dt, { playerPos, logicW: W, logicH: H, scrollX });

    this.store.debugForEachAlive((ref, e: any) => {
      if (!e || e.kind !== "enemy") return;
      if (e.pendingKill) return;

      // mandatory components
      if (!e.pos) {
        console.error("[EnemySystem] enemy without pos -> kill", e);
        this.store.markKill(ref);
        return;
      }
      if (!e.vel) e.vel = { x: 0, y: 0 };
      if (!e.bState) e.bState = { t: 0 };

      // sanitize BEFORE behavior
      e.pos.x = safeNum(e.pos.x, 0);
      e.pos.y = safeNum(e.pos.y, 0);
      e.vel.x = safeNum(e.vel.x, 0);
      e.vel.y = safeNum(e.vel.y, 0);

      // --- posPrev snapshot for render interpolation (must be BEFORE behavior + movement)
      const a = e as any;
      if (!a.posPrev) a.posPrev = { x: e.pos.x, y: e.pos.y };
      else { a.posPrev.x = e.pos.x; a.posPrev.y = e.pos.y; }

      // --- HIT FLASH timer (seconds) ---
      {
        const hf = Number(e.hitFlashT ?? 0);
        if (Number.isFinite(hf) && hf > 0) e.hitFlashT = Math.max(0, hf - dt);
        else e.hitFlashT = 0;
      }

      // --- AI overlay smoothing (future-ready; no effect on vel yet) ---
      {
        const hasAi = e.ai && typeof e.ai === "object";
        if (hasAi) {
          const curW = Number(e.aiWeight ?? 0);
          const tgtW = Number(e.aiWeightTarget ?? curW);
          const easeSec = Number(e.aiEaseSec ?? 0.12);
          const w = smoothTo(curW, tgtW, easeSec, dt);
          e.aiWeight = w;
          if (!Number.isFinite(e.aiWeightTarget)) e.aiWeightTarget = w;
        }
      }


      const def = ENEMY_DEFS[e.typeId];
      let fsmAttackProfile: any | undefined;
      const fsmRuntime = e.fsm;
      if (fsmRuntime?.preset) {
        const fsmResult = updateResolvedFsm(e, fsmRuntime, {
          scrollX,
          logicW: W,
          dt,
          inheritedAttackProfileId: def?.attackProfile?.id ?? null,
          lifecycle: {
            markKill: () => this.store.markKill(ref),
            isKilled: () => e.pendingKill === true,
          },
        });
        if (fsmResult.entityKilled) return;
        const attackProfileId = fsmRuntime.activeCombat.profileId;
        // updateResolvedFsm may perform a formal entry and replace
        // fsmRuntime.movement. Always execute the currently assigned runtime so
        // transition ticks use the target state's movement immediately.
        const activeMovement = fsmRuntime.movement;
        const groupControlled = isFsmIndividualMovementSuppressed(e, (groupId) => !!this.groups?.get(Number(groupId) as any));

        if (e.typeId === "turret_fsm_test") {
          console.log("[FSM]", {
            type: e.typeId,
            state: getFsmRuntimeStateLabel(fsmRuntime),
            switched: fsmResult.switched,
            age: fsmRuntime.age,
            x: e.pos?.x,
            velX: e.vel?.x,
            movement: activeMovement.base.presetId,
            attack: attackProfileId,
            suppressed: groupControlled,
            graphId: fsmRuntime.preset.id,
          });
        }

        if (groupControlled) {
          fsmRuntime.movement.movementSuspended = true;
        } else {
          if (activeMovement.movementSuspended) {
            fsmRuntime.movement = createFsmMovementRuntime(fsmResult.state, e);
          }
          const movement = fsmRuntime.movement;
          movement.movementSuspended = false;
          const target = executeFsmMovement(movement, e, { dt, playerPos, logicW: W, logicH: H });
          if (target) {
            const speed = fsmEffectiveSpeed(fsmRuntime.preset as any, fsmResult.state);
            const referenceSpeed = fsmMovementReferenceSpeed(movement);
            const rawVel = velocityFromFsmTarget(e, target, dt, null);
            const vel = velocityFromFsmTarget(e, target, dt, speed, referenceSpeed);
            (e.fsm as any).speedDiagnostics = { baseSpeed: fsmBaseSpeed(fsmRuntime.preset as any), speedMultiplier: fsmSpeedMultiplier(fsmResult.state), effectiveSpeed: speed, movementPresetReferenceSpeed: referenceSpeed, rawVelocityX: rawVel.x, rawVelocityY: rawVel.y, finalVelocityX: vel.x, finalVelocityY: vel.y, integratedDeltaX: vel.x * dt, integratedDeltaY: vel.y * dt };
            e.vel.x = vel.x;
            e.vel.y = vel.y;
          }
        }
        fsmAttackProfile = attackProfileId
          ? getAttackProfile(attackProfileId)
          : undefined;
      }

      // behavior id (TS-safe)
      const bid: EnemyBehaviorId = isEnemyBehaviorId(e.behaviorId) ? e.behaviorId : "none";
      if (DEV && bid === "none" && e.behaviorId && !isEnemyBehaviorId(e.behaviorId)) {
        console.warn("[EnemySystem] unknown behaviorId -> none:", e.behaviorId, "type:", e.typeId);
      }
      e.behaviorId = bid;

      const behavior = EnemyBehaviorDB[bid];

      // run behavior safely
      try {
        // 1) update internal state
        const behaviorCtx = {
          ...(ctx as any),
          playerPos,
          logicW: W,
          logicH: H,
        };
        if (!fsmRuntime?.preset) behavior?.update?.(e, behaviorCtx as any);

        // 2) V1: if behavior provides target, derive velocity here (single authority)
        if (!fsmRuntime?.preset && behavior?.getTarget) {
          const t = behavior.getTarget(e, behaviorCtx as any);
          if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
            const px = safeNum(e.pos?.x, 0);
            const py = safeNum(e.pos?.y, 0);
            e.vel = e.vel || { x: 0, y: 0 };
            e.vel.x = (t.x - px) / dt;
            e.vel.y = (t.y - py) / dt;
          }
        }
      } catch (err) {
        console.error("[EnemyBehavior crash]", bid, err, e);
        this.store.markKill(ref);
        return;
      }

      if (e.group) this.groups?.applyMemberCohesion(e, e.group, dt);

      // sanitize AFTER behavior (repair)
      if (!isFiniteNum(e.pos?.x) || !isFiniteNum(e.pos?.y)) {
        if (DEV) console.error("[EnemyBehavior] invalid pos -> reset", bid, e.pos, e);
        e.pos.x = safeNum(e.pos?.x, 0);
        e.pos.y = safeNum(e.pos?.y, 0);
      }
      if (!isFiniteNum(e.vel?.x) || !isFiniteNum(e.vel?.y)) {
        if (DEV) console.error("[EnemyBehavior] invalid vel -> zero", bid, e.vel, e);
        e.vel.x = 0;
        e.vel.y = 0;
      }

      // FAILSAFE: pokud behavior nic nenastaví a enemy je nad obrazem, tlač ho dolů
      if (e.pos.y < -1 && e.vel.y === 0) {
        e.vel.y = 40;
      }

      // integrate movement (single authority)
      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;

      // attack controller (data-driven enemy shooting)
      const attackProfile = fsmRuntime?.preset ? fsmAttackProfile : def?.attackProfile;
      if (attackProfile) {
        updateAttack({
          ent: e,
          profile: attackProfile,
          playerPos: playerPos ?? { x: 0, y: 0 },
          store: this.store,
          scrollX,
          logicW: W,
          dt,
        });
      }

      // Horizontal cleanup uses a persistent movement reference so temporary
      // cyclic offsets, group formation offsets, and cohesion lag do not cause
      // false deaths. Vertical viewport excursions are valid enemy movement.
      const r = safeNum(e.radius, 4);
      const camX = safeNum((this.world as any)?.scrollX, 0);
      const xBand = 160; // px tolerance left/right (allows offscreen spawns)
      const cullRefX = e.group
        ? this.groups?.resolveCullReferenceX(e.group.groupId, e.pos.x) ?? safeNum(e.pos.x, 0)
        : fsmRuntime?.preset
          ? getFsmMovementCullReferenceX(fsmRuntime.movement, e)
          : resolveMovementCullReferenceX(e.behaviorId, e.bState, e.pos.x);

      if (cullRefX < camX - r - xBand) {
        if (e.group) this.groups?.markMembersForKill(e.group.groupId, this.store);
        else this.store.markKill(ref);
        return;
      }
      if (cullRefX > camX + W + r + xBand) {
        if (e.group) this.groups?.markMembersForKill(e.group.groupId, this.store);
        else this.store.markKill(ref);
      }
    });
    this.groups?.reconcile(this.store);
  }
}
