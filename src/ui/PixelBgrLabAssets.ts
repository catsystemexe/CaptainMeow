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
  {
    id: "desert-test-sky",
    label: "Technical test: desert sky",
    url: "/assets/bg/test/desert/desert_sky.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-clouds",
    label: "Technical test: desert clouds",
    url: "/assets/bg/test/desert/desert_clouds.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-far-mesas",
    label: "Technical test: desert far mesas",
    url: "/assets/bg/test/desert/desert_far_mesas.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-mid-mesas-a",
    label: "Technical test: desert mid mesas A",
    url: "/assets/bg/test/desert/desert_mid_mesas_a.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-mid-mesas-b",
    label: "Technical test: desert mid mesas B",
    url: "/assets/bg/test/desert/desert_mid_mesas_b.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-near-band",
    label: "Technical test: desert near band",
    url: "/assets/bg/test/desert/desert_near_band.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
  {
    id: "desert-test-sun",
    label: "Technical test: desert sun",
    url: "/assets/bg/test/desert/desert_sun.png",
    kind: "sprite",
    pixelArt: true,
    technical: true,
  },
] as const;

export function findBackgroundAsset(id: string): BackgroundAssetEntry | null {
  return BACKGROUND_ASSET_CATALOG.find((asset) => asset.id === id) ?? null;
}
