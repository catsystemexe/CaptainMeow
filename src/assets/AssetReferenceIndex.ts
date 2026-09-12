import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { createBackgroundV2VisualVerificationScene } from "../render/bg/v2/BackgroundV2VisualVerificationScene";
import { B1_DEMO_SPRITE_BACKGROUND_URL } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import { ASSET_CATALOG } from "./BackgroundAssets";
import type { AssetCatalog } from "./AssetCatalog";
import { assetId, type AssetId } from "./AssetTypes";

export type AssetReferenceSourceKind = "bgr-v2-segment" | "bgr-v2-object" | "bgr-v2-static-backdrop" | "bgr-v1-url-compat";
export type AssetReferenceConfidence = "exact-id" | "url-match";
export type AssetReferenceImpact = "blocking" | "informational";

export interface AssetReferenceRecord {
  readonly assetId: AssetId;
  readonly sourceKind: AssetReferenceSourceKind;
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly detail?: string;
  readonly confidence: AssetReferenceConfidence;
  readonly impact: AssetReferenceImpact;
}

export interface AssetReferenceSourceRegistry {
  readonly v2Scenes: readonly { readonly sourceId: string; readonly impact: AssetReferenceImpact; readonly create: () => BackgroundSceneV2 }[];
  readonly v1Urls: readonly { readonly sourceId: string; readonly url: string; readonly impact: AssetReferenceImpact }[];
}

/** Registers source owners/factories, never individual asset references. */
export const REPOSITORY_ASSET_REFERENCE_SOURCES: AssetReferenceSourceRegistry = {
  v2Scenes: [
    { sourceId: "BackgroundV2DesertTestScene", impact: "blocking", create: createBackgroundV2DesertTestScene },
    { sourceId: "BackgroundV2VisualVerificationScene", impact: "informational", create: createBackgroundV2VisualVerificationScene },
  ],
  v1Urls: [
    { sourceId: "B1SpriteParallaxDemo", url: B1_DEMO_SPRITE_BACKGROUND_URL, impact: "blocking" },
  ],
};

function collectV2(scene: BackgroundSceneV2, sourceId: string, impact: AssetReferenceImpact): AssetReferenceRecord[] {
  const records: AssetReferenceRecord[] = [];
  if (scene.staticBackdrop) records.push({ assetId: assetId(scene.staticBackdrop.asset.id), sourceKind: "bgr-v2-static-backdrop", sourceId, sourcePath: "staticBackdrop.asset.id", confidence: "exact-id", impact });
  scene.tracks.forEach((track, trackIndex) => {
    track.segments.forEach((segment, index) => records.push({ assetId: assetId(segment.asset.id), sourceKind: "bgr-v2-segment", sourceId, sourcePath: `tracks[${trackIndex}].segments[${index}].asset.id`, detail: `track=${track.id} segment=${segment.id}`, confidence: "exact-id", impact }));
    track.objects.forEach((entry, index) => records.push({ assetId: assetId(entry.asset.id), sourceKind: "bgr-v2-object", sourceId, sourcePath: `tracks[${trackIndex}].objects[${index}].asset.id`, detail: `track=${track.id} object=${entry.id}`, confidence: "exact-id", impact }));
  });
  return records;
}

export function createAssetReferenceIndex(
  catalog: AssetCatalog = ASSET_CATALOG,
  sources: AssetReferenceSourceRegistry = REPOSITORY_ASSET_REFERENCE_SOURCES,
): readonly AssetReferenceRecord[] {
  const records = sources.v2Scenes.flatMap(({ sourceId, impact, create }) => collectV2(create(), sourceId, impact));
  for (const source of sources.v1Urls) {
    for (const definition of catalog.list()) if (definition.runtime.url === source.url) records.push({ assetId: definition.id, sourceKind: "bgr-v1-url-compat", sourceId: source.sourceId, sourcePath: "texture.url", detail: source.url, confidence: "url-match", impact: source.impact });
  }
  return records.sort((a, b) => a.assetId.localeCompare(b.assetId) || a.sourceId.localeCompare(b.sourceId) || a.sourcePath.localeCompare(b.sourcePath) || a.sourceKind.localeCompare(b.sourceKind));
}

const REPOSITORY_INDEX = createAssetReferenceIndex();

export function findAssetReferences(id: AssetId, index: readonly AssetReferenceRecord[] = REPOSITORY_INDEX): readonly AssetReferenceRecord[] {
  return index.filter(({ assetId: referencedId }) => referencedId === id);
}

export const UNUSED_CANDIDATE_LIMITATION = "Known repository references exclude imported scenes, external persisted files, browser localStorage, and dynamically constructed references.";

export interface UnusedAssetCandidate { readonly assetId: AssetId; readonly label: "UNUSED_CANDIDATE"; readonly limitation: string }
export function findUnusedAssetCandidates(catalog: AssetCatalog = ASSET_CATALOG, index: readonly AssetReferenceRecord[] = REPOSITORY_INDEX): readonly UnusedAssetCandidate[] {
  return catalog.list().filter(({ id }) => !index.some((record) => record.assetId === id && record.impact === "blocking")).map(({ id }) => ({ assetId: id, label: "UNUSED_CANDIDATE", limitation: UNUSED_CANDIDATE_LIMITATION }));
}

export interface AssetRemovalAssessment {
  readonly assetId: AssetId;
  readonly lifecycleState: "active" | "deprecated" | "removed" | "unknown";
  readonly replacementId?: AssetId;
  readonly safeAgainstKnownRepositoryReferences: boolean;
  readonly alreadyUnavailable: boolean;
  readonly blockingReferences: readonly AssetReferenceRecord[];
  readonly informationalReferences: readonly AssetReferenceRecord[];
  readonly limitation: string;
}

export function assessAssetRemoval(id: AssetId, catalog: AssetCatalog = ASSET_CATALOG, index: readonly AssetReferenceRecord[] = REPOSITORY_INDEX): AssetRemovalAssessment {
  const definition = catalog.get(id);
  const tombstone = catalog.listTombstones().find((entry) => entry.id === id);
  const references = findAssetReferences(id, index);
  const blockingReferences = references.filter(({ impact }) => impact === "blocking");
  return { assetId: id, lifecycleState: definition?.lifecycle.state ?? tombstone?.state ?? "unknown", replacementId: definition?.lifecycle.replacementId ?? tombstone?.replacementId, safeAgainstKnownRepositoryReferences: blockingReferences.length === 0, alreadyUnavailable: tombstone !== undefined, blockingReferences, informationalReferences: references.filter(({ impact }) => impact === "informational"), limitation: UNUSED_CANDIDATE_LIMITATION };
}
