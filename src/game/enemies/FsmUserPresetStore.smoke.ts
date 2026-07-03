import assert from "node:assert/strict";
import { CONTENT } from "../content/CONTENT";
import { createUserFsmPresetStore, USER_FSM_PRESET_STORAGE_KEY, type KeyValueStorage, type FsmPresetSchemaV1, asFsmStateId } from "./fsm";

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>(); reads=0; writes=0; removes=0; failWrite=false; failRead=false;
  getItem(k:string){ this.reads++; if(this.failRead) throw new Error("read fail"); return this.data.get(k) ?? null; }
  setItem(k:string,v:string){ this.writes++; if(this.failWrite) throw new Error("write fail"); this.data.set(k,v); }
  removeItem(k:string){ this.removes++; this.data.delete(k); }
}
const movementIds = new Set(CONTENT.behaviorPresets.map((p) => p.id));
const attackIds = new Set(["single_basic", "aimed_slow", "spread_test_slow", "spread_test_fast"]);
function makeStore(storage: KeyValueStorage | null = new MemoryStorage()) { return createUserFsmPresetStore({ storage, builtinRegistry: CONTENT.builtinFsmPresets, knownMovementPresetIds: movementIds, knownAttackProfileIds: attackIds, nowIso: () => "2026-07-03T00:00:00.000Z" }); }
function preset(id="fsm.user.alpha", movement="none.hold"): FsmPresetSchemaV1 { return { schemaVersion: 1, metadata: { id, name: id, source: "user", schemaVersion: 1 }, graph: { initialStateId: asFsmStateId("idle"), states: [{ id: asFsmStateId("idle"), label: "Idle", movement: { base: { type: "movementPreset", params: { presetId: movement } } }, targeting: { type: "forward" }, combat: { mode: "disabled" }, transitions: [{ condition: { type: "timeInState", params: { seconds: 1 } }, targetStateId: asFsmStateId("idle") }] }] } }; }
const storage = new MemoryStorage();
const store = makeStore(storage);
assert.equal(store.load().loadedCount, 0, "missing storage loads empty");
assert.equal(store.upsert(preset()).ok, true, "valid upsert succeeds");
assert.equal(store.get("fsm.user.alpha")?.metadata.id, "fsm.user.alpha", "get returns user preset");
assert.deepEqual(store.list().map((p) => p.metadata.id), ["fsm.user.alpha"], "list returns users");
assert.equal(store.upsert({ ...preset(), metadata: { ...preset().metadata, name: "replacement" } }).ok, true, "same user ID replaces on upsert");
assert.equal(store.get("fsm.user.alpha")?.metadata.name, "replacement", "replacement is visible");
assert.equal(store.delete("fsm.user.alpha").ok, true, "delete succeeds");
assert.equal(store.list().length, 0, "delete removes preset");
assert.equal(store.upsert(preset()).ok, true, "reinsert succeeds");
assert.equal(store.clear().ok, true, "clear succeeds");
assert.equal(store.list().length, 0, "clear empties users");
assert.equal(store.upsert(preset("fsm.turret")).ok, false, "built-in collision rejected");
const invalid = preset("fsm.user.invalid") as any; delete invalid.graph.states[0].movement;
assert.equal(store.upsert(invalid).ok, false, "invalid preset rejected");
assert.equal(store.upsert(preset("fsm.user.badmove", "missing.move")).ok, false, "unknown movement rejected");
const dangling = preset("fsm.user.dangling"); dangling.graph.states[0].transitions[0].targetStateId = asFsmStateId("missing");
assert.equal(store.upsert(dangling).ok, false, "dangling transition rejected");
const cycle = preset("fsm.user.cycle"); cycle.graph.states[0].transitions[0].condition = { type: "timeInState", params: { seconds: 0 } };
assert.equal(store.upsert(cycle).ok, false, "immediate action/cycle rejected");
const builtinBefore = CONTENT.builtinFsmPresets.get("fsm.turret")!;
assert(Object.isFrozen(builtinBefore.definition), "built-ins remain immutable");
assert.equal(makeStore(new MemoryStorage()).upsert(preset("fsm.user.beta")).ok, true, "fresh upsert works");
const s2 = makeStore(new MemoryStorage()); s2.upsert(preset("fsm.user.beta"));
assert.equal(s2.registry().get("fsm.turret")?.source, "builtin", "combined resolves built-in");
assert.equal(s2.registry().get("fsm.user.beta")?.source, "user", "combined resolves user");
assert.deepEqual(s2.registry().list().slice(0, CONTENT.builtinFsmPresets.size).map((p) => p.id), CONTENT.builtinFsmPresets.list().map((p) => p.id), "built-in order preserved");
s2.upsert(preset("fsm.user.aaa"));
assert.deepEqual(s2.list().map((p) => p.metadata.id), ["fsm.user.aaa", "fsm.user.beta"], "user order deterministic");
assert(Object.isFrozen(s2.registry().get("fsm.user.beta")!.definition), "runtime gets immutable snapshot");
const beforeReads = (s2 as any).storage.reads;
s2.registry().get("fsm.user.beta"); s2.registry().list();
assert.equal((s2 as any).storage.reads, beforeReads, "registry access does not read storage per tick");
const mutable = preset("fsm.user.mutable"); s2.upsert(mutable); mutable.metadata.name = "mutated";
assert.notEqual(s2.get("fsm.user.mutable")?.metadata.name, "mutated", "caller mutation does not affect store");
const fail = new MemoryStorage(); const s3 = makeStore(fail); s3.upsert(preset("fsm.user.before")); fail.failWrite = true;
assert.equal(s3.upsert(preset("fsm.user.after")).ok, false, "write failure fails");
assert.equal(s3.get("fsm.user.after"), undefined, "write failure is transactional");
assert.equal(makeStore(null).load().ok, true, "no browser global/storage required");
console.log("FsmUserPresetStore smoke passed");
