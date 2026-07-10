import { createB1SpriteParallaxDemoState, createB2BackgroundSceneDemoState, type BackgroundState } from "./webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "./webgl/bg/layers/BackgroundSceneTypes";

const STATE_KEY = "__CM_BACKGROUND_STATE__";
const PREVIEW_KEY = "__CM_BACKGROUND_PREVIEW__";
const MARKER_RESET_KEY = "__CM_BACKGROUND_MARKER_RESET__";

type Listener = (state: BackgroundState | null) => void;
const listeners = new Set<Listener>();
let state: BackgroundState | null = null;

export interface BackgroundPreviewState {
  enabled: boolean;
  paused: boolean;
  /** Camera/background scroll used by render layers. In Scene Lab preview this is derived from playerLevelX - playerScreenAnchorX. */
  scrollX: number;
  /** Canonical Scene Lab position: player level/world X. */
  playerLevelX: number;
  speed: number;
}

const defaultPreview: BackgroundPreviewState = { enabled: false, paused: true, scrollX: 0, playerLevelX: 0, speed: 90 };
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
  requestBackgroundMarkerRuntimeReset(root);
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
  requestBackgroundMarkerRuntimeReset(root);
  return previewState;
}

export function requestBackgroundMarkerRuntimeReset(root: any = globalThis): void { if (root) root[MARKER_RESET_KEY] = Number(root[MARKER_RESET_KEY] ?? 0) + 1; }
export function consumeBackgroundMarkerRuntimeReset(root: any = globalThis): number { return Number(root?.[MARKER_RESET_KEY] ?? 0); }

export function clearBackgroundPreviewState(root: any = globalThis): BackgroundPreviewState {
  previewState = { ...defaultPreview };
  if (root) root[PREVIEW_KEY] = previewState;
  requestBackgroundMarkerRuntimeReset(root);
  return previewState;
}

export function resolvePlayerScreenAnchorX(playerWorldX: number, cameraScrollX: number, fallback = 100): number {
  const playerX = Number(playerWorldX);
  const scrollX = Number(cameraScrollX);
  const safeFallback = Number.isFinite(fallback) ? fallback : 100;
  if (!Number.isFinite(playerX) || !Number.isFinite(scrollX)) return safeFallback;
  return playerX - scrollX;
}

export function playerLevelXToPreviewScrollX(playerLevelX: number, playerScreenAnchorX: number): number {
  const levelX = Number(playerLevelX);
  const anchorX = Number(playerScreenAnchorX);
  return (Number.isFinite(levelX) ? levelX : 0) - (Number.isFinite(anchorX) ? anchorX : 0);
}

export function previewScrollXToPlayerLevelX(previewScrollX: number, playerScreenAnchorX: number): number {
  const scrollX = Number(previewScrollX);
  const anchorX = Number(playerScreenAnchorX);
  return (Number.isFinite(scrollX) ? scrollX : 0) + (Number.isFinite(anchorX) ? anchorX : 0);
}

export function normalizeBackgroundPreviewState(value: unknown): BackgroundPreviewState {
  const raw = isObject(value) ? value : {};
  const scrollX = Number(raw.scrollX);
  const playerLevelX = Number(raw.playerLevelX);
  const speed = Number(raw.speed);
  const safeScrollX = Number.isFinite(scrollX) ? scrollX : 0;
  return {
    enabled: raw.enabled === true,
    paused: raw.paused !== false,
    scrollX: safeScrollX,
    playerLevelX: Number.isFinite(playerLevelX) ? playerLevelX : safeScrollX,
    speed: Number.isFinite(speed) ? speed : defaultPreview.speed,
  };
}

export function stepBackgroundPreviewState(preview: BackgroundPreviewState, dtSec: number): BackgroundPreviewState {
  const dt = Number.isFinite(dtSec) ? dtSec : 0;
  if (!preview.enabled || preview.paused) return normalizeBackgroundPreviewState(preview);
  return normalizeBackgroundPreviewState({ ...preview, scrollX: preview.scrollX + preview.speed * dt, playerLevelX: preview.playerLevelX + preview.speed * dt });
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
