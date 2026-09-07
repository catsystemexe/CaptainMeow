import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";

export const V2_PARALLAX_AUTHORING_POLICY = "preserve-track-geometry" as const;

export type V2TrackParallaxEditResult =
  | { ok: true; scene: BackgroundSceneV2; trackId: string }
  | { ok: false; scene: BackgroundSceneV2; code: "track-not-found" | "invalid-value"; error: string };

/** Updates only the selected track's horizontal parallax, preserving all authored track-space geometry. */
export function updateV2TrackParallaxX(
  scene: BackgroundSceneV2,
  trackId: string,
  value: number,
): V2TrackParallaxEditResult {
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, scene, code: "invalid-value", error: "Parallax X must be finite and non-negative." };
  }
  const index = scene.tracks.findIndex(track => track.id === trackId);
  if (index < 0) return { ok: false, scene, code: "track-not-found", error: `Track '${trackId}' was not found.` };
  const track = scene.tracks[index];
  return {
    ok: true,
    scene: {
      ...scene,
      tracks: scene.tracks.map((item, itemIndex) => itemIndex === index
        ? { ...track, parallax: { ...track.parallax, x: value } }
        : item),
    },
    trackId,
  };
}
