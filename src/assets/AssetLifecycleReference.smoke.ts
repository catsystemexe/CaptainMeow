import assert from "node:assert/strict";
import { createAssetCatalog } from "./AssetCatalog";
import { ASSET_CATALOG, BACKGROUND_ASSET_DECLARATIONS } from "./BackgroundAssets";
import { assessAssetRemoval, createAssetReferenceIndex, findAssetReferences, findUnusedAssetCandidates, type AssetReferenceSourceRegistry } from "./AssetReferenceIndex";
import { assetId, type AssetDefinition, type RemovedAssetTombstone } from "./AssetTypes";
import { validateAssetLifecycle } from "./AssetValidation";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";

const definition = (id: string, state: "active" | "deprecated" = "active", replacementId?: string): AssetDefinition => ({
  id: assetId(id), displayName: id, type: "image", lifecycle: { state, replacementId: replacementId ? assetId(replacementId) : undefined }, runtime: { kind: "url", url: `/assets/${id}.png` },
});

const active = definition("active");
const deprecated = definition("old", "deprecated", "active");
const removed: RemovedAssetTombstone = { id: assetId("removed"), state: "removed", replacementId: active.id };
const catalog = createAssetCatalog([active, deprecated], [removed]);
assert.equal(catalog.resolve(active.id), active, "active asset resolves");
assert.equal(catalog.resolve(deprecated.id), deprecated, "deprecated asset resolves itself without redirect");
assert.equal(catalog.resolve(deprecated.id)?.lifecycle.replacementId, active.id);
assert.equal(catalog.resolve(removed.id), null, "removed ID is not a live asset");
assert.throws(() => createAssetCatalog([active, definition("removed")], [removed]), /Removed Asset ID reused/);
assert.equal(validateAssetLifecycle([deprecated], []).diagnostics.some(({ code }) => code === "ASSET_REPLACEMENT_UNKNOWN"), true);
assert.equal(validateAssetLifecycle([definition("self", "deprecated", "self")], []).diagnostics.some(({ code }) => code === "ASSET_REPLACEMENT_SELF"), true);
assert.equal(validateAssetLifecycle([definition("a", "deprecated", "b"), definition("b", "deprecated", "a")], []).diagnostics.some(({ code }) => code === "ASSET_REPLACEMENT_CYCLE"), true);
assert.equal(validateAssetLifecycle([definition("removed")], [removed]).diagnostics.some(({ code }) => code === "ASSET_REMOVED_ID_REUSED"), true);

const index = createAssetReferenceIndex();
assert(index.some(({ sourceKind }) => sourceKind === "bgr-v2-segment"));
assert(index.some(({ sourceKind }) => sourceKind === "bgr-v2-object"));
assert(index.some(({ sourceKind }) => sourceKind === "bgr-v2-static-backdrop"));
assert.deepEqual(index, createAssetReferenceIndex(), "repository index order is deterministic");
const v1 = findAssetReferences(assetId("b1-technical-stars-svg"), index);
assert(v1.some(({ sourceKind, confidence }) => sourceKind === "bgr-v1-url-compat" && confidence === "url-match"));
assert(!v1.some(({ sourceKind, confidence }) => sourceKind === "bgr-v1-url-compat" && confidence === "exact-id"));
assert.equal(findAssetReferences(assetId("bgr-demo-orientation"), index).length, 0);
assert(findUnusedAssetCandidates().some(({ assetId, label }) => assetId === "bgr-demo-orientation" && label === "UNUSED_CANDIDATE"));
assert.equal(assessAssetRemoval(assetId("desert-test-near-band")).safeAgainstKnownRepositoryReferences, false);

const informationalSources: AssetReferenceSourceRegistry = { v2Scenes: [{ sourceId: "test-fixture", impact: "informational", create: createBackgroundV2DesertTestScene }], v1Urls: [] };
const informational = createAssetReferenceIndex(ASSET_CATALOG, informationalSources);
const assessment = assessAssetRemoval(assetId("desert-test-near-band"), ASSET_CATALOG, informational);
assert.equal(assessment.blockingReferences.length, 0);
assert(assessment.informationalReferences.length > 0);
assert.equal(BACKGROUND_ASSET_DECLARATIONS.length, 15);
for (const { definition: current } of BACKGROUND_ASSET_DECLARATIONS) {
  assert.equal(current.lifecycle.state, "active");
  assert.equal(ASSET_CATALOG.resolve(current.id), current);
}

console.log("AssetLifecycleReference.smoke: PASS");
