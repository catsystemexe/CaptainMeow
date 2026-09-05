import assert from "node:assert/strict";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import { calculateSegmentOverlap } from "./BackgroundV2Math";
import { createBackgroundV2DesertTestScene } from "./BackgroundV2DesertTestScene";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";
import { BACKGROUND_ASSET_CATALOG } from "../../../ui/PixelBgrLabAssets";
import { BACKGROUND_V2_DESERT_VERIFICATION_START_X, enableBackgroundV2DesertTest, getBackgroundSceneV2 } from "../../BackgroundState";

const scene = createBackgroundV2DesertTestScene();
const sourceBeforeEvaluation = structuredClone(scene);

assert.equal(scene.version, 2);
assert.equal(scene.id, "bgr-v2-desert-authoring-test");
assert.equal(scene.environment.starfield, undefined, "starfield is disabled by default");

const tracks = new Map(scene.tracks.map((track) => [track.id, track]));
for (const id of ["desert-sky", "desert-far", "desert-mid", "desert-near", "desert-foreground"]) {
  assert(tracks.has(id), `expected ${id} track`);
}
assert.deepEqual(scene.tracks.map((track) => track.parallax), [
  { x: 0, y: 0 },
  { x: 0.1, y: 0.05 },
  { x: 0.3, y: 0.15 },
  { x: 0.6, y: 0.3 },
  { x: 0.9, y: 0.6 },
]);

const mid = tracks.get("desert-mid")!;
assert(mid.segments.length >= 2, "Mid has consecutive authored segments");
assert(calculateSegmentOverlap(mid.segments[0], mid.segments[1]) > 0, "Mid segments intentionally overlap");
assert(scene.tracks.some((track) => track.objects.length > 0), "independent objects exist");
const far = tracks.get("desert-far")!;
assert(far.objects.some((object) => object.id === "sun"));
assert(far.objects.some((object) => object.id === "clouds" && object.y !== 0));
assert(far.objects.some((object) => {
  const width = object.width ?? 0;
  return far.segments.some((segment) => object.startTrackX < segment.startTrackX + segment.widthPx
    && object.startTrackX + width > segment.startTrackX);
}), "at least one independent object overlaps a segment");
assert(tracks.get("desert-foreground")!.objects.length > 0, "foreground content exists");

const catalogUrls = new Set(BACKGROUND_ASSET_CATALOG.map((entry) => entry.url));
const fixtureUrls = scene.tracks.flatMap((track) => [...track.segments, ...track.objects]).map((item) => item.asset.url);
for (const url of fixtureUrls) assert(catalogUrls.has(url), `fixture URL is registered: ${url}`);

const validation = validateBackgroundSceneV2(scene);
assert.equal(validation.valid, true, JSON.stringify(validation.errors));
const frame = evaluateBackgroundScene(scene, {
  playerWorldX: 2400,
  cameraScrollX: 2300,
  cameraScrollY: 120,
  viewportWidth: 896,
  viewportHeight: 504,
});
assert(frame.behindGameplay.length > 0, "evaluator produces behind-gameplay output");
assert(frame.foreground.length > 0, "evaluator produces foreground output");
assert.deepEqual(scene, sourceBeforeEvaluation, "evaluation leaves the source scene immutable");

const second = createBackgroundV2DesertTestScene();
scene.tracks[0].segments[0].asset.url = "/mutated.png";
assert.notEqual(second.tracks[0].segments[0].asset.url, scene.tracks[0].segments[0].asset.url, "fixture instances do not share mutable asset refs");

const seekCalls: Array<{ targetX: number; options: unknown }> = [];
const verificationRoot = {
  __CM: {
    game: {
      seekGameplayToPlayerX: (targetX: number, options: unknown) => seekCalls.push({ targetX, options }),
    },
  },
};
const authoredBeforeActivation = createBackgroundV2DesertTestScene();
enableBackgroundV2DesertTest(verificationRoot);
assert.deepEqual(seekCalls, [{
  targetX: BACKGROUND_V2_DESERT_VERIFICATION_START_X,
  options: { bounds: { startX: 0, endX: 0 }, pauseAfterSeek: true },
}], "Desert verification activates through the gameplay seek path at scene start");
assert.deepEqual(getBackgroundSceneV2(verificationRoot), authoredBeforeActivation, "verification seeking does not mutate authored V2 coordinates");

console.log("BackgroundV2DesertTestScene.smoke: PASS");
