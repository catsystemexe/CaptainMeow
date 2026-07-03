import assert from "node:assert/strict";
import { EnemyBehaviorDB } from "./EnemyBehaviorDB";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";
import { buildBuiltinFsmPresetRegistry, createFsmRuntimeSnapshot, getLegacyMovementPresetId, updateResolvedFsm, type BehaviorGraph } from "./fsm";

/*
S4 expected behavior matrix:
| Case | Expected entry? | Movement reset? | Combat reset? | Age after tick |
| Spawn initial state | yes | yes | according to mode | dt |
| Transition A → B | yes | yes | according to target mode/policy | dt |
| Self-transition A → A | yes | yes | reset | dt |
| Same profile + default policy | yes | yes | reset | dt |
| Same profile + preserveIfSameProfile | yes | yes | preserve | dt |
| profile → disabled | yes | yes | clear | dt |
| disabled → profile | yes | yes | reset | dt |
| inherit → profile | yes | yes | reset | dt |
| profile → inherit | yes | yes | reset inherited runtime | dt |
| No transition | no | no | no | previous age + dt |
*/

const dt = 0.25;
const knownMovementPresetIds = new Set(Object.keys(EnemyBehaviorPresets));
const knownAttackProfileIds = new Set(["single_basic"]);

function preset(id: string, graph: BehaviorGraph) {
  return buildBuiltinFsmPresetRegistry({ [id]: graph }, { knownMovementPresetIds, knownAttackProfileIds }, { errorPolicy: "throw" }).get(id)!;
}

function makeEnt() {
  return { pos: { x: 0, y: 0 }, vel: { x: 1, y: 1 }, hp: 10, maxHp: 10, bState: { t: 99, attack: { cooldownMs: 12, windupMs: 3, firing: true } }, fsmAppliedMovementPresetId: "stale" } as any;
}

let applyCount = 0;
function applyStateBehavior(e: any, movementPresetId?: string): void {
  if (!movementPresetId) return;
  if (e.fsmAppliedMovementPresetId === movementPresetId) return;
  applyCount += 1;
  const presetDef = EnemyBehaviorPresets[movementPresetId] ?? EnemyBehaviorPresets["none.hold"];
  const behavior = EnemyBehaviorDB[presetDef.behaviorId] ?? EnemyBehaviorDB.none;
  const attack = e.bState?.attack;
  e.behaviorId = presetDef.behaviorId;
  e.behavior = presetDef.params ?? {};
  e.bState = { t: 0 };
  if (attack) e.bState.attack = attack;
  if (presetDef.behaviorId === "none" && e.vel) { e.vel.x = 0; e.vel.y = 0; }
  e.fsmAppliedMovementPresetId = movementPresetId;
  behavior?.init?.(e);
}

function step(ent: any): ReturnType<typeof updateResolvedFsm> {
  const result = updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt, inheritedAttackProfileId: "single_basic" });
  applyStateBehavior(ent, getLegacyMovementPresetId(result.state));
  return result;
}

const timingGraph: BehaviorGraph = {
  initial: "wait",
  states: {
    wait: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 1.0 }, goto: "go" }] },
    go: { movementPresetId: "straight.basic" },
  },
};
const ent = makeEnt();
ent.fsm = createFsmRuntimeSnapshot(preset("timing", timingGraph), {}, ent, { inheritedAttackProfileId: "single_basic" });
assert.equal(ent.fsm.entryCount, 1, "spawn is exactly one formal entry");
assert.equal(ent.fsm.age, 0, "initial state age is 0 before first execution");
assert.equal(ent.fsmAppliedMovementPresetId, undefined, "spawn entry resets movement compatibility state");
step(ent);
assert.equal(ent.fsm.age, dt, "initial state age is dt after first execution");
assert.equal(applyCount, 1, "spawn applies initial movement once through bridge");
for (let i = 0; i < 3; i++) step(ent);
assert.equal(ent.fsm.age, 1.0, "after four execution ticks age reaches 1.0");
assert.equal(applyCount, 1, "no-transition ticks do not repeatedly reset movement");
const transition = step(ent);
assert.equal(transition.current, "go", "transition target executes in transition tick");
assert.equal(ent.fsm.age, dt, "target age ends as dt");
assert.equal(applyCount, 2, "transition applies target movement as fresh entry");

const priorityGraph: BehaviorGraph = { initial: "a", states: { a: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }, { when: { kind: "timeInState", seconds: 0 }, goto: "c" }] }, b: { movementPresetId: "straight.basic", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "c" }] }, c: { movementPresetId: "straight.charge" } } };
const pEnt = makeEnt();
pEnt.fsm = createFsmRuntimeSnapshot(preset("priority", priorityGraph), {}, pEnt);
const first = step(pEnt);
assert.equal(first.current, "b", "first-match priority remains");
assert.equal(pEnt.fsm.age, dt, "immediate transition target age ends as dt");
assert.equal(pEnt.fsm.entryCount, 2, "at most one transition occurs per tick and no chained second transition runs");

const selfGraph: BehaviorGraph = { initial: "loop", states: { loop: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: dt }, goto: "loop" }] } } };
applyCount = 0;
const sEnt = makeEnt();
sEnt.fsm = createFsmRuntimeSnapshot(preset("self", selfGraph), {}, sEnt);
applyStateBehavior(sEnt, getLegacyMovementPresetId(sEnt.fsm.preset.states[sEnt.fsm.stateIndex]));
assert.equal(applyCount, 1);
step(sEnt);
const self = step(sEnt);
assert.equal(self.entry?.selfTransition, true, "self-transition is explicit");
assert.equal(sEnt.fsm.entryCount, 2, "self-transition performs one entry");
assert.equal(sEnt.fsm.age, dt, "self-transition resets age then increments once");
assert.equal(applyCount, 2, "self-transition resets movement compatibility state and reapplies same preset");

const sameMoveGraph: BehaviorGraph = { initial: "a", states: { a: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold" } } };
applyCount = 0;
const mEnt = makeEnt();
mEnt.fsm = createFsmRuntimeSnapshot(preset("same-move", sameMoveGraph), {}, mEnt);
step(mEnt);
assert.equal(applyCount, 1, "same movement preset across states is reapplied after entry reset");

const nonFsm = makeEnt();
const before = JSON.stringify(nonFsm);
applyStateBehavior(nonFsm, undefined);
assert.equal(JSON.stringify(nonFsm), before, "non-FSM entities remain unchanged by FSM movement bridge test seam");
assert(!("enterActionsExecuted" in ent), "user-facing enterActions are not executed");

console.log("FsmStateEntry smoke passed");
