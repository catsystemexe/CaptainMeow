import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { asFsmStateId, resolveFsmPreset, type FsmPresetSchemaV1 } from "./fsm";

const DT = 1 / 60;
function preset(id: string, baseSpeed: number, followDelay: number, elasticity: number): any {
  const def: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id, name: id, source: "draft", schemaVersion: 1 }, basicSetup: { appearanceId: "red", count: 5, formationId: "line.horizontal", spacing: 40, elasticity, followDelay, baseSpeed, spawnY: 180 }, graph: { initialStateId: asFsmStateId("move"), states: [{ id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: "sine.soft" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], formationId: "line.horizontal", spacing: 40, elasticity, followDelay, speedMultiplier: 1 } as any] } };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness() { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, spawn, enemy }; }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
function spawnGroup(h: ReturnType<typeof harness>, speed: number, follow: number, elasticity: number) { h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 5, anchor: { x: 700, y: 180 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: elasticity === 0 ? "rigid" : "elastic", params: { formation: { spacing: 40 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`hs.${speed}.${follow}.${elasticity}`, speed, follow, elasticity), devManualSpawnId: 91 } }] as any); }

for (const speed of [100, 200, 300, 400, 600]) for (const follow of [0, 0.10, 0.25]) for (const elasticity of [0, 3, 8]) {
  const h = harness();
  spawnGroup(h, speed, follow, elasticity);
  const group = h.groups.get(1) as any;
  assert(group, "group spawned");
  const refs = group.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`);
  let previousAnchorX = group.anchor.x;
  for (let tick = 0; tick < 180; tick++) {
    h.enemy.update({ tick: tick + 2, dt: DT } as any);
    assert(Number.isFinite(group.anchor.x) && Number.isFinite(group.anchor.y), "anchor finite");
    assert.notEqual(group.anchor.x, previousAnchorX, "anchor remains moving/smooth");
    previousAnchorX = group.anchor.x;
    assert(group.anchorHistoryCount <= group.anchorHistoryCapacity, "history bounded");
    assert.deepEqual(group.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`), refs, "member identities stable");
    for (const ent of live(h.store)) {
      assert(Number.isFinite(ent.pos.x) && Number.isFinite(ent.pos.y), "member finite position");
      const d = ent.groupCohesionDiagnostics;
      assert(d, "member diagnostics present");
      const step = Math.hypot(d.correctionVelocityX * DT, d.correctionVelocityY * DT);
      assert(step <= d.distanceToTarget + 0.000001, `no overshoot step ${step} <= ${d.distanceToTarget}`);
      assert(d.correctionSpeed <= d.catchUpCap + 0.000001, "correction speed bounded by cap");
      assert(Number.isFinite(d.catchUpCap), "catch-up cap finite");
    }
  }
  const summary = group.cohesionDiagnostics;
  assert(summary.maxMemberCorrectionSpeed <= 2400 + 0.000001, "finite max cap applies");
}
console.log("FsmHighSpeedFollowStability smoke passed");
