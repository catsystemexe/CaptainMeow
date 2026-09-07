import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { updateV2Object } from "./PixelBgrV2ObjectEditing";
import { updateV2Segment } from "./PixelBgrV2SegmentEditing";

const asset={id:"a",url:"/a.png"};
const scene:BackgroundSceneV2={version:2,id:"context-y",environment:{},tracks:[{id:"mid",name:"Mid",role:"mid",mode:"sequence",enabled:true,parallax:{x:.3,y:.3},zBase:0,segments:[{id:"mid-a",startTrackX:0,widthPx:20,asset,offsetY:-55,opacity:1,blend:"normal",localZ:0,enabled:true}],objects:[{id:"rock",asset,startTrackX:30,y:12,localZ:0,opacity:1,blend:"normal",enabled:true}]}]};
const segment=updateV2Segment(scene,"mid","mid-a",{offsetY:-56});assert(segment.ok);if(segment.ok){assert.equal(segment.scene.tracks[0].segments[0].offsetY,-56);assert.equal(segment.segmentId,"mid-a","segment remains selected by the edit result");}
const object=updateV2Object(scene,"mid","rock",{y:13});assert(object.ok);if(object.ok){assert.equal(object.scene.tracks[0].objects[0].y,13);assert.equal(object.objectId,"rock","object remains selected by the edit result");}
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(source,/this\.renderV2Environment\(v2Scene\)\);[\s\S]*?renderV2ContextualYSurface\(\)[\s\S]*?this\.renderLeftTools\(\)/,"contextual Y is composed below Environment/Static Bgr and above tools");
assert.match(source,/if\(!segment&&!object\)return null/,"no selection produces no contextual surface");
assert.match(source,/title\.textContent=`Selected · \$\{id\}`/,"segment and object selections share the compact selected heading");
assert.match(source,/value:segment\.segment\.offsetY[\s\S]*?updateV2Segment\([^;]*\{offsetY:value\}/,"segment control writes canonical offsetY through the immutable helper");
assert.match(source,/value:object!\.object\.y[\s\S]*?updateV2Object\([^;]*\{y:value\}/,"object control writes canonical y through the immutable helper");
assert.match(source,/surface\.append\(title,row\);return surface/,"a selected item renders the contextual surface");
assert.match(source,/this\.v2SelectedSegmentId=result\.segmentId/,"segment edit retains result selection");
assert.match(source,/this\.v2SelectedObjectId=result\.objectId/,"object edit retains result selection");
console.log("[SMOKE] PixelBgrV2ContextualYSurface OK ✅");
