import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { applyV2SegmentDrag, calculateV2SegmentOverlaps, canAuthorV2Segments, createV2Segment, deleteV2Segment, duplicateV2Segment, findV2Segment, MIN_V2_SEGMENT_WIDTH, updateV2Segment, V2_DUPLICATE_OFFSET_PX, V2_PARALLAX_AUTHORING_POLICY } from "./PixelBgrV2SegmentEditing";

const asset = { id: "stars", url: "/stars.png" };
const segment = (id:string,startTrackX:number,widthPx:number)=>({ id,startTrackX,widthPx,asset,offsetY:2,opacity:.8,blend:"normal" as const,localZ:3,fadeInPx:4,fadeOutPx:5,enabled:true });
const scene: BackgroundSceneV2 = { version:2,id:"m6",environment:{starfield:{seed:4,density:.2}},tracks:[
  {id:"far",name:"Far",role:"far",mode:"sequence",enabled:true,parallax:{x:.1,y:.1},zBase:-2,segments:[segment("far-a",0,800)],objects:[]},
  {id:"mid",name:"Mid",role:"mid",mode:"sequence",enabled:true,parallax:{x:.4,y:.4},zBase:0,segments:[segment("mid-a",0,540)],objects:[]},
  {id:"near",name:"Near",role:"near",mode:"sequence",enabled:true,parallax:{x:.8,y:.8},zBase:2,segments:[segment("near-a",250,670)],objects:[{id:"untouched-object",asset,startTrackX:8,y:9,localZ:0,opacity:1,blend:"normal",enabled:true}]},
  {id:"repeat",name:"Repeat",role:"custom",mode:"repeat",enabled:true,parallax:{x:.2,y:.2},zBase:0,segments:[segment("repeat-a",0,100)],objects:[]},
]};
const original=structuredClone(scene);
const created=createV2Segment(scene,"mid",600,"mid-a"); assert(created.ok); if(!created.ok) throw Error(created.error);
assert.equal(created.segmentId,"mid-segment-copy"); assert.equal(findV2Segment(created.scene,"mid",created.segmentId)?.startTrackX,608); assert.equal(findV2Segment(created.scene,"mid",created.segmentId)?.widthPx,540);
assert.deepEqual(created.scene.environment,scene.environment); assert.strictEqual(created.scene.tracks[0],scene.tracks[0]); assert.strictEqual(created.scene.tracks[2],scene.tracks[2]);
const duplicated=duplicateV2Segment(scene,"far","far-a"); assert(duplicated.ok); if(!duplicated.ok) throw Error(duplicated.error);
const copy=findV2Segment(duplicated.scene,"far",duplicated.segmentId)!; assert.equal(copy.id,"far-a-copy"); assert.equal(copy.startTrackX,V2_DUPLICATE_OFFSET_PX); assert.deepEqual({...copy,id:"far-a",startTrackX:0},scene.tracks[0].segments[0]);
const deleted=deleteV2Segment(created.scene,"mid",created.segmentId); assert(deleted.ok); if(deleted.ok){assert.equal(deleted.segmentId,"mid-a");assert.deepEqual(deleted.scene.tracks[1].segments,scene.tracks[1].segments);}
const moved=applyV2SegmentDrag(scene,"near","near-a","move",-999); assert(moved.ok); if(moved.ok){const next=findV2Segment(moved.scene,"near","near-a")!;assert.equal(next.startTrackX,0);assert.equal(next.widthPx,670);assert.deepEqual(moved.scene.tracks[0].segments[0],scene.tracks[0].segments[0]);}
const right=applyV2SegmentDrag(scene,"mid","mid-a","resize-right",-999); assert(right.ok); if(right.ok){const next=findV2Segment(right.scene,"mid","mid-a")!;assert.equal(next.startTrackX,0);assert.equal(next.widthPx,MIN_V2_SEGMENT_WIDTH);}
const left=applyV2SegmentDrag(scene,"near","near-a","resize-left",100); assert(left.ok); if(left.ok){const next=findV2Segment(left.scene,"near","near-a")!;assert.equal(next.startTrackX,352);assert.equal(next.startTrackX+next.widthPx,920);}
assert.deepEqual(calculateV2SegmentOverlaps([segment("a",0,100),segment("b",100,20)]),[]);
assert.deepEqual(calculateV2SegmentOverlaps([segment("a",0,100),segment("b",80,50)]),[{startX:80,endX:100,segmentIds:["a","b"]}]);
assert.deepEqual(calculateV2SegmentOverlaps([segment("a",0,100),segment("b",20,40)]),[{startX:20,endX:60,segmentIds:["a","b"]}]);
assert.equal(canAuthorV2Segments(scene.tracks[0]),true); assert.equal(canAuthorV2Segments(scene.tracks[3]),false);
assert.equal(duplicateV2Segment(scene,"repeat","repeat-a").ok,false); assert.equal(createV2Segment(scene,"missing",0).ok,false);
assert.equal(updateV2Segment(scene,"far","far-a",{widthPx:0}).ok,false); assert.equal(updateV2Segment(scene,"far","far-a",{startTrackX:Number.NaN}).ok,false); assert.equal(updateV2Segment(scene,"far","far-a",{opacity:2}).ok,false);
assert.equal(V2_PARALLAX_AUTHORING_POLICY,"choice-required-before-track-parallax-edit");
assert.deepEqual(scene,original); assert.deepEqual(scene.tracks.map(t=>t.segments.map(s=>s.id)),[["far-a"],["mid-a"],["near-a"],["repeat-a"]]);
console.log("[SMOKE] PixelBgrV2SegmentEditing OK ✅");
