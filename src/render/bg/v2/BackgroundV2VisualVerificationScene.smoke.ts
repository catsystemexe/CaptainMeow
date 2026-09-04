import assert from "node:assert/strict";
import { createBackgroundV2VisualVerificationScene } from "./BackgroundV2VisualVerificationScene";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import { materializeBackgroundFrameCommands } from "../../webgl/bg/v2/BackgroundV2RenderCommands";

const first = createBackgroundV2VisualVerificationScene();
const second = createBackgroundV2VisualVerificationScene();

assert.deepEqual(first, second, "factory output is deterministic");
assert.notStrictEqual(first, second, "factory returns a new scene");
assert.notStrictEqual(first.tracks, second.tracks, "factory does not share track arrays");
assert.notStrictEqual(first.tracks[0].objects[0].asset, second.tracks[0].objects[0].asset, "factory does not share mutable assets");

const objects = first.tracks.flatMap((track) => track.objects);
assert.equal(objects.find(({ id }) => id === "opacity-100")?.opacity, 1);
assert.equal(objects.find(({ id }) => id === "opacity-025")?.opacity, 0.25);
assert.equal(objects.find(({ id }) => id === "blend-normal")?.blend, "normal");
assert.equal(objects.find(({ id }) => id === "blend-additive")?.blend, "additive");

const segment = first.tracks.flatMap((track) => track.segments).find(({ id }) => id === "segment-boundary");
assert(segment && Number.isFinite(segment.widthPx) && segment.widthPx > 0, "segment has an explicit finite boundary");
const frame = evaluateBackgroundScene(first, { playerWorldX: 0, cameraScrollX: 0, cameraScrollY: 0, viewportWidth: 896, viewportHeight: 504 });
const segmentCommand = materializeBackgroundFrameCommands(frame, { playerWorldX: 0 }).behindGameplay.find(({ sourceSegmentId }) => sourceSegmentId === segment.id);
assert.equal(segmentCommand?.width, segment.widthPx, "authored segment width propagates to draw geometry");
assert.equal(segmentCommand?.clip?.width, segment.widthPx, "clip geometry matches the authored segment boundary");
assert(first.tracks.some(({ role, objects: trackObjects }) => role === "foreground" && trackObjects.some(({ id }) => id === "gameplay-overlap")), "foreground sample exists");

assert.deepEqual(first.tracks.map(({ parallax }) => parallax), [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 }], "X/Y parallax rates are strongly distinct");
const urls = first.tracks.flatMap((track) => [...track.objects, ...track.segments]).map(({ asset: ref }) => ref.url);
assert(urls.some((url, index) => urls.indexOf(url) !== index), "multiple instances share a resource URL");

first.tracks[0].parallax.x = 99;
first.tracks[0].objects[0].asset.url = "/mutated.svg";
assert.equal(second.tracks[0].parallax.x, 0.1, "later factory output is isolated from track mutation");
assert.equal(second.tracks[0].objects[0].asset.url, "/assets/debug/bgr/bgr-test-solid.svg", "later factory output is isolated from asset mutation");

console.log("BackgroundV2VisualVerificationScene.smoke: PASS");
