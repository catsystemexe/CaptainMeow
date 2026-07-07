import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { CONTENT } from "../content/CONTENT";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";
import { FsmPresetEditorModel } from "../../dev/FsmPresetEditorModel";

function createHarness() {
  const store = new EntityStore<any>(64);
  const groups = new EnemyGroupRegistry();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState(), groups);
  return { store, groups, spawn };
}

function liveEnemies(store: EntityStore<any>): any[] {
  return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy");
}

function spawnGroup(spawn: SpawnSystem, input: { enemyTypeId: string; fsmPresetId?: string; count?: number }) {
  spawn.update({ tick: 1, dt: 1 / 60 }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: {
    enemyTypeId: input.enemyTypeId,
    count: input.count ?? 3,
    anchor: { x: 50, y: 100 },
    formationId: "column.vertical",
    movementPresetId: "none.hold",
    cohesionId: "rigid",
    ...(input.fsmPresetId ? { fsmPresetId: input.fsmPresetId } : {}),
  } }] as any);
}

{
  const { store, groups, spawn } = createHarness();
  spawnGroup(spawn, { enemyTypeId: "red", fsmPresetId: "fsm.hover", count: 3 });
  const enemies = liveEnemies(store);
  assert.equal(enemies.length, 3, "count > 1 group spawns all members");
  assert.equal(groups.size(), 1, "group registry keeps group membership owner");
  for (const ent of enemies) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.hover", "group member resolves selected explicit built-in FSM");
    assert(ent.group, "group membership remains present for movement suppression");
    assert.equal(ent.behaviorId, "none", "group member movement preset remains none.hold for formation ownership");
  }
}

{
  const { store, spawn } = createHarness();
  spawnGroup(spawn, { enemyTypeId: "fsm_turret", fsmPresetId: "fsm.hover", count: 3 });
  for (const ent of liveEnemies(store)) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.hover", "explicit group FSM overrides member default behaviorGraphId");
  }
}

{
  const { store, spawn } = createHarness();
  const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
  model.create();
  const userId = model.selectedId;
  const beforeStorage = CONTENT.userFsmPresets.inspectRawStorage().raw;
  spawnGroup(spawn, { enemyTypeId: "red", fsmPresetId: userId, count: 3 });
  assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, beforeStorage, "group spawn does not read or mutate user preset storage");
  for (const ent of liveEnemies(store)) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, userId, "group member resolves selected explicit user FSM from combined registry");
  }
  CONTENT.userFsmPresets.delete(userId);
}

{
  const { spawn, groups } = createHarness();
  assert.throws(() => spawnGroup(spawn, { enemyTypeId: "red", fsmPresetId: "fsm.missing.u0_1", count: 3 }), /Unknown explicit fsmPresetId/, "invalid explicit group fsmPresetId fails clearly");
  assert.equal(groups.size(), 0, "invalid group FSM does not leave an empty group behind");
}

console.log("FsmGroupSpawnOverride smoke passed");
