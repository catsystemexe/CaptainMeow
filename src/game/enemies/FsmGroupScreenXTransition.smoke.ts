import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { findLatestFsmRuntimeDiagnostics } from "../../dev/FsmRuntimeDiagnostics";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";

const DT = 1 / 60;
const LOGIC_W = 896;
const LOGIC_H = 504;
const WORLD_X = 20356;
const BELOW_SCROLL_X = 20100; // screenX = 256, below Charge 650 and Hover 760 thresholds.
const ABOVE_SCROLL_X = 19600; // screenX = 756, above Charge threshold.
const TOKEN = 7331;

function harness(scrollX: number) {
  const store = new EntityStore<any>(128);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  world.scrollX = scrollX;
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: LOGIC_W, h: LOGIC_H }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, LOGIC_W, LOGIC_H, world, groups);
  return { store, groups, world, spawn, enemy };
}

function update(enemy: EnemySystem, ticks = 1) {
  for (let i = 0; i < ticks; i++) enemy.update({ tick: i + 1, dt: DT } as any);
}

function liveEnemies(store: EntityStore<any>): any[] {
  return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill);
}

function spawnSingle(spawn: SpawnSystem, scrollX: number, fsmPresetId: string, token = TOKEN) {
  spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: {
    typeId: "red",
    spawn: { x: WORLD_X - scrollX, y: 244 },
    fsmPresetId,
    devManualSpawnId: token,
  } }] as any);
}

function spawnGroup(spawn: SpawnSystem, scrollX: number, fsmPresetId: string, token = TOKEN) {
  spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: {
    enemyTypeId: "red",
    count: 2,
    anchor: { x: WORLD_X - scrollX, y: 244 },
    formationId: "line.horizontal",
    movementPresetId: "none.hold",
    cohesionId: "rigid",
    fsmPresetId,
    devManualSpawnId: token,
    params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } },
  } }] as any);
}

{
  const single = harness(BELOW_SCROLL_X);
  spawnSingle(single.spawn, single.world.scrollX, "fsm.charge", 101);
  update(single.enemy);
  const [ent] = liveEnemies(single.store);
  const singleSnapshot = getFsmDebugSnapshot(ent);
  assert.equal(singleSnapshot?.stateId, "charge", "single fsm.charge uses worldX - scrollX and transitions enter -> charge");
  assert.equal(singleSnapshot?.movementPresetId, "straight.charge", "single fsm.charge transition activates Charge movement");
  assert.equal(singleSnapshot?.lastTransition?.from, "enter");
  assert.equal(singleSnapshot?.lastTransition?.to, "charge");
  assert.equal(singleSnapshot?.lastTransition?.reason, "screenXBelow");

  const group = harness(BELOW_SCROLL_X);
  spawnGroup(group.spawn, group.world.scrollX, "fsm.charge", 202);
  update(group.enemy);
  const diagnostics = findLatestFsmRuntimeDiagnostics({ store: group.store, groups: group.groups, latestManualSpawnId: 202, scrollX: group.world.scrollX }).primary!;
  assert.equal(diagnostics.kind, "group-anchor");
  assert.equal(diagnostics.scrollX, BELOW_SCROLL_X, "group diagnostics report actual world scrollX used by the anchor FSM");
  assert.equal(diagnostics.screenX, (diagnostics.worldX ?? 0) - BELOW_SCROLL_X, "group diagnostics report screenX as worldX - scrollX");
  assert.equal(diagnostics.stateId, "charge", "group fsm.charge uses the same screen-X semantics and transitions enter -> charge");
  assert.equal(diagnostics.movementPresetId, "straight.charge", "group fsm.charge transition activates Charge movement");
  assert.deepEqual(diagnostics.lastTransition, { from: "enter", to: "charge", reason: "screenXBelow" });
}

{
  const group = harness(BELOW_SCROLL_X);
  spawnGroup(group.spawn, group.world.scrollX, "fsm.hover", 303);
  update(group.enemy);
  const diagnostics = findLatestFsmRuntimeDiagnostics({ store: group.store, groups: group.groups, latestManualSpawnId: 303, scrollX: group.world.scrollX }).primary!;
  assert.equal(diagnostics.stateId, "hover", "group fsm.hover transitions when actual screenX satisfies its graph threshold");
  assert.equal(diagnostics.movementPresetId, "none.hold", "Hover transition reaches the graph's hold movement instead of staying in enter");
  assert.equal(diagnostics.scrollX, BELOW_SCROLL_X);
  assert.equal(diagnostics.screenX, (diagnostics.worldX ?? 0) - BELOW_SCROLL_X);
  assert.deepEqual(diagnostics.lastTransition, { from: "enter", to: "hover", reason: "screenXBelow" });
}

{
  const group = harness(ABOVE_SCROLL_X);
  spawnGroup(group.spawn, group.world.scrollX, "fsm.charge", 404);
  update(group.enemy);
  const diagnostics = findLatestFsmRuntimeDiagnostics({ store: group.store, groups: group.groups, latestManualSpawnId: 404, scrollX: group.world.scrollX }).primary!;
  assert.equal(diagnostics.screenX, (diagnostics.worldX ?? 0) - ABOVE_SCROLL_X);
  assert(diagnostics.screenX !== null && diagnostics.screenX > 650, "negative control keeps screenX above Charge threshold");
  assert.equal(diagnostics.stateId, "enter", "screenX above threshold does not transition on elapsed update alone");
  assert.equal(diagnostics.movementPresetId, "straight.drift");
  assert.equal(diagnostics.lastTransition, null);
}

console.log("FsmGroupScreenXTransition smoke passed");
