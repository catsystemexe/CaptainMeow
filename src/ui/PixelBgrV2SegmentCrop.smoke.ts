import assert from "node:assert/strict";
import { evaluateBackgroundScene } from "../render/bg/v2/BackgroundV2Evaluator";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { materializeBackgroundFrameCommands } from "../render/webgl/bg/v2/BackgroundV2RenderCommands";
import { applyV2SegmentDrag, createV2Segment, duplicateV2Segment, findV2Segment } from "./PixelBgrV2SegmentEditing";

const asset = { id: "desert_far_mesas", url: "/assets/bg/test/desert/desert_far_mesas.png" };
const scene: BackgroundSceneV2 = { version: 2, id: "crop", environment: {}, staticBackdrop: { enabled: true, asset, x: 2, y: 3, width: 9, height: 10, opacity: 1, blend: "normal" }, tracks: [{
  id: "mid", name: "Mid", role: "mid", mode: "sequence", enabled: true, parallax: { x: 1, y: 1 }, zBase: 0,
  segments: [{ id: "segment", asset, startTrackX: 100, widthPx: 1672, offsetY: 5, opacity: 1, blend: "normal", localZ: 0, enabled: true }],
  objects: [{ id: "object", asset, startTrackX: 20, y: 7, width: 80, height: 40, localZ: 1, opacity: 1, blend: "normal", enabled: true }],
}] };

const created = createV2Segment(scene, "mid", 2000, undefined, asset); assert(created.ok);
if (created.ok) { const value = findV2Segment(created.scene, "mid", created.segmentId)!; assert.equal(value.cropLeftPx ?? 0, 0); assert.equal(value.widthPx, 1672); }

const right = applyV2SegmentDrag(scene, "mid", "segment", "resize-right", -872); assert(right.ok);
if (!right.ok) throw new Error(right.error);
const rightTrimmed = findV2Segment(right.scene, "mid", "segment")!;
assert.deepEqual({ start: rightTrimmed.startTrackX, width: rightTrimmed.widthPx, crop: rightTrimmed.cropLeftPx ?? 0 }, { start: 100, width: 796, crop: 0 });

const left = applyV2SegmentDrag(scene, "mid", "segment", "resize-left", 208); assert(left.ok);
if (!left.ok) throw new Error(left.error);
const leftTrimmed = findV2Segment(left.scene, "mid", "segment")!;
assert.equal(leftTrimmed.startTrackX, 304); assert.equal(leftTrimmed.widthPx, 1468); assert.equal(leftTrimmed.cropLeftPx, 204);
assert.equal(leftTrimmed.startTrackX + leftTrimmed.widthPx, 1772, "left trim keeps the right edge fixed");
assert.equal(leftTrimmed.startTrackX - leftTrimmed.cropLeftPx, 100, "left trim keeps the source origin fixed");

const expanded = applyV2SegmentDrag(left.scene, "mid", "segment", "resize-left", -999); assert(expanded.ok);
if (expanded.ok) { const value = findV2Segment(expanded.scene, "mid", "segment")!; assert.equal(value.startTrackX, 100); assert.equal(value.cropLeftPx, 0, "left expansion clamps at the source start"); }

const moved = applyV2SegmentDrag(left.scene, "mid", "segment", "move", 16); assert(moved.ok);
if (moved.ok) assert.equal(findV2Segment(moved.scene, "mid", "segment")!.cropLeftPx, 204, "move preserves crop");
const duplicated = duplicateV2Segment(left.scene, "mid", "segment"); assert(duplicated.ok);
if (duplicated.ok) assert.equal(findV2Segment(duplicated.scene, "mid", duplicated.segmentId)!.cropLeftPx, 204, "duplicate preserves crop");

const trimmedScene = structuredClone(scene); Object.assign(trimmedScene.tracks[0].segments[0], { widthPx: 800, cropLeftPx: 200, startTrackX: 300 });
const frame = evaluateBackgroundScene(trimmedScene, { playerWorldX: 0, cameraScrollX: 10, cameraScrollY: 0, viewportWidth: 896, viewportHeight: 504 });
const commands = materializeBackgroundFrameCommands(frame, { playerWorldX: 0 });
const segmentCommand = commands.behindGameplay.find(command => command.sourceSegmentId === "segment")!;
const objectCommand = commands.behindGameplay.find(command => command.sourceObjectId === "object")!;
assert.equal(segmentCommand.x, 90); assert.equal(segmentCommand.width, 1672); assert.deepEqual(segmentCommand.clip, { x: 290, y: 0, width: 800, height: Number.POSITIVE_INFINITY });
assert.equal(objectCommand.width, 80, "Object width remains actual draw geometry"); assert.equal("cropLeftPx" in trimmedScene.tracks[0].objects[0], false);
assert.equal(commands.staticBackdrop?.width, 9, "static backdrop geometry remains unchanged");

const flippedScene = structuredClone(trimmedScene); flippedScene.tracks[0].segments[0].flipX = true;
const flipped = materializeBackgroundFrameCommands(evaluateBackgroundScene(flippedScene, { playerWorldX: 0, cameraScrollX: 10, cameraScrollY: 0, viewportWidth: 896, viewportHeight: 504 }), { playerWorldX: 0 }).behindGameplay[0];
assert.equal(flipped.x, -382, "flip mirrors the authored crop interval while retaining native draw width");
assert.deepEqual(flipped.clip, segmentCommand.clip);

const roundTrip = parseBackgroundSceneV2(serializeBackgroundSceneV2(trimmedScene)); assert(roundTrip.ok);
if (roundTrip.ok) assert.equal(roundTrip.scene.tracks[0].segments[0].cropLeftPx, 200);
const oldScene = structuredClone(scene); delete oldScene.tracks[0].segments[0].cropLeftPx;
const parsedOld = parseBackgroundSceneV2(serializeBackgroundSceneV2(oldScene)); assert(parsedOld.ok);
if (parsedOld.ok) { assert.equal(parsedOld.scene.tracks[0].segments[0].cropLeftPx ?? 0, 0); assert.equal(evaluateBackgroundScene(parsedOld.scene, { playerWorldX: 0, cameraScrollX: 0, cameraScrollY: 0, viewportWidth: 1, viewportHeight: 1 }).behindGameplay[0].screenX, 100); }

console.log("PixelBgrV2SegmentCrop.smoke: PASS");
