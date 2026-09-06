import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { createDemoScene } from "./PixelBgrLabState";
import { PIXEL_BGR_LAB_TAB_LABELS, PIXEL_BGR_LAB_TABS, normalizePixelBgrLabTab, pixelBgrLabTabAfterLayerDelete, pixelBgrLabTabForSelection } from "./PixelBgrLabUI";

assert.deepEqual([...PIXEL_BGR_LAB_TABS], ["scene", "chunks", "layers", "properties", "placement", "markers"]);
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.scene, "Scene");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.chunks, "Chunks");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.layers, "Layers");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.properties, "Properties");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.placement, "Placement");
assert.equal(PIXEL_BGR_LAB_TAB_LABELS.markers, "Markers");
assert.equal(normalizePixelBgrLabTab("scene"), "scene");
assert.equal(normalizePixelBgrLabTab("placement"), "placement");
assert.equal(normalizePixelBgrLabTab("markers"), "markers");
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

const labUiSource = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const labRule = labUiSource.match(/\.cm-pixel-bgr-lab\{([^}]*)\}/)?.[1] ?? "";
assert.match(labRule, /position:relative/, "Lab geometry is owned by its perimeter dock rather than a fixed overlay");
assert.match(labRule, /width:100%;height:100%/, "Lab fills its bounded left dock");
assert.match(labRule, /overflow:visible;display:flex;flex-direction:column;min-height:0/, "the Lab delegates scrolling to its outer dock");
assert.match(labRule, /pointer-events:none/, "the fixed Lab root does not create a larger hit region than its controls");
assert.match(labUiSource, /\.cm-pixel-bgr-lab>:not\(style\)\{pointer-events:auto\}/, "visible Lab control surfaces remain pointer-interactive");
for (const selector of [".cm-pixel-bgr-lab button", ".cm-pixel-bgr-lab input", ".cm-pixel-tab-body", ".cm-timeline", ".cm-v2-timeline"]) {
  assert(labUiSource.includes(selector), `Lab control remains addressable: ${selector}`);
}

console.log("[SMOKE] PixelBgrLabB4DockedLayout OK ✅");
