import { validateAnySceneLogicDocument, type SceneLogicDocument } from "../game/scene-logic/SceneLogicDocument";
import { validateSceneEventDefinition } from "../game/scene-logic/Event";
import { validateStateReferenceDefinition, type StateReferenceDefinition, type StateValue, type StateValueType } from "../game/scene-logic/State";
import { validateMarkerCrossTrigger, validateRangeSpaceTrigger, validateStateTrigger, validateTimeTrigger, validateZoneSpaceTrigger, type RangeZoneTriggerRelation, type SceneLogicTriggerDefinition, type StateTriggerRelation, type TimeTriggerRelation, type TriggerMode } from "../game/scene-logic/Trigger";
import { validateFlowRestartLevelAction, validateStateDecrementAction, validateStateIncrementAction, validateStateSetAction, validateWorldStopScrollAction, type SceneLogicActionDefinition } from "../game/scene-logic/Action";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { ensureSceneLogicDocument } from "./SceneLogicSpaceEditing";

export type LogicSelection = { kind: "trigger" | "event" | "action"; id: string };
export type LogicEditResult = { ok: true; scene: BackgroundSceneV2; selection?: LogicSelection } | { ok: false; scene: BackgroundSceneV2; error: string };
export const STATE_REFERENCE_PRESETS = [
  { id: "state_scroll_speed", address: "scene.scrollSpeed", valueType: "number" },
  { id: "state_player_alive", address: "player.alive", valueType: "boolean" },
  { id: "state_player_shield", address: "player.shield", valueType: "number" },
] as const;
export const NUMBER_STATE_TRIGGER_RELATIONS = ["==", "!=", "<", "<=", ">", ">="] as const;
export const EQUALITY_STATE_TRIGGER_RELATIONS = ["==", "!="] as const;

export function stateTriggerRelations(valueType: StateValueType): readonly StateTriggerRelation[] {
  return valueType === "number" ? NUMBER_STATE_TRIGGER_RELATIONS : EQUALITY_STATE_TRIGGER_RELATIONS;
}

export function defaultStateTriggerValue(valueType: StateValueType): StateValue {
  return valueType === "boolean" ? false : valueType === "number" ? 0 : "";
}

/** Produces an immediately valid patch when a State Trigger changes reference. */
export function stateTriggerReferencePatch(
  state: StateReferenceDefinition,
  relation: StateTriggerRelation,
  value: StateValue,
): { stateId: string; relation: StateTriggerRelation; value: StateValue } {
  const relations = stateTriggerRelations(state.valueType);
  return {
    stateId: state.id,
    relation: relations.includes(relation) ? relation : "==",
    value: typeof value === state.valueType ? value : defaultStateTriggerValue(state.valueType),
  };
}

export function stateActionStates(type: "set" | "increment" | "decrement", states: readonly StateReferenceDefinition[]): readonly StateReferenceDefinition[] {
  return type === "set" ? states : states.filter(state => state.valueType === "number");
}

export function stateActionReferencePatch(
  type: "set" | "increment" | "decrement",
  state: StateReferenceDefinition,
  value: StateValue,
): { stateId: string; value: StateValue } {
  if (type !== "set") {
    if (state.valueType !== "number") throw new Error("Increment/decrement require a number State.");
    return { stateId: state.id, value: typeof value === "number" && Number.isFinite(value) ? value : 1 };
  }
  return { stateId: state.id, value: typeof value === state.valueType ? value : defaultStateTriggerValue(state.valueType) };
}

const fail = (scene: BackgroundSceneV2, error: string): LogicEditResult => ({ ok: false, scene, error });
function save(scene: BackgroundSceneV2, logic: SceneLogicDocument, selection?: LogicSelection): LogicEditResult {
  const validation = validateAnySceneLogicDocument(logic);
  return validation.valid ? { ok: true, scene: { ...scene, sceneLogic: logic }, selection } : fail(scene, validation.errors[0]?.message ?? "Invalid Scene Logic edit.");
}
function nextId(items: readonly { id: string }[], stem: string): string { let i=1; const used=new Set(items.map(x=>x.id)); while(used.has(`${stem}_${i}`))i++; return `${stem}_${i}`; }
function triggerValidation(trigger: SceneLogicTriggerDefinition, logic: SceneLogicDocument) {
  if(trigger.kind==="time")return validateTimeTrigger(trigger);
  if(trigger.kind==="state")return validateStateTrigger(trigger,logic.states);
  if("markerId" in trigger)return validateMarkerCrossTrigger(trigger);
  if("rangeId" in trigger)return validateRangeSpaceTrigger(trigger);
  return validateZoneSpaceTrigger(trigger);
}
function addTrigger(scene:BackgroundSceneV2, trigger:SceneLogicTriggerDefinition):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const validation=triggerValidation(trigger,logic);if(!validation.valid)return fail(scene,validation.issues[0].message);return save(scene,{...logic,triggers:[...logic.triggers,trigger]},{kind:"trigger",id:trigger.id});}
export function createSpaceTrigger(scene:BackgroundSceneV2,spaceKind:"marker"|"range"|"zone",spaceId:string,relation:"cross"|RangeZoneTriggerRelation="cross"):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const exists=spaceKind==="marker"?logic.spaces.markers.some(x=>x.id===spaceId):spaceKind==="range"?logic.spaces.ranges.some(x=>x.id===spaceId):logic.spaces.zones.some(x=>x.id===spaceId);if(!exists)return fail(scene,`Missing ${spaceKind} '${spaceId}'.`);const base={id:nextId(logic.triggers,"trigger"),kind:"space" as const,mode:"once" as const,enabled:true};return addTrigger(scene,spaceKind==="marker"?{...base,relation:"cross",markerId:spaceId}:spaceKind==="range"?{...base,relation:relation as RangeZoneTriggerRelation,rangeId:spaceId}:{...base,relation:relation as RangeZoneTriggerRelation,zoneId:spaceId});}
export function createTimeTrigger(scene:BackgroundSceneV2,relation:TimeTriggerRelation="at"):LogicEditResult {const logic=ensureSceneLogicDocument(scene);return addTrigger(scene,{id:nextId(logic.triggers,"trigger"),kind:"time",relation,timeSec:0,mode:"once",enabled:true});}
export function createStateTrigger(scene:BackgroundSceneV2,stateId:string,relation:StateTriggerRelation="=="):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const state=logic.states.find(x=>x.id===stateId);if(!state)return fail(scene,"State Trigger creation requires an authored State reference.");return addTrigger(scene,{id:nextId(logic.triggers,"trigger"),kind:"state",stateId,relation,value:state.valueType==="boolean"?false:state.valueType==="number"?0:"",mode:"once",enabled:true});}
export function updateTrigger(scene:BackgroundSceneV2,id:string,patch:Partial<SceneLogicTriggerDefinition>):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const current=logic.triggers.find(x=>x.id===id);if(!current)return fail(scene,`Trigger '${id}' was not found.`);const next={...current,...patch,id:current.id,kind:current.kind} as SceneLogicTriggerDefinition;const validation=triggerValidation(next,logic);if(!validation.valid)return fail(scene,validation.issues[0].message);return save(scene,{...logic,triggers:logic.triggers.map(x=>x.id===id?next:x)},{kind:"trigger",id});}
export function deleteTrigger(scene:BackgroundSceneV2,id:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(logic.triggerEventBindings.some(x=>x.triggerId===id))return fail(scene,`Cannot delete Trigger '${id}': remove its Event bindings first.`);return save(scene,{...logic,triggers:logic.triggers.filter(x=>x.id!==id)});}

export function createSceneEvent(scene:BackgroundSceneV2,type="scene_event"):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const event={id:nextId(logic.events,"event"),category:"scene" as const,type:type.trim()};const validation=validateSceneEventDefinition(event);if(!validation.valid)return fail(scene,validation.issues[0].message);return save(scene,{...logic,events:[...logic.events,event]},{kind:"event",id:event.id});}
export function updateSceneEvent(scene:BackgroundSceneV2,id:string,type:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const current=logic.events.find(x=>x.id===id);if(!current)return fail(scene,`Event '${id}' was not found.`);const next={...current,type:type.trim()};const validation=validateSceneEventDefinition(next);if(!validation.valid)return fail(scene,validation.issues[0].message);return save(scene,{...logic,events:logic.events.map(x=>x.id===id?next:x)},{kind:"event",id});}
export function deleteSceneEvent(scene:BackgroundSceneV2,id:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(logic.triggerEventBindings.some(x=>x.eventId===id)||logic.eventActionBindings.some(x=>x.eventId===id))return fail(scene,`Cannot delete Event '${id}': remove its bindings first.`);return save(scene,{...logic,events:logic.events.filter(x=>x.id!==id)});}

export type ActionDraft={category:"world";type:"stop_scroll"}|{category:"flow";type:"restart_level"}|{category:"state";type:"set"|"increment"|"decrement";stateId:string;value:StateValue};
function actionError(action:SceneLogicActionDefinition,logic:SceneLogicDocument):string|null {const state=action.category==="state"?logic.states.find(x=>x.id===action.stateId):undefined;if(action.category==="state"&&!state)return `Missing State '${action.stateId}'.`;if(action.category==="state"&&action.type!=="set"&&state?.valueType!=="number")return "Increment/decrement require a number State.";if(action.category==="state"&&action.type==="set"&&typeof action.value!==state?.valueType)return `Set value must be ${state?.valueType}.`;const validation=action.category==="world"?validateWorldStopScrollAction(action):action.category==="flow"?validateFlowRestartLevelAction(action):action.type==="set"?validateStateSetAction(action):action.type==="increment"?validateStateIncrementAction(action):validateStateDecrementAction(action);return validation.valid?null:validation.issues[0].message;}
export function createAction(scene:BackgroundSceneV2,draft:ActionDraft):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const action={id:nextId(logic.actions,"action"),...draft} as SceneLogicActionDefinition;const error=actionError(action,logic);if(error)return fail(scene,error);return save(scene,{...logic,actions:[...logic.actions,action]},{kind:"action",id:action.id});}
export function updateAction(scene:BackgroundSceneV2,id:string,patch:Partial<{stateId:string;value:StateValue}>):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const current=logic.actions.find(x=>x.id===id);if(!current)return fail(scene,`Action '${id}' was not found.`);const next={...current,...patch,id:current.id,category:current.category,type:current.type} as SceneLogicActionDefinition;const error=actionError(next,logic);if(error)return fail(scene,error);return save(scene,{...logic,actions:logic.actions.map(action=>action.id===id?next:action)},{kind:"action",id});}
export function deleteAction(scene:BackgroundSceneV2,id:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(logic.eventActionBindings.some(x=>x.actionId===id))return fail(scene,`Cannot delete Action '${id}': remove its Event bindings first.`);return save(scene,{...logic,actions:logic.actions.filter(x=>x.id!==id)});}
export function createStateReference(scene:BackgroundSceneV2,presetId:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);const preset=STATE_REFERENCE_PRESETS.find(x=>x.id===presetId);if(!preset)return fail(scene,"Only approved State reference presets may be authored.");if(logic.states.some(x=>x.id===preset.id))return fail(scene,`State '${preset.id}' already exists.`);const validation=validateStateReferenceDefinition(preset);if(!validation.valid)return fail(scene,validation.issues[0].message);return save(scene,{...logic,states:[...logic.states,{...preset}]});}
export function deleteStateReference(scene:BackgroundSceneV2,id:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(logic.triggers.some(x=>x.kind==="state"&&x.stateId===id)||logic.actions.some(x=>x.category==="state"&&x.stateId===id))return fail(scene,`Cannot delete State '${id}': it is referenced by logic.`);return save(scene,{...logic,states:logic.states.filter(x=>x.id!==id)});}
export function bindTriggerEvent(scene:BackgroundSceneV2,triggerId:string,eventId:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(!logic.triggers.some(x=>x.id===triggerId))return fail(scene,`Missing Trigger '${triggerId}'.`);if(!logic.events.some(x=>x.id===eventId))return fail(scene,`Missing Event '${eventId}'.`);if(logic.triggerEventBindings.some(x=>x.triggerId===triggerId&&x.eventId===eventId))return fail(scene,"Duplicate Trigger/Event binding.");return save(scene,{...logic,triggerEventBindings:[...logic.triggerEventBindings,{triggerId,eventId}]});}
export function unbindTriggerEvent(scene:BackgroundSceneV2,triggerId:string,eventId:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);return save(scene,{...logic,triggerEventBindings:logic.triggerEventBindings.filter(x=>x.triggerId!==triggerId||x.eventId!==eventId)});}
export function bindEventAction(scene:BackgroundSceneV2,eventId:string,actionId:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);if(!logic.events.some(x=>x.id===eventId))return fail(scene,`Missing Event '${eventId}'.`);if(!logic.actions.some(x=>x.id===actionId))return fail(scene,`Missing Action '${actionId}'.`);if(logic.eventActionBindings.some(x=>x.eventId===eventId&&x.actionId===actionId))return fail(scene,"Duplicate Event/Action binding.");return save(scene,{...logic,eventActionBindings:[...logic.eventActionBindings,{eventId,actionId}]});}
export function unbindEventAction(scene:BackgroundSceneV2,eventId:string,actionId:string):LogicEditResult {const logic=ensureSceneLogicDocument(scene);return save(scene,{...logic,eventActionBindings:logic.eventActionBindings.filter(x=>x.eventId!==eventId||x.actionId!==actionId)});}
