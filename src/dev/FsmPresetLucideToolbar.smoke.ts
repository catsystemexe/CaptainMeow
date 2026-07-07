import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, v); } removeItem(k: string) { this.data.delete(k); } }

const source = readFileSync("src/dev/DevSummoner.ts", "utf8");
const toolbarBlock = source.slice(source.indexOf('const topNewBtn = makeIconBtn'), source.indexOf('fsmPresetSection.appendChild(fsmSpawnSelect.root)'));
const labels = [...toolbarBlock.matchAll(/"(New preset|Edit preset name|Duplicate preset|Reset preset|Save preset|Delete preset)"/g)].map((m) => m[1]);
assert.deepEqual(labels, ["New preset", "Edit preset name", "Duplicate preset", "Reset preset", "Save preset", "Delete preset"], "exactly six toolbar buttons in order");
for (const [icon, label] of [["Plus", "New preset"], ["Pencil", "Edit preset name"], ["Copy", "Duplicate preset"], ["RotateCcw", "Reset preset"], ["Save", "Save preset"], ["Trash2", "Delete preset"]] as const) {
  assert(toolbarBlock.includes(`makeIconBtn(${icon}, "${icon}"`) && toolbarBlock.includes(label), `${label} uses Lucide ${icon}`);
}
assert(!toolbarBlock.includes("ICONS.") && !toolbarBlock.includes("textContent = icon"), "toolbar no longer uses Unicode/text glyphs");
const styleSource = readFileSync("src/dev/ui/iconButton.ts", "utf8") + readFileSync("src/dev/ui/lucideIcon.ts", "utf8");
for (const token of ["createDevIconButton", "data-preset-toolbar-action", "preset-toolbar-button", "preset-toolbar-icon", "pointerEvents = \"none\""]) assert((source + styleSource).includes(token), `shared icon contract includes ${token}`);
for (const token of ["width:30px", "height:30px", "display:inline-grid", "place-items:center", "width:18px", "height:18px", "stroke-width", "data-icon-name"]) assert(styleSource.includes(token), `shared sizing/styling includes ${token}`);

const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage(), knownMovementPresetIds: CONTENT.behaviorPresets.map((p) => p.id), nowIso: () => "2026-07-07T00:00:00.000Z" });
const model = new FsmPresetEditorModel(store);
const builtinId = CONTENT.builtinFsmPresets.list()[0]!.id;
assert.equal(model.select(builtinId).ok, true);
assert.equal(model.renameSelected("Built In Rename").ok, false, "built-in edit disabled by model");
assert.equal(model.delete(builtinId, true).ok, false, "built-in delete disabled by model");
assert.equal(model.duplicate().ok, true, "built-in duplicate enabled");
assert.equal(model.draft?.source, "user", "user duplicate selected");
assert.equal(model.renameSelected("User Rename").ok, true, "user edit enabled");
assert.equal(model.delete(model.selectedId, true).ok, true, "user delete enabled");
console.log("[SMOKE] FsmPresetLucideToolbar OK ✅");
