import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";

export type AssetValidationSeverity = "ERROR" | "WARNING" | "INFO";

export type AssetValidationCode =
  | "ASSET_ID_EMPTY"
  | "ASSET_DUPLICATE_ID"
  | "ASSET_TYPE_UNSUPPORTED"
  | "ASSET_RUNTIME_INVALID"
  | "ASSET_FILE_MISSING"
  | "ASSET_DISPLAY_NAME_EMPTY"
  | "ASSET_REFERENCE_UNRESOLVED";

export interface AssetValidationDiagnostic {
  readonly severity: AssetValidationSeverity;
  readonly code: AssetValidationCode;
  readonly message: string;
  readonly assetId?: string;
  readonly source?: string;
}

export interface AssetValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly AssetValidationDiagnostic[];
}

export interface AssetReferenceRecord {
  readonly assetId: string;
  readonly source: string;
}

export interface AssetDefinitionValidationOptions {
  /** Maps repository-local runtime URLs to paths. Null excludes non-local URLs. */
  readonly runtimeUrlToPath?: (url: string) => string | null;
  readonly fileExists?: (path: string) => boolean;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function result(diagnostics: AssetValidationDiagnostic[]): AssetValidationResult {
  return { valid: !diagnostics.some(({ severity }) => severity === "ERROR"), diagnostics };
}

/** Validates untyped declarations so corrupt catalogue input can be diagnosed before construction. */
export function validateAssetDefinitions(
  definitions: readonly unknown[],
  options: AssetDefinitionValidationOptions = {},
): AssetValidationResult {
  const diagnostics: AssetValidationDiagnostic[] = [];
  const seenIds = new Set<string>();

  definitions.forEach((raw, index) => {
    const source = `definitions[${index}]`;
    const definition = object(raw) ? raw : {};
    const id = typeof definition.id === "string" ? definition.id : "";
    const diagnosticId = id || undefined;

    if (id.trim().length === 0) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_ID_EMPTY", message: "Asset ID must be a non-empty string.", source });
    } else if (seenIds.has(id)) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_DUPLICATE_ID", message: `Duplicate Asset ID: ${id}`, assetId: id, source });
    } else {
      seenIds.add(id);
    }

    if (typeof definition.displayName !== "string" || definition.displayName.trim().length === 0) {
      diagnostics.push({ severity: "WARNING", code: "ASSET_DISPLAY_NAME_EMPTY", message: "Asset display name is empty.", assetId: diagnosticId, source });
    }
    if (definition.type !== "image") {
      diagnostics.push({ severity: "ERROR", code: "ASSET_TYPE_UNSUPPORTED", message: `Unsupported asset type: ${String(definition.type)}`, assetId: diagnosticId, source });
    }

    const runtime = definition.runtime;
    if (!object(runtime) || runtime.kind !== "url") {
      diagnostics.push({ severity: "ERROR", code: "ASSET_RUNTIME_INVALID", message: "Asset runtime must use the supported URL delivery shape.", assetId: diagnosticId, source });
      return;
    }
    if (typeof runtime.url !== "string" || runtime.url.trim().length === 0) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_RUNTIME_INVALID", message: "Asset runtime URL must be a non-empty string.", assetId: diagnosticId, source });
      return;
    }

    const path = options.runtimeUrlToPath?.(runtime.url) ?? null;
    if (path !== null && options.fileExists && !options.fileExists(path)) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_FILE_MISSING", message: `Runtime file is missing for URL ${runtime.url}: ${path}`, assetId: diagnosticId, source: path });
    }
  });

  return result(diagnostics);
}

export function validateAssetReferences(
  references: readonly AssetReferenceRecord[],
  knownAssetIds: ReadonlySet<string>,
): AssetValidationResult {
  const diagnostics: AssetValidationDiagnostic[] = [];
  for (const reference of references) {
    if (!knownAssetIds.has(reference.assetId)) {
      diagnostics.push({
        severity: "ERROR",
        code: "ASSET_REFERENCE_UNRESOLVED",
        message: `Unresolved Asset ID: ${reference.assetId}`,
        assetId: reference.assetId,
        source: reference.source,
      });
    }
  }
  return result(diagnostics);
}

/** Collects only Phase C's migrated V2 segment/object references; staticBackdrop remains URL-persisted. */
export function collectBackgroundV2AssetReferences(
  scene: BackgroundSceneV2,
  sceneSource: string,
): readonly AssetReferenceRecord[] {
  return scene.tracks.flatMap((track, trackIndex) => [
    ...track.segments.map((segment, segmentIndex) => ({
      assetId: segment.asset.id,
      source: `${sceneSource}.tracks[${trackIndex}].segments[${segmentIndex}].asset.id`,
    })),
    ...track.objects.map((backgroundObject, objectIndex) => ({
      assetId: backgroundObject.asset.id,
      source: `${sceneSource}.tracks[${trackIndex}].objects[${objectIndex}].asset.id`,
    })),
  ]);
}

export function combineAssetValidationResults(
  ...results: readonly AssetValidationResult[]
): AssetValidationResult {
  return result(results.flatMap(({ diagnostics }) => [...diagnostics]));
}
