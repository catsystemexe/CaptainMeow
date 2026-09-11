import type { AssetDefinition, AssetId } from "./AssetTypes";

export interface AssetCatalog {
  get(id: AssetId): AssetDefinition | null;
  resolve(id: AssetId): AssetDefinition | null;
  list(): readonly AssetDefinition[];
}

export function createAssetCatalog(definitions: readonly AssetDefinition[]): AssetCatalog {
  const entries = [...definitions];
  const byId = new Map<AssetId, AssetDefinition>();

  for (const definition of entries) {
    if (byId.has(definition.id)) {
      throw new Error(`Duplicate Asset ID: ${definition.id}`);
    }
    byId.set(definition.id, definition);
  }

  const get = (id: AssetId): AssetDefinition | null => byId.get(id) ?? null;
  return {
    get,
    resolve: get,
    list: () => entries,
  };
}
