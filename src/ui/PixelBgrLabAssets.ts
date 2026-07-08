export interface BackgroundAssetEntry {
  id: string;
  label: string;
  url: string;
  kind: "sprite";
  pixelArt: boolean;
  technical: boolean;
}

export const BACKGROUND_ASSET_CATALOG: readonly BackgroundAssetEntry[] = [
  {
    id: "b1-technical-stars-svg",
    label: "Technical demo: B1 stars (SVG)",
    url: "/assets/bg/b1_pixel_stars.svg",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "bgr-demo-stars-tile",
    label: "Technical demo: seamless repeat/parallax raster pixel-art tile",
    url: "/assets/bg/demo/bgr_demo_stars_tile.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "bgr-demo-orientation",
    label: "Technical demo: orientation/origin/bounds/drag raster pixel-art test",
    url: "/assets/bg/demo/bgr_demo_orientation.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "bgr-demo-chunk-band",
    label: "Technical demo: chunk-local placement/boundary raster pixel-art test",
    url: "/assets/bg/demo/bgr_demo_chunk_band.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
] as const;

export function findBackgroundAsset(id: string): BackgroundAssetEntry | null {
  return BACKGROUND_ASSET_CATALOG.find((asset) => asset.id === id) ?? null;
}
