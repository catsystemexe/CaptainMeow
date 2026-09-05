import assert from "node:assert/strict";
import { createBackgroundV2VisualVerificationScene } from "./BackgroundV2VisualVerificationScene";
import { clearBackgroundSceneV2, loadBackgroundSceneV2, PIXEL_BGR_V2_DRAFT_KEY, saveBackgroundSceneV2 } from "./BackgroundV2Serialization";
const data=new Map<string,string>([["captain-meow.pixel-bgr.draft","v1"]]);const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
const scene=createBackgroundV2VisualVerificationScene();assert(saveBackgroundSceneV2(storage,scene).ok);const loaded=loadBackgroundSceneV2(storage);assert(loaded.ok);if(loaded.ok)assert.deepEqual(loaded.scene,scene);assert.equal(data.get("captain-meow.pixel-bgr.draft"),"v1");
data.set(PIXEL_BGR_V2_DRAFT_KEY,'{"version":1}');assert.equal(loadBackgroundSceneV2(storage).ok,false);assert.equal(data.get("captain-meow.pixel-bgr.draft"),"v1");clearBackgroundSceneV2(storage);assert.equal(data.has(PIXEL_BGR_V2_DRAFT_KEY),false);assert.equal(data.get("captain-meow.pixel-bgr.draft"),"v1");
console.log("BackgroundV2Persistence.smoke: PASS");
