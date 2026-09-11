import { EventType, type CMEventMap } from "../../engine/core/events";
import type { AnyCMEvent } from "./FlowDispatcher";
import type { EntityStore } from "../../engine/ecs/EntityStore";
import type { EntityRef } from "../../engine/ecs/EntityRef";

type SessionState = {
  lives: number;
  gameOver: boolean;
  lastDeathPos?: { x: number; y: number };
};

export class RespawnSystem {
  private respawnInTicks = 0;

  constructor(
    private session: SessionState,
    private store: EntityStore<any>,
    private getPlayerRef: () => EntityRef,
    private logicW: number,
    private logicH: number,
    private cfg = {
      respawnDelayTicks: 60, // 1s @60Hz
      invulnSec: 2.5,        // respawn protection; ordinary hit i-frames remain 0.75s
      introSec: 0.8,
      world: undefined as { scrollX: number; scrollY: number } | undefined,
    }
  ) {}

  reset(): void {
    this.respawnInTicks = 0;
  }

  onFlowEvents(events: AnyCMEvent[]): void {
    for (const e of events) {
      if (e.type !== EventType.ENTITY_KILLED) continue;

      const p = e.payload as CMEventMap[typeof EventType.ENTITY_KILLED] & { isPlayer?: boolean };
      if (!p?.isPlayer) continue;

      if (this.respawnInTicks > 0) return; // already waiting

      // ✅ capture last death position from the current player entity (still exists until cleanup)
      try {
        const pref = this.getPlayerRef();
        const pe: any = this.store.get(pref);
        if (pe?.pos && typeof pe.pos.x === "number" && typeof pe.pos.y === "number") {
          this.session.lastDeathPos = { x: pe.pos.x, y: pe.pos.y };
        }
      } catch {
        // ignore (fail-safe)
      }

      this.session.lives -= 1;
      if (this.session.lives < 0) this.session.lives = 0;

      if (this.session.lives === 0) {
        this.session.gameOver = true;
        const finalPlayer: any = this.store.get(this.getPlayerRef());
        if (finalPlayer) finalPlayer.deadT = Number.POSITIVE_INFINITY;
        return;
      }

      this.respawnInTicks = this.cfg.respawnDelayTicks;
      return;
    }
  }

  /** Call once per Simulation tick */
  tick(): void {
    if (this.session.gameOver) return;
    if (this.respawnInTicks <= 0) return;

    this.respawnInTicks -= 1;
    if (this.respawnInTicks > 0) return;

    const pref = this.getPlayerRef();
    const p: any = this.store.get(pref);
    if (!p) return;

    // ✅ reset player state in-place
    p.kind = "player";
    const viewportLeft = Number(this.cfg.world?.scrollX ?? 0);
    const viewportTop = Number(this.cfg.world?.scrollY ?? 0);
    const target = {
      x: viewportLeft + this.logicW * 0.30,
      y: viewportTop + this.logicH * 0.5,
    };
    const start = {
      x: viewportLeft - Math.max(1, Number(p.bodyRadius ?? p.radius ?? 20)),
      y: target.y,
    };
    p.pos = { x: start.x, y: start.y };
    p.posPrev = { x: start.x, y: start.y };
    p.vel = { x: 0, y: 0 };

    p.radius = Number.isFinite(Number(p.radius)) ? Number(p.radius) : 3;
    p.bodyRadius = Number.isFinite(Number(p.bodyRadius)) && Number(p.bodyRadius) > 0 ? Number(p.bodyRadius) : 20;

    const max0 = Number(p.shieldMax ?? 5);
    p.shieldMax = Number.isFinite(max0) && max0 > 0 ? max0 : 5;
    p.shield = p.shieldMax;

    p.pendingKill = false;
    p.__playerDeathFxDone = false;


    // ✅ spawn i-frames
    p.invulnT = this.cfg.invulnSec;
    p.invulnerabilityReason = "respawn";

    p.respawnIntroDuration = this.cfg.introSec;
    p.respawnIntroT = this.cfg.introSec;
    p.respawnIntroStart = start;
    p.respawnIntroTarget = target;

    // ✅ clear death gate
    p.deadT = 0;
  }
}
