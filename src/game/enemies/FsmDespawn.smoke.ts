import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { asFsmStateId, createFsmRuntimeSnapshot, enterResolvedFsmState, executeEnterActions, resolveFsmPreset, updateResolvedFsm, type FsmPresetSchemaV1 } from "./fsm";
import { BUILTIN_FSM_PRESETS } from "../content/CONTENT";

const dt = 1 / 60;
const baseMovement = { base: { type: "movementPreset" as const, params: { presetId: "straight.basic" } }, modifiers: [] };
const disabled = { mode: "disabled" as const };
const forward = { type: "forward" as const };

function state(id: string, enterActions: { type: "despawn" }[] = [], transitions: any[] = [], combat = disabled) {
  return { id: asFsmStateId(id), label: id, movement: baseMovement, targeting: forward, combat, lifecycle: { enterActions }, transitions };
}

function preset(states: ReturnType<typeof state>[], initialStateId = states[0].id): FsmPresetSchemaV1 {
  return { schemaVersion: 1, metadata: { id: "test.despawn", name: "test", source: "builtin", schemaVersion: 1 }, graph: { initialStateId, states } };
}

function makeHarness() {
  const store = new EntityStore<any>(8);
  const ref = store.spawn((e: any) => { e.kind = "enemy"; e.typeId = "test"; e.pos = { x: 10, y: 10 }; e.vel = { x: 9, y: 0 }; e.bState = {}; e.radius = 4; e.pendingKill = false; });
  const ent = store.get(ref)!;
  const lifecycle = { markKill: () => store.markKill(ref), isKilled: () => store.get(ref)?.pendingKill === true };
  return { store, ref, ent, lifecycle };
}

{
  const h = makeHarness();
  const resolved = resolveFsmPreset(preset([state("bye", [{ type: "despawn" }])]));
  const result = executeEnterActions(resolved.states[0], h.ent, h.lifecycle);
  assert.equal(result.killed, true, "explicit despawn marks entity killed");
  assert.equal(h.store.get(h.ref), h.ent, "entity remains in store until Cleanup");
  h.store.cleanup();
  assert.equal(h.store.get(h.ref), null, "Cleanup removes despawned entity");
}

{
  const h = makeHarness();
  const resolved = resolveFsmPreset(preset([state("spawn", [{ type: "despawn" }])]));
  createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  assert.equal(h.ent.pendingKill, true, "spawn-entry despawn works");
}

{
  const h = makeHarness();
  const resolved = resolveFsmPreset(preset([state("idle", [], [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("bye") }]), state("bye", [{ type: "despawn" }])]));
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  rt.age = 0.01;
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(result.entityKilled, true, "transition-entry despawn works");
  assert.equal(h.ent.pos.x, 10, "no position integration occurs in FsmRuntime on despawn tick");
  assert.equal(rt.age, 0, "age is skipped on despawn tick");
}

{
  const h = makeHarness();
  const resolved = resolveFsmPreset(preset([state("loop", [{ type: "despawn" }], [{ condition: { type: "timeInState", params: { seconds: 0.01 } }, targetStateId: asFsmStateId("loop") }])]));
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  h.ent.pendingKill = false;
  rt.age = 0.01;
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(result.entry?.selfTransition, true, "self-transition despawn works");
  assert.equal(h.ent.pendingKill, true, "self-transition marks killed");
}

{
  const h = makeHarness();
  h.lifecycle.markKill();
  const resolved = resolveFsmPreset(preset([state("dup", [{ type: "despawn" }, { type: "despawn" }])]));
  let calls = 0;
  const result = executeEnterActions(resolved.states[0], h.ent, { markKill: () => { calls++; h.lifecycle.markKill(); }, isKilled: h.lifecycle.isKilled });
  assert.equal(calls, 0, "already-killed entity remains safe");
  assert.equal(result.actionsExecuted, 2, "duplicate despawn actions are still accounted");
}

{
  const resolved = BUILTIN_FSM_PRESETS.get("fsm.turret")!;
  const despawnIndex = resolved.getStateIndex("despawn")!;
  const h = makeHarness();
  const rt = createFsmRuntimeSnapshot(resolved, {}, h.ent, { lifecycle: h.lifecycle });
  const result = updateResolvedFsm(h.ent, rt, { scrollX: 0, logicW: 800, dt, lifecycle: h.lifecycle });
  assert.equal(result.entityKilled, false, "migrated built-in does not kill before entering despawn");
  updateResolvedFsm(h.ent, rt, { scrollX: 2000, logicW: 800, dt, lifecycle: h.lifecycle });
  if (rt.stateIndex !== despawnIndex) enterResolvedFsmState(h.ent, rt, despawnIndex, { lifecycle: h.lifecycle });
  assert.equal(h.ent.pendingKill, true, "migrated built-in despawn state kills when entered");
}


{
  const h = makeHarness();
  const namedOnly = resolveFsmPreset(preset([state("despawn")]));
  createFsmRuntimeSnapshot(namedOnly, {}, h.ent, { lifecycle: h.lifecycle });
  assert.equal(h.ent.pendingKill, false, "state named despawn without action does not kill");
  const explicit = resolveFsmPreset(preset([state("vanish", [{ type: "despawn" }])]));
  createFsmRuntimeSnapshot(explicit, {}, h.ent, { lifecycle: h.lifecycle });
  assert.equal(h.ent.pendingKill, true, "differently named state with explicit action kills");
}

{
  const source = readFileSync("src/game/content/fsmPresets.json", "utf8");
  assert(source.includes('"schemaVersion": 1'), "canonical JSON is schema v1 in S7");
  const fsmRuntimeSource = readFileSync("src/game/enemies/fsm/FsmRuntime.ts", "utf8");
  const lifecycleSource = readFileSync("src/game/enemies/fsm/LifecycleExecutor.ts", "utf8");
  assert(!/splice\(|\.cleanup\(|\.remove\(/.test(lifecycleSource), "lifecycle executor does not directly remove or cleanup");
  assert(/markKill/.test(lifecycleSource), "standard markKill path is used through context");
  assert(!/playVfx|playSound|localStorage/.test(fsmRuntimeSource + lifecycleSource), "no render/audio/UI/persistence side effects added");
}

console.log("FsmDespawn smoke passed");
