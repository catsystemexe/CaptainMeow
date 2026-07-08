import assert from "node:assert/strict";
import { setBackgroundPreviewState } from "../render/BackgroundState";
import { createDemoScene, updateChunk, updateLayer, type LayerOwner } from "./PixelBgrLabState";
import { clampNumericValue, decimalPlacesForStep, normalizeSteppedValue, stepNumericValue, toggleValidationExpanded, validationSummaryState } from "./PixelBgrLabNumeric";
import { validateBackgroundScene, type PixelBgrIssue } from "./PixelBgrLabValidation";

assert.equal(decimalPlacesForStep(0.05), 2);
assert.equal(normalizeSteppedValue(0.1 + 0.2, 0.05), 0.3);
assert.equal(clampNumericValue(2, 0, 1), 1);
assert.equal(stepNumericValue(0.5, 1, { step: 0.05, min: 0, max: 1 }), 0.55);
assert.equal(stepNumericValue(0.5, -1, { step: 0.05, min: 0, max: 1 }), 0.45);
assert.equal(stepNumericValue(0.99, 1, { step: 0.05, min: 0, max: 1 }), 1);
assert.equal(stepNumericValue(0.01, -1, { step: 0.05, min: 0, max: 1 }), 0);
assert.equal(stepNumericValue(1, 1, { step: 0.05 }), 1.05);
assert.equal(stepNumericValue(10, 1, { step: 1 }), 11);
assert.equal(stepNumericValue(-2, -1, { step: 1 }), -3);
assert.equal(stepNumericValue(32, 1, { step: 16 }), 48);
assert.equal(stepNumericValue(1, -1, { step: 16, min: 1 }), 1);
assert.equal(stepNumericValue(20, 1, { step: 10 }), 30);
assert.equal(stepNumericValue(Number.NaN, 1, { step: 16 }), 16);
assert.equal(stepNumericValue(Infinity, -1, { step: 0.05, min: 0, max: 1 }), 0);

const none = validationSummaryState([], []);
assert.equal(none.label, "PASS");
assert.equal(none.expanded, false);
const warning: PixelBgrIssue = { level: "warning", path: "x", message: "warn" };
const error: PixelBgrIssue = { level: "error", path: "x", message: "err" };
assert.equal(validationSummaryState([], [warning, warning, warning]).label, "PASS — 3 warnings ▸");
assert.equal(validationSummaryState([error, error], [warning]).label, "ERROR — 2 errors, 1 warning ▾");
assert.equal(validationSummaryState([error], [warning], false).label, "ERROR — 1 error, 1 warning ▸");
assert.equal(toggleValidationExpanded(false), true);

const scene = createDemoScene();
const chunk = scene.chunks[0];
const steppedChunk = updateChunk(scene, chunk.id, { startX: stepNumericValue(chunk.startX, 1, { step: 16 }) });
assert.equal(steppedChunk.chunks[0].startX, chunk.startX + 16);
const lengthClamped = updateChunk(scene, chunk.id, { length: stepNumericValue(chunk.length, -1, { step: chunk.length + 16, min: 1 }) });
assert.equal(lengthClamped.chunks[0].length, 1);
assert.equal(validateBackgroundScene(lengthClamped).valid, true);

const owner: LayerOwner = { kind: "global" };
const sprite = scene.globalLayers.find(l => l.kind === "sprite")! as any;
const steppedLayer = updateLayer(scene, owner, sprite.id, l => l.kind === "sprite" ? { ...l, opacity: stepNumericValue(l.opacity, 1, { step: 0.05, min: 0, max: 1 }), parallax: { ...l.parallax, x: stepNumericValue(l.parallax.x, 1, { step: 0.05 }) }, offset: { ...l.offset, x: stepNumericValue(l.offset.x, -1, { step: 1 }) } } : l);
const nextSprite = steppedLayer.globalLayers.find(l => l.id === sprite.id)! as any;
assert.equal(nextSprite.opacity, Math.min(1, normalizeSteppedValue(sprite.opacity + 0.05, 0.05)));
assert.equal(nextSprite.parallax.x, normalizeSteppedValue(sprite.parallax.x + 0.05, 0.05));
assert.equal(nextSprite.offset.x, sprite.offset.x - 1);
assert.notEqual(steppedLayer, scene);
assert.equal((scene.globalLayers.find(l => l.id === sprite.id)! as any).offset.x, sprite.offset.x);

const preview = setBackgroundPreviewState({ speed: stepNumericValue(90, 1, { step: 10 }) }, {});
assert.equal(preview.speed, 100);

console.log("[SMOKE] PixelBgrLabB4UiPolish OK ✅");
