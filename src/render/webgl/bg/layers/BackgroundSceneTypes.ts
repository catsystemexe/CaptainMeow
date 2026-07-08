import type { BackgroundLayer } from "./BackgroundLayerTypes";

export interface BackgroundScene {
  id: string;
  globalLayers: BackgroundLayer[];
  chunks: BackgroundChunk[];
}

export interface BackgroundChunk {
  id: string;
  startX: number;
  length: number;
  layers: BackgroundLayer[];
}

export interface ResolvedBackgroundChunk {
  id: string;
  startX: number;
  length: number;
  endX: number;
  source: BackgroundChunk;
  sourceIndex: number;
}
