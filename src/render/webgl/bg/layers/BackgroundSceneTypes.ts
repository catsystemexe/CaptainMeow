import type { BackgroundLayer } from "./BackgroundLayerTypes";
import type { BackgroundMarker } from "./BackgroundMarkerTypes";

export interface BackgroundScene {
  id: string;
  globalLayers: BackgroundLayer[];
  chunks: BackgroundChunk[];
  markers?: BackgroundMarker[];
}

export interface BackgroundChunk {
  id: string;
  startX: number;
  length: number;
  layers: BackgroundLayer[];
  markers?: BackgroundMarker[];
}

export interface ResolvedBackgroundChunk {
  id: string;
  startX: number;
  length: number;
  endX: number;
  source: BackgroundChunk;
  sourceIndex: number;
}
