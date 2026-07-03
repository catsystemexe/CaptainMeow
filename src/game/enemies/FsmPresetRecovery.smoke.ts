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
const corruptStorage = new MemoryStorage(); corruptStorage.data.set(USER_FSM_PRESET_STORAGE_KEY, "not-json");
const corrupt = makeStore(corruptStorage); const corruptLoad = corrupt.load();
assert.equal(corruptLoad.ok, false, "corrupt JSON reports failure");
assert.equal(corrupt.list().length, 0, "corrupt JSON loads empty");
assert.equal(corrupt.inspectRawStorage().raw, "not-json", "raw corrupt value preserved");
const unsupportedStorage = new MemoryStorage(); unsupportedStorage.data.set(USER_FSM_PRESET_STORAGE_KEY, JSON.stringify({ storageVersion: 2, presets: [preset("fsm.user.future")] }));
const unsupported = makeStore(unsupportedStorage).load();
assert.equal(unsupported.ok, false, "unsupported storageVersion does not crash");
const partialStorage = new MemoryStorage(); partialStorage.data.set(USER_FSM_PRESET_STORAGE_KEY, JSON.stringify({ storageVersion: 1, presets: [preset("fsm.user.valid"), preset("fsm.turret")] }));
const partial = makeStore(partialStorage); const partialLoad = partial.load();
assert.equal(partialLoad.loadedCount, 1, "partially invalid bundle loads valid entries");
assert.equal(partialLoad.ok, false, "partial invalid reports diagnostics");
assert.equal(partialStorage.data.get(USER_FSM_PRESET_STORAGE_KEY)!.includes("fsm.turret"), true, "no automatic destructive rewrite");
assert.equal(partial.clear().ok, true, "explicit clear works");
assert.equal(partial.inspectRawStorage().raw, null, "clear removes raw storage");
assert.equal(partial.replaceFromImport(JSON.stringify({ storageVersion: 1, presets: [preset("fsm.user.reload")] })).ok, true, "valid reload after clear/import");
assert.equal(partial.get("fsm.user.reload")?.metadata.id, "fsm.user.reload", "reload visible");
const readFail = new MemoryStorage(); readFail.failRead = true;
assert.equal(makeStore(readFail).load().ok, false, "storage read exceptions become diagnostics");
assert.equal(makeStore(null).load().ok, true, "no browser global required");
assert(Object.isFrozen(CONTENT.builtinFsmPresets.get("fsm.turret")!.definition), "built-ins remain immutable");
console.log("FsmPresetRecovery smoke passed");
