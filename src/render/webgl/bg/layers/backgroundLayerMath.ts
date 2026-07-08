import type { BackgroundLayer, BackgroundState, SpriteBackgroundLayer } from "./BackgroundLayerTypes";

export type BackgroundFallback = "layers" | "legacy";
export type Vec2 = { x: number; y: number };

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp01(value: unknown, fallback = 1): number {
  const n = finiteNumber(value, fallback);
  return Math.max(0, Math.min(1, n));
}

export function isKnownBackgroundLayer(layer: unknown): layer is BackgroundLayer {
  if (!layer || typeof layer !== "object") return false;
  const kind = (layer as { kind?: unknown }).kind;
  return kind === "shader" || kind === "flow-ribbon" || kind === "flow-segments" || kind === "sprite";
}

export function isLayerVisible(layer: BackgroundLayer): boolean {
  if (!layer.enabled) return false;
  if (layer.kind === "sprite") return clamp01(layer.opacity, 1) > 0 && typeof layer.texture?.url === "string" && layer.texture.url.length > 0;
  return true;
}

export function selectBackgroundFallback(state: BackgroundState | null | undefined): BackgroundFallback {
  if (!state?.enabled || !Array.isArray(state.layers) || state.layers.length === 0) return "legacy";
  return state.layers.some(isKnownBackgroundLayer) ? "layers" : "legacy";
}

export function resolveBackgroundLayers(state: BackgroundState | null | undefined): BackgroundLayer[] {
  if (selectBackgroundFallback(state) === "legacy") return [];
  return state!.layers.filter((layer): layer is BackgroundLayer => isKnownBackgroundLayer(layer) && isLayerVisible(layer));
}

export function resolveParallaxOffset(layer: Pick<SpriteBackgroundLayer, "offset" | "parallax">, scroll: Vec2): Vec2 {
  return {
    x: finiteNumber(layer.offset?.x) - finiteNumber(scroll.x) * finiteNumber(layer.parallax?.x),
    y: finiteNumber(layer.offset?.y) - finiteNumber(scroll.y) * finiteNumber(layer.parallax?.y),
  };
}

export function wrapStart(offset: number, tileSize: number): number {
  const size = Math.max(1, finiteNumber(tileSize, 1));
  const n = finiteNumber(offset, 0);
  return ((n % size) + size) % size - size;
}

export function wrappedTileOrigins(offset: number, tileSize: number, viewportSize: number, overscanPx = 0): number[] {
  const size = Math.max(1, finiteNumber(tileSize, 1));
  const view = Math.max(0, finiteNumber(viewportSize, 0));
  const overscan = Math.max(0, finiteNumber(overscanPx, 0));
  const origins: number[] = [];
  for (let x = wrapStart(offset, size); x < view + overscan; x += size) {
    if (x + size >= -overscan) origins.push(x);
  }
  return origins;
}
