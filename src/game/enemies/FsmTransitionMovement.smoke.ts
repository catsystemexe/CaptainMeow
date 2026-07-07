import assert from "node:assert/strict";
import { CONTENT } from "../content/CONTENT";
import { enterResolvedFsmState } from "./fsm";
import { createFsmRuntimeSnapshot, executeFsmMovement, getFsmDebugSnapshot, updateResolvedFsm } from "./fsm";

const dt = 1 / 60;
const ctx = { scrollX: 0, logicW: 800, logicH: 600, playerPos: { x: 120, y: 300 }, dt };

function preset(id: string) {
  const p = CONTENT.builtinFsmPresets.get(id);
  assert(p, `${id} resolves from canonical builtin FSM presets`);
  return p;
}

function makeEnt(presetId: string, x = 400, y = 240) {
  const ent: any = { kind: "enemy", typeId: presetId, pos: { x, y }, vel: { x: 0, y: 0 }, radius: 8, hp: { value: 10, max: 10 }, bState: { t: 0 } };
  ent.fsm = createFsmRuntimeSnapshot(preset(presetId), {}, ent);
  return ent;
}

function step(ent: any) {
  const result = updateResolvedFsm(ent, ent.fsm, { scrollX: ctx.scrollX, logicW: ctx.logicW, dt });
  const movementAtExecution = ent.fsm.movement;
  const before = { x: ent.pos.x, y: ent.pos.y };
  const target = executeFsmMovement(movementAtExecution, ent, ctx)!;
  ent.vel.x = (target.x - before.x) / dt;
  ent.vel.y = (target.y - before.y) / dt;
  ent.pos.x += ent.vel.x * dt;
  ent.pos.y += ent.vel.y * dt;
  return { result, movementAtExecution, before, target, after: { x: ent.pos.x, y: ent.pos.y }, vel: { x: ent.vel.x, y: ent.vel.y } };
}

function forceState(ent: any, label: string) {
  const index = ent.fsm.preset.states.findIndex((s: any) => s.label === label || s.id === label);
  assert(index >= 0, `${ent.fsm.preset.id} has state ${label}`);
  enterResolvedFsmState(ent, ent.fsm, index);
}

{
  const ent = makeEnt("fsm.smart_orbit_half");
  forceState(ent, "orbit");
  ent.fsm.age = 1.6;
  const orbitRuntime = ent.fsm.movement;
  const orbitState = orbitRuntime.base.state;
  assert.equal(orbitRuntime.base.presetId, "smart.orbit.half", "orbit uses the orbit movement runtime");
  const beforePos = { ...ent.pos };
  const tick = step(ent);
  assert.equal(tick.result.switched, true, "orbit tick transitions to retreat");
  assert.equal(ent.fsm.stateIndex, 2, "transition changes stateIndex");
  assert.notEqual(ent.fsm.movement, orbitRuntime, "movement runtime object identity changes on formal entry");
  assert.notEqual(ent.fsm.movement.base.state, orbitState, "orbit behavior-local state is not reused");
  assert.equal(ent.fsm.movement.base.presetId, "straight.charge", "active base preset becomes straight.charge");
  assert.equal(tick.movementAtExecution, ent.fsm.movement, "same-tick movement execution uses the freshly assigned runtime");
  assert(tick.target.x < beforePos.x, "first retreat tick produces leftward straight.charge-compatible target X");
  assert.equal(tick.target.y, beforePos.y, "first retreat tick is straight horizontal charge, not orbit Y motion");
  assert.deepEqual(tick.after, tick.target, "position integrates exactly once to the movement target");
  assert.equal(ent.fsm.age, dt, "state-age semantics reset then advance once");
  const snapshot = getFsmDebugSnapshot(ent)!;
  assert.equal(snapshot.stateIndex, ent.fsm.stateIndex, "debug snapshot identifies the same active state");
  assert.equal(snapshot.movementPresetId, ent.fsm.movement.base.presetId, "debug snapshot identifies the same movement runtime");
  const later = step(ent);
  assert(later.target.x < tick.after.x, "later retreat ticks continue charge movement");
  assert.equal(later.target.y, tick.after.y, "later retreat ticks do not continue the orbit trajectory");
}

for (const id of ["fsm.smart_orbit_repeat", "fsm.smart_aligner", "fsm.hover", "fsm.zigzag"] as const) {
  const ent = makeEnt(id);
  const states = ent.fsm.preset.states;
  for (let i = 0; i < states.length; i += 1) {
    const source = states[i];
    const sourcePreset = source.movement.base.params.presetId;
    for (const transition of source.transitions) {
      if (transition.condition?.type !== "timeInState") continue;
      const target = states[transition.targetStateIndex];
      const targetPreset = target.movement.base.params.presetId;
      if (sourcePreset === targetPreset) continue;
      enterResolvedFsmState(ent, ent.fsm, i);
      ent.fsm.age = Number(transition.condition?.params?.seconds ?? 0);
      const sourceRuntime = ent.fsm.movement;
      const sourceState = sourceRuntime.base.state;
      const tick = step(ent);
      assert.equal(tick.result.switched, true, `${id}.${source.label} transitions`);
      assert.equal(ent.fsm.stateIndex, transition.targetStateIndex, `${id}.${source.label} activates target state`);
      assert.notEqual(ent.fsm.movement, sourceRuntime, `${id}.${source.label} replaces runtime`);
      assert.notEqual(ent.fsm.movement.base.state, sourceState, `${id}.${source.label} does not reuse source movement state`);
      assert.equal(ent.fsm.movement.base.presetId, targetPreset, `${id}.${target.label} target runtime uses canonical target preset`);
      assert.equal(tick.movementAtExecution, ent.fsm.movement, `${id}.${target.label} executes fresh target runtime in same tick`);
      break;
    }
  }
}

console.log("FsmTransitionMovement smoke passed");
