import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clearBackgroundState, enableB2BackgroundSceneDemo, getBackgroundScene, getBackgroundState, setBackgroundScene, subscribeBackgroundState, clearBackgroundPreviewState, setBackgroundPreviewState, stepBackgroundPreviewState } from "../render/BackgroundState";
import { addChunk, addLayer, cloneScene, createDemoScene, deleteChunk, deleteLayer, duplicateChunk, duplicateLayer, moveChunk, moveLayer } from "./PixelBgrLabState";
import { exportBackgroundScene, importBackgroundSceneJson, parseDraftPayload, serializeDraft } from "./PixelBgrLabSerialization";
import { validateBackgroundScene } from "./PixelBgrLabValidation";
import { pixelBgrLabButtonLabel, togglePixelBgrLab, type PixelBgrLabController } from "./PixelBgrLabAccess";

const root: any = {};
let calls = 0;
const off = subscribeBackgroundState(() => calls++);
clearBackgroundState(root);
assert.equal(getBackgroundState(root), null);
const b2 = enableB2BackgroundSceneDemo(root);
assert.equal(b2.source?.kind, "scene");
assert.equal(getBackgroundScene(root)?.chunks.length, 2);
setBackgroundScene(createDemoScene(), root);
assert.ok(calls >= 2);
off();
clearBackgroundState(root);
assert.equal(getBackgroundState(root), null);

const scene = createDemoScene();
assert.equal(validateBackgroundScene(scene).valid, true);
assert.equal(validateBackgroundScene({ ...scene, id: "" }).valid, false);
assert.equal(validateBackgroundScene({ ...scene, chunks: [{ ...scene.chunks[0] }, { ...scene.chunks[0] }] }).valid, false);
assert.equal(validateBackgroundScene({ ...scene, chunks: [{ ...scene.chunks[0], length: 0 }] }).valid, false);
assert.equal(validateBackgroundScene({ ...scene, globalLayers: [scene.globalLayers[0], scene.globalLayers[0]] }).valid, false);
const sameLayerIds = { ...scene, chunks: [{ ...scene.chunks[0], id: "a" }, { ...scene.chunks[1], id: "b", layers: [{ ...scene.chunks[0].layers[0] }] }] };
assert.equal(validateBackgroundScene(sameLayerIds).valid, true);
assert.equal(validateBackgroundScene({ ...scene, globalLayers: [{ ...scene.globalLayers[1], texture: { url: "", filtering: "nearest" } }] }).valid, false);
assert.equal(validateBackgroundScene({ ...scene, globalLayers: [{ ...scene.globalLayers[1], opacity: Number.NaN }] }).valid, false);
assert.ok(validateBackgroundScene({ ...scene, chunks: [{ ...scene.chunks[0], length: 900 }, scene.chunks[1]] }).warnings.some(w => w.message.includes("overlap")));
assert.ok(validateBackgroundScene({ ...scene, chunks: [scene.chunks[0], { ...scene.chunks[1], startX: 2000 }] }).warnings.some(w => w.message.includes("gap")));

const exported = exportBackgroundScene(scene);
const imported = importBackgroundSceneJson(exported);
assert.equal(imported.ok, true);
assert.deepEqual(imported.ok ? imported.scene : null, scene);
assert.equal(importBackgroundSceneJson('{').ok, false);
assert.equal(importBackgroundSceneJson(JSON.stringify({ format: "bad", version: 1, scene })).ok, false);
const prior = cloneScene(scene);
assert.deepEqual(prior, scene);
assert.deepEqual(parseDraftPayload(serializeDraft(scene)), scene);
assert.equal(parseDraftPayload(JSON.stringify({ version: 99, scene })), null);

const src = createDemoScene();
const withChunk = addChunk(src);
assert.notEqual(withChunk, src);
assert.equal(src.chunks.length + 1, withChunk.chunks.length);
const dupChunk = duplicateChunk(src, src.chunks[0].id);
assert.equal(new Set(dupChunk.chunks.map(c=>c.id)).size, dupChunk.chunks.length);
assert.equal(deleteChunk(dupChunk, dupChunk.chunks[2].id).chunks.length, 2);
assert.equal(moveChunk(src, src.chunks[1].id, -1).chunks[0].id, src.chunks[1].id);
const withLayer = addLayer(src, { kind: "global" });
assert.equal(withLayer.globalLayers.length, src.globalLayers.length + 1);
const dupLayer = duplicateLayer(src, { kind: "global" }, src.globalLayers[0].id);
assert.equal(new Set(dupLayer.globalLayers.map(l=>l.id)).size, dupLayer.globalLayers.length);
assert.equal(deleteLayer(dupLayer, { kind: "global" }, dupLayer.globalLayers.at(-1)!.id).globalLayers.length, src.globalLayers.length);
assert.equal(moveLayer(src, { kind: "global" }, src.globalLayers[1].id, -1).globalLayers[0].id, src.globalLayers[1].id);

clearBackgroundPreviewState(root);
assert.equal(setBackgroundPreviewState({ enabled: true, paused: false, scrollX: -10, speed: 30 }, root).scrollX, -10);
assert.equal(stepBackgroundPreviewState({ enabled: true, paused: false, scrollX: -10, speed: 30 }, 0.5).scrollX, 5);
assert.equal(stepBackgroundPreviewState({ enabled: true, paused: true, scrollX: -10, speed: 30 }, 0.5).scrollX, -10);
assert.equal(setBackgroundPreviewState({ scrollX: Number.NaN }, root).scrollX, 0);

let open = false;
let toggles = 0;
const controller: PixelBgrLabController = {
  open: () => { open = true; },
  close: () => { open = false; },
  toggle: () => { toggles++; open = !open; },
  isOpen: () => open,
};
assert.equal(pixelBgrLabButtonLabel(false), "Pixel BGR Lab");
assert.equal(pixelBgrLabButtonLabel(true), "Close Pixel BGR Lab");
togglePixelBgrLab(controller);
assert.equal(open, true);
togglePixelBgrLab(controller);
assert.equal(open, false);
assert.equal(toggles, 2);

const mainSource = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
for (const hook of ["visual:", "desert:", "clear:"]) {
  assert(mainSource.includes(hook), `BGR verification hook remains available: ${hook}`);
}

console.log("[SMOKE] PixelBgrLab OK ✅");
