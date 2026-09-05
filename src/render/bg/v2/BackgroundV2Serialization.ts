import type { BackgroundSceneV2 } from "./BackgroundV2Types";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";

export type BackgroundV2ParseResult = { ok: true; scene: BackgroundSceneV2 } | { ok: false; error: string };
export const PIXEL_BGR_V2_DRAFT_KEY = "captain-meow.pixel-bgr.scene-v2.draft";
export type V2Storage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function serializeBackgroundSceneV2(scene: BackgroundSceneV2): string {
  const validation = validateBackgroundSceneV2(scene);
  if (!validation.valid) throw new Error(validation.errors.map(({ path, message }) => `${path}: ${message}`).join("; "));
  return JSON.stringify(scene, null, 2);
}
export function parseBackgroundSceneV2(json: string): BackgroundV2ParseResult {
  try {
    const raw: unknown = JSON.parse(json);
    const validation = validateBackgroundSceneV2(raw);
    if (!validation.valid) return { ok: false, error: validation.errors.map(({ path, message }) => `${path}: ${message}`).join("; ") };
    return { ok: true, scene: structuredClone(raw) as BackgroundSceneV2 };
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
