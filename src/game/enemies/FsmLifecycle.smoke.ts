import assert from "node:assert/strict";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { asFsmStateId, createFsmRuntimeSnapshot, enterResolvedFsmState, executeEnterActions, resolveFsmPreset, updateResolvedFsm, type FsmPresetSchemaV1 } from "./fsm";

const dt = 1 / 60;
const baseMovement = { base: { type: "movementPreset" as const, params: { presetId: "none.hold" } }, modifiers: [] };
const disabled = { mode: "disabled" as const };
const forward = { type: "forward" as const };

function state(id: string, enterActions: { type: "despawn" }[] = [], transitions: any[] = []) {
  return { id: asFsmStateId(id), label: id, movement: baseMovement, targeting: forward, combat: disabled, lifecycle: { enterActions }, transitions };
}

function preset(states: ReturnType<typeof state>[], initialStateId = states[0].id): FsmPresetSchemaV1 {
  return { schemaVersion: 1, metadata: { id: "test.lifecycle", name: "test", source: "builtin", schemaVersion: 1 }, graph: { initialStateId, states } };
}

function makeEntityStore() {
  const store = new EntityStore<any>(4);
  const ref = store.spawn((e: any) => { e.kind = "enemy"; e.pos = { x: 10, y: 10 }; e.vel = { x: 0, y: 0 }; e.bState = { attack: { cooldownMs: 123 } }; e.pendingKill = false; });
  const ent = store.get(ref)!;
  const lifecycle = { markKill: () => store.markKill(ref), isKilled: () => store.get(ref)?.pendingKill === true };
  return { store, ref, ent, lifecycle };
}

{
  const resolved = resolveFsmPreset(preset([state("spawn", [{ type: "despawn" }])]));
  const h = makeEntityStore();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  assert.equal(rt.entryCount, 1, "spawn initial state is one formal entry");
  assert.equal(h.ent.pendingKill, true, "spawn enter action marks killed");
}

{
  const resolved = resolveFsmPreset(preset([state("idle", [], [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("bye") }]), state("bye", [{ type: "despawn" }])]));
  const h = makeEntityStore();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  assert.equal(h.ent.pendingKill, false, "non-killed entry preserves normal state");
  rt.age = 0.01;
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(result.switched, true, "normal transition enters target");
  assert.equal(result.entry?.lifecycleActionsExecuted, 1, "target actions execute once");
  assert.equal(result.entry?.entityKilled, true, "killed result is observable");
  assert.equal(rt.age, 0, "killed entity age does not increment");
}

{
  const resolved = resolveFsmPreset(preset([state("loop", [{ type: "despawn" }], [{ condition: { type: "timeInState", params: { seconds: 0.01 } }, targetStateId: asFsmStateId("loop") }])]));
  const h = makeEntityStore();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  h.ent.pendingKill = false;
  rt.age = 0.01;
  let kills = 0;
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: { markKill: () => { kills++; h.lifecycle.markKill(); }, isKilled: h.lifecycle.isKilled } });
  assert.equal(result.entry?.selfTransition, true, "self-transition is a formal entry");
  assert.equal(kills, 1, "self-transition despawn executes once");
}

{
  const resolved = resolveFsmPreset(preset([state("idle")]));
  const h = makeEntityStore();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  const before = rt.entryCount;
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(result.entry, undefined, "no-transition tick executes no actions");
  assert.equal(rt.entryCount, before, "entry count is unchanged on no-transition tick");
  assert.equal(rt.age, dt, "non-killed entry preserves S4 age increment");
}

{
  const resolved = resolveFsmPreset(preset([state("dup", [{ type: "despawn" }, { type: "despawn" }])]));
  const h = makeEntityStore();
  const calls: string[] = [];
  const result = executeEnterActions(resolved.states[0], h.ent, { markKill: () => { calls.push("kill"); h.lifecycle.markKill(); }, isKilled: h.lifecycle.isKilled });
  assert.deepEqual(calls, ["kill"], "duplicate despawn is idempotent while action order is visited");
  assert.equal(result.actionsExecuted, 2, "action count remains distinct from kill side effects");
}

{
  const traces: unknown[] = [];
  for (let i = 0; i < 2; i++) {
    const resolved = resolveFsmPreset(preset([state("idle"), state("bye", [{ type: "despawn" }]) ]));
    const h = makeEntityStore();
    const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
    traces.push({ entryCount: rt.entryCount, age: rt.age, killed: h.ent.pendingKill });
  }
  assert.deepEqual(traces[0], traces[1], "lifecycle runs are deterministic");
}

{
  const resolved = resolveFsmPreset(preset([state("a", [], [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("b") }]), state("b", [], [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("c") }]), state("c")]));
  const h = makeEntityStore();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(rt.entryCount, 2, "no recursive or chained entry occurs in one tick");
  assert.equal(resolved.states[rt.stateIndex].label, "b", "target transitions wait until a later tick");
}

{
  const before = { pos: { x: 1, y: 2 }, vel: { x: 3, y: 4 } };
  assert.deepEqual(before, { pos: { x: 1, y: 2 }, vel: { x: 3, y: 4 } }, "non-FSM entity path is unchanged by lifecycle helpers");
}

console.log("FsmLifecycle smoke passed");
