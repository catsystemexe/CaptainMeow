import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { asFsmStateId, createFsmRuntimeSnapshot, updateResolvedFsm, resolveFsmPreset, type FsmPresetSchemaV1 } from "../game/enemies/fsm";
import { createLiveFsmInspection, endFsmInspection } from "./DevSummoner";

const movement = { base: { type: "movementPreset" as const, params: { presetId: "none.hold" } }, modifiers: [] };
const preset: FsmPresetSchemaV1 = {
  schemaVersion: 1,
  metadata: { id: "retention.test", name: "retention", source: "builtin", schemaVersion: 1 },
  graph: {
    initialStateId: asFsmStateId("live"),
    states: [
      { id: asFsmStateId("live"), label: "Live", movement, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0.25 } }, targetStateId: asFsmStateId("final") }] },
      { id: asFsmStateId("final"), label: "Final", movement, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] },
    ],
  },
};

function enemy(typeId: string, x = 100) {
  const ent: any = { kind: "enemy", typeId, pos: { x, y: 50 }, vel: { x: 0, y: 0 }, hp: { value: 3, max: 5 }, bState: {} };
  ent.fsm = createFsmRuntimeSnapshot(resolveFsmPreset(preset), {}, ent);
  return ent;
}

let ent: any = enemy("fsm-retain-a");
let retained = createLiveFsmInspection(ent, 10);
assert(retained, "live FSM spawn populates retained inspection");
assert.equal(retained.status, "live", "live inspection is marked live");
assert.equal(retained.runtime.stateLabel, "Live", "live state label is retained");
assert.equal(retained.runtime.stateIndex, 0, "live state index is retained");
assert.equal((retained as any).entity, undefined, "retained inspection does not expose a mutable entity reference");

updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt: 0.25 });
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt: 0.25 });
retained = createLiveFsmInspection(ent, 10);
assert.equal(retained?.runtime.stateLabel, "Final", "transition refresh updates the state");
assert.equal(retained?.runtime.stateIndex, 1, "transition refresh updates the index");
assert.equal(retained?.runtime.stateAge, 0.25, "transition refresh retains age");
assert.equal(retained?.runtime.entryCount, 2, "transition refresh retains entry count");

const ended = endFsmInspection(retained, "removed");
assert.equal(ended?.status, "ended", "Cleanup/entity disappearance marks retained inspection ended");
assert.equal(ended?.endReason, "removed", "ended inspection records removal reason");
assert.equal(ended?.runtime.stateLabel, "Final", "ended inspection keeps final label");
assert.equal(ended?.runtime.stateIndex, 1, "ended inspection keeps final index");
assert.equal(ended?.runtime.stateAge, 0.25, "ended inspection keeps final age");
assert.equal(ended?.runtime.entryCount, 2, "ended inspection keeps final entry count");
ent.fsm.stateIndex = 0;
assert.equal(ended?.runtime.stateLabel, "Final", "ended inspection is immutable and detached from later entity mutation");

ent = enemy("fsm-retain-b", 200);
const replacement = createLiveFsmInspection(ent, 0);
assert.equal(replacement?.status, "live", "next FSM spawn replaces ended inspection with live data");
assert.equal(replacement?.typeId, "fsm-retain-b", "next FSM spawn replacement has new identity data");

assert.equal(createLiveFsmInspection({ kind: "enemy", typeId: "plain" }), null, "explicit non-FSM selection clears/replaces rather than presenting stale data as live");
const uiSource = readFileSync("src/dev/DevSummoner.ts", "utf8");
assert(uiSource.includes("refreshEnemyLab"), "existing refresh path is used");
assert(!uiSource.includes("localStorage"), "no persistence was added");

console.log("DevSummonerFsmRetention smoke passed");
