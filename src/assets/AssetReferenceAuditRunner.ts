import { pathToFileURL } from "node:url";
import { ASSET_CATALOG } from "./BackgroundAssets";
import { createAssetReferenceIndex, findUnusedAssetCandidates } from "./AssetReferenceIndex";

export function formatAssetReferenceAudit(): string {
  const index = createAssetReferenceIndex();
  const candidates = new Set(findUnusedAssetCandidates(ASSET_CATALOG, index).map(({ assetId }) => assetId));
  return ["Asset references:", ...ASSET_CATALOG.list().map(({ id }) => {
    const references = index.filter((record) => record.assetId === id);
    const blocking = references.filter(({ impact }) => impact === "blocking").length;
    const info = references.length - blocking;
    return `${id} blocking=${blocking} info=${info}${candidates.has(id) ? " UNUSED_CANDIDATE" : ""}`;
  })].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(formatAssetReferenceAudit());
