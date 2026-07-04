import { strict as assert } from "node:assert";
import { CONTENT } from "../game/content/CONTENT";
import { FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1, type KeyValueStorage, createUserFsmPresetStore } from "../game/enemies/fsm";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";

class MemoryStorage implements KeyValueStorage { data = new Map<string,string>(); getItem(k:string){ return this.data.get(k) ?? null; } setItem(k:string,v:string){ this.data.set(k,v); } removeItem(k:string){ this.data.delete(k); } }
export function basePreset(id = "user.s10"): FsmPresetSchemaV1 { return { schemaVersion: FSM_SCHEMA_VERSION, metadata: { id, name: "S10 User", source: "user", schemaVersion: FSM_SCHEMA_VERSION, description: "draft" }, graph: { initialStateId: asFsmStateId("idle"), states: [ { id: asFsmStateId("idle"), label: "Idle", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 1 } }, targetStateId: asFsmStateId("exit") }] }, { id: asFsmStateId("exit"), label: "Exit", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] } ] } }; }
export function createAuthoring(id = "user.s10") { const store = createUserFsmPresetStore({ builtinRegistry: CONTENT.builtinFsmPresets, storage: new MemoryStorage() }); const upsert = store.upsert(basePreset(id)); assert.equal(upsert.ok, true); return { store, model: new FsmPresetAuthoringModel(store, id) }; }
export { assert };
