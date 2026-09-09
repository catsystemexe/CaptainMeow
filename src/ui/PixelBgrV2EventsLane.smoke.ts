import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";
const scene:BackgroundSceneV2={version:2,id:"lane",environment:{},tracks:[],events:[{id:"boss",type:"signal",name:"boss-start",worldX:8200,enabled:true},{id:"end",type:"level-end",worldX:12000,enabled:true}]};
const projection=projectBackgroundV2Timeline(scene,{},400);assert.equal(projection.lanes.length,4);assert.deepEqual(projection.events.map(event=>[event.label,event.worldX]),[["boss-start",8200],["END",12000]]);assert.equal(projection.bounds.endX,12000);
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");assert.match(source,/eventsLabel\.textContent="Events"/);assert.match(source,/◇ \$\{event\.label\}/);assert.match(source,/"▼ END"/);assert.doesNotMatch(source,/eventsGutter[\s\S]{0,300}cm-v2-parallax/);
console.log("[SMOKE] PixelBgrV2EventsLane OK ✅");
