import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { createV2Object, deleteV2Object, duplicateV2Object, moveV2Object, updateV2Object, V2_OBJECT_DUPLICATE_OFFSET_PX } from "./PixelBgrV2ObjectEditing";

const scene: BackgroundSceneV2 = { version:2,id:"objects",environment:{starfield:{seed:2,density:.2}},tracks:[
  {id:"near",name:"Near",role:"near",mode:"sequence",enabled:true,parallax:{x:.7,y:.3},zBase:4,segments:[],objects:[{id:"existing",asset:{id:"stars",url:"/stars.png"},startTrackX:10,y:20,width:30,height:40,localZ:2,opacity:.5,blend:"normal",enabled:true}]},
  {id:"front",name:"Front",role:"foreground",mode:"sequence",enabled:true,parallax:{x:1,y:1},zBase:20,segments:[],objects:[]},
]};
const snapshot=structuredClone(scene),asset={id:"piece",url:"/piece.png"};
const created=createV2Object(scene,"front",asset,100,80);assert.equal(created.ok,true);if(!created.ok)throw new Error(created.error);
assert.deepEqual(scene,snapshot,"input is immutable");assert.equal(created.scene.tracks[0],scene.tracks[0],"untouched track identity is preserved");assert.equal(created.scene.environment,scene.environment);assert.equal(created.scene.tracks[1].role,"foreground");
const made=created.scene.tracks[1].objects[0];assert.ok(made.id);assert.deepEqual(made.asset,asset);assert.deepEqual({x:made.startTrackX,y:made.y,z:made.localZ,opacity:made.opacity,blend:made.blend,enabled:made.enabled},{x:100,y:80,z:0,opacity:1,blend:"normal",enabled:true});
const duplicated=duplicateV2Object(created.scene,"front",made.id);assert.equal(duplicated.ok,true);if(!duplicated.ok)throw new Error(duplicated.error);const copy=duplicated.scene.tracks[1].objects[1];assert.notEqual(copy.id,made.id);assert.equal(copy.startTrackX,made.startTrackX+V2_OBJECT_DUPLICATE_OFFSET_PX);assert.equal(copy.y,made.y+V2_OBJECT_DUPLICATE_OFFSET_PX);assert.equal(created.scene.tracks[1].objects.length,1);
const moved=moveV2Object(duplicated.scene,"front",copy.id,33,44);assert.equal(moved.ok,true);if(!moved.ok)throw new Error(moved.error);assert.deepEqual([moved.scene.tracks[1].objects[1].startTrackX,moved.scene.tracks[1].objects[1].y],[33,44]);assert.equal(moved.scene.tracks[1].objects[0],duplicated.scene.tracks[1].objects[0]);
const updated=updateV2Object(moved.scene,"front",copy.id,{width:64,height:32,localZ:7,opacity:.25,blend:"additive",enabled:false});assert.equal(updated.ok,true);if(!updated.ok)throw new Error(updated.error);assert.deepEqual({width:updated.scene.tracks[1].objects[1].width,height:updated.scene.tracks[1].objects[1].height,localZ:updated.scene.tracks[1].objects[1].localZ,opacity:updated.scene.tracks[1].objects[1].opacity,blend:updated.scene.tracks[1].objects[1].blend,enabled:updated.scene.tracks[1].objects[1].enabled},{width:64,height:32,localZ:7,opacity:.25,blend:"additive",enabled:false});
for(const patch of [{width:0},{height:-1},{opacity:2},{localZ:Number.NaN},{startTrackX:Number.POSITIVE_INFINITY},{y:Number.NaN}])assert.equal(updateV2Object(updated.scene,"front",copy.id,patch).ok,false);
const deleted=deleteV2Object(updated.scene,"front",copy.id);assert.equal(deleted.ok,true);if(!deleted.ok)throw new Error(deleted.error);assert.deepEqual(deleted.scene.tracks[1].objects.map(item=>item.id),[made.id]);assert.equal(deleted.scene.tracks[0],updated.scene.tracks[0]);
console.log("[SMOKE] PixelBgrV2ObjectEditing OK ✅");
