import { createAssetCatalog } from "./AssetCatalog";
import { assetId, type AssetDefinition, type RemovedAssetTombstone } from "./AssetTypes";

export interface BackgroundAssetMetadata {
  readonly technical: boolean;
  readonly pixelArt: boolean;
  readonly preparation: BackgroundAssetPreparation;
}

export type BackgroundAssetUsage = "segment" | "object" | "static-backdrop";
export type BackgroundAssetSeam = "seamless" | "not-seamless" | "unknown";

export interface BackgroundAssetPreparation {
  readonly nativeSize: { readonly width: number; readonly height: number };
  readonly usage: readonly BackgroundAssetUsage[];
  /** Compatibility with current BGR V2 geometry; this is not a future pivot. */
  readonly positioning: { readonly convention: "top-left" };
  readonly repeat: { readonly x: boolean; readonly seam: BackgroundAssetSeam };
}

export interface BackgroundAssetDeclaration {
  readonly definition: AssetDefinition;
  readonly background: BackgroundAssetMetadata;
}

function backgroundImage(
  id: string,
  displayName: string,
  url: string,
  nativeSize: { width: number; height: number },
  usage: readonly BackgroundAssetUsage[],
  repeat: BackgroundAssetPreparation["repeat"] = { x: false, seam: "unknown" },
): BackgroundAssetDeclaration {
  return {
    definition: { id: assetId(id), displayName, type: "image", lifecycle: { state: "active" }, runtime: { kind: "url", url } },
    background: { pixelArt: true, technical: true, preparation: { nativeSize, usage, positioning: { convention: "top-left" }, repeat } },
  };
}

/** The canonical declarations for the initial BGR Asset System seed. */
export const BACKGROUND_ASSET_DECLARATIONS: readonly BackgroundAssetDeclaration[] = [
  backgroundImage("b1-technical-stars-svg", "Technical demo: B1 stars (SVG)", "/assets/bg/b1_pixel_stars.svg", { width: 128, height: 64 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("bgr-demo-stars-tile", "Technical demo: seamless repeat/parallax raster pixel-art tile", "/assets/bg/demo/bgr_demo_stars_tile.png", { width: 64, height: 64 }, ["segment", "object", "static-backdrop"], { x: true, seam: "seamless" }),
  backgroundImage("bgr-demo-orientation", "Technical demo: orientation/origin/bounds/drag raster pixel-art test", "/assets/bg/demo/bgr_demo_orientation.png", { width: 128, height: 64 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("bgr-demo-chunk-band", "Technical demo: chunk-local placement/boundary raster pixel-art test", "/assets/bg/demo/bgr_demo_chunk_band.png", { width: 256, height: 127 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("desert-test-sky", "Technical test: desert sky", "/assets/bg/test/desert/desert_sky.png", { width: 1672, height: 941 }, ["static-backdrop"]),
  backgroundImage("desert-test-clouds", "Technical test: desert clouds", "/assets/bg/test/desert/desert_clouds.png", { width: 1672, height: 941 }, ["object"]),
  backgroundImage("desert-test-far-mesas", "Technical test: desert far mesas", "/assets/bg/test/desert/desert_far_mesas.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert-test-mid-mesas-a", "Technical test: desert mid mesas A", "/assets/bg/test/desert/desert_mid_mesas_a.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert-test-mid-mesas-b", "Technical test: desert mid mesas B", "/assets/bg/test/desert/desert_mid_mesas_b.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert-test-near-band", "Technical test: desert near band", "/assets/bg/test/desert/desert_near_band.png", { width: 1672, height: 941 }, ["segment", "object"]),
  backgroundImage("desert-test-sun", "Technical test: desert sun", "/assets/bg/test/desert/desert_sun.png", { width: 1672, height: 941 }, ["object"]),
  backgroundImage("shared-solid", "Technical verification: solid", "/assets/debug/bgr/bgr-test-solid.svg", { width: 64, height: 64 }, ["object"]),
  backgroundImage("blend-backdrop", "Technical verification: blend backdrop", "/assets/debug/bgr/bgr-test-backdrop.svg", { width: 64, height: 64 }, ["object"]),
  backgroundImage("finite-stripes", "Technical verification: finite stripes", "/assets/debug/bgr/bgr-test-stripes.svg", { width: 256, height: 96 }, ["segment"]),
  backgroundImage("foreground-marker", "Technical verification: foreground marker", "/assets/debug/bgr/bgr-test-marker.svg", { width: 128, height: 128 }, ["object"]),
];

/** Canonical historical-ID reservations live beside the live BGR declarations. */
export const BACKGROUND_ASSET_TOMBSTONES: readonly RemovedAssetTombstone[] = [];

export const ASSET_CATALOG = createAssetCatalog(
  BACKGROUND_ASSET_DECLARATIONS.map((entry) => entry.definition),
  BACKGROUND_ASSET_TOMBSTONES,
);

export const resolveAsset = ASSET_CATALOG.resolve;
