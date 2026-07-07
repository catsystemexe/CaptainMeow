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

function state(id: string, movementPresetId: string, next: string) {
  return { id: asFsmStateId(id), label: id, movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "timeInState", params: { seconds: DT } }, targetStateId: asFsmStateId(next) }], speedMultiplier: 1 } as const;
}

function preset(baseSpeed: number) {
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id: `carry.${baseSpeed}`, name: `carry.${baseSpeed}`, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, followDelay: 0, baseSpeed, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("enter"), states: [state("enter", "straight.basic", "attack"), state("attack", "none.hold", "retreat"), state("retreat", "straight.charge", "enter")] as any },
  };
  return resolveFsmPreset(def, { allowDraftSource: true } as any);
}

function close(actual: number, expected: number, message: string): void { assert(Math.abs(actual - expected) <= 0.000001, `${message}: ${actual} ~= ${expected}`); }

function run(baseSpeed: number) {
  const store = new EntityStore<any>(32);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(baseSpeed), devManualSpawnId: 1411 } }] as any);
  const ent = ((store as any).entities as any[]).find((e) => e?.alive && e.kind === "enemy");
  assert(ent, "enemy spawned");
  const observed: Array<{ state: string; base: number; effective: number; world: number }> = [];
  for (let tick = 2; tick <= 5; tick++) {
    enemy.update({ tick, dt: DT } as any);
    const state = ent.fsm.preset.states[ent.fsm.stateIndex].id;
    const d = ent.fsm.speedDiagnostics;
    observed.push({ state, base: d.baseSpeed, effective: d.effectiveSpeed, world: d.worldSpeedMagnitude });
  }
  assert.deepEqual(observed.map((x) => x.state), ["enter", "attack", "retreat", "enter"], `state cycle for ${baseSpeed}`);
  for (const row of observed) {
    assert.equal(row.base, baseSpeed, `${row.state} keeps baseSpeed ${baseSpeed}`);
    assert.equal(row.effective, baseSpeed, `${row.state} recomputes effectiveSpeed ${baseSpeed}`);
  }
  assert.equal(observed[1].world, 0, "none.hold has zero velocity without losing Basic Speed");
  close(observed[0].world, baseSpeed, "enter scales to selected speed");
  close(observed[2].world, baseSpeed, "retreat scales to selected speed");
  close(observed[3].world, baseSpeed, "return to enter preserves selected speed");
}

for (const base of [0, 115, 320]) run(base);
console.log("FsmBasicSpeedThreeStateCarry smoke passed");
