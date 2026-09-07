import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";

export type V2StaticBackdropEditResult =
  | { ok: true; scene: BackgroundSceneV2 }
  | { ok: false; scene: BackgroundSceneV2; code: "static-backdrop-missing"; error: string };

/** Immutably changes the existing scene-global backdrop without creating one. */
export function setV2StaticBackdropEnabled(scene: BackgroundSceneV2, enabled: boolean): V2StaticBackdropEditResult {
  if (!scene.staticBackdrop) return { ok: false, scene, code: "static-backdrop-missing", error: "Static backdrop is not configured" };
  return { ok: true, scene: { ...scene, staticBackdrop: { ...scene.staticBackdrop, enabled } } };
}
