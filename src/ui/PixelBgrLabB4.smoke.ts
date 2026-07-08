import assert from "node:assert/strict";
import { BACKGROUND_ASSET_CATALOG, findBackgroundAsset } from "./PixelBgrLabAssets";
import { assignAssetToSpriteLayer, cloneScene, createSpriteLayer, nudgeSpriteLayer, updateSelectedSpriteOffset } from "./PixelBgrLabState";
import { clientPointToInternalPoint, layerRenderedOrigin, renderedOriginToAuthoredOffset, resolveCanvasViewportRect } from "./PixelBgrLabCoordinates";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";

const vp = resolveCanvasViewportRect({ left: 0, top: 0, width: 896, height: 504 }, 896, 504)!;
assert.deepEqual(clientPointToInternalPoint({ x: 448, y: 252 }, vp, 896, 504), { x: 448, y: 252 });
const scaled = resolveCanvasViewportRect({ left: 10, top: 20, width: 1792, height: 1008 }, 896, 504)!;
assert.deepEqual(clientPointToInternalPoint({ x: 906, y: 524 }, scaled, 896, 504), { x: 448, y: 252 });
const letter = resolveCanvasViewportRect({ left: 0, top: 0, width: 1000, height: 1000 }, 896, 504)!;
assert.equal(clientPointToInternalPoint({ x: 500, y: 10 }, letter, 896, 504), null);
assert.equal(clientPointToInternalPoint({ x: -1, y: -1 }, vp, 896, 504), null);
const ipad = resolveCanvasViewportRect({ left: 0, top: 0, width: 1024, height: 768 }, 896, 504)!;
assert.ok(ipad.top > 0 && ipad.height < 768);

const layer = createSpriteLayer("s");
layer.offset = { x: 100, y: 20 }; layer.parallax = { x: 0.5, y: 0 };
assert.deepEqual(layerRenderedOrigin(layer, { kind: "global" }, { x: 40, y: 0 }), { x: 80, y: 20 });
assert.deepEqual(renderedOriginToAuthoredOffset({ x: 80, y: 20 }, layer, { kind: "global" }, { x: 40, y: 0 }), { x: 100, y: 20 });
assert.deepEqual(renderedOriginToAuthoredOffset({ x: 180, y: 20 }, layer, { kind: "chunk", chunkStartX: 200 }, { x: 40, y: 0 }), { x: 0, y: 20 });

const scene: BackgroundScene = { id: "b4", globalLayers: [layer, { id:"shader", kind:"shader", enabled:true, presetIndex:0 } as any], chunks: [{ id: "A", startX: 200, length: 300, layers: [createSpriteLayer("chunk-s")] }] };
const before = cloneScene(scene);
let next = updateSelectedSpriteOffset(scene, { kind:"global" }, "s", { x: 10.4, y: 11.6 }, "integer");
assert.equal((next.globalLayers[0] as any).offset.x, 10);
assert.equal((next.globalLayers[0] as any).offset.y, 12);
assert.deepEqual(scene, before);
next = updateSelectedSpriteOffset(scene, { kind:"chunk", chunkId:"A" }, "chunk-s", { x: 1.25, y: 2.5 }, "fractional");
assert.equal((next.chunks[0].layers[0] as any).offset.x, 1.25);
for (const step of [1,2,4,8]) {
  const moved = nudgeSpriteLayer(scene, { kind:"global" }, "s", step, -step, "integer");
  assert.equal((moved.globalLayers[0] as any).offset.x, 100 + step);
}
assert.equal(nudgeSpriteLayer(scene, { kind:"global" }, "missing", 1, 1), scene);
assert.equal((nudgeSpriteLayer(scene, { kind:"global" }, "shader", 1, 1).globalLayers[1] as any).kind, "shader");
const assigned = assignAssetToSpriteLayer(scene, { kind:"global" }, "s", "/manual.png");
assert.equal((assigned.globalLayers[0] as any).texture.url, "/manual.png");
assert.equal((scene.globalLayers[0] as any).texture.url, "/assets/bg/b1_pixel_stars.svg");

const ids = new Set<string>();
for (const a of BACKGROUND_ASSET_CATALOG) { assert.equal(a.kind, "sprite"); assert.ok(a.url.length); assert.ok(a.label.includes("Technical") || a.technical === false); assert.ok(!ids.has(a.id)); ids.add(a.id); }
assert.ok(findBackgroundAsset("b1-technical-stars-svg"));
console.log("[SMOKE] PixelBgrLabB4 OK ✅");
