import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
const layoutSource=readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts",import.meta.url),"utf8");

assert.equal(source.match(/dataset\.inspector="selection"/g)?.length,1,"one contextual inspector owns V2 selection presentation");
assert.match(source,/if\(this\.selectedV2Object\(\)\)\{inspector\.append\(this\.inspectorHeading\("OBJECT"[\s\S]*?this\.renderV2ObjectInspector\(\)/,"object selection renders the existing object editor in the contextual inspector");
assert.match(source,/if\(this\.selectedV2Segment\(\)\)\{inspector\.append\(this\.inspectorHeading\("SEGMENT"[\s\S]*?this\.renderV2SegmentInspector\(\)/,"segment selection renders the existing segment editor in the contextual inspector");
assert.match(source,/if\(track\)\{inspector\.append\(this\.inspectorHeading\("TRACK"[\s\S]*?this\.renderV2TrackInspector\(track\)/,"track-only selection renders track details");
assert.match(source,/inspector\.append\(this\.inspectorHeading\("SCENE"[\s\S]*?scene\.tracks\.length/,"no item selection renders useful scene status");

assert.match(source,/selectV2Track\(trackId:string,render=true\):void \{this\.v2SelectedTrackId=trackId;this\.v2SelectedSegmentId="";this\.v2SelectedObjectId=""/,"track selection clears item selection");
assert.match(source,/selectV2Segment\(trackId:string,segmentId:string,render=true\):void \{this\.v2SelectedTrackId=trackId;this\.v2SelectedSegmentId=segmentId;this\.v2SelectedObjectId=""/,"segment selection clears object selection");
assert.match(source,/selectV2Object\(trackId:string,objectId:string,render=true\):void \{this\.v2SelectedTrackId=trackId;this\.v2SelectedSegmentId="";this\.v2SelectedObjectId=objectId/,"object selection clears segment selection");
assert.equal(source.match(/private v2SelectedSegmentId/g)?.length,1,"selection remains owned by the existing Lab state");
assert.equal(source.match(/private v2SelectedObjectId/g)?.length,1,"no duplicate object selection model is introduced");

assert(source.includes("this.workspace.left.appendChild(this.root)"),"the Lab-owned inspector state remains mounted transitionally within the left BGR Lab");
assert(source.includes("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))"),"the timeline remains mounted in workspace.timeline");
assert.match(layoutSource,/\.cm-bgr-workspace-right \{[\s\S]*?overflow: auto;/,"the right region retains internal overflow ownership");
assert.match(layoutSource,/\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: hidden;/,"compact timeline has no vertical-scroll dependency");
assert.match(source,/\.cm-v2-timeline-scroll\{[^}]*overflow-x:auto;overflow-y:hidden/,"P1.3 inner horizontal timeline scrolling remains intact");

console.log("[SMOKE] PixelBgrV2ContextualInspector OK ✅");
