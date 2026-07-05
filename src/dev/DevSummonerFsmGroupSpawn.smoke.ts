import assert from "node:assert/strict";
import { EventType } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { getFsmDebugSnapshot } from "../game/enemies/fsm";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { createDevSummonerGroupSpawnPayload } from "./DevSummoner";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

function runDevGroup(input: { enemyTypeId: string; fsmPresetId: string }) {
  const store = new EntityStore<any>(64);
  const groups = new EnemyGroupRegistry();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState(), groups);
  const payload = createDevSummonerGroupSpawnPayload({
    enemyTypeId: input.enemyTypeId,
    count: 3,
    anchorX: 50,
    anchorY: 100,
    formationId: "column.vertical",
    movementPresetId: "none.hold",
    cohesionId: "rigid",
    fsmPresetId: input.fsmPresetId,
  });
  assert(payload, "DevSummoner creates a browser group payload");
  assert.equal(payload.fsmPresetId, input.fsmPresetId, "DevSummoner group payload contains selected fsmPresetId");
  assert.equal((payload as any).behaviorPresetId, undefined, "DevSummoner group payload does not put FSM ID in behaviorPresetId");
  spawn.update({ tick: 1, dt: 1 / 60 }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload }] as any);
  const enemies = ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy");
  assert.equal(enemies.length, 3, "browser Count > 1 group path spawns every member");
  assert.equal(groups.size(), 1, "browser group path keeps group registry membership");
  assert.equal((groups.get(1) as any)?.fsm?.preset?.id, input.fsmPresetId, "browser group path resolves selected FSM on the group anchor");
  assert.equal((groups.get(1) as any)?.movementPresetId, "none.hold", "browser group path does not leave default group movement in control");
  for (const ent of enemies) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, input.fsmPresetId, "browser group path resolves selected FSM on every member");
    assert(ent.group, "browser group path preserves member group metadata");
    assert.equal(ent.behaviorId, "none", "browser group path keeps none.hold movement suppression contract");
  }
}

runDevGroup({ enemyTypeId: "red", fsmPresetId: "fsm.hover" });
runDevGroup({ enemyTypeId: "fsm_turret", fsmPresetId: "fsm.hover" });

const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
model.create();
const userId = model.selectedId;
const beforeStorage = CONTENT.userFsmPresets.inspectRawStorage().raw;
runDevGroup({ enemyTypeId: "red", fsmPresetId: userId });
assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, beforeStorage, "DevSummoner group spawn performs no storage read/mutation during spawn");
CONTENT.userFsmPresets.delete(userId);

console.log("DevSummonerFsmGroupSpawn smoke passed");
