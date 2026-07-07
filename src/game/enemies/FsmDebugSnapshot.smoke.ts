import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { asFsmStateId, createFsmRuntimeSnapshot, getFsmDebugSnapshot, resolveFsmPreset, updateResolvedFsm, type FsmPresetSchemaV1 } from "./fsm";

const dt = 0.25;
const baseMovement = { base: { type: "movementPreset" as const, params: { presetId: "none.hold" } }, modifiers: [{ type: "sineOffset" as const, params: { ampX: 3, ampY: 4, freqHz: 1 } }] };
const disabled = { mode: "disabled" as const };
const forward = { type: "forward" as const };

function state(id: string, label: string, transitions: any[] = []) {
  return { id: asFsmStateId(id), label, movement: baseMovement, targeting: forward, combat: disabled, lifecycle: { enterActions: [] }, transitions };
}

const preset: FsmPresetSchemaV1 = {
  schemaVersion: 1,
  metadata: { id: "test.debug", name: "debug", source: "builtin", schemaVersion: 1 },
  graph: {
    initialStateId: asFsmStateId("idle"),
    states: [
      state("idle", "Idle Label", [{ condition: { type: "timeInState", params: { seconds: dt } }, targetStateId: asFsmStateId("attack") }]),
      state("attack", "Attack Label", [{ condition: { type: "timeInState", params: { seconds: dt } }, targetStateId: asFsmStateId("attack") }]),
    ],
  },
};

const ent = { kind: "enemy", pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: {} } as any;
ent.fsm = createFsmRuntimeSnapshot(resolveFsmPreset(preset), {}, ent);
const initialRuntimeJson = JSON.stringify(ent.fsm);
const initial = getFsmDebugSnapshot(ent);
assert(initial, "FSM entity returns a debug snapshot");
assert.equal(initial.stateId, "idle", "initial state ID is exposed");
assert.equal(initial.stateLabel, "Idle Label", "initial state label is exposed");
assert.equal(initial.stateIndex, 0, "initial state index is exposed");
assert.equal(initial.stateAge, 0, "initial age is exposed");
assert.equal(initial.entryCount, 1, "initial entry count is exposed");
assert.equal(initial.movementPresetId, "none.hold", "movement base preset is exposed");
assert.deepEqual(initial.modifierTypes, ["sineOffset"], "modifier types are exposed");
assert.equal(JSON.stringify(ent.fsm), initialRuntimeJson, "helper does not mutate runtime");

updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt });
assert.equal(getFsmDebugSnapshot(ent)?.stateAge, dt, "age updates after a no-transition tick");
const beforeTransitionEntries = ent.fsm.entryCount;
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt });
const transitioned = getFsmDebugSnapshot(ent)!;
assert.equal(transitioned.stateId, "attack", "transitioned state ID is exposed");
assert.equal(transitioned.stateLabel, "Attack Label", "transitioned state label is exposed");
assert.equal(transitioned.stateIndex, 1, "transitioned state index is exposed");
assert.equal(transitioned.stateAge, dt, "transitioned state age is exposed");
assert.equal(transitioned.entryCount, beforeTransitionEntries + 1, "transition increments entry count");

const beforeSelfEntries = ent.fsm.entryCount;
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt });
const self = getFsmDebugSnapshot(ent)!;
assert.equal(self.stateId, "attack", "self-transition stays on target state");
assert.equal(self.entryCount, beforeSelfEntries + 1, "self-transition increments entry count");
assert.equal(self.stateAge, dt, "self-transition resets age and then advances by dt");

assert.equal(getFsmDebugSnapshot({ kind: "enemy" }), null, "non-FSM entity returns null");
const helperSource = readFileSync("src/game/enemies/fsm/FsmDebugSnapshot.ts", "utf8");
assert(!helperSource.includes("fsm.current"), "debug helper does not use legacy fsm.current");
const uiSource = readFileSync("src/dev/DevSummoner.ts", "utf8");
assert(uiSource.includes("getFsmDebugSnapshot"), "DevSummoner UI adapter uses the resolved debug helper");
assert(!uiSource.includes("fsm?.current"), "DevSummoner does not read legacy fsm.current");

console.log("FsmDebugSnapshot smoke passed");
