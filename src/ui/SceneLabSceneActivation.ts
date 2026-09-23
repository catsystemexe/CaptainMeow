import { setBackgroundSceneV2 } from "../render/BackgroundState";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";

export interface SceneLabAuthoringBounds {
  startX: number;
  endX: number;
}

interface SceneLabGameApi {
  reset?: () => void;
  seekGameplayToPlayerX?: (
    targetX: number,
    options: { bounds: SceneLabAuthoringBounds; pauseAfterSeek: boolean },
  ) => unknown;
}

export interface SceneLabAuthoringRoot {
  __CM?: { game?: SceneLabGameApi };
}

export interface SceneLabActivationDeps {
  setScene?: (scene: BackgroundSceneV2, root: object) => unknown;
}

/** Establishes a fresh, paused Level run for a Scene Lab document replacement. */
export function activateV2SceneForAuthoring(
  scene: BackgroundSceneV2,
  root: object = globalThis,
  deps: SceneLabActivationDeps = {},
): void {
  const bounds = projectBackgroundV2Timeline(scene).bounds;
  (deps.setScene ?? setBackgroundSceneV2)(scene, root);
  const game = (root as SceneLabAuthoringRoot).__CM?.game;
  game?.reset?.();
  game?.seekGameplayToPlayerX?.(bounds.startX, { bounds, pauseAfterSeek: true });
}
