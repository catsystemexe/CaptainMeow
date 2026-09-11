import { ASSET_CATALOG, BACKGROUND_ASSET_DECLARATIONS } from "../assets/BackgroundAssets";
import { assetId } from "../assets/AssetTypes";

export interface BackgroundAssetEntry {
  id: string;
  label: string;
  url: string;
  kind: "sprite";
  pixelArt: boolean;
  technical: boolean;
}

/** Compatibility view for existing Scene Lab consumers. */
export const BACKGROUND_ASSET_CATALOG: readonly BackgroundAssetEntry[] = BACKGROUND_ASSET_DECLARATIONS.map(
  ({ definition, background }) => ({
    id: definition.id,
    label: definition.displayName,
    url: definition.runtime.url,
    kind: "sprite",
    pixelArt: background.pixelArt,
    technical: background.technical,
  }),
);

export function findBackgroundAsset(id: string): BackgroundAssetEntry | null {
  if (!ASSET_CATALOG.get(assetId(id))) return null;
  return BACKGROUND_ASSET_CATALOG.find((asset) => asset.id === id) ?? null;
}
