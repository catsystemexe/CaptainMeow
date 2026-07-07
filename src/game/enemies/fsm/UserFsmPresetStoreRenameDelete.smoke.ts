import assert from "node:assert/strict";
import { CONTENT } from "../../content/CONTENT";
import { createUserFsmPresetStore, FSM_SCHEMA_VERSION, USER_FSM_PRESET_STORAGE_KEY, asFsmStateId, type FsmPresetSchemaV1, type KeyValueStorage } from "./index";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function preset(id: string, name: string): FsmPresetSchemaV1 { return { schemaVersion: FSM_SCHEMA_VERSION, metadata: { id, name, source: "user", schemaVersion: FSM_SCHEMA_VERSION }, graph: { initialStateId: asFsmStateId("idle"), states: [{ id: asFsmStateId("idle"), label: "Idle", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] }] } }; }

const storage = new MemoryStorage();
const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage, nowIso: () => "2026-07-07T00:00:00.000Z" });
const originals = new Map<string, FsmPresetSchemaV1>();
for (let i = 1; i <= 10; i++) { const id = `fsm.user.rename-delete-${String(i).padStart(2, "0")}`; const p = preset(id, `User ${i}`); originals.set(id, clone(p)); assert.equal(store.upsert(p).ok, true); }
assert.equal(store.list().length, 10, "seeded 10 user presets");
const renameId = "fsm.user.rename-delete-04";
assert.equal(store.renameUserPreset(renameId, "  Renamed Four  ").ok, true, "rename succeeds");
assert.equal(store.list().length, 10, "rename preserves count");
assert.equal(store.get(renameId)?.metadata.id, renameId, "rename preserves ID");
assert.equal(store.get(renameId)?.metadata.name, "Renamed Four", "rename trims and updates name");
for (const [id, before] of originals) if (id !== renameId) assert.deepEqual(store.get(id), before, `rename preserves unrelated preset ${id}`);
assert.equal(store.renameUserPreset(renameId, "   ").ok, false, "empty rename is rejected");
const builtinId = CONTENT.builtinFsmPresets.list()[0]!.id;
assert.equal(store.renameUserPreset(builtinId, "Nope").ok, false, "built-ins cannot be renamed through user store");
assert.equal(store.deleteUserPreset(builtinId).ok, false, "built-ins cannot be deleted through user store");
const deleteId = "fsm.user.rename-delete-07";
assert.equal(store.deleteUserPreset(deleteId).ok, true, "delete succeeds");
assert.equal(store.list().length, 9, "delete removes exactly one preset");
assert.equal(store.get(deleteId), undefined, "target ID removed");
for (const [id, before] of originals) if (id !== renameId && id !== deleteId) assert.deepEqual(store.get(id), before, `delete preserves unrelated preset ${id}`);
const raw = storage.getItem(USER_FSM_PRESET_STORAGE_KEY);
assert(raw, "raw storage exists");
const envelope = JSON.parse(raw);
assert.equal(envelope.storageVersion, 1, "storage envelope version remains valid");
assert.equal(envelope.presets.length, 9, "raw storage count matches delete result");
assert(!envelope.presets.some((p: FsmPresetSchemaV1) => p.metadata.id === deleteId), "raw storage removed only deleted ID");
console.log("[SMOKE] UserFsmPresetStoreRenameDelete OK ✅");
