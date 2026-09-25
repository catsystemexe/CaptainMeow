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
  url: string,
  nativeSize: { width: number; height: number },
  usage: readonly BackgroundAssetUsage[],
  repeat: BackgroundAssetPreparation["repeat"] = { x: false, seam: "unknown" },
): BackgroundAssetDeclaration {
  return {
    definition: { id: assetId(id), displayName: id, type: "image", lifecycle: { state: "active" }, runtime: { kind: "url", url } },
    background: { pixelArt: true, technical: true, preparation: { nativeSize, usage, positioning: { convention: "top-left" }, repeat } },
  };
}

/** The canonical declarations for the initial BGR Asset System seed. */
export const BACKGROUND_ASSET_DECLARATIONS: readonly BackgroundAssetDeclaration[] = [
  backgroundImage("b1_pixel_stars", "/assets/bg/b1_pixel_stars.svg", { width: 128, height: 64 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("bgr_demo_stars_tile", "/assets/bg/demo/bgr_demo_stars_tile.png", { width: 64, height: 64 }, ["segment", "object", "static-backdrop"], { x: true, seam: "seamless" }),
  backgroundImage("bgr_demo_orientation", "/assets/bg/demo/bgr_demo_orientation.png", { width: 128, height: 64 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("bgr_demo_chunk_band", "/assets/bg/demo/bgr_demo_chunk_band.png", { width: 256, height: 127 }, ["segment", "object", "static-backdrop"]),
  backgroundImage("desert_sky", "/assets/bg/test/desert/desert_sky.png", { width: 1672, height: 941 }, ["static-backdrop"]),
  backgroundImage("desert_clouds", "/assets/bg/test/desert/desert_clouds.png", { width: 1672, height: 941 }, ["object"]),
  backgroundImage("desert_far_mesas", "/assets/bg/test/desert/desert_far_mesas.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert_mid_mesas_a", "/assets/bg/test/desert/desert_mid_mesas_a.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert_mid_mesas_b", "/assets/bg/test/desert/desert_mid_mesas_b.png", { width: 1672, height: 941 }, ["segment"]),
  backgroundImage("desert_near_band", "/assets/bg/test/desert/desert_near_band.png", { width: 1672, height: 941 }, ["segment", "object"]),
  backgroundImage("desert_sun", "/assets/bg/test/desert/desert_sun.png", { width: 1672, height: 941 }, ["object"]),
  backgroundImage("castle_bgr_1", "/assets/bg/test/castle/castle_bgr_1.png", { width: 4480, height: 504 }, ["segment"]),
  backgroundImage("bgr-test-solid", "/assets/debug/bgr/bgr-test-solid.svg", { width: 64, height: 64 }, ["object"]),
  backgroundImage("bgr-test-backdrop", "/assets/debug/bgr/bgr-test-backdrop.svg", { width: 64, height: 64 }, ["object"]),
  backgroundImage("bgr-test-stripes", "/assets/debug/bgr/bgr-test-stripes.svg", { width: 256, height: 96 }, ["segment"]),
  backgroundImage("bgr-test-marker", "/assets/debug/bgr/bgr-test-marker.svg", { width: 128, height: 128 }, ["object"]),
];

/** Canonical historical-ID reservations live beside the live BGR declarations. */
export const BACKGROUND_ASSET_TOMBSTONES: readonly RemovedAssetTombstone[] = [];

export const ASSET_CATALOG = createAssetCatalog(
  BACKGROUND_ASSET_DECLARATIONS.map((entry) => entry.definition),
  BACKGROUND_ASSET_TOMBSTONES,
);

export const resolveAsset = ASSET_CATALOG.resolve;
