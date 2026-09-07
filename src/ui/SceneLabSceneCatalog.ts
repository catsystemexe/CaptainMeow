import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { createBackgroundV2VisualVerificationScene } from "../render/bg/v2/BackgroundV2VisualVerificationScene";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { createDemoScene } from "./PixelBgrLabState";

export type SceneLabCatalogEntry =
  | { id: string; label: string; version: 1; create: () => BackgroundScene }
  | { id: string; label: string; version: 2; create: () => BackgroundSceneV2 };

/** Built-in Scene Lab fixtures. Factories remain the single owners of scene data. */
export const SCENE_LAB_SCENE_CATALOG: readonly SceneLabCatalogEntry[] = [
  { id: "desert-v2", label: "Desert V2", version: 2, create: createBackgroundV2DesertTestScene },
  { id: "visual-verification-v2", label: "Visual Verification V2", version: 2, create: createBackgroundV2VisualVerificationScene },
  { id: "b2-demo", label: "B2 Demo", version: 1, create: createDemoScene },
];
