import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";

const store = new EntityStore<any>(64);
const groups = new EnemyGroupRegistry();
const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState(), groups);
spawn.update({ tick: 1, dt: 1 / 60 }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 3, anchor: { x: 50, y: 100 }, formationId: "column.vertical", movementPresetId: "none.hold", cohesionId: "rigid", fsmPresetId: "fsm.hover" } }] as any);
const enemies = ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy");
assert.equal(enemies.length, 3, "group spawns all members");
for (const ent of enemies) {
  assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.hover", "group member resolves selected explicit FSM");
  assert(ent.group, "group membership remains present for movement suppression");
  assert.equal(ent.behaviorId, "none", "group member movement preset remains none.hold for formation ownership");
}
console.log("FsmGroupSpawnOverride smoke passed");
