import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { createUserFsmPresetStore, FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1, type KeyValueStorage } from "../game/enemies/fsm";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }
function preset(id: string, name: string, stateLabel = "Idle"): FsmPresetSchemaV1 { return { schemaVersion: FSM_SCHEMA_VERSION, metadata: { id, name, source: "user", schemaVersion: FSM_SCHEMA_VERSION }, basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, followDelay: 0, baseSpeed: 115, spawnY: 260 }, graph: { initialStateId: asFsmStateId("idle"), states: [{ id: asFsmStateId("idle"), label: stateLabel, movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] }] } }; }

const source = readFileSync("src/dev/DevSummoner.ts", "utf8");
const compactSelectBlock = source.slice(source.indexOf("function createCompactSelect"), source.indexOf("export function getPrimitiveFromPresetId"));
const renderBlock = source.slice(source.indexOf("const renderPresetEditor = () =>"), source.indexOf("editFsmBasicSetupDraft = () =>"));
const renameBlock = source.slice(source.indexOf('topRenameBtn.addEventListener("click"'), source.indexOf('topDuplicateBtn.addEventListener("click"'));
const deleteBlock = source.slice(source.indexOf('topDeleteBtn.addEventListener("click"'), source.indexOf('addStateBtn.addEventListener("click"'));
assert(compactSelectBlock.includes("const wasOpen = isOpen()") && compactSelectBlock.includes('list.style.display = "block"'), "open preset list stays open and rerenders rows during option refresh");
assert(renderBlock.includes("${item.label}") && source.includes("preset.definition.metadata.name"), "visible current/list labels render canonical preset names, not only IDs");
assert(renameBlock.includes("presetModel.renameSelected(nextName)") && renameBlock.includes("authoringModel.draft.preset.metadata.name = presetModel.draft.label") && renameBlock.includes("renderPresetEditor()"), "rename synchronizes model, authoring label, and visible labels immediately");
assert(deleteBlock.includes("const selectedLabel = presetModel.list().find") && deleteBlock.includes('message.textContent = `Delete preset "${selectedLabel}"?`;'), "delete dialog reads current selected label at click time with safe textContent");
assert(deleteBlock.includes("This preset has unsaved changes."), "delete dirty warning uses required text");

const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage(), knownMovementPresetIds: CONTENT.behaviorPresets.map((p) => p.id), nowIso: () => "2026-07-07T00:00:00.000Z" });
assert.equal(store.upsert(preset("fsm.user.original", "Original Name", "Original State")).ok, true);
assert.equal(store.upsert(preset("fsm.user.unrelated", "Unrelated Name", "Unrelated State")).ok, true);
const model = new FsmPresetEditorModel(store, "fsm.user.original");
const authoring = new FsmPresetAuthoringModel(store, model.selectedId);
const selectedIdBefore = model.selectedId;
const graphBefore = JSON.stringify(store.get(selectedIdBefore)!.graph);
const unrelatedBefore = JSON.stringify(store.get("fsm.user.unrelated"));
assert.equal(authoring.setPresetDescription("dirty draft remains dirty").ok, true);
assert.equal(model.renameSelected("Renamed Preset").ok, true);
if (authoring.draft?.originalPresetId === model.selectedId && model.draft) authoring.draft.preset.metadata.name = model.draft.label;
assert.equal(model.selectedId, selectedIdBefore, "selected ID unchanged after rename");
assert.equal(model.draft?.label, "Renamed Preset", "selected model label changed immediately");
assert.equal(store.get(selectedIdBefore)!.metadata.name, "Renamed Preset", "stored label changed immediately");
assert.equal(model.list().find((x) => x.id === selectedIdBefore)?.label, "Renamed Preset", "preset-list row source changed immediately");
assert.equal(authoring.draft?.preset.metadata.name, "Renamed Preset", "authoring label synchronized without saving dirty content");
assert.equal(JSON.stringify(store.get(selectedIdBefore)!.graph), graphBefore, "graph/content unchanged by rename");
assert.equal(JSON.stringify(store.get("fsm.user.unrelated")), unrelatedBefore, "unrelated preset unchanged by rename");
assert.equal(authoring.draft?.dirty, true, "dirty draft remains dirty after label sync");
assert.equal(model.renameSelected("Latest Name").ok, true);
const latestDialogText = `Delete preset "${model.list().find((x) => x.id === model.selectedId)?.label}"?`;
assert.equal(latestDialogText, 'Delete preset "Latest Name"?', "delete opened immediately after second rename uses latest name");
const countBeforeCancel = model.list().filter((x) => x.source === "user").length;
assert.equal(model.delete(model.selectedId, false).ok, false, "delete cancel preserves preset");
assert.equal(model.list().filter((x) => x.source === "user").length, countBeforeCancel, "cancel leaves user count unchanged");
assert.equal(model.delete(selectedIdBefore, true).ok, true, "confirm removes selected preset");
assert.equal(store.get(selectedIdBefore), undefined, "selected preset removed");
assert(store.get("fsm.user.unrelated"), "unrelated preset remains after delete");
console.log("[SMOKE] FsmPresetRenameDeleteLabelSync OK ✅");
