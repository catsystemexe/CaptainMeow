export type AssetId = string & { readonly __assetIdBrand: unique symbol };

export type AssetType = "image";

export interface AssetDefinition {
  readonly id: AssetId;
  readonly displayName: string;
  readonly type: AssetType;
  readonly runtime: {
    readonly kind: "url";
    readonly url: string;
  };
}

/** Explicit boundary for IDs declared by catalogue owners or supplied to lookup APIs. */
export function assetId(value: string): AssetId {
  return value as AssetId;
}
