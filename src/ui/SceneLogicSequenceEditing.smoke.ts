import assert from "node:assert/strict";
import type { SceneLogicDocumentV1 } from "../game/scene-logic/SceneLogicDocument";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import {
  addSequenceActionStep, addSequenceEventStep, addSequenceWaitStep, createSequenceDefinition,
  createSequenceInstance, deleteSequenceDefinition, deleteSequenceInstance, deleteSequenceStep,
  enableSequenceAuthoring, moveSequenceStep, updateSequenceStep,
} from "./SceneLogicSequenceEditing";

const v1:SceneLogicDocumentV1={version:1,spaces:{markers:[{id:"m",position:1}],ranges:[],zones:[]},states:[],triggers:[],events:[{id:"event_1",category:"scene",type:"proof"}],actions:[{id:"action_1",category:"flow",type:"complete_level"}],triggerEventBindings:[],eventActionBindings:[]};
let logic=enableSequenceAuthoring(v1);
const {sequenceDefinitions: enabledDefinitions,sequenceInstances: enabledInstances,...preserved}=logic;
assert.deepEqual({...preserved,version:1},v1,"explicit upgrade preserves every V1 collection");
assert.deepEqual([enabledDefinitions,enabledInstances],[[],[]]);
assert.equal(v1.version,1,"upgrade does not mutate its input");
let result=createSequenceDefinition(logic);assert(result.ok);if(result.ok)logic=result.document;
result=createSequenceDefinition(logic);assert(result.ok);if(result.ok)logic=result.document;
assert.deepEqual(logic.sequenceDefinitions.map(item=>item.id),["sequence_1","sequence_2"]);
result=addSequenceWaitStep(logic,"sequence_1",.5);assert(result.ok);if(result.ok)logic=result.document;
result=addSequenceEventStep(logic,"sequence_1","event_1");assert(result.ok);if(result.ok)logic=result.document;
result=addSequenceActionStep(logic,"sequence_1","action_1");assert(result.ok);if(result.ok)logic=result.document;
assert.equal(addSequenceEventStep(logic,"sequence_1","missing").ok,false);
assert.equal(addSequenceActionStep(logic,"sequence_1","missing").ok,false);
result=updateSequenceStep(logic,"sequence_1",0,{kind:"wait",durationSec:1.25});assert(result.ok);if(result.ok)logic=result.document;
result=moveSequenceStep(logic,"sequence_1",2,-1);assert(result.ok);if(result.ok)logic=result.document;
assert.deepEqual(logic.sequenceDefinitions[0].steps.map(step=>step.kind),["wait","action","event"]);
result=deleteSequenceStep(logic,"sequence_1",2);assert(result.ok);if(result.ok)logic=result.document;
result=createSequenceInstance(logic,"sequence_1");assert(result.ok);if(result.ok)logic=result.document;
result=createSequenceInstance(logic,"sequence_1");assert(result.ok);if(result.ok)logic=result.document;
assert.deepEqual(logic.sequenceInstances.map(item=>item.id),["sequence_instance_1","sequence_instance_2"]);
assert.equal(deleteSequenceDefinition(logic,"sequence_1").ok,false,"referenced Definition deletion is blocked");
logic={...logic,actions:[...logic.actions,{id:"start",category:"flow",type:"start_sequence",sequenceInstanceId:"sequence_instance_1"}]};
assert.equal(addSequenceActionStep(logic,"sequence_1","start").ok,false,"nested start_sequence step is rejected");
assert.equal(deleteSequenceInstance(logic,"sequence_instance_1").ok,false,"referenced Instance deletion is blocked");
result=deleteSequenceInstance(logic,"sequence_instance_2");assert(result.ok);if(result.ok)logic=result.document;
const scene:BackgroundSceneV2={version:2,id:"sequence-authoring-proof",environment:{},tracks:[],sceneLogic:logic};
const json=serializeBackgroundSceneV2(scene);const parsed=parseBackgroundSceneV2(json);assert(parsed.ok);
if(parsed.ok){assert.deepEqual(parsed.scene.sceneLogic,logic);assert(!json.includes("cursor")&&!json.includes("waitProgress")&&!json.includes("status"));}
console.log("SceneLogicSequenceEditing.smoke: PASS");
