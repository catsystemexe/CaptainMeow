import { createAssetCatalog } from "./AssetCatalog";
import { assetId, type AssetDefinition } from "./AssetTypes";

export interface BackgroundAssetMetadata {
  readonly technical: boolean;
  readonly pixelArt: boolean;
}

export interface BackgroundAssetDeclaration {
  readonly definition: AssetDefinition;
  readonly background: BackgroundAssetMetadata;
}

function backgroundImage(
  id: string,
  displayName: string,
  url: string,
): BackgroundAssetDeclaration {
  return {
    definition: { id: assetId(id), displayName, type: "image", runtime: { kind: "url", url } },
    background: { pixelArt: true, technical: true },
  };
}

/** The canonical declarations for the initial BGR Asset System seed. */
export const BACKGROUND_ASSET_DECLARATIONS: readonly BackgroundAssetDeclaration[] = [
  backgroundImage("b1-technical-stars-svg", "Technical demo: B1 stars (SVG)", "/assets/bg/b1_pixel_stars.svg"),
  backgroundImage("bgr-demo-stars-tile", "Technical demo: seamless repeat/parallax raster pixel-art tile", "/assets/bg/demo/bgr_demo_stars_tile.png"),
  backgroundImage("bgr-demo-orientation", "Technical demo: orientation/origin/bounds/drag raster pixel-art test", "/assets/bg/demo/bgr_demo_orientation.png"),
  backgroundImage("bgr-demo-chunk-band", "Technical demo: chunk-local placement/boundary raster pixel-art test", "/assets/bg/demo/bgr_demo_chunk_band.png"),
  backgroundImage("desert-test-sky", "Technical test: desert sky", "/assets/bg/test/desert/desert_sky.png"),
  backgroundImage("desert-test-clouds", "Technical test: desert clouds", "/assets/bg/test/desert/desert_clouds.png"),
  backgroundImage("desert-test-far-mesas", "Technical test: desert far mesas", "/assets/bg/test/desert/desert_far_mesas.png"),
  backgroundImage("desert-test-mid-mesas-a", "Technical test: desert mid mesas A", "/assets/bg/test/desert/desert_mid_mesas_a.png"),
  backgroundImage("desert-test-mid-mesas-b", "Technical test: desert mid mesas B", "/assets/bg/test/desert/desert_mid_mesas_b.png"),
  backgroundImage("desert-test-near-band", "Technical test: desert near band", "/assets/bg/test/desert/desert_near_band.png"),
  backgroundImage("desert-test-sun", "Technical test: desert sun", "/assets/bg/test/desert/desert_sun.png"),
];

export const ASSET_CATALOG = createAssetCatalog(
  BACKGROUND_ASSET_DECLARATIONS.map((entry) => entry.definition),
);

export const resolveAsset = ASSET_CATALOG.resolve;
