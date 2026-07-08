import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { validateBackgroundScene } from "./PixelBgrLabValidation";
import { cloneScene } from "./PixelBgrLabState";

export const PIXEL_BGR_SCENE_FORMAT = "captain-meow-background-scene";
export const PIXEL_BGR_SCENE_VERSION = 1;
export const PIXEL_BGR_DRAFT_KEY = "CM_PIXEL_BGR_LAB_DRAFT_v1";
export interface PixelBgrSceneEnvelope { format: typeof PIXEL_BGR_SCENE_FORMAT; version: 1; scene: BackgroundScene }
export type ImportResult = { ok: true; scene: BackgroundScene } | { ok: false; error: string };
export function exportBackgroundScene(scene: BackgroundScene): string { return JSON.stringify({ format: PIXEL_BGR_SCENE_FORMAT, version: PIXEL_BGR_SCENE_VERSION, scene }, null, 2); }
export function importBackgroundSceneJson(text: string): ImportResult { try { const raw = JSON.parse(text) as unknown; const env = raw as Partial<PixelBgrSceneEnvelope>; const scene = env && typeof env === "object" && "format" in env ? (env.format === PIXEL_BGR_SCENE_FORMAT && env.version === PIXEL_BGR_SCENE_VERSION ? env.scene : null) : raw as BackgroundScene; if (!scene) return { ok: false, error: "Unsupported Pixel BGR scene envelope" }; const validation = validateBackgroundScene(scene); if (!validation.valid) return { ok: false, error: validation.errors.map(e=>`${e.path}: ${e.message}`).join("; ") }; return { ok: true, scene: cloneScene(scene as BackgroundScene) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }; } }
export function serializeDraft(scene: BackgroundScene): string { return JSON.stringify({ version: 1, scene }); }
export function parseDraftPayload(text: string | null): BackgroundScene | null { if (!text) return null; try { const raw = JSON.parse(text) as { version?: unknown; scene?: unknown }; if (raw?.version !== 1) return null; const result = validateBackgroundScene(raw.scene); return result.valid ? cloneScene(raw.scene as BackgroundScene) : null; } catch { return null; } }
export function saveDraft(storage: Pick<Storage, "setItem">, scene: BackgroundScene): void { storage.setItem(PIXEL_BGR_DRAFT_KEY, serializeDraft(scene)); }
export function loadDraft(storage: Pick<Storage, "getItem">): BackgroundScene | null { return parseDraftPayload(storage.getItem(PIXEL_BGR_DRAFT_KEY)); }
export function clearDraft(storage: Pick<Storage, "removeItem">): void { storage.removeItem(PIXEL_BGR_DRAFT_KEY); }
