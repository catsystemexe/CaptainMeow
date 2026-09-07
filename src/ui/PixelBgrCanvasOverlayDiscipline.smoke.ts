import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clientPointToInternalPoint, resolveCanvasViewportRect } from "./PixelBgrLabCoordinates";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const css = source.match(/style\.textContent = `([^`]+)`/)?.[1] ?? "";
const sync = source.slice(source.indexOf("private syncOverlay"), source.indexOf("private pointerInternal"));
const placement = source.slice(source.indexOf("private syncV2Overlay"), source.indexOf("private pointerInternal"));
const pointerDown = source.slice(source.indexOf("private onPointerDown"), source.indexOf("private onPointerMove"));

assert.match(css, /\.cm-bgr-placement-overlay\{[^}]*pointer-events:none;overflow:hidden/, "placement overlay is pointer-transparent and clips descendants to the canvas viewport");
assert.doesNotMatch(source, /syncV2SelectionOverlay|V2 canvas selection · cyan segments · purple objects/, "default V2 path has no generic segment/object canvas overlay");
assert.match(sync, /if\(v2Scene&&this\.v2PlacementTarget\)\{this\.syncV2Overlay\(v2Scene\);return;\}[\s\S]*if\(v2Scene\)\{this\.removeOverlay\(\);return;\}/, "V2 creates an overlay only in explicit placement mode");
assert.equal((placement.match(/el\("div","cm-bgr-placement-box"\)/g) ?? []).length, 1, "explicit placement creates one relevant target");
assert.match(placement, /overlay\.style\.pointerEvents="none"[\s\S]*box\.style\.pointerEvents="auto"/, "only the explicit target is pointer-active");
assert.match(pointerDown, /closest\("\.cm-bgr-placement-box"\)\)return;const p=this\.pointerInternal\(e\);if\(!p\)return;/, "drag start requires both the explicit target and a point inside the canvas");

const viewport = resolveCanvasViewportRect({ left: 100, top: 50, width: 896, height: 504 }, 896, 504)!;
assert.equal(clientPointToInternalPoint({ x: 99, y: 200 }, viewport, 896, 504), null, "left-of-canvas input is rejected");
assert.equal(clientPointToInternalPoint({ x: 400, y: 555 }, viewport, 896, 504), null, "below-canvas input is rejected");
assert.deepEqual(clientPointToInternalPoint({ x: 100, y: 50 }, viewport, 896, 504), { x: 0, y: 0 }, "visible canvas edge remains interactive");

console.log("[SMOKE] PixelBgrCanvasOverlayDiscipline OK ✅");
