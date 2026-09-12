import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import type { IntrinsicAssetSize } from "./AssetPreparationInspection";
import type { RemovedAssetTombstone } from "./AssetTypes";

export type AssetValidationSeverity = "ERROR" | "WARNING" | "INFO";

export type AssetValidationCode =
  | "ASSET_ID_EMPTY"
  | "ASSET_DUPLICATE_ID"
  | "ASSET_TYPE_UNSUPPORTED"
  | "ASSET_RUNTIME_INVALID"
  | "ASSET_FILE_MISSING"
  | "ASSET_DISPLAY_NAME_EMPTY"
  | "ASSET_REFERENCE_UNRESOLVED"
  | "ASSET_NATIVE_SIZE_INVALID"
  | "ASSET_NATIVE_SIZE_MISMATCH"
  | "ASSET_USAGE_EMPTY"
  | "ASSET_USAGE_INVALID"
  | "ASSET_PREPARATION_INVALID"
  | "ASSET_DIMENSION_UNAVAILABLE"
  | "ASSET_LIFECYCLE_INVALID"
  | "ASSET_REPLACEMENT_NOT_PERMITTED"
  | "ASSET_REPLACEMENT_SELF"
  | "ASSET_REPLACEMENT_UNKNOWN"
  | "ASSET_REPLACEMENT_NOT_ACTIVE"
  | "ASSET_REPLACEMENT_CYCLE"
  | "ASSET_REMOVED_ID_REUSED";

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

export interface BackgroundPreparationValidationOptions {
  readonly runtimeUrlToPath?: (url: string) => string | null;
  readonly inspectFile?: (path: string) => IntrinsicAssetSize | null;
}

/** Validates the single live-definition/tombstone lifecycle ownership graph. */
export function validateAssetLifecycle(
  definitions: readonly unknown[],
  tombstones: readonly RemovedAssetTombstone[],
): AssetValidationResult {
  const diagnostics: AssetValidationDiagnostic[] = [];
  const live = new Map<string, Record<string, unknown>>();
  const removed = new Map<string, RemovedAssetTombstone>();
  for (const raw of definitions) {
    if (object(raw) && typeof raw.id === "string") live.set(raw.id, raw);
  }
  for (const tombstone of tombstones) {
    if (live.has(tombstone.id)) diagnostics.push({ severity: "ERROR", code: "ASSET_REMOVED_ID_REUSED", message: `Removed Asset ID is reused by a live definition: ${tombstone.id}`, assetId: tombstone.id });
    removed.set(tombstone.id, tombstone);
  }
  const all = new Map<string, { state: string; replacementId?: string }>();
  for (const [id, definition] of live) {
    const lifecycle = object(definition.lifecycle) ? definition.lifecycle : {};
    const state = lifecycle.state;
    const replacementId = typeof lifecycle.replacementId === "string" ? lifecycle.replacementId : undefined;
    if (state !== "active" && state !== "deprecated") diagnostics.push({ severity: "ERROR", code: "ASSET_LIFECYCLE_INVALID", message: `Invalid lifecycle state: ${String(state)}`, assetId: id });
    if (state === "active" && replacementId !== undefined) diagnostics.push({ severity: "ERROR", code: "ASSET_REPLACEMENT_NOT_PERMITTED", message: "Active assets cannot declare a replacement.", assetId: id });
    all.set(id, { state: typeof state === "string" ? state : "invalid", replacementId });
  }
  for (const [id, tombstone] of removed) all.set(id, tombstone);

  for (const [id, lifecycle] of all) {
    const replacementId = lifecycle.replacementId;
    if (!replacementId) continue;
    if (replacementId === id) diagnostics.push({ severity: "ERROR", code: "ASSET_REPLACEMENT_SELF", message: "An asset cannot replace itself.", assetId: id });
    else if (!all.has(replacementId)) diagnostics.push({ severity: "ERROR", code: "ASSET_REPLACEMENT_UNKNOWN", message: `Unknown replacement Asset ID: ${replacementId}`, assetId: id });
    else if (all.get(replacementId)?.state !== "active") diagnostics.push({ severity: "ERROR", code: "ASSET_REPLACEMENT_NOT_ACTIVE", message: `Replacement target must be active: ${replacementId}`, assetId: id });
  }

  for (const start of all.keys()) {
    const path = new Set<string>();
    let current: string | undefined = start;
    while (current !== undefined && all.has(current)) {
      if (path.has(current)) {
        diagnostics.push({ severity: "ERROR", code: "ASSET_REPLACEMENT_CYCLE", message: `Replacement cycle includes Asset ID: ${current}`, assetId: start });
        break;
      }
      path.add(current);
      current = all.get(current)?.replacementId;
    }
  }
  return result(diagnostics);
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

const BGR_USAGES = new Set(["segment", "object", "static-backdrop"]);
const BGR_SEAMS = new Set(["seamless", "not-seamless", "unknown"]);

/** Validates preparation at its canonical BGR declaration owner. */
export function validateBackgroundAssetPreparations(
  declarations: readonly unknown[],
  options: BackgroundPreparationValidationOptions = {},
): AssetValidationResult {
  const diagnostics: AssetValidationDiagnostic[] = [];
  declarations.forEach((raw, index) => {
    const source = `backgroundDeclarations[${index}].background.preparation`;
    const declaration = object(raw) ? raw : {};
    const definition = object(declaration.definition) ? declaration.definition : {};
    const assetId = typeof definition.id === "string" ? definition.id : undefined;
    const runtime = object(definition.runtime) ? definition.runtime : {};
    const background = object(declaration.background) ? declaration.background : {};
    const preparation = object(background.preparation) ? background.preparation : null;
    if (!preparation) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_PREPARATION_INVALID", message: "Background asset preparation metadata is required.", assetId, source });
      return;
    }

    const nativeSize = object(preparation.nativeSize) ? preparation.nativeSize : {};
    const width = nativeSize.width;
    const height = nativeSize.height;
    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0 || typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_NATIVE_SIZE_INVALID", message: "Native width and height must be finite positive numbers.", assetId, source });
    }

    const usage = preparation.usage;
    if (!Array.isArray(usage) || usage.length === 0) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_USAGE_EMPTY", message: "At least one BGR usage role is required.", assetId, source });
    } else if (usage.some((role) => typeof role !== "string" || !BGR_USAGES.has(role))) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_USAGE_INVALID", message: "BGR usage contains an unsupported role.", assetId, source });
    }

    const positioning = object(preparation.positioning) ? preparation.positioning : {};
    const repeat = object(preparation.repeat) ? preparation.repeat : {};
    if (positioning.convention !== "top-left" || typeof repeat.x !== "boolean" || typeof repeat.seam !== "string" || !BGR_SEAMS.has(repeat.seam)) {
      diagnostics.push({ severity: "ERROR", code: "ASSET_PREPARATION_INVALID", message: "Positioning or repeat/seam metadata is invalid.", assetId, source });
    } else if (repeat.x === false && repeat.seam === "seamless") {
      diagnostics.push({ severity: "ERROR", code: "ASSET_PREPARATION_INVALID", message: "A seamless horizontal asset must declare repeat.x=true.", assetId, source });
    }

    if (typeof runtime.url === "string") {
      const path = options.runtimeUrlToPath?.(runtime.url) ?? null;
      if (path !== null && options.inspectFile) {
        const measured = options.inspectFile(path);
        if (!measured) {
          diagnostics.push({ severity: "ERROR", code: "ASSET_DIMENSION_UNAVAILABLE", message: `Intrinsic dimensions could not be determined: ${path}`, assetId, source: path });
        } else if (typeof width === "number" && typeof height === "number" && (measured.width !== width || measured.height !== height)) {
          diagnostics.push({ severity: "ERROR", code: "ASSET_NATIVE_SIZE_MISMATCH", message: `Declared ${width}x${height}, measured ${measured.width}x${measured.height}.`, assetId, source: path });
        }
      }
    }
  });
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
