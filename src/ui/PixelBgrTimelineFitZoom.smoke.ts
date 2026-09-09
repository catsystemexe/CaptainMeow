import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fitV2TimelineZoom, PIXEL_BGR_TIMELINE_ZOOM_LEVELS } from "./PixelBgrLabUI";
assert.equal(fitV2TimelineZoom(1000,500),.5);assert.equal(fitV2TimelineZoom(1200,500),.2);assert(PIXEL_BGR_TIMELINE_ZOOM_LEVELS.includes(fitV2TimelineZoom(9999,320)));
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(source,/zoomControls\.append\(zoomOut,zoomFit,zoomIn\)/);
const fit=source.slice(source.indexOf("private fitV2Timeline"),source.indexOf("private selectV2Track"));
assert.match(fit,/segment\.startX,segment\.endX/);assert.doesNotMatch(fit,/setCurrentX|setBackgroundSceneV2/);
console.log("[SMOKE] PixelBgrTimelineFitZoom OK ✅");
