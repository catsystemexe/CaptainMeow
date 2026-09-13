import assert from "node:assert/strict";
import { BACKGROUND_ASSET_DECLARATIONS } from "../assets/BackgroundAssets";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { evaluateBackgroundScene } from "../render/bg/v2/BackgroundV2Evaluator";
import { materializeBackgroundCommands, resolveBackgroundCommandTiles } from "../render/webgl/bg/v2/BackgroundV2RenderCommands";
import { insertV2LaneObject, insertV2LaneSegment } from "./PixelBgrV2LaneInsert";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";

for (const { definition } of BACKGROUND_ASSET_DECLARATIONS) {
  const stem = definition.runtime.url.split("/").at(-1)!.replace(/\.[^.]+$/, "");
  assert.equal(definition.id, stem, `${definition.id} equals its runtime filename stem`);
  assert.equal(definition.displayName, definition.id, `${definition.id} has no divergent display name`);
}
assert.equal(new Set(BACKGROUND_ASSET_DECLARATIONS.map(({ definition }) => definition.id)).size, BACKGROUND_ASSET_DECLARATIONS.length, "filename-stem IDs do not collide");

const scene: BackgroundSceneV2 = {
  version: 2, id: "p5-insert", name: "P5 insert", world: { pixelsPerUnit: 1 }, environment: {},
  tracks: [{
    id: "near", name: "Near", role: "near", mode: "sequence", enabled: true, zBase: 0,
    parallax: { x: 1, y: 1 },
    segments: [{ id: "small-template", name: "legacy custom name", asset: { id: "bgr-test-stripes", url: "/assets/debug/bgr/bgr-test-stripes.svg" }, startTrackX: 300, widthPx: 32, offsetY: 900, localZ: 8, opacity: 0.2, blend: "additive", fadeInPx: 20, fadeOutPx: 20, flipX: true, flipY: true, enabled: true }],
    objects: [],
  }],
};
const segmentAsset = { id: "desert_near_band", url: "/assets/bg/test/desert/desert_near_band.png" };
const segmentResult = insertV2LaneSegment(scene, "near", 0, segmentAsset, "small-template");
assert(segmentResult.ok); if (!segmentResult.ok) throw new Error(segmentResult.error);
const insertedSegment = segmentResult.scene.tracks[0].segments.at(-1)!;
assert.deepEqual(insertedSegment, { id: insertedSegment.id, asset: segmentAsset, startTrackX: 0, widthPx: 1672, offsetY: 0, opacity: 1, blend: "normal", localZ: 0, enabled: true }, "catalogue SEG uses clean native asset defaults rather than unrelated template presentation");
assert.notEqual(insertedSegment.id, insertedSegment.asset.id, "SEG instance identity remains independent");
const secondSegment = insertV2LaneSegment(segmentResult.scene, "near", 0, segmentAsset);
assert(secondSegment.ok); if (!secondSegment.ok) throw new Error(secondSegment.error);
assert.notEqual(secondSegment.segmentId, segmentResult.segmentId, "the same asset supports unique SEG instances");

const objectAsset = { id: "desert_clouds", url: "/assets/bg/test/desert/desert_clouds.png" };
const objectResult = insertV2LaneObject(secondSegment.scene, "near", 0, objectAsset);
assert(objectResult.ok); if (!objectResult.ok) throw new Error(objectResult.error);
const secondObject = insertV2LaneObject(objectResult.scene, "near", 0, objectAsset);
assert(secondObject.ok); if (!secondObject.ok) throw new Error(secondObject.error);
assert.notEqual(secondObject.objectId, objectResult.objectId, "the same asset supports unique OBJ instances");
const insertedObject = objectResult.scene.tracks[0].objects.at(-1)!;
assert.equal(insertedObject.y, 0); assert.equal(insertedObject.width, undefined); assert.equal(insertedObject.height, undefined);

const projection = projectBackgroundV2Timeline(objectResult.scene);
assert.equal(projection.lanes.find(lane => lane.id === "near")!.tracks[0].segments.at(-1)!.assetId, segmentAsset.id, "SEG visible projection uses asset ID");
assert.equal(projection.lanes.find(lane => lane.id === "near")!.tracks[0].objects.at(-1)!.assetId, objectAsset.id, "OBJ visible projection uses asset ID");
const frame = evaluateBackgroundScene(objectResult.scene, { cameraScrollX: 0, cameraScrollY: 0 });
const commands = materializeBackgroundCommands(frame.behindGameplay, { playerWorldX: 0 });
for (const [asset, nativeSize] of [[segmentAsset, { width: 1672, height: 941 }], [objectAsset, { width: 1672, height: 941 }]] as const) {
  const command = commands.find(item => item.assetId === asset.id)!;
  assert(command); assert.equal(command.url, asset.url); assert.equal(command.assetResolved, true); assert.deepEqual(command.expectedTextureSize, nativeSize);
  const tiles = resolveBackgroundCommandTiles(command, nativeSize, 896, 504);
  assert(tiles.length > 0, `${asset.id} produces a draw tile`);
  assert(tiles.some(tile => tile.x < 896 && tile.x + tile.width > 0 && tile.y < 504 && tile.y + tile.height > 0), `${asset.id} intersects the controlled viewport`);
}
console.log("PixelBgrP5AssetIdentityVisibility.smoke: PASS");
