import assert from "node:assert/strict";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { createBackgroundV2VisualVerificationScene } from "../render/bg/v2/BackgroundV2VisualVerificationScene";
import { rememberSceneLabCatalogEntry, resolveSceneLabV2Entry, SCENE_LAB_LAST_SCENE_KEY } from "./SceneLabLastScene";
import { SCENE_LAB_SCENE_CATALOG } from "./SceneLabSceneCatalog";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const storage = new MemoryStorage() as Storage;
const visual = SCENE_LAB_SCENE_CATALOG.find(entry => entry.id === "visual-verification-v2")!;
rememberSceneLabCatalogEntry(visual, storage);
assert.equal(storage.getItem(SCENE_LAB_LAST_SCENE_KEY), visual.id, "catalog selection records its stable identity");
assert.deepEqual(resolveSceneLabV2Entry(createBackgroundV2DesertTestScene(), storage), { source: "active", entry: SCENE_LAB_SCENE_CATALOG[0] }, "a known active V2 scene wins");
assert.equal(resolveSceneLabV2Entry(null, storage).entry.create().id, createBackgroundV2VisualVerificationScene().id, "a valid remembered V2 entry is restored");
storage.setItem(SCENE_LAB_LAST_SCENE_KEY, "missing-or-v1");
assert.equal(resolveSceneLabV2Entry(null, storage).entry.id, "desert-v2", "invalid persistence uses the safe V2 catalog default");
assert.equal(resolveSceneLabV2Entry(null, null).entry.id, "desert-v2", "missing storage is harmless");

console.log("SceneLabLastScene.smoke: PASS");
