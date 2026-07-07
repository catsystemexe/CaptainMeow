import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }

const source = readFileSync("src/dev/DevSummoner.ts", "utf8");
const renameBlock = source.slice(source.indexOf('topRenameBtn.addEventListener("click"'), source.indexOf('topDuplicateBtn.addEventListener("click"'));
const deleteBlock = source.slice(source.indexOf('topDeleteBtn.addEventListener("click"'), source.indexOf('addStateBtn.addEventListener("click"'));
assert(renameBlock.includes("openDevDialog") && !renameBlock.includes("window.prompt"), "rename uses in-app dialog, not prompt");
assert(deleteBlock.includes("openDevDialog") && !deleteBlock.includes("window.confirm"), "delete uses in-app dialog, not confirm");
assert(renameBlock.includes("input.value = draft.label"), "rename input is prefilled");
assert(renameBlock.includes("input.value.trim()") && renameBlock.includes("Preset name is required"), "rename trims and rejects empty values");
assert(renameBlock.includes("nextName === draft.label"), "same-name rename is no-op");
assert(renameBlock.includes("opener: topRenameBtn"), "rename focus returns to Pencil button");
assert(deleteBlock.includes("Delete preset") && deleteBlock.includes("draft.label"), "delete dialog shows preset name");
assert(deleteBlock.includes('data-dev-dialog-warning') && deleteBlock.includes("unsaved draft changes"), "delete dirty path shows warning");
assert(deleteBlock.includes("opener: topDeleteBtn"), "delete focus returns to Trash2 button");
assert(readFileSync("src/dev/ui/devDialog.ts", "utf8").includes("activeDialog?.close(false)"), "dialog enforces single active overlay");

const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage(), knownMovementPresetIds: CONTENT.behaviorPresets.map((p) => p.id), nowIso: () => "2026-07-07T00:00:00.000Z" });
const model = new FsmPresetEditorModel(store);
assert.equal(model.create().ok, true, "new user preset created");
const id = model.selectedId;
const graphBefore = JSON.stringify(store.get(id)!.graph);
const authoring = new FsmPresetAuthoringModel(store, id);
assert.equal(authoring.setPresetDescription("dirty before rename").ok, true);
assert.equal(authoring.draft?.dirty, true, "dirty before rename");
assert.equal(model.renameSelected("  Renamed Via Dialog  ").ok, true, "trimmed rename succeeds");
assert.equal(model.selectedId, id, "rename preserves preset ID");
assert.equal(store.get(id)!.metadata.name, "Renamed Via Dialog", "label updates immediately/persistently in store");
assert.equal(JSON.stringify(store.get(id)!.graph), graphBefore, "rename preserves graph content");
assert.equal(authoring.draft?.dirty, true, "rename does not save dirty authoring draft");
assert.equal(model.renameSelected("   ").ok, false, "whitespace-only rename rejected");
const countBeforeCancel = model.list().filter((x) => x.source === "user").length;
assert.equal(model.delete(id, false).ok, false, "delete cancel rejected by model");
assert.equal(model.list().filter((x) => x.source === "user").length, countBeforeCancel, "delete cancel preserves preset count");
assert.equal(model.delete(id, true).ok, true, "delete confirm removes preset");
assert.equal(model.list().filter((x) => x.source === "user").length, countBeforeCancel - 1, "delete removes exactly one user preset");
assert.equal(store.get(id), undefined, "selected preset gone");
assert(model.selectedId && (CONTENT.fsmPresets.get(model.selectedId) || store.registry().get(model.selectedId)), "fallback selection is deterministic and valid");
console.log("[SMOKE] FsmPresetRenameDeleteDialog OK ✅");
