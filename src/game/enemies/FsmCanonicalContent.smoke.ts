import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fsmPresetsJson from "../content/fsmPresets.json";
import { CONTENT } from "../content/CONTENT";
import { buildBuiltinFsmPresetRegistry, buildBuiltinFsmPresetRegistryFromPresets, migrateLegacyBehaviorGraph, type BehaviorGraph } from "./fsm";
import { validateFsmPreset } from "./fsm/validate";

const expectedIds = ["fsm.turret", "fsm.hover", "fsm.charge", "fsm.zigzag", "fsm.smart_tracker", "fsm.smart_aligner", "fsm.smart_evader", "fsm.smart_ranger", "fsm.smart_orbit_half", "fsm.smart_orbit_repeat"];
const source = fsmPresetsJson as any;
assert.equal(source.schemaVersion, 1, "canonical source schema version is 1");
assert.deepEqual(source.presets.map((preset: any) => preset.metadata.id), expectedIds, "canonical presets preserve all 10 built-in IDs in legacy order");
const movementIds = new Set(CONTENT.behaviorPresets.map((preset) => preset.id));
const attackIds = new Set(["single_basic", "aimed_slow", "spread_test_slow", "spread_test_fast"]);
const registry = buildBuiltinFsmPresetRegistryFromPresets(source, { knownMovementPresetIds: movementIds, knownAttackProfileIds: attackIds }, { errorPolicy: "throw" });
assert.equal(registry.size, 10, "all canonical presets resolve");
for (const preset of source.presets) {
  const issues = validateFsmPreset(preset, { knownAttackProfileIds: attackIds }).issues;
  assert.deepEqual(issues.filter((issue) => issue.severity === "error"), [], `${preset.metadata.id} validates without errors`);
  assert(!issues.some((issue) => issue.severity === "normalized"), `${preset.metadata.id} requires no normalization`);
  const labels = preset.graph.states.map((state: any) => state.label);
  assert(labels.includes("despawn"), `${preset.metadata.id} preserves despawn label for display only`);
  const despawn = preset.graph.states.find((state: any) => state.label === "despawn");
  assert.deepEqual(despawn.lifecycle, { enterActions: [{ type: "despawn" }] }, `${preset.metadata.id} has explicit despawn action`);
}
const contentTs = readFileSync("src/game/content/loadContent.ts", "utf8");
assert(contentTs.includes("fsmPresets.json"), "production loader imports canonical schema-v1 content");
assert(!contentTs.includes("behaviorGraphs.json") && !contentTs.includes("migrateBuiltinFsmPresets"), "production loader does not migrate legacy built-ins");
assert.throws(() => buildBuiltinFsmPresetRegistry({ bad: { initial: "a", states: { a: { movementPresetId: "missing" } } } as BehaviorGraph }, { knownMovementPresetIds: ["none.hold"] }, { errorPolicy: "throw" }), /E_MIGRATE_UNKNOWN_MOVEMENT_PRESET/, "legacy adapter remains available for compatibility callers");
const migrated = migrateLegacyBehaviorGraph("compat", { initial: "a", states: { a: { movementPresetId: "none.hold" } } } as BehaviorGraph, { knownMovementPresetIds: ["none.hold"] });
assert.equal(migrated.preset.schemaVersion, 1, "legacy adapter still converts external legacy shape to schema v1");
console.log("FsmCanonicalContent smoke passed");
