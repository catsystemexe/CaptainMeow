import type { Range, Zone } from "../game/scene-logic/Space";
import type { Point } from "./PixelBgrLabCoordinates";

export type SpaceTimelineDragMode = "move" | "resize-left" | "resize-right";
export const markerTimelineWorldX = (position: number): number => position;
export const rangeTimelineWorldX = (range: Range): { startX: number; endX: number } => ({ startX: range.start, endX: range.end });
export function dragRange(range: Range, mode: SpaceTimelineDragMode, deltaX: number): Pick<Range, "start" | "end"> {
  if (!Number.isFinite(deltaX)) return { start: range.start, end: range.end };
  if (mode === "move") return { start: range.start + deltaX, end: range.end + deltaX };
  if (mode === "resize-left") return { start: Math.min(range.end, range.start + deltaX), end: range.end };
  return { start: range.start, end: Math.max(range.start, range.end + deltaX) };
}
export function zoneToCanvasRect(zone: Zone, scroll: Point): { x: number; y: number; width: number; height: number } {
  return { x: zone.minX - scroll.x, y: zone.minY - scroll.y, width: zone.maxX - zone.minX, height: zone.maxY - zone.minY };
}
export function moveZone(zone: Zone, delta: Point): Pick<Zone, "minX" | "maxX" | "minY" | "maxY"> {
  return { minX: zone.minX + delta.x, maxX: zone.maxX + delta.x, minY: zone.minY + delta.y, maxY: zone.maxY + delta.y };
}
