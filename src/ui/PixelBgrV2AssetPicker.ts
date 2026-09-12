import type { BackgroundAssetRef } from "../render/bg/v2/BackgroundV2Types";
import type { BackgroundAssetEntry } from "./PixelBgrLabAssets";

export function initialV2AssetId(catalog: readonly BackgroundAssetEntry[]): string {
  return catalog[0]?.id ?? "";
}

export function resolveV2PickerAsset(catalog: readonly BackgroundAssetEntry[], selectedId: string): BackgroundAssetRef | null {
  const entry = catalog.find(asset => asset.id === selectedId);
  return entry ? { id: entry.id, url: entry.url } : null;
}

/** Entity selection is contextual, including unresolved IDs that need diagnosis. */
export function syncV2PickerAssetId(entityAssetId: string): string {
  return entityAssetId;
}
