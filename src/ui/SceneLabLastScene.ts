import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { SCENE_LAB_SCENE_CATALOG, type SceneLabCatalogEntry } from "./SceneLabSceneCatalog";

export const SCENE_LAB_LAST_SCENE_KEY = "captainmeow.sceneLab.lastScene";

type V2CatalogEntry = Extract<SceneLabCatalogEntry, { version: 2 }>;
export type SceneLabEntryResolution = { source: "active" | "persisted" | "fallback"; entry: V2CatalogEntry };

function availableStorage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function rememberSceneLabCatalogEntry(entry: SceneLabCatalogEntry, storage: Storage | null = availableStorage()): void {
  try { storage?.setItem(SCENE_LAB_LAST_SCENE_KEY, entry.id); } catch { /* Preferences must not prevent scene selection. */ }
}

export function resolveSceneLabV2Entry(active: BackgroundSceneV2 | null, storage: Storage | null = availableStorage()): SceneLabEntryResolution {
  const v2Entries = SCENE_LAB_SCENE_CATALOG.filter((entry): entry is V2CatalogEntry => entry.version === 2);
  const activeEntry = active && v2Entries.find(entry => entry.create().id === active.id);
  if (activeEntry) return { source: "active", entry: activeEntry };

  let rememberedId: string | null = null;
  try { rememberedId = storage?.getItem(SCENE_LAB_LAST_SCENE_KEY) ?? null; } catch { /* Fall through to the catalog default. */ }
  const rememberedEntry = v2Entries.find(entry => entry.id === rememberedId);
  if (rememberedEntry) return { source: "persisted", entry: rememberedEntry };

  const fallback = v2Entries[0];
  if (!fallback) throw new Error("Scene Lab requires at least one V2 catalog scene");
  return { source: "fallback", entry: fallback };
}
