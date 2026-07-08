import type { BackgroundScene } from "./BackgroundSceneTypes";

export type BackgroundBlendMode = "normal" | "additive";
export type BackgroundLayerKind = "shader" | "flow-ribbon" | "flow-segments" | "sprite";

export interface ShaderBackgroundLayer {
  id: string;
  kind: "shader";
  enabled: boolean;
  presetIndex: number;
}

export interface FlowRibbonBackgroundLayer {
  id: string;
  kind: "flow-ribbon";
  enabled: boolean;
  presetIndex: number;
}

export interface FlowSegmentsBackgroundLayer {
  id: string;
  kind: "flow-segments";
  enabled: boolean;
  presetIndex: number;
}

export interface SpriteBackgroundLayer {
  id: string;
  kind: "sprite";
  enabled: boolean;
  texture: {
    url: string;
    filtering: "nearest";
  };
  opacity: number;
  blend: BackgroundBlendMode;
  parallax: { x: number; y: number };
  offset: { x: number; y: number };
  repeat: { x: boolean; y: boolean };
}

export type FlowBackgroundLayer = FlowRibbonBackgroundLayer | FlowSegmentsBackgroundLayer;
export type BackgroundLayer = ShaderBackgroundLayer | FlowBackgroundLayer | SpriteBackgroundLayer;

export type BackgroundRuntimeSource =
  | { kind: "layers"; layers: BackgroundLayer[] }
  | { kind: "scene"; scene: BackgroundScene };

export interface BackgroundState {
  enabled: boolean;
  layers?: BackgroundLayer[];
  source?: BackgroundRuntimeSource;
}

export const B1_DEMO_SPRITE_BACKGROUND_URL = "/assets/bg/b1_pixel_stars.svg";

export function createB1SpriteParallaxDemoState(): BackgroundState {
  const layers: BackgroundLayer[] = [
      { id: "legacy-shader", kind: "shader", enabled: true, presetIndex: 0 },
      {
        id: "b1-pixel-stars",
        kind: "sprite",
        enabled: true,
        texture: { url: B1_DEMO_SPRITE_BACKGROUND_URL, filtering: "nearest" },
        opacity: 0.72,
        blend: "normal",
        parallax: { x: 0.35, y: 0.18 },
        offset: { x: 0, y: 0 },
        repeat: { x: true, y: true },
      },
    ];
  return { enabled: true, layers, source: { kind: "layers", layers } };
}

export function createB2BackgroundSceneDemoState(): BackgroundState {
  const scene: BackgroundScene = {
    id: "b2-technical-scene",
    globalLayers: [
      { id: "legacy-shader", kind: "shader", enabled: true, presetIndex: 0 },
      {
        id: "far-stars",
        kind: "sprite",
        enabled: true,
        texture: { url: B1_DEMO_SPRITE_BACKGROUND_URL, filtering: "nearest" },
        opacity: 0.5,
        blend: "normal",
        parallax: { x: 0.2, y: 0.12 },
        offset: { x: 0, y: 0 },
        repeat: { x: true, y: true },
      },
    ],
    chunks: [
      {
        id: "chunk-a",
        startX: 0,
        length: 720,
        layers: [{
          id: "near-rocks",
          kind: "sprite",
          enabled: true,
          texture: { url: B1_DEMO_SPRITE_BACKGROUND_URL, filtering: "nearest" },
          opacity: 0.82,
          blend: "normal",
          parallax: { x: 0.72, y: 0.05 },
          offset: { x: 24, y: 72 },
          repeat: { x: true, y: false },
        }],
      },
      {
        id: "chunk-b",
        startX: 720,
        length: 720,
        layers: [{
          id: "near-rocks",
          kind: "sprite",
          enabled: true,
          texture: { url: B1_DEMO_SPRITE_BACKGROUND_URL, filtering: "nearest" },
          opacity: 0.95,
          blend: "additive",
          parallax: { x: 0.72, y: 0.05 },
          offset: { x: 80, y: 118 },
          repeat: { x: true, y: false },
        }],
      },
    ],
  };
  return { enabled: true, source: { kind: "scene", scene } };
}
