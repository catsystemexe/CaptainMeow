import type { BackgroundSceneV2, BackgroundSegment, BackgroundTrack } from "../render/bg/v2/BackgroundV2Types";
import { DEFAULT_CHUNK_TIMELINE_SNAP_PX, MIN_CHUNK_TIMELINE_LENGTH, snapTimelineValue } from "./PixelBgrTimeline";

export const V2_SEGMENT_SNAP_PX = DEFAULT_CHUNK_TIMELINE_SNAP_PX;
export const MIN_V2_SEGMENT_WIDTH = MIN_CHUNK_TIMELINE_LENGTH;
export const V2_DUPLICATE_OFFSET_PX = DEFAULT_CHUNK_TIMELINE_SNAP_PX;
export const V2_PARALLAX_AUTHORING_POLICY = "choice-required-before-track-parallax-edit" as const;

export type V2SegmentEditErrorCode = "track-not-found" | "segment-not-found" | "sequence-required" | "invalid-value" | "duplicate-id" | "asset-required";
export type V2SegmentEditResult =
  | { ok: true; scene: BackgroundSceneV2; trackId: string; segmentId: string }
  | { ok: false; scene: BackgroundSceneV2; code: V2SegmentEditErrorCode; error: string };
export type V2SegmentDragMode = "move" | "resize-left" | "resize-right";
export type V2SegmentPatch = Partial<Pick<BackgroundSegment, "startTrackX" | "widthPx" | "offsetY" | "opacity" | "blend" | "localZ" | "fadeInPx" | "fadeOutPx" | "enabled">>;
export interface V2SegmentOverlap { startX: number; endX: number; segmentIds: string[] }

const fail = (scene: BackgroundSceneV2, code: V2SegmentEditErrorCode, error: string): V2SegmentEditResult => ({ ok: false, scene, code, error });
const success = (scene: BackgroundSceneV2, trackId: string, segmentId: string): V2SegmentEditResult => ({ ok: true, scene, trackId, segmentId });

export function findV2Track(scene: BackgroundSceneV2, trackId: string): BackgroundTrack | null {
  return scene.tracks.find(track => track.id === trackId) ?? null;
}
export function findV2Segment(scene: BackgroundSceneV2, trackId: string, segmentId: string): BackgroundSegment | null {
  return findV2Track(scene, trackId)?.segments.find(segment => segment.id === segmentId) ?? null;
}
export function canAuthorV2Segments(track: BackgroundTrack | null): boolean { return track?.mode === "sequence"; }

function uniqueSegmentId(scene: BackgroundSceneV2, base: string): string {
  const ids = new Set(scene.tracks.flatMap(track => track.segments.map(segment => segment.id)));
  const stem = (base.trim() || "segment").replace(/-copy(?:-\d+)?$/, "");
  let candidate = `${stem}-copy`;
  for (let suffix = 2; ids.has(candidate); suffix += 1) candidate = `${stem}-copy-${suffix}`;
  return candidate;
}

function replaceTrack(scene: BackgroundSceneV2, nextTrack: BackgroundTrack): BackgroundSceneV2 {
  return { ...scene, tracks: scene.tracks.map(track => track.id === nextTrack.id ? nextTrack : track) };
}

function editable(scene: BackgroundSceneV2, trackId: string, segmentId?: string): { track: BackgroundTrack; segment?: BackgroundSegment } | V2SegmentEditResult {
  const ids = scene.tracks.flatMap(item => item.segments.map(segment => segment.id));
  if (new Set(ids).size !== ids.length) return fail(scene, "duplicate-id", "Segment IDs must be unique across the V2 scene before editing.");
  const track = findV2Track(scene, trackId);
  if (!track) return fail(scene, "track-not-found", `Track '${trackId}' was not found.`);
  if (!canAuthorV2Segments(track)) return fail(scene, "sequence-required", `Track '${trackId}' is ${track.mode}; M6 segment authoring is sequence-only.`);
  if (segmentId === undefined) return { track };
  const segment = track.segments.find(item => item.id === segmentId);
  return segment ? { track, segment } : fail(scene, "segment-not-found", `Segment '${segmentId}' was not found on track '${trackId}'.`);
}

function validSegment(segment: BackgroundSegment): string | null {
  if (!Number.isFinite(segment.startTrackX) || segment.startTrackX < 0) return "startTrackX must be finite and non-negative.";
  if (!Number.isFinite(segment.widthPx) || segment.widthPx <= 0) return "widthPx must be finite and positive.";
  if (!Number.isFinite(segment.offsetY) || !Number.isFinite(segment.localZ)) return "offsetY and localZ must be finite.";
  if (!Number.isFinite(segment.opacity) || segment.opacity < 0 || segment.opacity > 1) return "opacity must be finite and between 0 and 1.";
  if (segment.fadeInPx !== undefined && (!Number.isFinite(segment.fadeInPx) || segment.fadeInPx < 0)) return "fadeInPx must be finite and non-negative.";
  if (segment.fadeOutPx !== undefined && (!Number.isFinite(segment.fadeOutPx) || segment.fadeOutPx < 0)) return "fadeOutPx must be finite and non-negative.";
  return null;
}

export function createV2Segment(scene: BackgroundSceneV2, trackId: string, startTrackX: number, templateSegmentId?: string): V2SegmentEditResult {
  const target = editable(scene, trackId);
  if ("ok" in target) return target;
  const template = (templateSegmentId ? target.track.segments.find(item => item.id === templateSegmentId) : null) ?? target.track.segments[0];
  if (!template) return fail(scene, "asset-required", "Create requires an existing segment asset on the target track; asset selection is outside M6.");
  const next: BackgroundSegment = { ...template, asset: { ...template.asset }, id: uniqueSegmentId(scene, `${target.track.id}-segment`), startTrackX: snapTimelineValue(Math.max(0, startTrackX), V2_SEGMENT_SNAP_PX), widthPx: Math.max(MIN_V2_SEGMENT_WIDTH, template.widthPx) };
  const invalid = validSegment(next);
  if (invalid) return fail(scene, "invalid-value", invalid);
  return success(replaceTrack(scene, { ...target.track, segments: [...target.track.segments, next] }), trackId, next.id);
}

export function duplicateV2Segment(scene: BackgroundSceneV2, trackId: string, segmentId: string): V2SegmentEditResult {
  const target = editable(scene, trackId, segmentId); if ("ok" in target) return target;
  const source = target.segment!;
  const next = { ...source, asset: { ...source.asset }, id: uniqueSegmentId(scene, source.id), startTrackX: source.startTrackX + V2_DUPLICATE_OFFSET_PX };
  return success(replaceTrack(scene, { ...target.track, segments: [...target.track.segments, next] }), trackId, next.id);
}

export function deleteV2Segment(scene: BackgroundSceneV2, trackId: string, segmentId: string): V2SegmentEditResult {
  const target = editable(scene, trackId, segmentId); if ("ok" in target) return target;
  const index = target.track.segments.findIndex(item => item.id === segmentId);
  const segments = target.track.segments.filter(item => item.id !== segmentId);
  const nextSelection = segments[Math.min(index, segments.length - 1)]?.id ?? "";
  return success(replaceTrack(scene, { ...target.track, segments }), trackId, nextSelection);
}

export function updateV2Segment(scene: BackgroundSceneV2, trackId: string, segmentId: string, patch: V2SegmentPatch): V2SegmentEditResult {
  const target = editable(scene, trackId, segmentId); if ("ok" in target) return target;
  const next = { ...target.segment!, ...patch, asset: { ...target.segment!.asset } };
  const invalid = validSegment(next); if (invalid) return fail(scene, "invalid-value", invalid);
  const segments = target.track.segments.map(item => item.id === segmentId ? next : item);
  return success(replaceTrack(scene, { ...target.track, segments }), trackId, segmentId);
}

export function applyV2SegmentDrag(scene: BackgroundSceneV2, trackId: string, segmentId: string, mode: V2SegmentDragMode, rawDeltaX: number): V2SegmentEditResult {
  const target = editable(scene, trackId, segmentId); if ("ok" in target) return target;
  if (!Number.isFinite(rawDeltaX)) return fail(scene, "invalid-value", "Drag delta must be finite.");
  const segment = target.segment!, right = segment.startTrackX + segment.widthPx;
  if (mode === "move") return updateV2Segment(scene, trackId, segmentId, { startTrackX: Math.max(0, snapTimelineValue(segment.startTrackX + rawDeltaX, V2_SEGMENT_SNAP_PX)) });
  if (mode === "resize-right") {
    const end = Math.max(segment.startTrackX + MIN_V2_SEGMENT_WIDTH, snapTimelineValue(right + rawDeltaX, V2_SEGMENT_SNAP_PX));
    return updateV2Segment(scene, trackId, segmentId, { widthPx: end - segment.startTrackX });
  }
  const start = Math.min(Math.max(0, snapTimelineValue(segment.startTrackX + rawDeltaX, V2_SEGMENT_SNAP_PX)), right - MIN_V2_SEGMENT_WIDTH);
  return updateV2Segment(scene, trackId, segmentId, { startTrackX: start, widthPx: right - start });
}

export function calculateV2SegmentOverlaps(segments: readonly Pick<BackgroundSegment, "id" | "startTrackX" | "widthPx">[]): V2SegmentOverlap[] {
  const points = new Set<number>();
  for (const segment of segments) if (Number.isFinite(segment.startTrackX) && Number.isFinite(segment.widthPx) && segment.widthPx > 0) points.add(segment.startTrackX).add(segment.startTrackX + segment.widthPx);
  const sorted = [...points].sort((a, b) => a - b), overlaps: V2SegmentOverlap[] = [];
  for (let index = 0; index + 1 < sorted.length; index += 1) {
    const startX = sorted[index], endX = sorted[index + 1];
    const segmentIds = segments.filter(segment => segment.startTrackX < endX && segment.startTrackX + segment.widthPx > startX).map(segment => segment.id).sort();
    if (segmentIds.length > 1) overlaps.push({ startX, endX, segmentIds });
  }
  return overlaps;
}
