import { createB1SpriteParallaxDemoState, createB2BackgroundSceneDemoState, type BackgroundState } from "./webgl/bg/layers/BackgroundLayerTypes";

const STATE_KEY = "__CM_BACKGROUND_STATE__";

export function getBackgroundState(root: any = globalThis): BackgroundState | null {
  const state = root?.[STATE_KEY];
  return state && typeof state === "object" ? state as BackgroundState : null;
}

export function setBackgroundState(state: BackgroundState | null, root: any = globalThis): void {
  if (!root) return;
  if (state) root[STATE_KEY] = state;
  else delete root[STATE_KEY];
}

export function enableB1SpriteParallaxDemo(root: any = globalThis): BackgroundState {
  const state = createB1SpriteParallaxDemoState();
  setBackgroundState(state, root);
  return state;
}

export function enableB2BackgroundSceneDemo(root: any = globalThis): BackgroundState {
  const state = createB2BackgroundSceneDemoState();
  setBackgroundState(state, root);
  return state;
}

export function disableTypedBackground(root: any = globalThis): void {
  setBackgroundState(null, root);
}
