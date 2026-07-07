import assert from "node:assert/strict";
import { CONTENT } from "../game/content/CONTENT";
import { FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1 } from "../game/enemies/fsm/schema";
import { createUserFsmPresetStore } from "../game/enemies/fsm/UserFsmPresetStore";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

import {
  cloneBasicSetup,
  defaultBasicSetupForMode,
  normalizeBasicSetup,
  validateBasicSetup,
  type EnemyLabPresetEnvelope,
} from "./EnemyLabPresetModel";

function preset(id: string, basicSetup?: unknown): FsmPresetSchemaV1 {
  return {
    schemaVersion: FSM_SCHEMA_VERSION,
    metadata: { id, name: id, source: "user", schemaVersion: FSM_SCHEMA_VERSION },
    ...(basicSetup ? { basicSetup: basicSetup as any } : {}),
    graph: {
      initialStateId: asFsmStateId("idle"),
      states: [{ id: asFsmStateId("idle"), label: "Idle", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] }],
    },
  };
}

for (const mode of ["simple", "smart", "fsm"] as const) {
  const setup = defaultBasicSetupForMode(mode);
  assert.equal(validateBasicSetup(setup).length, 0, `${mode} default validates`);
  const normalized = normalizeBasicSetup({}, mode);
  assert.deepEqual(normalized, setup, `${mode} legacy missing Basic Setup normalizes to deterministic defaults`);
}

const cloned = cloneBasicSetup(defaultBasicSetupForMode("fsm"));
cloned.appearanceId = "blue";
assert.notEqual(cloned.appearanceId, defaultBasicSetupForMode("fsm").appearanceId, "clone is independent enough for flat Basic Setup data");
assert(validateBasicSetup({ ...defaultBasicSetupForMode("fsm"), appearanceId: "missing" }).some((x) => x.code === "E_APPEARANCE_UNKNOWN"), "validation catches invalid appearance");
assert(validateBasicSetup({ ...defaultBasicSetupForMode("fsm"), baseSpeed: Infinity }).some((x) => x.code === "E_BASE_SPEED_RANGE"), "validation catches invalid baseSpeed");

const storage = new MemoryStorage();
const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage, knownMovementPresetIds: new Set(CONTENT.behaviorPresets.map((p) => p.id)) });
store.load();
const model = new FsmPresetEditorModel(store);
const builtinId = CONTENT.builtinFsmPresets.list()[0].id;
assert.equal(model.select(builtinId).ok, true, "selecting built-in FSM succeeds");
assert.equal(model.draft?.dirty, false, "built-in selection starts clean");
assert.equal(model.draft?.basicSetup.appearanceId, "red", "built-in FSM receives normalized Basic Setup default");
assert.equal(model.setBasicSetup({ appearanceId: "blue" }), undefined, "built-in Basic Setup edit is ignored");
assert.equal(model.draft?.dirty, true, "built-in Basic Setup draft can become dirty without mutating storage");
assert.equal(model.save().ok, false, "built-in dirty Basic Setup cannot be saved directly");

const duplicated = model.duplicateForEdit(builtinId);
assert.equal(duplicated.ok, true, "duplicate-to-edit succeeds for built-in");
assert.equal(model.draft?.source, "user", "duplicate-to-edit selects user copy");
model.setBasicSetup({ appearanceId: "blue", count: 4, formationId: "ring", spacing: 44, elasticity: 7, baseSpeed: 155, spawnY: 123 });
assert.equal(model.draft?.dirty, true, "editing FSM Basic Setup marks draft dirty");
assert.equal(model.save().ok, true, "saving FSM Basic Setup succeeds");
const saved = store.get(model.selectedId)!;
assert.equal(saved.basicSetup?.appearanceId, "blue", "saved FSM preset persists Basic Setup appearance");
assert.equal(saved.basicSetup?.baseSpeed, 155, "saved FSM preset persists baseSpeed");
const reloaded = new FsmPresetEditorModel(store, model.selectedId);
assert.equal(reloaded.draft?.basicSetup.spacing, 44, "reloaded FSM preset restores Basic Setup");
const selectedBeforeBasicSetup = model.selectedId;
const graphBeforeBasicSetup = store.registry().get(selectedBeforeBasicSetup)?.definition.graph;
for (const edit of [
  { appearanceId: "green" },
  { count: 2 },
  { count: 1 },
  { formationId: "wedge" },
  { spacing: 52 },
  { elasticity: 3 },
  { baseSpeed: 205 },
  { spawnY: 321 },
]) {
  model.setBasicSetup(edit as any);
  assert.equal(model.selectedId, selectedBeforeBasicSetup, "Basic Setup edit preserves selected FSM preset ID");
  assert.equal(store.registry().get(model.selectedId)?.definition.graph, graphBeforeBasicSetup, "Basic Setup edit preserves FSM graph identity");
}
const explicitSelection = model.select(builtinId);
assert.equal(explicitSelection.ok, true, "explicit preset selection succeeds");
assert.notEqual(model.selectedId, selectedBeforeBasicSetup, "only explicit preset selection changes selected FSM behavior");
assert.equal(model.select(selectedBeforeBasicSetup).ok, true, "test reselects saved user preset before export");

const beforeLegacyRaw = storage.getItem(store.storageKey);
const legacyStore = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage(), knownMovementPresetIds: new Set(CONTENT.behaviorPresets.map((p) => p.id)) });
assert.equal(legacyStore.upsert(preset("fsm.user.legacy")).ok, true, "legacy FSM preset without Basic Setup is accepted");
const legacyRawAfterWrite = legacyStore.inspectRawStorage().raw;
const legacyModel = new FsmPresetEditorModel(legacyStore, "fsm.user.legacy");
assert.equal(legacyModel.draft?.basicSetup.spawnY, 260, "legacy FSM draft receives normalized spawnY default");
assert.equal(legacyStore.inspectRawStorage().raw, legacyRawAfterWrite, "loading legacy Basic Setup default does not mutate storage");
assert.equal(storage.getItem(store.storageKey), beforeLegacyRaw, "unrelated storage is not touched during legacy read");

const simplePreset: EnemyLabPresetEnvelope<{ behaviorPresetId: string }> = { id: "simple.user", label: "Simple", mode: "simple", source: "user", basicSetup: { ...defaultBasicSetupForMode("simple"), appearanceId: "blue", baseSpeed: 120 }, behavior: { behaviorPresetId: "straight.basic" } };
const smartPreset: EnemyLabPresetEnvelope<{ behaviorPresetId: string }> = { id: "smart.user", label: "Smart", mode: "smart", source: "user", basicSetup: { ...defaultBasicSetupForMode("smart"), appearanceId: "green", baseSpeed: 90 }, behavior: { behaviorPresetId: "smart.track.soft" } };
assert.equal(simplePreset.mode, "simple", "Simple preset envelope carries mode");
assert.equal(simplePreset.basicSetup.baseSpeed, 120, "Simple envelope carries Basic Setup and baseSpeed");
assert.equal(simplePreset.behavior.behaviorPresetId, "straight.basic", "Simple envelope carries behavior data");
assert.equal(smartPreset.mode, "smart", "Smart preset envelope carries mode");
assert.equal(smartPreset.basicSetup.baseSpeed, 90, "Smart envelope carries Basic Setup and baseSpeed");
assert.equal(smartPreset.behavior.behaviorPresetId, "smart.track.soft", "Smart envelope carries behavior data");
assert.notEqual(simplePreset.basicSetup, smartPreset.basicSetup, "mode Basic Setup objects are isolated");

const exported = store.exportJson([model.selectedId]);
assert.equal(exported.ok, true, "FSM export succeeds");
const parsed = JSON.parse(exported.text!);
assert.equal(parsed.basicSetup.baseSpeed, 155, "export includes Basic Setup/baseSpeed");
assert.equal(typeof parsed.graph.initialStateId, "string", "export includes behavior graph");
const importedStore = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage(), knownMovementPresetIds: new Set(CONTENT.behaviorPresets.map((p) => p.id)) });
const imported = importedStore.importJson(exported.text!, { collisionPolicy: "rename" });
assert.equal(imported.ok, true, "FSM import with Basic Setup succeeds");
assert.equal(importedStore.get(imported.importedIds[0])?.basicSetup?.baseSpeed, 155, "import restores Basic Setup/baseSpeed");

console.log("EnemyLabPresetBasicSetup smoke passed");
