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

function preset(movementPresetId: string) {
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id: `zero.${movementPresetId}`, name: `zero.${movementPresetId}`, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, followDelay: 0, baseSpeed: 0, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("move"), states: [{ id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], speedMultiplier: 1 }] },
  };
  return resolveFsmPreset(def, { allowDraftSource: true } as any);
}

function run(movementPresetId: string) {
  const store = new EntityStore<any>(32);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(movementPresetId), devManualSpawnId: 1411 } }] as any);
  const ent = ((store as any).entities as any[]).find((e) => e?.alive && e.kind === "enemy");
  assert(ent, "enemy spawned");
  const x0 = ent.pos.x;
  const y0 = ent.pos.y;
  enemy.update({ tick: 2, dt: DT } as any);
  const d = ent.fsm.speedDiagnostics;
  assert.equal(d.baseSpeed, 0, `${movementPresetId} keeps runtime baseSpeed 0`);
  assert.equal(d.effectiveSpeed, 0, `${movementPresetId} keeps effectiveSpeed 0`);
  assert.equal(d.finalVelocityX, 0, `${movementPresetId} finalVelocityX is zero`);
  assert.equal(d.finalVelocityY, 0, `${movementPresetId} finalVelocityY is zero`);
  assert.equal(d.integratedDeltaX, 0, `${movementPresetId} world dx is zero`);
  assert.equal(d.integratedDeltaY, 0, `${movementPresetId} world dy is zero`);
  assert.equal(ent.pos.x - x0, 0, `${movementPresetId} entity world x unchanged`);
  assert.equal(ent.pos.y - y0, 0, `${movementPresetId} entity world y unchanged`);
}

for (const movement of ["straight.basic", "straight.charge", "sine.soft", "none.hold"]) run(movement);
console.log("FsmBasicSpeedZeroSemantics smoke passed");
