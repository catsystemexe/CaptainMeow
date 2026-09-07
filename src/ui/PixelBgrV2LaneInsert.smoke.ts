import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";
import { insertV2LaneObject, insertV2LaneSegment, resolveV2LaneInsertTrack } from "./PixelBgrV2LaneInsert";

const asset={id:"fallback",url:"/fallback.png"};
const segment={id:"far-a",startTrackX:0,widthPx:160,asset,offsetY:4,opacity:1,blend:"normal" as const,localZ:0,enabled:true};
const scene:BackgroundSceneV2={version:2,id:"insert",environment:{},tracks:[
  {id:"far-a",name:"Far A",role:"far",mode:"sequence",enabled:true,parallax:{x:.25,y:.25},zBase:0,segments:[segment],objects:[]},
  {id:"far-b",name:"Far B",role:"far",mode:"sequence",enabled:true,parallax:{x:.5,y:.5},zBase:0,segments:[],objects:[]},
  {id:"mid-zero",name:"Mid",role:"mid",mode:"sequence",enabled:true,parallax:{x:0,y:0},zBase:0,segments:[],objects:[]},
]};
const original=structuredClone(scene);const projection=projectBackgroundV2Timeline(scene,{},100);const far=projection.lanes.find(lane=>lane.id==="far")!;const mid=projection.lanes.find(lane=>lane.id==="mid")!;
assert.equal(resolveV2LaneInsertTrack(scene,far,"far-b")?.id,"far-b","same-lane selection wins");
assert.equal(resolveV2LaneInsertTrack(scene,far,"mid-zero")?.id,"far-a","another-lane selection falls back to lane.tracks[0]");
const addedSegment=insertV2LaneSegment(scene,"far-a",100,asset,"far-a");assert(addedSegment.ok);if(!addedSegment.ok)throw Error(addedSegment.error);assert.equal(addedSegment.scene.tracks[0].segments.at(-1)?.startTrackX,32);assert.equal(addedSegment.segmentId,"far-a-segment-copy");
const addedObject=insertV2LaneObject(scene,"far-b",100,asset);assert(addedObject.ok);if(!addedObject.ok)throw Error(addedObject.error);assert.equal(addedObject.scene.tracks[1].objects[0].startTrackX,50);assert.equal(addedObject.scene.tracks[1].objects[0].y,0);assert.equal(addedObject.objectId,"far-b-object-copy");
assert.equal(insertV2LaneSegment(scene,"mid-zero",100,asset).ok,false);assert.equal(insertV2LaneObject(scene,"mid-zero",100,asset).ok,false);assert.deepEqual(scene,original,"insertion never mutates scene input");
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(source,/for\(const lane of projection\.lanes\)[\s\S]*?className="cm-v2-lane-add"/);assert.match(source,/position:sticky;left:3px/);assert.match(source,/timeline\.style\.width=`\$\{scale\.widthPx\}px`/);assert.match(source,/title=`Add to \$\{lane\.label\}`/);assert.match(source,/button\("Segment"/);assert.match(source,/button\("Object"/);
console.log("[SMOKE] PixelBgrV2LaneInsert OK ✅");
