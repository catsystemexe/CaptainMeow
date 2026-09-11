import { resolveAsset } from "../../../assets/BackgroundAssets";
import { assetId } from "../../../assets/AssetTypes";
import type { BackgroundAssetRef, BackgroundSceneV2 } from "./BackgroundV2Types";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";

export type BackgroundV2ParseResult = { ok: true; scene: BackgroundSceneV2 } | { ok: false; error: string };
export const PIXEL_BGR_V2_DRAFT_KEY = "captain-meow.pixel-bgr.scene-v2.draft";
export type V2Storage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** V2 wire identity for migrated segment/object assets. Runtime refs still include a resolved URL. */
export interface PersistedBackgroundAssetRefV2 { id: string }

function resolvePersistedAssetRef(value: unknown, path: string): BackgroundAssetRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: must be an object`);
  const ref = value as Record<string, unknown>;
  for (const key of Object.keys(ref)) if (key !== "id" && key !== "url") throw new Error(`${path}.${key}: unknown field`);
  if (typeof ref.id !== "string" || ref.id.trim().length === 0) throw new Error(`${path}.id: must be a non-empty string`);
  if (ref.url !== undefined && (typeof ref.url !== "string" || ref.url.trim().length === 0)) throw new Error(`${path}.url: must be a non-empty string when present`);
  const definition = resolveAsset(assetId(ref.id));
  if (!definition) throw new Error(`${path}.id: unknown Asset ID "${ref.id}"`);
  return { id: definition.id, url: definition.runtime.url };
}

function normalizePersistedScene(raw: unknown): unknown {
  const scene = structuredClone(raw);
  if (!scene || typeof scene !== "object" || Array.isArray(scene)) return scene;
  const tracks = (scene as Record<string, unknown>).tracks;
  if (!Array.isArray(tracks)) return scene;
  tracks.forEach((track, trackIndex) => {
    if (!track || typeof track !== "object" || Array.isArray(track)) return;
    for (const kind of ["segments", "objects"] as const) {
      const items = (track as Record<string, unknown>)[kind];
      if (!Array.isArray(items)) continue;
      items.forEach((item, itemIndex) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return;
        const record = item as Record<string, unknown>;
        record.asset = resolvePersistedAssetRef(record.asset, `tracks[${trackIndex}].${kind}[${itemIndex}].asset`);
      });
    }
  });
  return scene;
}

function projectPersistedScene(scene: BackgroundSceneV2): unknown {
  const persisted = structuredClone(scene) as BackgroundSceneV2;
  persisted.tracks.forEach((track, trackIndex) => {
    for (const [kind, items] of [["segments", track.segments], ["objects", track.objects]] as const) {
      items.forEach((item, itemIndex) => {
        const definition = resolveAsset(assetId(item.asset.id));
        if (!definition) throw new Error(`tracks[${trackIndex}].${kind}[${itemIndex}].asset.id: unknown Asset ID "${item.asset.id}"`);
        (item as unknown as { asset: PersistedBackgroundAssetRefV2 }).asset = { id: definition.id };
      });
    }
  });
  return persisted;
}

export function serializeBackgroundSceneV2(scene: BackgroundSceneV2): string {
  const validation = validateBackgroundSceneV2(scene);
  if (!validation.valid) throw new Error(validation.errors.map(({ path, message }) => `${path}: ${message}`).join("; "));
  return JSON.stringify(projectPersistedScene(scene), null, 2);
}
export function parseBackgroundSceneV2(json: string): BackgroundV2ParseResult {
  try {
    const raw: unknown = JSON.parse(json);
    const normalized = normalizePersistedScene(raw);
    const validation = validateBackgroundSceneV2(normalized);
    if (!validation.valid) return { ok: false, error: validation.errors.map(({ path, message }) => `${path}: ${message}`).join("; ") };
    return { ok: true, scene: normalized as BackgroundSceneV2 };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" }; }
}
export function saveBackgroundSceneV2(storage: V2Storage, scene: BackgroundSceneV2): BackgroundV2ParseResult {
  try { const json = serializeBackgroundSceneV2(scene); storage.setItem(PIXEL_BGR_V2_DRAFT_KEY, json); return { ok: true, scene }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to save V2 scene" }; }
}
export function loadBackgroundSceneV2(storage: V2Storage): BackgroundV2ParseResult {
  const json = storage.getItem(PIXEL_BGR_V2_DRAFT_KEY);
  return json === null ? { ok: false, error: "No saved V2 scene" } : parseBackgroundSceneV2(json);
}
export function clearBackgroundSceneV2(storage: V2Storage): void { storage.removeItem(PIXEL_BGR_V2_DRAFT_KEY); }
