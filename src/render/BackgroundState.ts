import { createB1SpriteParallaxDemoState, createB2BackgroundSceneDemoState, type BackgroundState } from "./webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "./webgl/bg/layers/BackgroundSceneTypes";
import type { BackgroundSceneV2 } from "./bg/v2/BackgroundV2Types";
import { createBackgroundV2VisualVerificationScene } from "./bg/v2/BackgroundV2VisualVerificationScene";

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

export function setBackgroundSceneV2(scene: BackgroundSceneV2, root: any = globalThis): BackgroundState {
  const next: BackgroundState = { enabled: true, source: { kind: "scene-v2", scene } };
  setBackgroundState(next, root);
  return next;
}

export function getBackgroundSceneV2(root: any = globalThis): BackgroundSceneV2 | null {
  const current = getBackgroundState(root);
  return current?.source?.kind === "scene-v2" ? current.source.scene : null;
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

/** Deterministic console hook for the M4 post-PR browser verification. */
export function enableM4BackgroundV2Demo(root: any = globalThis): BackgroundState {
  const asset = { id: "m4-shared-stars", url: "/assets/bg/b1_pixel_stars.svg" };
  return setBackgroundSceneV2({
    version: 2,
    id: "m4-render-instance-resource-demo",
    environment: {},
    tracks: [
      { id: "far", name: "Far shared resource", role: "far", mode: "sequence", enabled: true, parallax: { x: 0.15, y: 0.1 }, zBase: -10, segments: [], objects: [
        { id: "normal", asset: { ...asset }, startTrackX: 0, y: 0, width: 320, height: 180, localZ: 0, opacity: 0.35, blend: "normal", enabled: true },
        { id: "additive", asset: { ...asset }, startTrackX: 320, y: 40, width: 160, height: 120, localZ: 1, opacity: 0.8, blend: "additive", enabled: true },
      ] },
      { id: "near", name: "Explicit segment clip", role: "near", mode: "sequence", enabled: true, parallax: { x: 0.7, y: 0.35 }, zBase: 10, segments: [
        { id: "clip", startTrackX: 120, widthPx: 180, asset: { ...asset }, offsetY: 80, opacity: 0.7, blend: "normal", localZ: 0, enabled: true },
      ], objects: [] },
      { id: "foreground", name: "Foreground", role: "foreground", mode: "sequence", enabled: true, parallax: { x: 0.9, y: 0.6 }, zBase: 0, segments: [], objects: [
        { id: "front", asset: { ...asset }, startTrackX: 180, y: 120, width: 140, height: 90, localZ: 0, opacity: 0.55, blend: "additive", enabled: true },
      ] },
    ],
  }, root);
}

/** Enables the reusable visual acceptance scene without bypassing typed background state. */
export function enableBackgroundV2VisualVerification(root: any = globalThis): BackgroundState {
  return setBackgroundSceneV2(createBackgroundV2VisualVerificationScene(), root);
}

export function disableTypedBackground(root: any = globalThis): void {
  clearBackgroundState(root);
}
