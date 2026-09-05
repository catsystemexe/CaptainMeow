import type { BackgroundAssetRef, BackgroundSceneV2 } from "./BackgroundV2Types";

const DESERT_ROOT = "/assets/bg/test/desert";
const ASSET_WIDTH = 1672;

function asset(id: string, file: string): BackgroundAssetRef {
  return { id, url: `${DESERT_ROOT}/${file}` };
}

/** Practical multitrack fixture for exercising the normal Pixel BGR Lab V2 authoring path. */
export function createBackgroundV2DesertTestScene(): BackgroundSceneV2 {
  return {
    version: 2,
    id: "bgr-v2-desert-authoring-test",
    environment: {},
    tracks: [
      {
        id: "desert-sky",
        name: "Sky: fixed backdrop",
        role: "far",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0, y: 0 },
        zBase: -50,
        segments: [
          { id: "sky", startTrackX: 0, widthPx: ASSET_WIDTH, asset: asset("desert-test-sky", "desert_sky.png"), offsetY: -180, opacity: 1, blend: "normal", localZ: 0, enabled: true },
        ],
        objects: [],
      },
      {
        id: "desert-far",
        name: "Far: mesas, sun, and clouds",
        role: "far",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.1, y: 0.05 },
        zBase: -30,
        segments: [
          { id: "far-mesas", startTrackX: 0, widthPx: ASSET_WIDTH, asset: asset("desert-test-far-mesas", "desert_far_mesas.png"), offsetY: -120, opacity: 1, blend: "normal", localZ: 0, enabled: true },
        ],
        objects: [
          { id: "sun", asset: asset("desert-test-sun", "desert_sun.png"), startTrackX: 120, y: -210, width: 836, height: 471, localZ: -1, opacity: 1, blend: "normal", enabled: true },
          { id: "clouds", asset: asset("desert-test-clouds", "desert_clouds.png"), startTrackX: 720, y: -70, width: 1254, height: 706, localZ: 2, opacity: 0.9, blend: "normal", enabled: true },
        ],
      },
      {
        id: "desert-mid",
        name: "Mid: overlapping sequence",
        role: "mid",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.3, y: 0.15 },
        zBase: -10,
        segments: [
          { id: "mid-a", startTrackX: 0, widthPx: ASSET_WIDTH, asset: asset("desert-test-mid-mesas-a", "desert_mid_mesas_a.png"), offsetY: -55, opacity: 1, blend: "normal", localZ: 0, enabled: true },
          { id: "mid-b", startTrackX: 1600, widthPx: ASSET_WIDTH, asset: asset("desert-test-mid-mesas-b", "desert_mid_mesas_b.png"), offsetY: -35, opacity: 1, blend: "normal", localZ: 1, enabled: true },
        ],
        objects: [],
      },
      {
        id: "desert-near",
        name: "Near: terrain band",
        role: "near",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.6, y: 0.3 },
        zBase: 10,
        segments: [
          { id: "near-band", startTrackX: 260, widthPx: ASSET_WIDTH, asset: asset("desert-test-near-band", "desert_near_band.png"), offsetY: 35, opacity: 1, blend: "normal", localZ: 0, enabled: true },
        ],
        objects: [],
      },
      {
        id: "desert-foreground",
        name: "Foreground: gameplay crossing",
        role: "foreground",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.9, y: 0.6 },
        zBase: 30,
        segments: [],
        objects: [
          { id: "foreground-band", asset: asset("desert-test-near-band", "desert_near_band.png"), startTrackX: 1850, y: 175, width: 1003, height: 565, localZ: 0, opacity: 0.92, blend: "normal", enabled: true },
        ],
      },
    ],
  };
}
