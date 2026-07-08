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

export interface BackgroundState {
  enabled: boolean;
  layers: BackgroundLayer[];
}

export const B1_DEMO_SPRITE_BACKGROUND_URL = "/assets/bg/b1_pixel_stars.svg";

export function createB1SpriteParallaxDemoState(): BackgroundState {
  return {
    enabled: true,
    layers: [
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
    ],
  };
}
