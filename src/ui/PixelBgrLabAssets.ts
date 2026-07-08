export interface BackgroundAssetEntry { id: string; label: string; url: string; kind: "sprite"; pixelArt: boolean; technical: boolean; }
export const BACKGROUND_ASSET_CATALOG: readonly BackgroundAssetEntry[] = [
  { id: "b1-technical-stars-svg", label: "Technical demo: B1 stars (SVG)", url: "/assets/bg/b1_pixel_stars.svg", kind: "sprite", pixelArt: true, technical: true },
  { id: "core-sprite-raster", label: "Technical demo: existing core sprite sheet", url: "/assets/sprites/core.png", kind: "sprite", pixelArt: true, technical: true },
] as const;
export function findBackgroundAsset(id: string): BackgroundAssetEntry | null { return BACKGROUND_ASSET_CATALOG.find(a => a.id === id) ?? null; }
