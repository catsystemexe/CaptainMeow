import assert from "node:assert/strict";
import { CONTENT } from "../game/content/CONTENT";
import { createUserFsmPresetStore, type KeyValueStorage } from "../game/enemies/fsm";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";
class Mem implements KeyValueStorage { m = new Map<string,string>(); fail = false; getItem(k:string){return this.m.get(k)??null;} setItem(k:string,v:string){ if(this.fail) throw new Error("fail"); this.m.set(k,v);} removeItem(k:string){this.m.delete(k);} }
function store(mem=new Mem()){ return createUserFsmPresetStore({ storage: mem, builtinRegistry: CONTENT.builtinFsmPresets, knownMovementPresetIds: CONTENT.behaviorPresets.map((p) => p.id) }); }
const s = store(); const m = new FsmPresetEditorModel(s);
assert(m.list().some(x=>x.source==="builtin")); assert.equal(m.list()[0].source,"builtin");
assert.equal(m.list()[0].readOnly,true);
assert.equal(m.create().ok,true); assert.equal(m.selectedId,"fsm.user.new"); assert.equal(m.details()?.validationStatus,"valid");
assert.equal(m.duplicate(CONTENT.builtinFsmPresets.list()[0].id).ok,true); assert.equal(s.registry().sourceOf(m.selectedId),"user");
assert.equal(m.duplicate("fsm.user.new").ok,true); assert(m.selectedId.startsWith("fsm.user.new-copy"));
assert.equal(m.select(CONTENT.builtinFsmPresets.list()[0].id).ok,true); m.setDraftLabel("bad"); assert.equal(m.save().ok,true); assert.equal(m.delete(m.selectedId,true).ok,false);
assert.equal(m.select("fsm.user.new").ok,true); m.setDraftId("fsm.user.renamed"); m.setDraftLabel("Renamed"); assert.equal(m.save().ok,true); assert.equal(m.selectedId,"fsm.user.renamed");
m.setDraftId(CONTENT.builtinFsmPresets.list()[0].id); assert.equal(m.save().ok,false);
const mem = new Mem(); const s2 = store(mem); const m2 = new FsmPresetEditorModel(s2); m2.create(); m2.setDraftId("fsm.user.tx"); mem.fail = true; assert.equal(m2.save().ok,false); assert(s2.get("fsm.user.new")); assert(!s2.get("fsm.user.tx"));
mem.fail = false; m2.cancel(); const d = m2.draft!; d.label = "Mutated outside"; assert.notEqual(s2.get(d.originalId)?.metadata.name,"Mutated outside");
assert.equal(m.delete("fsm.user.renamed", true).ok,true); assert(m.selectedId);
console.log("FsmPresetEditorModel smoke passed");
