import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEHAVIOR_GRAPHS, BUILTIN_FSM_PRESETS, CONTENT } from "../content/CONTENT";
import { buildBuiltinFsmPresetRegistry, migrateBuiltinFsmPresets, type BehaviorGraph } from "./fsm";

const movementIds = new Set(CONTENT.behaviorPresets.map((p) => p.id));
const attackIds = new Set(["single_basic", "aimed_slow", "spread_test_slow", "spread_test_fast"]);
const migrated = migrateBuiltinFsmPresets(BEHAVIOR_GRAPHS, { knownMovementPresetIds: movementIds, knownAttackProfileIds: attackIds });
const graphIds = Object.keys(BEHAVIOR_GRAPHS);
assert.equal(migrated.length, graphIds.length, "migrated count equals legacy graph count");
assert.deepEqual(migrated.flatMap((m) => m.issues.filter((i) => i.severity === "error")), [], "all built-in graphs migrate without hard errors");
const registry = buildBuiltinFsmPresetRegistry(BEHAVIOR_GRAPHS, { knownMovementPresetIds: movementIds, knownAttackProfileIds: attackIds }, { errorPolicy: "throw" });
assert.equal(registry.size, graphIds.length, "registry size equals valid migrated count");
assert.equal(BUILTIN_FSM_PRESETS.size, registry.size, "CONTENT exposes built-in registry");
assert.deepEqual(registry.list().map((p) => p.id), graphIds, "list order follows canonical JSON key order");
for (const id of graphIds) {
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
const rawClone = structuredClone(BEHAVIOR_GRAPHS);
(BEHAVIOR_GRAPHS as any).__s2_mutability_probe = { initial: "a", states: { a: { movementPresetId: "none.hold" } } };
delete (BEHAVIOR_GRAPHS as any).__s2_mutability_probe;
assert.deepEqual(BEHAVIOR_GRAPHS, rawClone, "raw legacy source remains mutable and unchanged after probe");
assert.equal(CONTENT.behaviorGraphs, BEHAVIOR_GRAPHS, "CONTENT behaviorGraphs is the legacy runtime registry object");
const enemySystemSource = readFileSync(new URL("../systems/EnemySystem.ts", import.meta.url), "utf8");
assert(enemySystemSource.includes('BEHAVIOR_GRAPHS') && !enemySystemSource.includes('BUILTIN_FSM_PRESETS') && !enemySystemSource.includes('buildBuiltinFsmPresetRegistry'), "EnemySystem remains on legacy graph path");
console.log("FsmBuiltinContent smoke passed");
