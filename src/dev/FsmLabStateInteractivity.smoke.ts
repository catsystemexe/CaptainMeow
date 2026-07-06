import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { asFsmStateId, FSM_SCHEMA_VERSION, type FsmPresetSchemaV1 } from "../game/enemies/fsm/schema";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm/UserFsmPresetStore";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }

const preset: FsmPresetSchemaV1 = {
  schemaVersion: FSM_SCHEMA_VERSION,
  metadata: { id: "user.u142", name: "U1.4.2 smoke", source: "user", schemaVersion: FSM_SCHEMA_VERSION },
  basicSetup: { appearanceId: "grunt", count: 3, formationId: "line.horizontal", spacing: 64, elasticity: 0, baseSpeed: 1, spawnY: 250 },
  graph: {
    initialStateId: asFsmStateId("A"),
    states: [
      { id: asFsmStateId("A"), label: "A", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "timeInState", params: { seconds: 1 } }, targetStateId: asFsmStateId("B") }] },
      { id: asFsmStateId("B"), label: "B", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "screenXBelow", params: { x: 650 } }, targetStateId: asFsmStateId("C") }] },
      { id: asFsmStateId("C"), label: "C", movement: { base: { type: "movementPreset", params: { presetId: "sine.soft" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [] },
    ],
  },
};

const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage() });
assert.equal(store.upsert(preset).ok, true);
const model = new FsmPresetAuthoringModel(store, "user.u142");

model.selectState("B");
let expandedStateId: string | null = "B";
model.reorderState("B", 0);
model.normalizeSequentialTriggers();
assert.deepEqual(model.labStateRows().map((row) => `${row.number}:${row.id}`), ["1:B", "2:A", "3:C"], "Move Up changes order and numbering");
assert.equal(model.draft?.selectedStateId, "B", "selection identity remains after Move Up");
assert.equal(expandedStateId, "B", "expanded identity remains after Move Up");
assert.equal(model.draft?.dirty, true, "Move Up marks draft dirty");
model.draft!.dirty = false;
model.reorderState("B", -1);
assert.equal(model.draft?.dirty, false, "first-row Move Up is a disabled/no-op boundary");
model.selectState("C");
expandedStateId = "C";
model.reorderState("C", 1);
model.normalizeSequentialTriggers();
assert.deepEqual(model.labStateRows().map((row) => `${row.number}:${row.id}`), ["1:B", "2:C", "3:A"], "Move Down changes order and numbering");
model.draft!.dirty = false;
model.reorderState("A", 99);
assert.equal(model.draft?.dirty, false, "last-row Move Down is a disabled/no-op boundary");

expandedStateId = null;
expandedStateId = expandedStateId === "B" ? null : "B";
assert.equal(expandedStateId, "B", "click collapsed row expands it");
expandedStateId = expandedStateId === "B" ? null : "B";
assert.equal(expandedStateId, null, "click same expanded row collapses it");
expandedStateId = expandedStateId === "C" ? null : "C";
assert.equal(expandedStateId, "C", "click another row leaves one expanded editor identity");

model.selectState("C");
model.setMovementPreset("C", "zigzag.sharp");
assert.equal(model.selectedStateView()?.behaviorPresetId, "zigzag.sharp", "Behavior dropdown writes selected state movement preset");
assert.equal(model.labStateRows().find((row) => row.id === "C")?.behaviorPresetId, "zigzag.sharp", "row label source updates after behavior change");
assert.equal(model.draft?.dirty, true, "behavior change marks dirty");

model.setLabFormationOverrideEnabled("C", true);
assert.equal(model.selectedStateView()?.formation.enabled, true, "formation override ON creates enabled override data");
model.setLabFormationField("C", "shape", "wedge");
model.setLabFormationField("C", "spacing", 96);
model.setLabFormationField("C", "elasticity", 4);
model.setLabFormationField("C", "speedMultiplier", 1.5);
assert.deepEqual(model.selectedStateView()?.formation, { enabled: true, shape: "wedge", spacing: 96, elasticity: 4, speedMultiplier: 1.5 }, "formation controls write draft values");
model.setLabFormationOverrideEnabled("C", false);
assert.equal((model.draft?.preset.graph.states.find((state) => state.id === "C") as any)?.formationOverride, undefined, "formation override OFF removes state override");
assert.equal(model.selectedStateView()?.formation.shape, "line.horizontal", "formation OFF returns to Basic Setup effective values");

model.selectState("B");
model.setLabTrigger("B", "time", { seconds: 2.5 });
assert.equal(model.selectedStateView()?.triggerType, "time", "trigger type Never/other -> Time writes draft transition");
assert.equal(model.selectedStateView()?.triggerParams.seconds, 2.5, "time trigger value writes payload");
assert.equal(model.draft?.preset.graph.states[0]?.transitions[0]?.targetStateId, "C", "trigger target remains next state");
model.setLabTrigger("B", "screenXBelow", { x: 512 });
assert.equal(model.selectedStateView()?.triggerType, "screenXBelow", "trigger type updates to screenXBelow");
assert.equal(model.selectedStateView()?.triggerParams.x, 512, "screenXBelow threshold persists in draft");
assert.equal(model.draft?.preset.graph.states[0]?.transitions[0]?.targetStateId, "C", "screenXBelow target remains next state");

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
assert(source.includes("let expandedStateId: string | null"), "DevSummoner uses explicit expandedStateId accordion state");
assert(source.includes("expandedStateId = expandedStateId === row.id ? null : row.id"), "row click toggles expand/collapse");
assert(source.includes("if (row.id === expandedStateId) stateList.appendChild(editorSection)"), "only expanded row renders the inline editor");
assert(source.includes("editorSection.addEventListener(\"click\", (ev) => ev.stopPropagation())"), "inner editor clicks stop propagation");
assert(source.includes("ev.stopPropagation(); const states") && source.includes("authoringModel.selectState(row.id); expandedStateId = row.id;"), "Move arrows stop row bubbling and preserve expanded selected state");
assert(source.includes("setLabFormationOverrideEnabled"), "formation override checkbox calls model toggle method");
assert(source.includes("cursor:default"), "drag handle is decorative rather than a fake active drag affordance");

console.log("FsmLabStateInteractivity smoke passed");
