import { strict as assert } from "node:assert";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import {
  calculateEffectiveZ,
  calculateSegmentOverlap,
  calculateTrackScroll,
  preserveTrackGeometry,
  rebaseTrackXPreservingWorldTiming,
  trackPointToScreen,
  trackXToWorldX,
  worldXToTrackX,
} from "./BackgroundV2Math";
import type { BackgroundEvaluationContext, BackgroundSceneV2, BackgroundTrack } from "./BackgroundV2Types";

assert.deepEqual(calculateTrackScroll({ x: 80, y: 40 }, { x: 0.5, y: 0.25 }), { x: 40, y: 10 });
assert.deepEqual(
  trackPointToScreen({ x: 100, y: 25 }, { x: 80, y: 40 }, { x: 0.5, y: 0.25 }),
  { x: 60, y: 15 },
);
assert.equal(calculateEffectiveZ(1_000, 25), 1_025);
assert.equal(calculateSegmentOverlap({ startTrackX: 100, widthPx: 80 }, { startTrackX: 160 }), 20);
assert.deepEqual(worldXToTrackX(300, 0.5), { ok: true, value: 150 });
assert.deepEqual(worldXToTrackX(300, 0), { ok: false, reason: "non-invertible-parallax" });
assert.deepEqual(trackXToWorldX(150, 0.5), { ok: true, value: 300 });
assert.deepEqual(trackXToWorldX(150, 0), { ok: false, reason: "non-invertible-parallax" });
assert.deepEqual(trackXToWorldX(150, Number.NaN), { ok: false, reason: "non-invertible-parallax" });
assert.deepEqual(rebaseTrackXPreservingWorldTiming(150, 0.5, 0.25), { ok: true, value: 75 });
assert.deepEqual(rebaseTrackXPreservingWorldTiming(150, 0, 0.25), { ok: false, reason: "non-invertible-parallax" });
assert.deepEqual(rebaseTrackXPreservingWorldTiming(150, 0.5, 0), { ok: false, reason: "non-invertible-parallax" });
assert.equal(preserveTrackGeometry(150), 150);

const asset = (id: string) => ({ id, url: `/assets/${id}.png` });
const track = (overrides: Partial<BackgroundTrack>): BackgroundTrack => ({
  id: "track",
  name: "Track",
  role: "far",
  mode: "sequence",
  enabled: true,
  parallax: { x: 0.5, y: 0.25 },
  zBase: 100,
  segments: [],
  objects: [],
  ...overrides,
});

const scene: BackgroundSceneV2 = {
  version: 2,
  id: "smoke",
  environment: { starfield: { seed: 42, density: 0.4 } },
  tracks: [
    track({
      id: "disabled-track",
      enabled: false,
      segments: [{
        id: "hidden-by-track",
        startTrackX: 0,
        widthPx: 10,
        asset: asset("hidden"),
        offsetY: 0,
        opacity: 1,
        blend: "normal",
        localZ: 0,
        enabled: true,
      }],
    }),
    track({
      id: "far",
      mode: "repeat",
      segments: [
        {
          id: "disabled-segment",
          startTrackX: 0,
          widthPx: 10,
          asset: asset("disabled-segment"),
          offsetY: 0,
          opacity: 1,
          blend: "normal",
          localZ: 0,
          enabled: false,
        },
        {
          id: "later-local",
          startTrackX: 130,
          widthPx: 64,
          asset: asset("later-local"),
          offsetY: 25,
          opacity: 0.8,
          blend: "normal",
          localZ: 5,
          enabled: true,
        },
        {
          id: "higher-z",
          startTrackX: 100,
          widthPx: 32,
          asset: asset("higher-z"),
          offsetY: 10,
          opacity: 1,
          blend: "additive",
          localZ: 20,
          enabled: true,
        },
      ],
      objects: [
        {
          id: "disabled-object",
          asset: asset("disabled-object"),
          startTrackX: 0,
          y: 0,
          localZ: 0,
          opacity: 1,
          blend: "normal",
          enabled: false,
        },
        {
          id: "object",
          asset: asset("object"),
          startTrackX: 110,
          y: 30,
          width: 12,
          height: 16,
          localZ: 5,
          opacity: 1,
          blend: "normal",
          enabled: true,
        },
      ],
    }),
    track({
      id: "near",
      zBase: 100,
      segments: [{
        id: "same-z-later-track",
        startTrackX: 100,
        widthPx: 48,
        asset: asset("near"),
        offsetY: 0,
        opacity: 1,
        blend: "normal",
        localZ: 5,
        enabled: true,
      }],
    }),
    track({
      id: "foreground",
      role: "foreground",
      zBase: 4_000,
      objects: [{
        id: "foreground-object",
        asset: asset("foreground"),
        startTrackX: 90,
        y: 20,
        localZ: 1,
        opacity: 0.7,
        blend: "additive",
        enabled: true,
      }],
    }),
  ],
};

const context: BackgroundEvaluationContext = {
  playerWorldX: 999,
  cameraScrollX: 80,
  cameraScrollY: 40,
  viewportWidth: 320,
  viewportHeight: 180,
};
const sceneBefore = structuredClone(scene);
const frame = evaluateBackgroundScene(scene, context);

assert.deepEqual(frame.behindGameplay.map((instance) => instance.instanceId), [
  "far:segment:later-local",
  "far:object:object",
  "near:segment:same-z-later-track",
  "far:segment:higher-z",
]);
assert.deepEqual(frame.foreground.map((instance) => instance.instanceId), ["foreground:object:foreground-object"]);
assert.deepEqual(
  frame.behindGameplay.find((instance) => instance.sourceSegmentId === "higher-z"),
  {
    instanceId: "far:segment:higher-z",
    asset: asset("higher-z"),
    screenX: 60,
    screenY: 0,
    width: 32,
    opacity: 1,
    blend: "additive",
    effectiveZ: 120,
    sourceTrackId: "far",
    sourceSegmentId: "higher-z",
  },
);
assert.deepEqual(frame.environment, scene.environment);
assert.deepEqual(scene, sceneBefore);
assert.deepEqual(evaluateBackgroundScene(scene, context), frame);

// Player world position is a distinct authoring/runtime input and does not replace camera scroll.
assert.deepEqual(evaluateBackgroundScene(scene, { ...context, playerWorldX: -500 }), frame);
assert.notDeepEqual(evaluateBackgroundScene(scene, { ...context, cameraScrollX: 0 }), frame);

console.log("[SMOKE] BackgroundV2 domain, math, and evaluator OK ✅");
