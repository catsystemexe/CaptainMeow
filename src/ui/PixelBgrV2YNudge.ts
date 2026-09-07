import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { updateV2Object } from "./PixelBgrV2ObjectEditing";
import { updateV2Segment } from "./PixelBgrV2SegmentEditing";

export function isV2YNudgeTextTarget(target: EventTarget | null): boolean {
  return target instanceof Element && (target.matches("input, textarea, select, [contenteditable]") || Boolean(target.closest("[contenteditable]")));
}

export function nudgeV2SelectionY(scene: BackgroundSceneV2, trackId: string, segmentId: string, objectId: string, delta: number) {
  const track = scene.tracks.find(item => item.id === trackId);
  if (!track || !Number.isFinite(delta)) return null;
  if (segmentId) {
    const segment = track.segments.find(item => item.id === segmentId);
    return segment ? updateV2Segment(scene, trackId, segmentId, { offsetY: segment.offsetY + delta }) : null;
  }
  if (objectId) {
    const object = track.objects.find(item => item.id === objectId);
    return object ? updateV2Object(scene, trackId, objectId, { y: object.y + delta }) : null;
  }
  return null;
}
