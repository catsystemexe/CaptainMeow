import { strict as assert } from "node:assert";
import { CONTENT } from "../game/content/CONTENT";
import { asFsmStateId, FSM_SCHEMA_VERSION, type FsmPresetSchemaV1 } from "../game/enemies/fsm/schema";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm/UserFsmPresetStore";
class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";

const preset: FsmPresetSchemaV1 = {
  schemaVersion: FSM_SCHEMA_VERSION,
  metadata: { id: "user.u14", name: "U1.4 smoke", source: "user", schemaVersion: FSM_SCHEMA_VERSION },
  basicSetup: { appearanceId: "grunt", count: 1, formationId: "line.horizontal", spacing: 64, elasticity: 0, baseSpeed: 1, spawnY: 250 },
  graph: {
    initialStateId: asFsmStateId("one"),
    states: [
      { id: asFsmStateId("one"), label: "One", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "timeInState", params: { seconds: 1 } }, targetStateId: asFsmStateId("two") }] },
      { id: asFsmStateId("two"), label: "Two", movement: { base: { type: "movementPreset", params: { presetId: "sine.soft" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "screenXBelow", params: { x: 650 } }, targetStateId: asFsmStateId("three") }] },
      { id: asFsmStateId("three"), label: "Three", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [] },
    ],
  },
};

const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage() });
assert.equal(store.upsert(preset).ok, true);
const model = new FsmPresetAuthoringModel(store, "user.u14");

assert.deepEqual(model.labStateRows().map((row) => row.number), [1, 2, 3], "state numbering is derived as 1..n");
model.reorderState("three", 0);
model.normalizeSequentialTriggers();
assert.deepEqual(model.labStateRows().map((row) => `${row.number}:${row.id}`), ["1:three", "2:one", "3:two"], "reorder updates UI numbering");
assert.equal(model.draft?.preset.graph.states[1].transitions[0]?.targetStateId, "two", "existing trigger targets next state after reorder");

model.addState();
assert.equal(model.labStateRows().length, 4, "add state appends one state");
model.duplicateState();
assert.equal(model.labStateRows().length, 5, "duplicate state inserts a copy");
const selected = model.draft?.selectedStateId;
assert(selected, "duplicate selects copied state");
model.deleteState(selected, true);
assert.equal(model.labStateRows().length, 4, "delete state removes selected state");

const first = model.labStateRows()[0];
model.selectState(first.id);
model.setLabFormationOverride(first.id, { enabled: true, shape: "wedge", spacing: 80, elasticity: 4, speedMultiplier: 1.25 });
assert.deepEqual(model.selectedStateView()?.formation, { enabled: true, shape: "wedge", spacing: 80, elasticity: 4, speedMultiplier: 1.25 }, "formation override toggle data is state-owned UI model data");
model.setLabTrigger(first.id, "hit");
assert.equal(model.selectedStateView()?.triggerType, "hit", "Hit trigger is exposed by UI model");
assert.equal(model.draft?.preset.graph.states[0].transitions[0]?.targetStateId, model.draft?.preset.graph.states[1].id, "trigger-to-next semantics are enforced");

while ((model.draft?.preset.graph.states.length ?? 0) > 1) model.deleteState(String(model.draft?.preset.graph.states.at(-1)?.id), true);
model.normalizeSequentialTriggers();
assert.equal(model.labStateRows().length, 1, "1-state FSM is valid in UI model");
assert.equal(model.hasErrors(), false, "1-state FSM has no validation errors");
assert.equal(model.selectedStateView()?.triggerType, "never", "last-state Never is valid");
assert(!model.draft?.preset.graph.states.some((s) => /enter|retreat/i.test(String(s.id)) && s.id !== model.draft?.preset.graph.initialStateId), "no enter/retreat hard requirement is introduced");

console.log("FsmLabSequentialUiModel smoke passed");
