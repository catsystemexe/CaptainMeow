import type { BackgroundLayer, SpriteBackgroundLayer } from "./BackgroundLayerTypes";
import type { BackgroundChunk, BackgroundScene, ResolvedBackgroundChunk } from "./BackgroundSceneTypes";
import { finiteNumber } from "./backgroundLayerMath";

export interface VisibleWorldRange {
  startX: number;
  endX: number;
}

function warnInvalid(message: string): void {
  if (typeof console !== "undefined") console.warn(`[BGR B2] ${message}`);
}

export function resolveVisibleWorldRange(worldScrollX: number, viewportWidth: number, overscan = 0): VisibleWorldRange {
  const start = finiteNumber(worldScrollX, 0) - Math.max(0, finiteNumber(overscan, 0));
  const width = Math.max(0, finiteNumber(viewportWidth, 0));
  const end = finiteNumber(worldScrollX, 0) + width + Math.max(0, finiteNumber(overscan, 0));
  return end >= start ? { startX: start, endX: end } : { startX: start, endX: start };
}

export function chunkEndX(chunk: Pick<BackgroundChunk, "startX" | "length">): number {
  return chunk.startX + chunk.length;
}

export function isValidChunkInterval(chunk: unknown): chunk is BackgroundChunk {
  if (!chunk || typeof chunk !== "object") return false;
  const c = chunk as BackgroundChunk;
  return typeof c.id === "string" && c.id.length > 0 && Number.isFinite(c.startX) && Number.isFinite(c.length) && c.length > 0 && Array.isArray(c.layers);
}

export function chunkIntersectsVisibleRange(chunk: Pick<BackgroundChunk, "startX" | "length">, range: VisibleWorldRange): boolean {
  const endX = chunkEndX(chunk);
  // Chunks use half-open intervals: [startX, startX + length). A zero-width
  // viewport still samples the chunk containing its origin; non-zero ranges use
  // strict interval intersection so exact end boundaries exclude the prior chunk.
  if (range.endX <= range.startX) return chunk.startX <= range.startX && range.startX < endX;
  return chunk.startX < range.endX && endX > range.startX;
}

export function resolveActiveBackgroundChunks(scene: BackgroundScene | null | undefined, worldScrollX: number, viewportWidth: number, overscan = 0): ResolvedBackgroundChunk[] {
  if (!scene || typeof scene.id !== "string" || scene.id.length === 0 || !Array.isArray(scene.chunks)) {
    if (scene) warnInvalid("invalid scene skipped");
    return [];
  }
  const range = resolveVisibleWorldRange(worldScrollX, viewportWidth, overscan);
  const seen = new Set<string>();
  const resolved: ResolvedBackgroundChunk[] = [];
  scene.chunks.forEach((chunk, sourceIndex) => {
    if (!isValidChunkInterval(chunk)) {
      warnInvalid(`invalid chunk skipped at index ${sourceIndex}`);
      return;
    }
    if (seen.has(chunk.id)) {
      warnInvalid(`duplicate chunk id skipped: ${chunk.id}`);
      return;
    }
    seen.add(chunk.id);
    if (!chunkIntersectsVisibleRange(chunk, range)) return;
    resolved.push({ id: chunk.id, startX: chunk.startX, length: chunk.length, endX: chunkEndX(chunk), source: chunk, sourceIndex });
  });
  return resolved.sort((a, b) => a.startX - b.startX || a.endX - b.endX || a.sourceIndex - b.sourceIndex || a.id.localeCompare(b.id));
}

export function globalRuntimeLayerId(layerId: string): string {
  return `global:${layerId}`;
}

export function chunkRuntimeLayerId(chunkId: string, layerId: string): string {
  return `chunk:${chunkId}:${layerId}`;
}

function withRuntimeId(layer: BackgroundLayer, runtimeId: string): BackgroundLayer {
  return { ...layer, id: runtimeId } as BackgroundLayer;
}

function withChunkLocalOffset(layer: BackgroundLayer, chunk: ResolvedBackgroundChunk): BackgroundLayer {
  if (layer.kind !== "sprite") return layer;
  const sprite = layer as SpriteBackgroundLayer;
  return {
    ...sprite,
    offset: {
      x: chunk.startX + finiteNumber(sprite.offset?.x, 0),
      y: finiteNumber(sprite.offset?.y, 0),
    },
  };
}

export function composeBackgroundLayers(scene: BackgroundScene | null | undefined, activeChunks: ResolvedBackgroundChunk[]): BackgroundLayer[] {
  if (!scene || !Array.isArray(scene.globalLayers)) return [];
  const layers: BackgroundLayer[] = [];
  scene.globalLayers.forEach((layer) => layers.push(withRuntimeId(layer, globalRuntimeLayerId(layer.id))));
  activeChunks.forEach((chunk) => {
    chunk.source.layers.forEach((layer) => layers.push(withRuntimeId(withChunkLocalOffset(layer, chunk), chunkRuntimeLayerId(chunk.id, layer.id))));
  });
  return layers;
}

export function resolveActiveBackgroundLayerIds(layers: BackgroundLayer[]): string[] {
  return layers.filter((layer) => layer.kind === "sprite").map((layer) => layer.id);
}
