import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { asFsmStateId, FSM_SCHEMA_VERSION, type FsmPresetSchemaV1 } from "../game/enemies/fsm/schema";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm/UserFsmPresetStore";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }

const idsFor = (id: string) => CONTENT.builtinFsmPresets.get(id)!.definition.graph.states.map((s) => String(s.id));
const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage() });
const userPreset: FsmPresetSchemaV1 = {
  schemaVersion: FSM_SCHEMA_VERSION,
  metadata: { id: "user.binding", name: "Binding", source: "user", schemaVersion: FSM_SCHEMA_VERSION },
  graph: { initialStateId: asFsmStateId("customA"), states: [
    { id: asFsmStateId("customA"), label: "Custom A", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "timeInState", params: { seconds: 2 } }, targetStateId: asFsmStateId("customB") }] },
    { id: asFsmStateId("customB"), label: "Custom B", movement: { base: { type: "movementPreset", params: { presetId: "straight.charge" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [] },
  ] },
};
assert.equal(store.upsert(userPreset).ok, true);

const model = new FsmPresetAuthoringModel(store, "fsm.charge");
assert.deepEqual(model.labStateRows().map((row) => row.id), idsFor("fsm.charge"), "Charge preset rows come from the Charge graph");
const chargeOnly = model.labStateRows().map((row) => row.id).find((id) => !idsFor("fsm.hover").includes(id));
model.selectState(chargeOnly ?? model.labStateRows()[0]!.id);
model.load("fsm.hover");
assert.deepEqual(model.labStateRows().map((row) => row.id), idsFor("fsm.hover"), "Hover preset rows replace Charge rows");
assert(!model.labStateRows().some((row) => row.id === chargeOnly), "stale Charge-only row is absent after selecting Hover");
assert.equal(model.draft?.selectedStateId, idsFor("fsm.hover")[0], "selection reconciles to first Hover state when previous state is absent");
model.load("user.binding");
assert.deepEqual(model.labStateRows().map((row) => row.id), ["customA", "customB"], "user preset rows come from the user draft graph");
assert.equal(model.draft?.selectedStateId, "customA", "user preset selection reconciles to its first state");

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
assert(source.includes("stateList.appendChild(editorSection)"), "selected-state editor is mounted inline within the state list");
assert(source.indexOf("stateList.appendChild(stateRow)") < source.indexOf("stateList.appendChild(editorSection)"), "inline editor is appended immediately after a state row");
assert(!source.includes("addAuthoringSection(\"SELECTED STATE\")"), "selected-state editor is no longer an always-detached authoring section");
assert(source.includes("authoringSections.appendChild(runtimeDiagnosticsSection)"), "Runtime Diagnostics panel is mounted once in the normal FSM layout");
assert(!source.includes("textContent: \"FSM Presets\""), "legacy FSM Presets panel heading is not mounted");
assert(source.includes("const runtimeDiagnosticsSection = document.createElement"), "runtime diagnostics infrastructure remains defined");

console.log("FsmLabPresetBindingAndInlineEditor smoke passed");
