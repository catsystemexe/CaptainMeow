import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../content/CONTENT";
import { asFsmStateId, createFsmRuntimeSnapshot, resolveFsmPreset, updateResolvedFsm, type FsmPresetSchemaV1 } from "./fsm";

const dt = 1 / 60;
const ids = CONTENT.builtinFsmPresets.list().map((preset) => preset.id);
assert.equal(ids.length, 10, "all 10 canonical presets load");
for (const preset of CONTENT.builtinFsmPresets.list()) {
  const ent: any = { pos: { x: 900, y: 120 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: {}, pendingKill: false };
  const lifecycle = { markKill: () => { ent.pendingKill = true; }, isKilled: () => ent.pendingKill === true };
  const rt = createFsmRuntimeSnapshot(preset, {}, ent, { lifecycle });
  const firstLabel = preset.states[preset.initialStateIndex].label;
  const result = updateResolvedFsm(ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle });
  assert.equal(result.current, firstLabel, `${preset.id} starts in its explicit initial state`);
  for (const state of preset.states) {
    assert.equal(preset.getStateIndex(state.id) !== undefined, true, `${preset.id}.${state.label} resolves by state ID`);
    assert(state.movement.base.type === "movementPreset", `${preset.id}.${state.label} uses movementPreset base`);
    if (state.label === "despawn") assert.deepEqual(state.lifecycle?.enterActions, [{ type: "despawn" }], `${preset.id}.despawn kills by explicit action`);
  }
}
const namedOnly: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id: "name.only", name: "name only", source: "builtin", schemaVersion: 1 }, graph: { initialStateId: asFsmStateId("despawn"), states: [{ id: asFsmStateId("despawn"), label: "despawn", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } } }, targeting: { type: "forward" }, combat: { mode: "disabled" }, transitions: [] }] } };
const explicit: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id: "action.only", name: "action only", source: "builtin", schemaVersion: 1 }, graph: { initialStateId: asFsmStateId("vanish"), states: [{ id: asFsmStateId("vanish"), label: "not despawn", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } } }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [{ type: "despawn" }] }, transitions: [] }] } };
let killed = false;
createFsmRuntimeSnapshot(resolveFsmPreset(namedOnly), {}, { bState: {} }, { lifecycle: { markKill: () => { killed = true; }, isKilled: () => killed } });
assert.equal(killed, false, "state named despawn without explicit action does not kill");
createFsmRuntimeSnapshot(resolveFsmPreset(explicit), {}, { bState: {} }, { lifecycle: { markKill: () => { killed = true; }, isKilled: () => killed } });
assert.equal(killed, true, "explicit despawn action kills regardless of state name");
const loadContent = readFileSync("src/game/content/loadContent.ts", "utf8");
assert(!loadContent.includes("migrateBuiltinFsmPresets") && !loadContent.includes("behaviorGraphs.json"), "no production built-in legacy migration remains");
console.log("FsmCanonicalRuntimeParity smoke passed");
