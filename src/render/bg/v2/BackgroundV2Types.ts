export type BackgroundTrackRole = "far" | "mid" | "near" | "foreground" | "custom";
export type BackgroundTrackMode = "sequence" | "repeat";
export type BackgroundBlendMode = "normal" | "additive";

/** Pure resource identity. Resource loading and GPU ownership are intentionally external. */
export interface BackgroundAssetRef {
  id: string;
  url: string;
}

export interface StarfieldConfig {
  seed: number;
  density: number;
}

export interface BackgroundEnvironment {
  starfield?: StarfieldConfig;
}

export interface BackgroundSegment {
  id: string;
  startTrackX: number;
  widthPx: number;
  asset: BackgroundAssetRef;
  offsetY: number;
  opacity: number;
  blend: BackgroundBlendMode;
  localZ: number;
  fadeInPx?: number;
  fadeOutPx?: number;
  enabled: boolean;
}

export interface BackgroundObject {
  id: string;
  asset: BackgroundAssetRef;
  startTrackX: number;
  y: number;
  width?: number;
  height?: number;
  localZ: number;
  opacity: number;
  blend: BackgroundBlendMode;
  enabled: boolean;
}

export interface BackgroundTrack {
  id: string;
  name: string;
  role: BackgroundTrackRole;
  mode: BackgroundTrackMode;
  enabled: boolean;
  parallax: { x: number; y: number };
  zBase: number;
  segments: BackgroundSegment[];
  objects: BackgroundObject[];
}

export interface BackgroundSceneV2 {
  version: 2;
  id: string;
  environment: BackgroundEnvironment;
  tracks: BackgroundTrack[];
}

export interface BackgroundEvaluationContext {
  playerWorldX: number;
  cameraScrollX: number;
  cameraScrollY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface BackgroundRenderInstance {
  instanceId: string;
  asset: BackgroundAssetRef;
  screenX: number;
  screenY: number;
  width?: number;
  height?: number;
  opacity: number;
  blend: BackgroundBlendMode;
  effectiveZ: number;
  sourceTrackId: string;
  sourceSegmentId?: string;
  sourceObjectId?: string;
}

export interface EvaluatedBackgroundEnvironment {
  starfield?: StarfieldConfig;
}

export interface EvaluatedBackgroundFrame {
  behindGameplay: BackgroundRenderInstance[];
  foreground: BackgroundRenderInstance[];
  environment: EvaluatedBackgroundEnvironment;
}
