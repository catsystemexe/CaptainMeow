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
const s = makeStore(new MemoryStorage());
assert.equal(s.importJson(JSON.stringify(preset("fsm.user.single"))).ok, true, "single schema-v1 import");
assert.equal(s.importJson(JSON.stringify({ storageVersion: 1, presets: [preset("fsm.user.bundle")] })).ok, true, "bundle import");
const exported = s.exportJson();
assert.equal(exported.ok, true, "export succeeds");
assert(exported.text!.includes('"storageVersion": 1'), "multi export is envelope");
assert.equal(exported.text, s.exportJson().text, "deterministic export");
const round = makeStore(new MemoryStorage());
assert.equal(round.importJson(exported.text!).ok, true, "round trip imports");
assert.deepEqual(round.list().map((p) => p.metadata.id), s.list().map((p) => p.metadata.id), "round trip preserves IDs");
assert.equal(s.importJson(JSON.stringify(preset("fsm.turret"))).ok, false, "built-in collision reject");
assert.equal(s.importJson(JSON.stringify(preset("fsm.user.single"))).ok, false, "user collision reject by default");
assert.equal(s.importJson(JSON.stringify({ ...preset("fsm.user.single"), metadata: { ...preset("fsm.user.single").metadata, name: "replaced" } }), { collisionPolicy: "replace-user" }).ok, true, "replace-user policy");
assert.equal(s.get("fsm.user.single")?.metadata.name, "replaced", "replace-user updated preset");
const renamed = s.importJson(JSON.stringify(preset("fsm.user.single")), { collisionPolicy: "rename" });
assert.equal(renamed.ok, true, "rename policy succeeds");
assert.equal(renamed.renamed["fsm.user.single"], "fsm.user.single-2", "rename is deterministic");
assert.equal(s.importJson("{").ok, false, "invalid JSON rejected");
assert.equal(s.importJson("x".repeat(1024 * 1024 + 1)).ok, false, "oversized input rejected");
assert.equal(s.importJson(JSON.stringify({ ...preset("fsm.user.v2"), schemaVersion: 2 })).ok, false, "unsupported schema version rejected");
const legacy = { initial: "a", states: { a: { movementPresetId: "none.hold" } } };
const migrated = makeStore(new MemoryStorage()).importJson(JSON.stringify(legacy));
assert.equal(migrated.ok, true, "legacy migration import succeeds");
assert(migrated.diagnostics.some((d) => d.code === "W_IMPORT_LEGACY_MIGRATED"), "migration warning reported");
const one = s.exportJson(["fsm.user.single"]).text!;
assert(!one.includes("storageVersion"), "single selected export is preset");
assert(!s.exportJson().text!.includes("fsm.turret"), "built-ins excluded by default");
assert(!/movementRuntime|combatRuntimeState|selectedEnemy/.test(s.exportJson().text!), "no runtime state export");
console.log("FsmPresetImportExport smoke passed");
