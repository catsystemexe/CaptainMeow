import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fsmPresetsJson from "../content/fsmPresets.json";
import { BUILTIN_FSM_PRESETS, CONTENT } from "../content/CONTENT";
import { buildBuiltinFsmPresetRegistry, buildBuiltinFsmPresetRegistryFromPresets, type BehaviorGraph } from "./fsm";

const movementIds = new Set(CONTENT.behaviorPresets.map((p) => p.id));
const attackIds = new Set(["single_basic", "aimed_slow", "spread_test_slow", "spread_test_fast"]);
const canonicalSource = fsmPresetsJson as any;
const presetIds = canonicalSource.presets.map((preset: any) => preset.metadata.id);
assert.equal(canonicalSource.schemaVersion, 1, "canonical built-in FSM source is schema v1");
assert.equal(presetIds.length, 10, "canonical built-in preset count is 10");
const registry = buildBuiltinFsmPresetRegistryFromPresets(canonicalSource, { knownMovementPresetIds: movementIds, knownAttackProfileIds: attackIds }, { errorPolicy: "throw" });
assert.equal(registry.size, presetIds.length, "registry size equals canonical preset count");
assert.equal(BUILTIN_FSM_PRESETS.size, registry.size, "CONTENT exposes built-in registry");
assert.deepEqual(registry.list().map((p) => p.id), presetIds, "list order follows canonical JSON preset order");
for (const id of presetIds) {
  const preset = registry.get(id);
  assert(preset, `preset ${id} is retrievable`);
  assert.equal(preset.initialStateIndex >= 0, true, `preset ${id} has resolved initial state`);
  for (const state of preset.states) {
    assert.equal(preset.getStateIndex(state.id) !== undefined, true, `state ${String(state.id)} resolves`);
    assert(movementIds.has(state.movement.base.params.presetId), `movement ${state.movement.base.params.presetId} is known`);
    if (state.combat.mode === "profile") assert(attackIds.has(state.combat.profileId), `attack ${state.combat.profileId} is known`);
    for (const transition of state.transitions) assert(preset.states[transition.targetStateIndex]?.id === transition.targetStateId, "transition target resolves");
  }
}
const invalid: Record<string, BehaviorGraph> = { ok: { initial: "a", states: { a: { movementPresetId: "none.hold" } } }, bad: { initial: "a", states: { a: { movementPresetId: "missing" } } } };
assert.throws(() => buildBuiltinFsmPresetRegistry(invalid, { knownMovementPresetIds: ["none.hold"] }, { errorPolicy: "throw" }), /bad.*E_MIGRATE_UNKNOWN_MOVEMENT_PRESET/, "development policy throws with preset id and issue code");
const logs: string[] = [];
const prod = buildBuiltinFsmPresetRegistry(invalid, { knownMovementPresetIds: ["none.hold"] }, { errorPolicy: "omit-invalid", logger: { warn: (msg?: unknown) => { logs.push(String(msg)); } } });
assert.equal(prod.size, 1, "production policy omits only invalid preset");
assert(prod.has("ok") && !prod.has("bad"), "production policy preserves valid preset");
assert.equal(logs.length, 1, "production policy logs once per build");
const first = registry.list()[0];
assert.throws(() => ((first.states as any).push({})), /extensible|read only|object is not extensible/i, "state collection is immutable");
assert.throws(() => (((first.states[0].transitions as any).push({}))), /extensible|read only|object is not extensible/i, "transition collection is immutable");
assert.equal(canonicalSource.schemaVersion, 1, "CONTENT no longer exposes legacy behaviorGraphs");
const enemySystemSource = readFileSync(new URL("../systems/EnemySystem.ts", import.meta.url), "utf8");
assert(!enemySystemSource.includes('BEHAVIOR_GRAPHS') && !enemySystemSource.includes('BUILTIN_FSM_PRESETS') && !enemySystemSource.includes('buildBuiltinFsmPresetRegistry'), "EnemySystem uses spawned FSM snapshots instead of legacy graph or registry lookup");
console.log("FsmBuiltinContent smoke passed");
