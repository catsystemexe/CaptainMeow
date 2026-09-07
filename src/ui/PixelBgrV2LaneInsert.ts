import type { BackgroundAssetRef, BackgroundSceneV2, BackgroundTrack } from "../render/bg/v2/BackgroundV2Types";
import { worldXToTrackX } from "../render/bg/v2/BackgroundV2Math";
import type { V2ProjectedLane } from "./PixelBgrV2TimelineProjection";
import { createV2Segment, type V2SegmentEditResult } from "./PixelBgrV2SegmentEditing";
import { createV2Object, type V2ObjectEditResult } from "./PixelBgrV2ObjectEditing";

export function resolveV2LaneInsertTrack(scene: BackgroundSceneV2, lane: Pick<V2ProjectedLane, "tracks">, selectedTrackId: string): BackgroundTrack | null {
  const targetId = lane.tracks.some(track => track.id === selectedTrackId) ? selectedTrackId : lane.tracks[0]?.id;
  return targetId ? scene.tracks.find(track => track.id === targetId) ?? null : null;
}

function insertionTrackX(scene: BackgroundSceneV2, trackId: string, playerWorldX: number): { ok: true; value: number } | { ok: false; error: string } {
  const track = scene.tracks.find(item => item.id === trackId);
  if (!track) return { ok: false, error: `Track '${trackId}' was not found.` };
  if (!Number.isFinite(track.parallax.x) || track.parallax.x <= 0) return { ok: false, error: `Cannot insert on '${trackId}': horizontal parallax must be positive and invertible.` };
  const converted = worldXToTrackX(playerWorldX, track.parallax.x);
  return converted.ok ? converted : { ok: false, error: `Cannot insert on '${trackId}': horizontal parallax must be positive and invertible.` };
}

export function insertV2LaneSegment(scene: BackgroundSceneV2, trackId: string, playerWorldX: number, fallbackAsset: BackgroundAssetRef, selectedSegmentId?: string): V2SegmentEditResult {
  const x = insertionTrackX(scene, trackId, playerWorldX);
  if (!x.ok) return { ok: false, scene, code: "invalid-value", error: x.error };
  return createV2Segment(scene, trackId, x.value, selectedSegmentId, fallbackAsset);
}

export function insertV2LaneObject(scene: BackgroundSceneV2, trackId: string, playerWorldX: number, asset: BackgroundAssetRef): V2ObjectEditResult {
  const x = insertionTrackX(scene, trackId, playerWorldX);
  if (!x.ok) return { ok: false, scene, code: "invalid-value", error: x.error };
  return createV2Object(scene, trackId, asset, x.value, 0);
}
