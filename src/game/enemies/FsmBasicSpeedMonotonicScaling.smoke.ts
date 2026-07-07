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
const SPEEDS = [0, 50, 100, 200, 300];

function preset(movementPresetId: string, baseSpeed: number) {
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id: `mono.${movementPresetId}.${baseSpeed}`, name: `mono.${movementPresetId}.${baseSpeed}`, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, followDelay: 0, baseSpeed, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("move"), states: [{ id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], speedMultiplier: 1 }] },
  };
  return resolveFsmPreset(def, { allowDraftSource: true } as any);
}

function speedMagnitude(movementPresetId: string, baseSpeed: number): number {
  const store = new EntityStore<any>(32);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(movementPresetId, baseSpeed), devManualSpawnId: 1411 } }] as any);
  const ent = ((store as any).entities as any[]).find((e) => e?.alive && e.kind === "enemy");
  enemy.update({ tick: 2, dt: DT } as any);
  return ent.fsm.speedDiagnostics.worldSpeedMagnitude;
}

for (const movement of ["straight.basic", "straight.charge"]) {
  const values = SPEEDS.map((speed) => speedMagnitude(movement, speed));
  assert.equal(values[0], 0, `${movement} speed(0) = 0`);
  for (let i = 1; i < values.length; i++) assert(values[i - 1] < values[i], `${movement} ${SPEEDS[i - 1]} < ${SPEEDS[i]} (${values.join(", ")})`);
}
console.log("FsmBasicSpeedMonotonicScaling smoke passed");
