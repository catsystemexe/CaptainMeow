import type { SpriteBackgroundLayer } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundChunk } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { finiteNumber } from "../render/webgl/bg/layers/backgroundLayerMath";

export type RectLike = { left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };
export type CanvasViewportRect = RectLike & { scale: number };

export function resolveCanvasViewportRect(rect: RectLike, internalW: number, internalH: number): CanvasViewportRect | null {
  const w = finiteNumber(rect.width, 0), h = finiteNumber(rect.height, 0);
  const iw = finiteNumber(internalW, 0), ih = finiteNumber(internalH, 0);
  if (w <= 0 || h <= 0 || iw <= 0 || ih <= 0) return null;
  const scale = Math.min(w / iw, h / ih);
  const width = iw * scale, height = ih * scale;
  return { left: rect.left + (w - width) / 2, top: rect.top + (h - height) / 2, width, height, scale };
}

export function clientPointToInternalPoint(client: Point, viewport: CanvasViewportRect, internalW: number, internalH: number): Point | null {
  if (client.x < viewport.left || client.y < viewport.top || client.x > viewport.left + viewport.width || client.y > viewport.top + viewport.height) return null;
  return { x: ((client.x - viewport.left) / viewport.width) * internalW, y: ((client.y - viewport.top) / viewport.height) * internalH };
}

export function internalPointToWorldPoint(point: Point, scroll: Point): Point { return { x: point.x + finiteNumber(scroll.x), y: point.y + finiteNumber(scroll.y) }; }
export function worldPointToChunkLocalPoint(point: Point, chunk: Pick<BackgroundChunk, "startX">): Point { return { x: point.x - finiteNumber(chunk.startX), y: point.y }; }

export function layerAuthoredWorldOffset(layer: SpriteBackgroundLayer, owner: { kind: "global" } | { kind: "chunk"; chunkStartX: number }): Point {
  return { x: finiteNumber(layer.offset.x) + (owner.kind === "chunk" ? finiteNumber(owner.chunkStartX) : 0), y: finiteNumber(layer.offset.y) };
}

export function layerRenderedOrigin(layer: SpriteBackgroundLayer, owner: { kind: "global" } | { kind: "chunk"; chunkStartX: number }, scroll: Point): Point {
  const w = layerAuthoredWorldOffset(layer, owner);
  return { x: w.x - finiteNumber(scroll.x) * finiteNumber(layer.parallax.x), y: w.y - finiteNumber(scroll.y) * finiteNumber(layer.parallax.y) };
}

export function renderedOriginToAuthoredOffset(rendered: Point, layer: SpriteBackgroundLayer, owner: { kind: "global" } | { kind: "chunk"; chunkStartX: number }, scroll: Point): Point {
  const world = { x: rendered.x + finiteNumber(scroll.x) * finiteNumber(layer.parallax.x), y: rendered.y + finiteNumber(scroll.y) * finiteNumber(layer.parallax.y) };
  return owner.kind === "chunk" ? { x: world.x - finiteNumber(owner.chunkStartX), y: world.y } : world;
}
