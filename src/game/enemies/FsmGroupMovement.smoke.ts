import { strict as assert } from "node:assert";
import { createFsmRuntimeSnapshot, executeFsmMovement, getFsmMovementCullReferenceX, isFsmIndividualMovementSuppressed, updateResolvedFsm } from "./fsm";
import { resolveFsmPreset } from "./fsm/resolve";
import type { FsmPresetSchemaV1, FsmStateDefinition } from "./fsm/schema";

const state = (id: string, presetId: string, transitions: FsmStateDefinition["transitions"] = [], modifiers: FsmStateDefinition["movement"]["modifiers"] = []): FsmStateDefinition => ({
  id: id as any,
  label: id,
  movement: { base: { type: "movementPreset", params: { presetId } }, modifiers },
  targeting: { type: "forward" },
  combat: { mode: "profile", profileId: "single_basic" },
  lifecycle: { enterActions: [] },
  transitions,
});
const preset = (states: FsmStateDefinition[]): FsmPresetSchemaV1 => ({ schemaVersion: 1, metadata: { id: "group", name: "group", source: "builtin", schemaVersion: 1 }, graph: { initialStateId: states[0].id, states } });
const tickCtx = { scrollX: 0, logicW: 320, dt: 0.25, inheritedAttackProfileId: null };

{
  const resolved = resolveFsmPreset(preset([state("a", "straight.basic", [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: "b" as any }], [{ type: "sineOffset", params: { ampX: 0, ampY: 10, freqHz: 1 } }]), state("b", "none.hold")]));
  const ent: any = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 }, group: { groupId: 1, slotIndex: 0 } };
  const rt = createFsmRuntimeSnapshot(resolved, {}, ent);
  const baseState = rt.movement.base.state;
  assert.equal(isFsmIndividualMovementSuppressed(ent, (id) => Number(id) === 1), true, "group-controlled detection uses runtime membership");
  if (isFsmIndividualMovementSuppressed(ent, (id) => Number(id) === 1)) rt.movement.movementSuspended = true;
  assert.equal(rt.movement.base.state, baseState, "group-controlled enemy skips base movement update");
  assert.equal(rt.movement.modifiers[0].state.phase, 0, "group-controlled enemy skips modifier update");
  const result = updateResolvedFsm(ent, rt, tickCtx);
  assert.equal(result.switched, true, "FSM transitions continue while movement is suppressed");
  assert.equal(rt.age, 0.25, "FSM state age continues while movement is suppressed");
  assert.equal(rt.activeCombat.profileId, "single_basic", "combat selection continues while movement is suppressed");
  assert.equal(rt.movement.base.presetId, "none.hold", "formal entry still creates movement runtime while grouped");
}

{
  const resolved = resolveFsmPreset(preset([state("a", "straight.basic", [], [{ type: "sineOffset", params: { ampX: 0, ampY: 10, freqHz: 1 } }])]));
  const ent: any = { pos: { x: 100, y: 50 }, vel: { x: 123, y: 456 }, bState: { t: 0 }, group: { groupId: 1, slotIndex: 0 } };
  const rt = createFsmRuntimeSnapshot(resolved, {}, ent);
  rt.movement.movementSuspended = true;
  const phase = rt.movement.modifiers[0].state.phase;
  assert.equal(ent.vel.x, 123, "no individual movement target leaks into group-controlled velocity");
  assert.equal(rt.movement.modifiers[0].state.phase, phase, "movement runtime is paused while grouped");
  delete ent.group;
  rt.movement.movementSuspended = false;
  const target = executeFsmMovement(rt.movement, ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 })!;
  assert.equal(target.x, 60, "leaving group control resumes individual movement from paused runtime");
  assert.notEqual(rt.movement.modifiers[0].state.phase, phase, "modifier runtime advances after resume");
}

{
  const ent: any = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 } };
  let rt = createFsmRuntimeSnapshot(resolveFsmPreset(preset([state("a", "straight.basic")])), {}, ent);
  executeFsmMovement(rt.movement, ent, { dt: 1, playerPos: null, logicW: 320, logicH: 180 });
  assert.equal(getFsmMovementCullReferenceX(rt.movement, ent), 100, "entity-position cull reference uses current entity X");
  rt = createFsmRuntimeSnapshot(resolveFsmPreset(preset([state("a", "sine.soft")])), {}, ent);
  executeFsmMovement(rt.movement, ent, { dt: 1, playerPos: null, logicW: 320, logicH: 180 });
  assert.notEqual(getFsmMovementCullReferenceX(rt.movement, ent), ent.pos.x, "module-anchor cull reference uses base module anchor");
}

{
  const resolved = resolveFsmPreset(preset([state("a", "straight.basic", [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: "b" as any }]), state("b", "sine.soft")]));
  const ent: any = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 } };
  const rt = createFsmRuntimeSnapshot(resolved, {}, ent);
  assert.equal(rt.movement.cullReference, undefined);
  assert.equal(rt.movement.base.cullReference, "entityPosition");
  updateResolvedFsm(ent, rt, tickCtx);
  assert.equal(rt.movement.base.cullReference, "moduleAnchor", "state transition updates active cull reference");
}

console.log("FsmGroupMovement smoke passed");
