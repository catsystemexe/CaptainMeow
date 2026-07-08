import { createB1SpriteParallaxDemoState, createB2BackgroundSceneDemoState, type BackgroundState } from "./webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "./webgl/bg/layers/BackgroundSceneTypes";

const STATE_KEY = "__CM_BACKGROUND_STATE__";
const PREVIEW_KEY = "__CM_BACKGROUND_PREVIEW__";

type Listener = (state: BackgroundState | null) => void;
const listeners = new Set<Listener>();
let state: BackgroundState | null = null;

export interface BackgroundPreviewState {
  enabled: boolean;
  paused: boolean;
  scrollX: number;
  speed: number;
}

const defaultPreview: BackgroundPreviewState = { enabled: false, paused: true, scrollX: 0, speed: 90 };
let previewState: BackgroundPreviewState = { ...defaultPreview };

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function publish(root: any = globalThis): void {
  if (root) {
    if (state) root[STATE_KEY] = state;
    else delete root[STATE_KEY];
    root[PREVIEW_KEY] = previewState;
  }
  for (const listener of [...listeners]) listener(state);
}

export function getBackgroundState(root: any = globalThis): BackgroundState | null {
  if (!state && isObject(root?.[STATE_KEY])) state = root[STATE_KEY] as unknown as BackgroundState;
  return state;
}

export function setBackgroundState(next: BackgroundState | null, root: any = globalThis): void {
  state = isObject(next) ? next as BackgroundState : null;
  publish(root);
}

export function setBackgroundScene(scene: BackgroundScene, root: any = globalThis): BackgroundState {
  const next: BackgroundState = { enabled: true, source: { kind: "scene", scene } };
  setBackgroundState(next, root);
  return next;
}

export function clearBackgroundState(root: any = globalThis): void {
  setBackgroundState(null, root);
}

export function subscribeBackgroundState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBackgroundScene(root: any = globalThis): BackgroundScene | null {
  const current = getBackgroundState(root);
  return current?.source?.kind === "scene" ? current.source.scene : null;
}

export function getBackgroundPreviewState(root: any = globalThis): BackgroundPreviewState {
  const raw = root?.[PREVIEW_KEY];
  if (isObject(raw)) previewState = normalizeBackgroundPreviewState(raw);
  return previewState;
}

export function setBackgroundPreviewState(next: Partial<BackgroundPreviewState>, root: any = globalThis): BackgroundPreviewState {
  previewState = normalizeBackgroundPreviewState({ ...previewState, ...next });
  if (root) root[PREVIEW_KEY] = previewState;
  return previewState;
}

export function clearBackgroundPreviewState(root: any = globalThis): BackgroundPreviewState {
  previewState = { ...defaultPreview };
  if (root) root[PREVIEW_KEY] = previewState;
  return previewState;
}

export function normalizeBackgroundPreviewState(value: unknown): BackgroundPreviewState {
  const raw = isObject(value) ? value : {};
  const scrollX = Number(raw.scrollX);
  const speed = Number(raw.speed);
  return {
    enabled: raw.enabled === true,
    paused: raw.paused !== false,
    scrollX: Number.isFinite(scrollX) ? scrollX : 0,
    speed: Number.isFinite(speed) ? speed : defaultPreview.speed,
  };
}

export function stepBackgroundPreviewState(preview: BackgroundPreviewState, dtSec: number): BackgroundPreviewState {
  const dt = Number.isFinite(dtSec) ? dtSec : 0;
  if (!preview.enabled || preview.paused) return normalizeBackgroundPreviewState(preview);
  return normalizeBackgroundPreviewState({ ...preview, scrollX: preview.scrollX + preview.speed * dt });
}

export function enableB1SpriteParallaxDemo(root: any = globalThis): BackgroundState {
  const next = createB1SpriteParallaxDemoState();
  setBackgroundState(next, root);
  return next;
}

export function enableB2BackgroundSceneDemo(root: any = globalThis): BackgroundState {
  const next = createB2BackgroundSceneDemoState();
  setBackgroundState(next, root);
  return next;
}

export function disableTypedBackground(root: any = globalThis): void {
  clearBackgroundState(root);
}
