import assert from "node:assert/strict";
import { CONTENT } from "../game/content/CONTENT";
import { createUserFsmPresetStore, FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1, type KeyValueStorage } from "../game/enemies/fsm";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";
class Mem implements KeyValueStorage { m = new Map<string,string>(); getItem(k:string){return this.m.get(k)??null;} setItem(k:string,v:string){this.m.set(k,v);} removeItem(k:string){this.m.delete(k);} }
function preset(id:string): FsmPresetSchemaV1 { return { schemaVersion:FSM_SCHEMA_VERSION, metadata:{ id, name:id, source:"user", schemaVersion:FSM_SCHEMA_VERSION }, graph:{ initialStateId:asFsmStateId("idle"), states:[{ id:asFsmStateId("idle"), label:"Idle", movement:{ base:{ type:"movementPreset", params:{ presetId:"none.hold" }}}, targeting:{type:"forward"}, combat:{mode:"disabled"}, transitions:[] }] } }; }
const s = createUserFsmPresetStore({ storage:new Mem(), builtinRegistry: CONTENT.builtinFsmPresets, knownMovementPresetIds:CONTENT.behaviorPresets.map((p) => p.id) }); const m = new FsmPresetEditorModel(s);
assert.equal(m.importJson(JSON.stringify(preset("fsm.user.imported")), "reject").ok,true); assert.equal(m.selectedId,"fsm.user.imported");
assert.equal(m.importJson(JSON.stringify({ storageVersion:1, presets:[preset("fsm.user.bundle")] }), "reject").ok,true);
assert.equal(m.importJson(JSON.stringify(preset("fsm.user.bundle")), "reject").ok,false);
assert.equal(m.importJson(JSON.stringify({ ...preset("fsm.user.bundle"), metadata:{...preset("fsm.user.bundle").metadata, name:"R"} }), "replace-user").ok,true);
const renamed = m.importJson(JSON.stringify(preset("fsm.user.bundle")), "rename"); assert.equal(renamed.ok,true); assert(renamed.importedIds?.[0].endsWith("-2"));
assert.equal(m.importJson("{", "reject").ok,false); assert.equal(m.importJson("x".repeat(1024*1024+1), "reject").ok,false);
const legacy = { initial:"a", states:{ a:{ movementPresetId:"none.hold" } } }; const mig = m.importJson(JSON.stringify(legacy), "rename"); assert.equal(mig.ok,true); assert(mig.diagnostics.some(d=>d.code==="W_IMPORT_LEGACY_MIGRATED"));
assert(m.list().some(x=>x.id==="fsm.user.imported")); assert(m.exportSelected().exportedText?.includes(m.selectedId)); const all = m.exportAllUsers().exportedText!; assert(!all.includes(CONTENT.builtinFsmPresets.list()[0].id));
console.log("FsmPresetImportUi smoke passed");
