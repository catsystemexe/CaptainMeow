import assert from "node:assert/strict";
import { dragRange, markerTimelineWorldX, moveZone, rangeTimelineWorldX, zoneToCanvasRect } from "./SceneLogicSpaceProjection";
const range={id:"range_1",start:100,end:200};assert.equal(markerTimelineWorldX(42),42);assert.deepEqual(rangeTimelineWorldX(range),{startX:100,endX:200});assert.deepEqual(dragRange(range,"move",25),{start:125,end:225});assert.deepEqual(dragRange(range,"resize-left",150),{start:200,end:200});assert.deepEqual(dragRange(range,"resize-right",-150),{start:100,end:100});
const zone={id:"zone_1",minX:100,maxX:300,minY:50,maxY:150};assert.deepEqual(zoneToCanvasRect(zone,{x:25,y:10}),{x:75,y:40,width:200,height:100});const moved=moveZone(zone,{x:12,y:-8});assert.deepEqual(moved,{minX:112,maxX:312,minY:42,maxY:142});assert.equal(moved.maxX-moved.minX,200);assert.equal(moved.maxY-moved.minY,100);
console.log("SceneLogicSpaceProjection.smoke: PASS");
