import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { v2YRailValue } from "./PixelBgrV2YRail";

const drag={pointerId:1,startClientY:100,originalY:-20,logicPerClientPx:2};
assert.equal(v2YRailValue(drag,110),0);
assert.equal(v2YRailValue(drag,90),-40);
assert.equal(v2YRailValue(drag,10000),19780,"rail is not canonically bounded");

const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
const method=(name:string,next:string)=>source.slice(source.indexOf(`private ${name}`),source.indexOf(`private ${next}`));
assert.doesNotMatch(method("selectV2Event","selectV2Track"),/v2SelectedSegmentId|v2SelectedObjectId/,"Event selection preserves visual selection");
assert.doesNotMatch(method("selectV2Segment","selectV2Object"),/v2SelectedEventId/,"segment selection preserves Event selection");
assert.doesNotMatch(method("selectV2Object","renderV2EventSurface"),/v2SelectedEventId/,"object selection preserves Event selection");
assert.match(source,/panel\.classList\.add\("has-y-rail"\);const rail=this\.renderV2YRail\(\)/,"every V2 timeline render mounts the rail");
assert.match(source,/panel\.append\(rail,scroll\)/,"the persistent rail is directly adjacent to the timeline viewport");
assert.match(source,/rail\.dataset\.yRail=segment\|\|object\?"selection":"neutral"/,"rail state depends only on visual selection");
assert.match(source,/rail\.setAttribute\("aria-disabled",String\(!segment&&!object\)\);if\(!segment&&!object\)return rail/,"neutral rail is disabled and has no thumb or drag handler");
assert.match(source,/if\(segment\|\|object\)rail\.dataset\.contextKind=segment\?"segment":"object"/,"segment and object selections identify rail ownership");
assert.match(source,/grid-template-columns:21px minmax\(0,1fr\);grid-template-rows:172px/,"center layout reserves only the persistent rail and timeline columns");
assert.doesNotMatch(source,/grid-template-columns:42px 21px/,"readout consumes no standalone center column");
assert.match(source,/\.cm-v2-panel\.has-y-rail \.cm-v2-timeline-scroll\{grid-column:2;grid-row:1;width:auto;min-width:0\}/,"timeline geometry is selection-independent");
assert.match(source,/width:21px;min-height:155px;background:/,"rail has a visible persistent interaction surface");
assert.match(source,/width:21px;height:21px/,"active rail thumb remains visible");
assert.match(source,/drag\.thumb\?\.style\.setProperty\("transform"/,"rail thumb tracks pointer movement");
assert.match(source,/\{offsetY:y\}/);assert.match(source,/\{y\}\)/);
console.log("[SMOKE] PixelBgrV2YRail OK ✅");
