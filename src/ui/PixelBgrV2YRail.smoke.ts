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
assert.match(source,/const contextualY=this\.renderV2ContextualYSurface\(\);if\(contextualY\.dataset\.contextualY==="selection"\)/,"the mounted timeline derives rail presence from a resolved visual selection");
assert.match(source,/surface\.dataset\.contextKind=segment\?"segment":"object"/,"resolved segment and object paths identify contextual ownership");
assert.match(source,/panel\.dataset\.contextKind=contextualY\.dataset\.contextKind/,"simultaneous Event and visual selection keeps rail ownership with resolved visual context");
assert.match(source,/panel\.append\(contextualY,this\.renderV2YRail\(\),scroll\)/,"readout, rail, and timeline are mounted in visual order");
assert.match(source,/if\(!segment&&!object\)return el\("section","cm-v2-selected-y"\)/,"Event-only state has no resolved visual context");
assert.match(source,/else panel\.appendChild\(scroll\)/,"Event-only state with no visual selection mounts no rail");
assert.match(source,/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/,"the complete panel is mounted into the center-owned timeline workspace");
assert.match(source,/grid-template-columns:42px 21px minmax\(0,1fr\);grid-template-rows:172px/,"rail owns a dedicated column before the timeline");
assert.match(source,/\.cm-v2-panel\.has-y-rail \.cm-v2-timeline-scroll\{grid-column:3;grid-row:1;width:auto;min-width:0\}/,"the timeline is constrained to its third grid column");
assert.match(source,/width:21px;min-height:155px;background:/,"rail has a visible interaction surface");
assert.match(source,/width:21px;height:21px/,"rail thumb remains visible");
assert.match(source,/drag\.thumb\?\.style\.setProperty\("transform"/,"rail thumb tracks pointer movement");
assert.match(source,/\{offsetY:y\}/);assert.match(source,/\{y\}\)/);
console.log("[SMOKE] PixelBgrV2YRail OK ✅");
