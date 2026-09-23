import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampGameplaySeekX } from "../game/authoring/GameplaySeek";
import type { SceneLogicDocumentV1 } from "../game/scene-logic/SceneLogicDocument";
import { createBackgroundV2SequenceVerificationScene } from "../render/bg/v2/BackgroundV2SequenceVerificationScene";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { projectBackgroundV2Timeline, SCENE_LAB_V2_LOGIC_TAIL_X } from "./PixelBgrV2TimelineProjection";

const empty = (): BackgroundSceneV2 => ({ version: 2, id: "bounds", environment: {}, tracks: [] });
assert.deepEqual(projectBackgroundV2Timeline(empty()).bounds, { startX: 0, endX: 0 }, "empty bounds are deterministic");

const withSpaces = (spaces: SceneLogicDocumentV1["spaces"]): BackgroundSceneV2 => ({
  ...empty(), sceneLogic: { version: 1, spaces, states: [], triggers: [], events: [], actions: [], triggerEventBindings: [], eventActionBindings: [] },
});
const markerBounds = projectBackgroundV2Timeline(withSpaces({ markers: [{ id: "m", position: 2200 }], ranges: [], zones: [] })).bounds;
assert.deepEqual(markerBounds, { startX: 0, endX: 2200 + SCENE_LAB_V2_LOGIC_TAIL_X });
assert.equal(clampGameplaySeekX(1900, markerBounds), 1900);
assert.equal(clampGameplaySeekX(2500, markerBounds), 2500, "one viewport of authoring tail permits crossing a terminal Marker");
assert.deepEqual(projectBackgroundV2Timeline(withSpaces({ markers: [], ranges: [{ id: "r", start: -50, end: 500 }], zones: [] })).bounds, { startX: -50, endX: 500 + SCENE_LAB_V2_LOGIC_TAIL_X });
assert.deepEqual(projectBackgroundV2Timeline(withSpaces({ markers: [], ranges: [], zones: [{ id: "z", minX: -80, maxX: 700, minY: -999, maxY: 999 }] })).bounds, { startX: -80, endX: 700 + SCENE_LAB_V2_LOGIC_TAIL_X }, "Zone Y is irrelevant");

const asset = { id: "asset", url: "/asset.png" };
const geometry: BackgroundSceneV2 = { ...empty(), tracks: [{ id: "t", name: "T", role: "far", mode: "sequence", enabled: true, parallax: { x: .5, y: 1 }, zBase: 0, segments: [{ id: "s", asset, startTrackX: 100, widthPx: 200, offsetY: 0, opacity: 1, blend: "normal", localZ: 0, enabled: true }], objects: [{ id: "o", asset, startTrackX: 400, y: 0, width: 50, opacity: 1, blend: "normal", localZ: 0, enabled: true }] }], events: [{ id: "e", type: "signal", signal: "legacy", worldX: 1200, enabled: true }] };
assert.deepEqual(projectBackgroundV2Timeline(geometry).bounds, { startX: 0, endX: 1200 }, "BGR projected extents and legacy Events retain exact-content bounds without Scene Logic tail");

const sequenceBounds = projectBackgroundV2Timeline(createBackgroundV2SequenceVerificationScene()).bounds;
assert(sequenceBounds.endX >= 2200);
assert.equal(clampGameplaySeekX(1900, sequenceBounds), 1900);
assert.equal(clampGameplaySeekX(2500, sequenceBounds), 2500);
const uiSource = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
assert.match(uiSource, /const timelineBounds=projection\.bounds/, "timeline render delegates to canonical projection bounds");
assert.match(uiSource, /const bounds=sceneV2 \? projectBackgroundV2Timeline\(sceneV2,\{\},this\.currentX\(\)\)\.bounds/, "setCurrentX delegates to canonical projection bounds");
assert.doesNotMatch(uiSource, /const spaceXs=/, "timeline has no independent competing Space-bound expansion");
console.log("SceneLabV2WorldBounds.smoke: PASS");
