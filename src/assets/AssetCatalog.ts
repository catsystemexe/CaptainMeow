import type { AssetDefinition, AssetId, RemovedAssetTombstone } from "./AssetTypes";

export interface AssetCatalog {
  get(id: AssetId): AssetDefinition | null;
  resolve(id: AssetId): AssetDefinition | null;
  list(): readonly AssetDefinition[];
  listTombstones(): readonly RemovedAssetTombstone[];
}

export function createAssetCatalog(
  definitions: readonly AssetDefinition[],
  tombstones: readonly RemovedAssetTombstone[] = [],
): AssetCatalog {
  const entries = [...definitions];
  const byId = new Map<AssetId, AssetDefinition>();

  for (const definition of entries) {
    if (byId.has(definition.id)) {
      throw new Error(`Duplicate Asset ID: ${definition.id}`);
    }
    byId.set(definition.id, definition);
  }
  const reserved = new Set<AssetId>();
  for (const tombstone of tombstones) {
    if (reserved.has(tombstone.id)) throw new Error(`Duplicate removed Asset ID: ${tombstone.id}`);
    if (byId.has(tombstone.id)) throw new Error(`Removed Asset ID reused by live definition: ${tombstone.id}`);
    reserved.add(tombstone.id);
  }

  const get = (id: AssetId): AssetDefinition | null => byId.get(id) ?? null;
  return {
    get,
    resolve: get,
    list: () => entries,
    listTombstones: () => [...tombstones],
  };
}
