import assert from "node:assert/strict";
import { migrateLegacyBehaviorGraph, makeStableFsmStateIds } from "./fsm/migrate";
import type { BehaviorGraph } from "./fsm";

const graph: BehaviorGraph = {
  initial: "Enter Now!",
  states: {
    "Enter Now!": { movementPresetId: "straight.basic", transitions: [{ when: { kind: "xLessThan", x: 700 }, goto: "Attack" }, { when: { kind: "hpBelow", ratio: 0.5 }, goto: "Retreat" }] },
    Attack: { movementPresetId: "none.hold", attackProfileId: "single_basic", transitions: [{ when: { kind: "timeInState", seconds: 1.25 }, goto: "Retreat" }] },
    Retreat: { movementPresetId: "straight.charge", transitions: [{ when: { kind: "offscreen", side: "left" }, goto: "despawn" }] },
    despawn: { movementPresetId: "none.hold" },
  },
};
const before = structuredClone(graph);
const result = migrateLegacyBehaviorGraph("fsm.fixture", graph, { knownMovementPresetIds: ["straight.basic", "none.hold", "straight.charge"], knownAttackProfileIds: ["single_basic"] });
assert.deepEqual(result.issues.filter((i) => i.severity === "error"), [], "fixture migrates without hard errors");
assert.equal(result.preset.metadata.id, "fsm.fixture", "preset ID is deterministic");
assert.equal(result.preset.metadata.source, "builtin", "source metadata is builtin");
assert.deepEqual(result.preset.graph.states.map((s) => s.label), Object.keys(graph.states), "state order and labels are preserved");
assert.deepEqual(result.preset.graph.states.map((s) => s.id), ["enter_now", "attack", "retreat", "despawn"], "state IDs are stable slugs");
assert.equal(result.preset.graph.initialStateId, "enter_now", "initial state maps through generated IDs");
assert.deepEqual(result.preset.graph.states[0].transitions.map((t) => t.targetStateId), ["attack", "retreat"], "transition order and targets are preserved");
assert.deepEqual(result.preset.graph.states[0].movement.base, { type: "movementPreset", params: { presetId: "straight.basic" } }, "movementPresetId maps to movement base");
assert.deepEqual(result.preset.graph.states[1].combat, { mode: "profile", profileId: "single_basic", runtimePolicy: "reset" }, "attackProfileId maps to profile combat");
assert.deepEqual(result.preset.graph.states[0].combat, { mode: "inherit" }, "absent attackProfileId preserves legacy enemy-default fallback");
assert.deepEqual(result.preset.graph.states[0].targeting, { type: "forward" }, "targeting defaults to forward");
assert.deepEqual(result.preset.graph.states[0].transitions[0].condition, { type: "screenXBelow", params: { x: 700 } }, "xLessThan maps exactly");
assert.deepEqual(result.preset.graph.states[0].transitions[1].condition, { type: "hpBelow", params: { ratio: 0.5 } }, "hpBelow maps exactly");
assert.deepEqual(result.preset.graph.states[1].transitions[0].condition, { type: "timeInState", params: { seconds: 1.25 } }, "timeInState maps exactly");
assert.deepEqual(result.preset.graph.states[2].transitions[0].condition, { type: "offscreen", params: { side: "left", marginPx: 96 } }, "offscreen maps with legacy 96px margin");
assert.deepEqual(result.preset.graph.states[3].lifecycle, { enterActions: [{ type: "despawn" }] }, "despawn convention becomes explicit lifecycle action");
assert(result.issues.some((i) => i.code === "W_MIGRATE_DESPAWN_CONVENTION"), "despawn convention reports stable warning");
assert.deepEqual(graph, before, "migration does not mutate source graph");
assert.deepEqual(migrateLegacyBehaviorGraph("fsm.fixture", graph, { knownMovementPresetIds: ["straight.basic", "none.hold", "straight.charge"], knownAttackProfileIds: ["single_basic"] }).preset, result.preset, "repeated migration is deterministic");
assert.deepEqual([...makeStableFsmStateIds(["A B", "a-b", "!!!"]).values()], ["a_b", "a_b_2", "state"], "state ID generation handles slug collisions");
const unsupported: BehaviorGraph = { initial: "a", states: { a: { movementPresetId: "none.hold", unexpected: true } as any } };
assert(migrateLegacyBehaviorGraph("bad", unsupported).issues.some((i) => i.code === "E_MIGRATE_UNSUPPORTED_STATE_FIELD"), "unsupported state field is a migration error");
console.log("FsmMigrate smoke passed");
