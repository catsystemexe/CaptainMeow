export type AssetId = string & { readonly __assetIdBrand: unique symbol };

export type AssetType = "image";

export type AssetLifecycleState = "active" | "deprecated";

export interface AssetLifecycle {
  readonly state: AssetLifecycleState;
  /** Advisory only. Resolution never redirects to this asset. */
  readonly replacementId?: AssetId;
}

export interface AssetDefinition {
  readonly id: AssetId;
  readonly displayName: string;
  readonly type: AssetType;
  readonly lifecycle: AssetLifecycle;
  readonly runtime: {
    readonly kind: "url";
    readonly url: string;
  };
}

/** A historical ID reservation. Tombstones are deliberately not live definitions. */
export interface RemovedAssetTombstone {
  readonly id: AssetId;
  readonly state: "removed";
  readonly replacementId?: AssetId;
}

/** Explicit boundary for IDs declared by catalogue owners or supplied to lookup APIs. */
export function assetId(value: string): AssetId {
  return value as AssetId;
}
