import assert from "node:assert/strict";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { createDemoScene } from "./PixelBgrLabState";
import { PIXEL_BGR_LAB_TAB_LABELS, PIXEL_BGR_LAB_TABS, normalizePixelBgrLabTab, pixelBgrLabTabAfterLayerDelete, pixelBgrLabTabForSelection } from "./PixelBgrLabUI";

assert.deepEqual([...PIXEL_BGR_LAB_TABS], ["scene", "chunks", "layers", "properties", "placement"]);
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.scene, "Scene");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.chunks, "Chunks");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.layers, "Layers");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.properties, "Properties");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.placement, "Placement");
assert.equal(normalizePixelBgrLabTab("scene"), "scene");
assert.equal(normalizePixelBgrLabTab("placement"), "placement");
assert.equal(normalizePixelBgrLabTab("bad", "chunks"), "chunks");
assert.equal(normalizePixelBgrLabTab(undefined), "scene");
assert.equal(pixelBgrLabTabForSelection(false), "scene");
assert.equal(pixelBgrLabTabForSelection(true, "shader"), "properties");
assert.equal(pixelBgrLabTabForSelection(true, "sprite"), "properties");
assert.equal(pixelBgrLabTabForSelection(true, "sprite", true), "placement");
assert.equal(pixelBgrLabTabAfterLayerDelete("placement", false), "layers");
assert.equal(pixelBgrLabTabAfterLayerDelete("properties", false), "layers");
assert.equal(pixelBgrLabTabAfterLayerDelete("chunks", false), "chunks");
assert.equal(pixelBgrLabTabAfterLayerDelete("placement", true), "placement");

const scene = createDemoScene();
const before: BackgroundScene = JSON.parse(JSON.stringify(scene));
normalizePixelBgrLabTab("layers");
pixelBgrLabTabForSelection(true, "sprite", true);
pixelBgrLabTabAfterLayerDelete("properties", false);
assert.deepEqual(scene, before);
assert.ok(scene.globalLayers.some(layer => layer.kind === "sprite"));

console.log("[SMOKE] PixelBgrLabB4DockedLayout OK ✅");
