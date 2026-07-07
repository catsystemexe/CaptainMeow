import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry, sampleAnchorHistoryForGroup } from "./EnemyGroups";
import { asFsmStateId, resolveFsmPreset, type FsmPresetSchemaV1 } from "./fsm";

const DT = 1 / 60;
function close(actual: number, expected: number, eps = 0.85) { assert(Math.abs(actual - expected) <= eps, `${actual} ~= ${expected}`); }
function finite(n: number) { assert(Number.isFinite(n), `${n} is finite`); }
function preset(id: string, follow0: number, follow1 = follow0, movementPresetId = "sine.soft", transitionSeconds = 120, baseSpeed = 120, elasticity0 = 0, speedMultiplier0 = 1): any {
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id, name: id, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 5, formationId: "line.horizontal", spacing: 40, elasticity: 0, followDelay: 0, baseSpeed, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("a"), states: [
      { id: asFsmStateId("a"), label: "A", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "timeInState", params: { seconds: transitionSeconds } }, targetStateId: asFsmStateId("b") }], formationId: "line.horizontal", spacing: 40, elasticity: elasticity0, followDelay: follow0, speedMultiplier: speedMultiplier0 } as any,
      { id: asFsmStateId("b"), label: "B", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], formationId: "ring", spacing: 60, elasticity: 0, followDelay: follow1, speedMultiplier: 1 } as any,
    ] },
  };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness() { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, spawn, enemy }; }
function spawnGroup(h: ReturnType<typeof harness>, fsmPreset: any, count = 5) { h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count, anchor: { x: 700, y: 180 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { formation: { spacing: 40 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: fsmPreset, devManualSpawnId: 9 } }] as any); }
function run(h: ReturnType<typeof harness>, ticks: number, dt = DT) { for (let i = 0; i < ticks; i++) h.enemy.update({ tick: i + 2, dt } as any); }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }

{
  const h = harness();
  spawnGroup(h, preset("zero", 0), 5);
  const group = h.groups.get(1) as any;
  run(h, 3);
  const before = { ...group.anchor };
  h.enemy.update({ tick: 10, dt: DT } as any);
  for (let i = 0; i < 5; i++) assert.deepEqual(sampleAnchorHistoryForGroup(group, i * group.followDelay), { x: group.anchor.x, y: group.anchor.y, sampleAge: 0 }, "Follow = 0 samples current anchor");
  assert(group.anchor.x !== before.x || group.anchor.y !== before.y, "anchor still follows sine immediately");
}

{
  const h = harness();
  spawnGroup(h, preset("sine-follow", 0.1), 5);
  run(h, 60);
  const group = h.groups.get(1) as any;
  assert.equal(group.followDelay, 0.1);
  assert.equal(group.members.map((m: any) => m.slotIndex).join(","), "0,1,2,3,4", "deterministic slot order");
  close(sampleAnchorHistoryForGroup(group, 0).sampleAge, 0, 0.001);
  close(sampleAnchorHistoryForGroup(group, 0.1).sampleAge, 0.1, 0.001);
  close(sampleAnchorHistoryForGroup(group, 0.4).sampleAge, 0.4, 0.001);
  assert(group.anchorHistoryCount <= group.anchorHistoryCapacity, "history buffer remains bounded");
  assert(group.anchorHistoryCapacity >= 56, "capacity covers 0.4s max trail plus safety margin");
  for (const ent of live(h.store)) { finite(ent.pos.x); finite(ent.pos.y); assert.notEqual(ent.pos.x, 0, "member never jumps to origin"); }
}

{
  const h = harness();
  spawnGroup(h, preset("interp", 0.1, 0.1, "straight.basic"), 2);
  run(h, 12);
  const group = h.groups.get(1) as any;
  const a = sampleAnchorHistoryForGroup(group, 0.05);
  const older = sampleAnchorHistoryForGroup(group, 0.0666667);
  const newer = sampleAnchorHistoryForGroup(group, 0.0333333);
  assert(a.x > Math.min(older.x, newer.x) && a.x < Math.max(older.x, newer.x), "historical lookup interpolates between samples on straight motion");
}

{
  const fixed = harness(); spawnGroup(fixed, preset("fixed", 0.08), 5); run(fixed, 30, 1 / 60);
  const variable = harness(); spawnGroup(variable, preset("variable", 0.08), 5); for (const dt of [1 / 30, 1 / 120, 1 / 60, 1 / 45, 1 / 90, 1 / 60, 1 / 30, 1 / 120, 1 / 60, 1 / 45, 1 / 90, 1 / 60]) variable.enemy.update({ tick: 2, dt } as any);
  assert((fixed.groups.get(1) as any).anchorHistoryCount <= (fixed.groups.get(1) as any).anchorHistoryCapacity);
  assert((variable.groups.get(1) as any).anchorHistoryCount <= (variable.groups.get(1) as any).anchorHistoryCapacity);
}

{
  const h = harness(); spawnGroup(h, preset("single", 0.25), 1); run(h, 5); const group = h.groups.get(1) as any; assert.equal(group.members.length, 1); assert.equal(sampleAnchorHistoryForGroup(group, 0).sampleAge, 0);
}

{
  const h = harness(); spawnGroup(h, preset("transition", 0, 0.15, "straight.basic", 0.1), 5); const group = h.groups.get(1) as any; const refs = group.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`); const offsets = group.members.map((m: any) => ({ ...m.offset })); run(h, 3); assert.equal(group.followDelay, 0); run(h, 10); assert.equal(group.followDelay, 0.15, "state transition applies positive Follow immediately"); assert.equal(group.formationId, "ring"); assert.deepEqual(group.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`), refs, "formation change preserves identities"); assert.notDeepEqual(group.members.map((m: any) => m.offset), offsets, "formation offset changes use current active formation");
}

{
  const h = harness(); spawnGroup(h, preset("transition-zero", 0.15, 0, "straight.basic", 0.1), 5); run(h, 3); assert.equal((h.groups.get(1) as any).followDelay, 0.15); run(h, 10); assert.equal((h.groups.get(1) as any).followDelay, 0, "state transition to Follow 0 applies immediately");
}

{
  const rigid = harness(); spawnGroup(rigid, preset("elastic-rigid", 0.15, 0.15, "straight.basic"), 5); run(rigid, 30); const rigidGroup = rigid.groups.get(1) as any;
  const elastic = harness(); spawnGroup(elastic, preset("elastic-soft", 0.15, 0.15, "straight.basic", 120, 120, 8), 5); run(elastic, 30); const elasticGroup = elastic.groups.get(1) as any;
  assert.equal(rigidGroup.followDelay, elasticGroup.followDelay, "elasticity does not change active Follow");
  assert.notEqual(rigidGroup.params.cohesion.response, elasticGroup.params.cohesion.response, "elasticity still controls cohesion independently");
}

{
  const slow = harness(); spawnGroup(slow, preset("slow", 0.1, 0.1, "straight.basic", 120, 120), 5); run(slow, 60);
  const fast = harness(); spawnGroup(fast, preset("fast", 0.1, 0.1, "straight.basic", 120, 120, 0, 2), 5); run(fast, 60);
  assert.equal((slow.groups.get(1) as any).followDelay, (fast.groups.get(1) as any).followDelay, "Follow remains time-based and independent of speed inputs");
  assert.equal(sampleAnchorHistoryForGroup(slow.groups.get(1) as any, 0.4).sampleAge, sampleAnchorHistoryForGroup(fast.groups.get(1) as any, 0.4).sampleAge, "same Follow requests the same sample age at different speeds");
}


{
  const h = harness(); spawnGroup(h, preset("reset", 0.1), 5); run(h, 20); assert((h.groups.get(1) as any).anchorHistoryCount > 1); h.groups.reset(); assert.equal(h.groups.size(), 0, "reset/stop releases group history with the group");
}

console.log("FsmGroupFollowRuntime smoke passed");
