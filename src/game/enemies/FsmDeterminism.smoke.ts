import assert from "node:assert/strict";
import fs from "node:fs";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";
import { buildBuiltinFsmPresetRegistry, createFsmRuntimeSnapshot, updateResolvedFsmLegacySemantics, type BehaviorGraph } from "./fsm";

const dt = 1 / 60;
const knownMovementPresetIds = new Set(Object.keys(EnemyBehaviorPresets));
const graph: BehaviorGraph = { initial: "a", states: { a: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: dt }, goto: "b" }] }, b: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: dt * 3 }, goto: "c" }] }, c: { movementPresetId: "straight.basic" } } };

function makeRegistry(g: BehaviorGraph) { return buildBuiltinFsmPresetRegistry({ "fsm.det": g }, { knownMovementPresetIds, knownAttackProfileIds: [] }, { errorPolicy: "throw" }); }
function run(preset = makeRegistry(graph).get("fsm.det")!) {
  const ent: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 1, maxHp: 1, fsm: createFsmRuntimeSnapshot(preset) };
  const frames = [];
  for (let tick = 0; tick < 8; tick++) {
    const r = updateResolvedFsmLegacySemantics(ent, ent.fsm, { scrollX: 0, logicW: 800, dt });
    frames.push({ tick, state: r.current, age: ent.fsm.age, stateIndex: ent.fsm.stateIndex });
  }
  return { ent, frames };
}

assert.deepEqual(run().frames, run().frames, "two identical resolved runs produce deeply equal traces");

const registry = makeRegistry(graph);
const preset = registry.get("fsm.det")!;
const initCounter = { count: 0 };
const ents = Array.from({ length: 5 }, (_, i) => ({ pos: { x: i, y: 0 }, vel: { x: 0, y: 0 }, hp: 1, maxHp: 1, fsm: createFsmRuntimeSnapshot(preset, { onInit: () => initCounter.count++ }) }));
assert.equal(initCounter.count, 5, "runtime initialization count equals entity initialization count");
assert(ents.every((e) => e.fsm.preset === preset), "all entities share the immutable preset reference");
assert(Object.isFrozen(preset) && Object.isFrozen(preset.states[0].transitions), "resolved preset is immutable");

for (let tick = 0; tick < 2; tick++) {
  for (const ent of ents) updateResolvedFsmLegacySemantics(ent, ent.fsm, { scrollX: 0, logicW: 800, dt });
}
ents[0].fsm.age = 99;
ents[0].fsm.stateIndex = 0;
assert.notEqual(ents[1].fsm.age, 99, "mutating one runtime cannot alter another runtime age");
assert.notEqual(ents[1].fsm.stateIndex, ents[0].fsm.stateIndex, "mutating one runtime cannot alter another runtime state");

const replacementGraph: BehaviorGraph = { initial: "only", states: { only: { movementPresetId: "none.hold" } } };
const replacementPreset = makeRegistry(replacementGraph).get("fsm.det")!;
assert.notEqual(replacementPreset, preset, "replacement registry creates a different preset object");
const spawnedBeforeReplacement = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 1, maxHp: 1, fsm: createFsmRuntimeSnapshot(preset) } as any;
updateResolvedFsmLegacySemantics(spawnedBeforeReplacement, spawnedBeforeReplacement.fsm, { scrollX: 0, logicW: 800, dt });
assert.equal(spawnedBeforeReplacement.fsm.preset, preset, "registry replacement after spawn does not alter stored snapshot");
assert.notEqual(spawnedBeforeReplacement.fsm.preset, replacementPreset, "stored snapshot is not live-linked to replacement registry");

const before = JSON.stringify(preset);
run(preset);
assert.equal(JSON.stringify(preset), before, "repeated execution does not mutate the resolved preset");
const enemySystemSource = fs.readFileSync("src/game/systems/EnemySystem.ts", "utf8");
assert(!enemySystemSource.includes("BUILTIN_FSM_PRESETS.get"), "EnemySystem does not perform per-tick registry lookups");
assert(!enemySystemSource.includes("createFsmRuntimeSnapshot"), "EnemySystem does not repeat runtime initialization per tick");
assert(!enemySystemSource.includes("Math.random"), "resolved FSM path does not introduce direct randomness");
assert(!enemySystemSource.includes("BEHAVIOR_GRAPHS["), "resolved FSM path does not perform per-tick graph lookup");

console.log("FsmDeterminism smoke passed");
