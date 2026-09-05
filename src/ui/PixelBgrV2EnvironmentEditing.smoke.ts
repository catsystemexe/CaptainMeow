import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { disableV2Starfield, enableV2Starfield, updateV2Starfield } from "./PixelBgrV2EnvironmentEditing";
const scene:BackgroundSceneV2={version:2,id:"environment",environment:{},tracks:[{id:"far",name:"Far",role:"far",mode:"sequence",enabled:true,parallax:{x:.1,y:.1},zBase:0,segments:[],objects:[]}]};
const enabled=enableV2Starfield(scene);assert(enabled.ok);if(!enabled.ok)throw new Error(enabled.error);assert.deepEqual(enabled.scene.environment.starfield,{seed:1,density:.35});assert.strictEqual(enabled.scene.tracks,scene.tracks);assert.equal(scene.environment.starfield,undefined);
const updated=updateV2Starfield(enabled.scene,{seed:99,density:.8});assert(updated.ok);if(!updated.ok)throw new Error(updated.error);assert.deepEqual(updated.scene.environment.starfield,{seed:99,density:.8});assert.strictEqual(updated.scene.tracks,scene.tracks);
for(const patch of [{seed:Number.NaN},{seed:Number.POSITIVE_INFINITY},{density:-1},{density:1.1}])assert.equal(updateV2Starfield(updated.scene,patch).ok,false);
const disabled=disableV2Starfield(updated.scene);assert(disabled.ok);if(disabled.ok){assert.equal(disabled.scene.environment.starfield,undefined);assert.strictEqual(disabled.scene.tracks,scene.tracks);}
console.log("PixelBgrV2EnvironmentEditing.smoke: PASS");
