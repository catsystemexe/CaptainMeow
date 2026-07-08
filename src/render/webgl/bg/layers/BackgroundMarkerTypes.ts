export type BackgroundMarkerAction =
  | { kind: "set-layer-enabled"; layerId: string; enabled: boolean }
  | { kind: "set-layer-opacity"; layerId: string; opacity: number }
  | { kind: "pulse-layer-opacity"; layerId: string; from: number; to: number; durationMs: number }
  | { kind: "emit-environment-event"; event: string };

export interface BackgroundMarker {
  id: string;
  x: number;
  enabled: boolean;
  once: boolean;
  actions: BackgroundMarkerAction[];
}

export type BackgroundMarkerOwner = { kind: "global" } | { kind: "chunk"; chunkId: string; chunkStartX: number; chunkLength: number };

export interface ResolvedBackgroundMarker {
  runtimeId: string;
  marker: BackgroundMarker;
  owner: BackgroundMarkerOwner;
  worldX: number;
  sourceIndex: number;
  ownerIndex: number;
}

export interface BackgroundEnvironmentEvent {
  name: string;
  markerRuntimeId: string;
  sceneId: string;
  worldX: number;
  presentationTimeMs: number;
}
