import type { BackgroundChunk } from "../render/webgl/bg/layers/BackgroundSceneTypes";

export interface TimelineRange { startX: number; endX: number }
export interface TimelineScale { minX: number; maxX: number; widthPx: number }
export interface ChunkTimelineBlock extends TimelineRange { id: string; leftPx: number; widthPx: number; selected: boolean }
export type ChunkTimelineDragMode = "move" | "resize-left" | "resize-right";
export interface ChunkTimelineDragOptions { snapPx?: number; minStartX?: number; minLength?: number }
export interface TimelinePointerDrag { pointerId: number; active: boolean }

const DEFAULT_LENGTH = 720;
const MIN_SPAN = 1;
const PADDING = 120;
export const DEFAULT_CHUNK_TIMELINE_SNAP_PX = 16;
export const MIN_CHUNK_TIMELINE_LENGTH = 64;

export function chunkEndX(chunk: Pick<BackgroundChunk, "startX" | "length">): number {
  return chunk.startX + chunk.length;
}

export function snapTimelineValue(value: number, snapPx = DEFAULT_CHUNK_TIMELINE_SNAP_PX): number {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(snapPx) || snapPx <= 0) return value;
  return Math.round(value / snapPx) * snapPx;
}

export function createTimelineScale(chunks: readonly Pick<BackgroundChunk, "startX" | "length">[], cursorX = 0, widthPx = 1000): TimelineScale {
  let minX = Math.min(0, cursorX);
  let maxX = Math.max(DEFAULT_LENGTH, cursorX);
  for (const chunk of chunks) {
    if (!Number.isFinite(chunk.startX) || !Number.isFinite(chunk.length)) continue;
    minX = Math.min(minX, chunk.startX);
    maxX = Math.max(maxX, chunkEndX(chunk));
  }
  if (maxX <= minX) maxX = minX + DEFAULT_LENGTH;
  const pad = Math.max(PADDING, (maxX - minX) * 0.08);
  return { minX: minX - pad, maxX: maxX + pad, widthPx: Math.max(1, widthPx) };
}

export function worldToTimelinePx(x: number, scale: TimelineScale): number {
  const span = Math.max(MIN_SPAN, scale.maxX - scale.minX);
  return ((x - scale.minX) / span) * scale.widthPx;
}

export function timelinePxToWorld(px: number, scale: TimelineScale): number {
  const span = Math.max(MIN_SPAN, scale.maxX - scale.minX);
  return scale.minX + (px / Math.max(1, scale.widthPx)) * span;
}

export function chunkTimelineBlocks(chunks: readonly BackgroundChunk[], selectedChunkId: string, scale: TimelineScale): ChunkTimelineBlock[] {
  return chunks.map((chunk) => {
    const startX = chunk.startX;
    const endX = chunkEndX(chunk);
    const leftPx = worldToTimelinePx(startX, scale);
    return { id: chunk.id, startX, endX, leftPx, widthPx: Math.max(1, worldToTimelinePx(endX, scale) - leftPx), selected: chunk.id === selectedChunkId };
  });
}

export function chunkOverlapRanges(chunks: readonly Pick<BackgroundChunk, "id" | "startX" | "length">[]): TimelineRange[] {
  const points: Array<{ x: number; delta: 1 | -1 }> = [];
  for (const chunk of chunks) {
    const endX = chunkEndX(chunk);
    if (!Number.isFinite(chunk.startX) || !Number.isFinite(chunk.length) || endX <= chunk.startX) continue;
    points.push({ x: chunk.startX, delta: 1 }, { x: endX, delta: -1 });
  }
  points.sort((a, b) => a.x - b.x || a.delta - b.delta);
  const ranges: TimelineRange[] = [];
  let active = 0;
  let lastX: number | null = null;
  for (const point of points) {
    if (lastX !== null && point.x > lastX && active > 1) ranges.push({ startX: lastX, endX: point.x });
    active += point.delta;
    lastX = point.x;
  }
  return ranges;
}

export function overlapsForChunk(chunkId: string, chunks: readonly Pick<BackgroundChunk, "id" | "startX" | "length">[]): TimelineRange[] {
  const chunk = chunks.find(c => c.id === chunkId);
  if (!chunk) return [];
  const startX = chunk.startX;
  const endX = chunkEndX(chunk);
  return chunks.filter(c => c.id !== chunkId).map(c => ({ startX: Math.max(startX, c.startX), endX: Math.min(endX, chunkEndX(c)) })).filter(r => r.endX > r.startX);
}

export function timelinePointerDeltaWorld(startClientX: number, clientX: number, scale: TimelineScale): number {
  const deltaPx = (Number.isFinite(clientX) ? clientX : startClientX) - (Number.isFinite(startClientX) ? startClientX : 0);
  return timelinePxToWorld(deltaPx, scale) - timelinePxToWorld(0, scale);
}

export function shouldHandleTimelinePointerEvent(drag: TimelinePointerDrag | null, pointerId: number): boolean {
  return Boolean(drag?.active && drag.pointerId === pointerId);
}

export function applyChunkTimelineDrag(
  chunk: Pick<BackgroundChunk, "startX" | "length">,
  mode: ChunkTimelineDragMode,
  rawDeltaX: number,
  options: ChunkTimelineDragOptions = {},
): Pick<BackgroundChunk, "startX" | "length"> {
  const snapPx = options.snapPx ?? DEFAULT_CHUNK_TIMELINE_SNAP_PX;
  const minStartX = options.minStartX ?? 0;
  const minLength = Math.max(1, options.minLength ?? MIN_CHUNK_TIMELINE_LENGTH);
  const deltaX = Number.isFinite(rawDeltaX) ? rawDeltaX : 0;
  const originalStart = Number.isFinite(chunk.startX) ? chunk.startX : minStartX;
  const originalLength = Number.isFinite(chunk.length) ? chunk.length : minLength;
  const originalEnd = originalStart + Math.max(minLength, originalLength);

  if (mode === "move") {
    const startX = Math.max(minStartX, snapTimelineValue(originalStart + deltaX, snapPx));
    return { startX, length: Math.max(minLength, originalLength) };
  }

  if (mode === "resize-right") {
    const snappedEnd = Math.max(originalStart + minLength, snapTimelineValue(originalEnd + deltaX, snapPx));
    return { startX: Math.max(minStartX, originalStart), length: Math.max(minLength, snappedEnd - originalStart) };
  }

  const snappedStart = Math.max(minStartX, snapTimelineValue(originalStart + deltaX, snapPx));
  const startX = Math.min(snappedStart, Math.max(minStartX, originalEnd - minLength));
  return { startX, length: Math.max(minLength, originalEnd - startX) };
}
