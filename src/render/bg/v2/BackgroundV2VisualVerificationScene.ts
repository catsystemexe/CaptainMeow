import type { BackgroundAssetRef, BackgroundSceneV2 } from "./BackgroundV2Types";

const SOLID_URL = "/assets/debug/bgr/bgr-test-solid.svg";
const BACKDROP_URL = "/assets/debug/bgr/bgr-test-backdrop.svg";
const STRIPES_URL = "/assets/debug/bgr/bgr-test-stripes.svg";
const MARKER_URL = "/assets/debug/bgr/bgr-test-marker.svg";

function asset(id: string, url: string): BackgroundAssetRef {
  return { id, url };
}

/** Deterministic debug scene for browser-level acceptance of the real BGR V2 path. */
export function createBackgroundV2VisualVerificationScene(): BackgroundSceneV2 {
  return {
    version: 2,
    id: "bgr-v2-visual-verification",
    environment: {},
    tracks: [
      {
        id: "verify-far",
        name: "Far: opacity and blend",
        role: "far",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.1, y: 0.1 },
        zBase: -20,
        segments: [],
        objects: [
          { id: "opacity-100", asset: asset("shared-solid", SOLID_URL), startTrackX: 190, y: 54, width: 96, height: 96, localZ: 1, opacity: 1, blend: "normal", enabled: true },
          { id: "opacity-025", asset: asset("shared-solid", SOLID_URL), startTrackX: 310, y: 54, width: 96, height: 96, localZ: 1, opacity: 0.25, blend: "normal", enabled: true },
          { id: "normal-base", asset: asset("blend-backdrop", BACKDROP_URL), startTrackX: 470, y: 54, width: 112, height: 112, localZ: 0, opacity: 1, blend: "normal", enabled: true },
          { id: "additive-base", asset: asset("blend-backdrop", BACKDROP_URL), startTrackX: 610, y: 54, width: 112, height: 112, localZ: 0, opacity: 1, blend: "normal", enabled: true },
          { id: "blend-normal", asset: asset("shared-solid", SOLID_URL), startTrackX: 482, y: 66, width: 88, height: 88, localZ: 1, opacity: 0.65, blend: "normal", enabled: true },
          { id: "blend-additive", asset: asset("shared-solid", SOLID_URL), startTrackX: 622, y: 66, width: 88, height: 88, localZ: 1, opacity: 0.65, blend: "additive", enabled: true },
        ],
      },
      {
        id: "verify-near",
        name: "Near: finite striped segment",
        role: "near",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.5, y: 0.5 },
        zBase: 10,
        segments: [
          { id: "segment-boundary", startTrackX: 360, widthPx: 128, asset: asset("finite-stripes", STRIPES_URL), offsetY: 300, opacity: 1, blend: "normal", localZ: 0, enabled: true },
        ],
        objects: [],
      },
      {
        id: "verify-foreground",
        name: "Foreground: gameplay overlap marker",
        role: "foreground",
        mode: "sequence",
        enabled: true,
        parallax: { x: 0.9, y: 0.9 },
        zBase: 20,
        segments: [],
        objects: [
          { id: "gameplay-overlap", asset: asset("foreground-marker", MARKER_URL), startTrackX: 36, y: 188, width: 128, height: 128, localZ: 0, opacity: 0.9, blend: "normal", enabled: true },
        ],
      },
    ],
  };
}
