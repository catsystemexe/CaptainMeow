import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { applyV2SegmentDrag, findV2Segment } from "./PixelBgrV2SegmentEditing";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";

const asset={id:"test",url:"/test.png"};
const scene:BackgroundSceneV2={version:2,id:"world-projection",environment:{},tracks:[1,.5,.25,0].map((x,index)=>({id:`track-${index}`,name:`Track ${index}`,role:index===3?"far":"mid",mode:"sequence" as const,enabled:true,parallax:{x,y:x},zBase:index,segments:[{id:`segment-${index}`,startTrackX:100,widthPx:100,asset,offsetY:0,opacity:1,blend:"normal" as const,localZ:0,enabled:true}],objects:[{id:`object-${index}`,asset,startTrackX:100,y:0,width:50,localZ:0,opacity:1,blend:"normal" as const,enabled:true}]}))};
const projection=projectBackgroundV2Timeline(scene);
const tracks=projection.lanes.flatMap(lane=>lane.tracks);
assert.deepEqual(tracks.slice(0,3).map(track=>track.segments[0].widthPx),[100,200,400]);
assert.deepEqual(tracks.slice(0,3).map(track=>track.segments[0].startX),[100,200,400]);
assert.deepEqual(tracks.slice(0,3).map(track=>[track.objects[0].x,track.objects[0].width]),[[100,50],[200,100],[400,200]]);
assert.equal(tracks[3].projectable,false);assert.deepEqual(tracks[3].segments,[]);assert.deepEqual(tracks[3].objects,[]);
const beforePlayer=projection.playerX;
const moved=applyV2SegmentDrag(scene,"track-1","segment-1","move",100);assert(moved.ok);if(moved.ok)assert.equal(findV2Segment(moved.scene,"track-1","segment-1")?.startTrackX,144,"world delta is converted and snapped in track-space");
const unit=applyV2SegmentDrag(scene,"track-0","segment-0","resize-right",100);assert(unit.ok);if(unit.ok)assert.equal(findV2Segment(unit.scene,"track-0","segment-0")?.widthPx,204,"parallax 1 retains existing snapped behavior");
assert.equal(projection.playerX,beforePlayer,"model editing does not mutate Player X");
console.log("[SMOKE] PixelBgrV2WorldTimelineProjection OK ✅");
