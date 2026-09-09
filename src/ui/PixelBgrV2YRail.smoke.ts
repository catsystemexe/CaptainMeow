import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { v2YRailValue } from "./PixelBgrV2YRail";
const drag={pointerId:1,startClientY:100,originalY:-20,logicPerClientPx:2};assert.equal(v2YRailValue(drag,110),0);assert.equal(v2YRailValue(drag,90),-40);assert.equal(v2YRailValue(drag,10000),19780,"rail is not canonically bounded");
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");assert.match(source,/if\(!segment&&!object\)[\s\S]*?return surface/);assert.match(source,/if\(contextualY\.dataset\.contextualY[^)]*\)this\.workspace\.left\.appendChild\(this\.renderV2YRail/);assert.match(source,/setPointerCapture/);assert.match(source,/releasePointerCapture/);assert.match(source,/logicH\/rect\.height/);assert.match(source,/\{offsetY:y\}/);assert.match(source,/\{y\}\)/);
assert.match(source,/width:21px;background:/,"rail has a visibly thicker interaction surface");assert.match(source,/width:21px;height:21px/,"rail thumb is approximately three times its prior size");assert.match(source,/drag\.thumb\?\.style\.setProperty\("transform"/,"rail thumb visibly tracks pointer movement");
console.log("[SMOKE] PixelBgrV2YRail OK ✅");
