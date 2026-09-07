import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { shouldApplyPixelBgrV1Draft } from "./PixelBgrLabUI";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";

const asset = { id: "asset", url: "/asset.png" };
const scene: BackgroundSceneV2 = {
  version: 2, id: "projection", environment: { starfield: { seed: 7, density: 0.4 } }, tracks: [
    { id: "far-a", name: "Far A", role: "far", mode: "sequence", enabled: true, parallax: { x: .1, y: .1 }, zBase: -10,
      segments: [{ id: "wide", startTrackX: 100, widthPx: 200, asset, offsetY: 0, opacity: 1, blend: "normal", localZ: 2, enabled: true }], objects: [] },
    { id: "far-b", name: "Far B", role: "far", mode: "repeat", enabled: false, parallax: { x: .2, y: .2 }, zBase: -5,
      segments: [{ id: "overlap", startTrackX: 250, widthPx: 40, asset, offsetY: 0, opacity: 1, blend: "normal", localZ: 0, enabled: false }], objects: [] },
    { id: "mid", name: "Mid", role: "mid", mode: "sequence", enabled: true, parallax: { x: .4, y: .4 }, zBase: 0, segments: [], objects: [] },
    { id: "near", name: "Near", role: "near", mode: "sequence", enabled: true, parallax: { x: .7, y: .7 }, zBase: 5, segments: [], objects: [
      { id: "sized", asset, startTrackX: 420, y: 0, width: 80, localZ: 1, opacity: 1, blend: "normal", enabled: true },
      { id: "point", asset, startTrackX: 540, y: 0, localZ: 2, opacity: 1, blend: "normal", enabled: false },
    ] },
    { id: "custom", name: "Mist", role: "custom", mode: "sequence", enabled: true, parallax: { x: .5, y: .5 }, zBase: 3, segments: [], objects: [] },
    { id: "front", name: "Front", role: "foreground", mode: "sequence", enabled: true, parallax: { x: 1, y: 1 }, zBase: 20, segments: [], objects: [] },
  ],
};
const gameplay = { ranges: [{ id: "future-range", label: "Range", startX: 600, endX: 900 }], markers: [{ id: "future-marker", label: "Marker", x: 950 }] };
const beforeScene = structuredClone(scene), beforeGameplay = structuredClone(gameplay);
const projection = projectBackgroundV2Timeline(scene, gameplay, 1100);

assert.deepEqual(projection.lanes.map(lane => lane.label), ["Foreground", "Near", "Mid", "Far"]);
assert.equal(projection.lanes.length, 4, "the compact projection has exactly four content lanes");
assert.equal(projection.lanes.some(lane => lane.id === "environment" || lane.id === "gameplay"), false);
assert.deepEqual(projection.lanes.find(lane => lane.id === "far")?.tracks.map(track => track.id), ["far-a", "far-b"]);
assert.equal(projection.lanes.flatMap(lane => lane.tracks).some(track => track.role === "custom"), false, "custom data receives no invented depth mapping");
const segments = projection.lanes.find(lane => lane.id === "far")!.tracks.flatMap(track => track.segments);
assert.deepEqual(segments.map(segment => [segment.id, segment.trackId, segment.startX, segment.endX, segment.enabled]), [["wide", "far-a", 100, 300, true], ["overlap", "far-b", 250, 290, false]]);
const objects = projection.lanes.find(lane => lane.id === "near")!.tracks[0].objects;
assert.deepEqual(objects.map(object => [object.id, object.trackId, object.x, object.width, object.enabled]), [["sized", "near", 420, 80, true], ["point", "near", 540, null, false]]);
assert.deepEqual(projection.bounds, { startX: 0, endX: 1100 });
assert.equal(projection.environmentLabels[0], "Starfield · seed 7 · density 0.4");
assert.deepEqual(scene, beforeScene); assert.deepEqual(gameplay, beforeGameplay);
assert.deepEqual(projectBackgroundV2Timeline(scene, gameplay, 1100), projection);
const desert = projectBackgroundV2Timeline(createBackgroundV2DesertTestScene());
assert.deepEqual(desert.lanes.find(lane => lane.id === "far")?.tracks.map(track => track.id), ["desert-sky", "desert-far"], "same-role Desert tracks share Far");
assert.deepEqual(desert.lanes.find(lane => lane.id === "far")?.tracks.flatMap(track => track.objects).map(object => object.id), ["sun", "clouds"], "Desert sky objects project into Far");
assert.deepEqual(desert.lanes.find(lane => lane.id === "foreground")?.tracks.flatMap(track => track.objects).map(object => object.id), ["foreground-band"], "Desert foreground object projects into Foreground");
const unavailable = projectBackgroundV2Timeline(scene, {}, 0);
assert.equal(unavailable.gameplay.available, false);
assert.deepEqual(unavailable.gameplay.ranges, []);
assert.equal(shouldApplyPixelBgrV1Draft({ enabled: true, source: { kind: "scene-v2", scene } }), false, "active V2 prevents V1 draft application");
assert.equal(shouldApplyPixelBgrV1Draft({ enabled: true, source: { kind: "scene", scene: { id: "v1", globalLayers: [], chunks: [] } } }), true, "V1 keeps existing draft application");
assert.equal(shouldApplyPixelBgrV1Draft(null), false, "empty startup state does not activate a V1 draft");
const uiSource=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(uiSource,/if \(shouldApplyPixelBgrV1Draft\(activeState\)\) this\.applyIfValid\(\)/,"constructor gates V1 application before replacing active state");
assert.match(uiSource,/getBackgroundSceneV2\(globalThis\)/,"render path detects the current typed V2 source");
assert.doesNotMatch(uiSource,/Gameplay chunks\/markers: unavailable in current gameplay model/,"normal compact view consumes no permanent gameplay row");
console.log("[SMOKE] PixelBgrV2TimelineProjection OK ✅");
