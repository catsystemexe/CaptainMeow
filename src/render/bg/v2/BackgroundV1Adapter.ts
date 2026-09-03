import type { BackgroundLayer, SpriteBackgroundLayer } from "../../webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundMarker, BackgroundMarkerAction, BackgroundMarkerOwner } from "../../webgl/bg/layers/BackgroundMarkerTypes";
import type { BackgroundScene } from "../../webgl/bg/layers/BackgroundSceneTypes";
import { chunkRuntimeLayerId, globalRuntimeLayerId, isValidChunkInterval } from "../../webgl/bg/layers/BackgroundSceneResolve";
import { chunkMarkerRuntimeId, globalMarkerRuntimeId, isValidBackgroundMarker } from "../../webgl/bg/layers/BackgroundMarkerResolve";
import type { BackgroundSceneV2 } from "./BackgroundV2Types";

export type BackgroundV1AdapterDiagnosticCode =
  | "unsupported-layer-kind"
  | "unsupported-repeat-axis-semantics"
  | "unsupported-marker-action-target"
  | "ambiguous-legacy-state"
  | "invalid-source-data";

export interface BackgroundV1AdapterDiagnostic {
  code: BackgroundV1AdapterDiagnosticCode;
  message: string;
  sceneId: string;
  scope: "global" | "chunk";
  chunkId?: string;
  layerId?: string;
  markerId?: string;
  actionIndex?: number;
}

export type BackgroundV1ActivationScope =
  | { kind: "global" }
  | { kind: "chunk"; chunkId: string; startWorldX: number; length: number; interval: "half-open" };

export interface BackgroundV1SourceMapEntry {
  sourceRuntimeLayerId: string;
  sourceOrder: number;
  activation: BackgroundV1ActivationScope;
  adaptedTrackId?: string;
  adaptedObjectId?: string;
  repeat?: { repeatX: boolean; repeatY: boolean; materialization: "deferred" };
  filtering?: "nearest";
}

export interface BackgroundV1PassthroughLayer {
  sourceRuntimeLayerId: string;
  sourceScope: BackgroundV1ActivationScope;
  sourceOrder: number;
  sourceLayer: BackgroundLayer;
}

export interface BackgroundV1PreservedMarker {
  runtimeId: string;
  marker: BackgroundMarker;
  owner: BackgroundMarkerOwner;
  worldX: number;
  sourceOrder: number;
}

export interface BackgroundV1CompatibilityState {
  sourceMap: BackgroundV1SourceMapEntry[];
  passthroughLayers: BackgroundV1PassthroughLayer[];
  markers: BackgroundV1PreservedMarker[];
}

export interface BackgroundV1AdapterResult {
  scene: BackgroundSceneV2;
  compatibility: BackgroundV1CompatibilityState;
  diagnostics: BackgroundV1AdapterDiagnostic[];
}

const cloneAction = (action: BackgroundMarkerAction): BackgroundMarkerAction => ({ ...action });
const cloneMarker = (marker: BackgroundMarker): BackgroundMarker => ({ ...marker, actions: marker.actions.map(cloneAction) });
const cloneLayer = (layer: BackgroundLayer): BackgroundLayer => {
  if (layer.kind !== "sprite") return { ...layer };
  return {
    ...layer,
    texture: { ...layer.texture },
    parallax: { ...layer.parallax },
    offset: { ...layer.offset },
    repeat: { ...layer.repeat },
  };
};

function validSprite(layer: SpriteBackgroundLayer): boolean {
  return layer.texture.url.trim().length > 0
    && Number.isFinite(layer.opacity)
    && Number.isFinite(layer.parallax.x)
    && Number.isFinite(layer.parallax.y)
    && Number.isFinite(layer.offset.x)
    && Number.isFinite(layer.offset.y);
}

/**
 * Purely adapts V1 sprite origins into V2 objects. Chunk activation, exact repeat
 * axes, legacy layers, and marker execution remain explicit compatibility data.
 */
export function adaptBackgroundSceneV1ToV2(scene: BackgroundScene): BackgroundV1AdapterResult {
  const diagnostics: BackgroundV1AdapterDiagnostic[] = [];
  const sourceMap: BackgroundV1SourceMapEntry[] = [];
  const passthroughLayers: BackgroundV1PassthroughLayer[] = [];
  const markers: BackgroundV1PreservedMarker[] = [];
  const tracks: BackgroundSceneV2["tracks"] = [];
  const knownRuntimeLayerIds = new Set<string>();
  let sourceOrder = 0;

  const diagnostic = (code: BackgroundV1AdapterDiagnosticCode, message: string, context: Omit<BackgroundV1AdapterDiagnostic, "code" | "message" | "sceneId">) => {
    diagnostics.push({ code, message, sceneId: scene.id, ...context });
  };

  const visitLayer = (layer: BackgroundLayer, activation: BackgroundV1ActivationScope, runtimeId: string, context: { scope: "global" | "chunk"; chunkId?: string }) => {
    const order = sourceOrder++;
    const duplicate = knownRuntimeLayerIds.has(runtimeId);
    if (duplicate) diagnostic("ambiguous-legacy-state", `Duplicate V1 runtime layer id: ${runtimeId}`, { ...context, layerId: layer.id });
    knownRuntimeLayerIds.add(runtimeId);

    if (layer.kind !== "sprite") {
      sourceMap.push({ sourceRuntimeLayerId: runtimeId, sourceOrder: order, activation });
      passthroughLayers.push({ sourceRuntimeLayerId: runtimeId, sourceScope: activation, sourceOrder: order, sourceLayer: cloneLayer(layer) });
      diagnostic("unsupported-layer-kind", `V1 ${layer.kind} layer is preserved for compatibility but has no native V2 representation.`, { ...context, layerId: layer.id });
      return;
    }
    if (!validSprite(layer)) {
      sourceMap.push({ sourceRuntimeLayerId: runtimeId, sourceOrder: order, activation });
      passthroughLayers.push({ sourceRuntimeLayerId: runtimeId, sourceScope: activation, sourceOrder: order, sourceLayer: cloneLayer(layer) });
      diagnostic("invalid-source-data", "Sprite layer has an empty URL or non-finite numeric data and was not adapted.", { ...context, layerId: layer.id });
      return;
    }

    const trackId = context.scope === "global" ? `v1-global:${layer.id}` : `v1-chunk:${context.chunkId}:${layer.id}`;
    const objectId = "sprite";
    const entry: BackgroundV1SourceMapEntry = {
      sourceRuntimeLayerId: runtimeId,
      sourceOrder: order,
      activation,
      adaptedTrackId: trackId,
      adaptedObjectId: objectId,
      repeat: { repeatX: layer.repeat.x, repeatY: layer.repeat.y, materialization: "deferred" },
      filtering: layer.texture.filtering,
    };
    sourceMap.push(entry);
    if (layer.repeat.x || layer.repeat.y) {
      diagnostic("unsupported-repeat-axis-semantics", "V2 repeat mode records intent; exact V1 X/Y repeat materialization is deferred.", { ...context, layerId: layer.id });
    }
    tracks.push({
      id: trackId,
      name: `V1 compatibility: ${runtimeId}`,
      role: "custom",
      mode: layer.repeat.x || layer.repeat.y ? "repeat" : "sequence",
      enabled: true,
      parallax: { ...layer.parallax },
      zBase: order,
      segments: [],
      objects: [{
        id: objectId,
        asset: { id: `${trackId}:asset`, url: layer.texture.url },
        startTrackX: (activation.kind === "chunk" ? activation.startWorldX : 0) + layer.offset.x,
        y: layer.offset.y,
        localZ: 0,
        opacity: layer.opacity,
        blend: layer.blend,
        enabled: layer.enabled,
      }],
    });
  };

  const globalIds = new Set<string>();
  scene.globalLayers.forEach((layer) => {
    if (globalIds.has(layer.id)) diagnostic("ambiguous-legacy-state", `Duplicate global layer id: ${layer.id}`, { scope: "global", layerId: layer.id });
    globalIds.add(layer.id);
    visitLayer(layer, { kind: "global" }, globalRuntimeLayerId(layer.id), { scope: "global" });
  });

  const chunkIds = new Set<string>();
  const validChunks = scene.chunks.map((chunk, index) => ({ chunk, index })).filter(({ chunk, index }) => {
    if (!isValidChunkInterval(chunk)) {
      diagnostic("invalid-source-data", `Invalid chunk interval at source index ${index}.`, { scope: "chunk", chunkId: chunk?.id });
      return false;
    }
    if (chunkIds.has(chunk.id)) diagnostic("ambiguous-legacy-state", `Duplicate chunk id: ${chunk.id}`, { scope: "chunk", chunkId: chunk.id });
    chunkIds.add(chunk.id);
    return true;
  }).sort((a, b) => a.chunk.startX - b.chunk.startX || (a.chunk.startX + a.chunk.length) - (b.chunk.startX + b.chunk.length) || a.index - b.index || a.chunk.id.localeCompare(b.chunk.id));

  validChunks.forEach(({ chunk }) => {
    const activation: BackgroundV1ActivationScope = { kind: "chunk", chunkId: chunk.id, startWorldX: chunk.startX, length: chunk.length, interval: "half-open" };
    const layerIds = new Set<string>();
    chunk.layers.forEach((layer) => {
      if (layerIds.has(layer.id)) diagnostic("ambiguous-legacy-state", `Duplicate layer id in chunk ${chunk.id}: ${layer.id}`, { scope: "chunk", chunkId: chunk.id, layerId: layer.id });
      layerIds.add(layer.id);
      visitLayer(layer, activation, chunkRuntimeLayerId(chunk.id, layer.id), { scope: "chunk", chunkId: chunk.id });
    });
  });

  let markerOrder = 0;
  const visitMarker = (marker: BackgroundMarker, owner: BackgroundMarkerOwner, runtimeId: string, worldX: number, scope: "global" | "chunk", chunkId?: string) => {
    if (!isValidBackgroundMarker(marker)) {
      diagnostic("invalid-source-data", "Invalid marker was not preserved.", { scope, chunkId, markerId: marker?.id });
      return;
    }
    const preserved = cloneMarker(marker);
    markers.push({ runtimeId, marker: preserved, owner: { ...owner }, worldX, sourceOrder: markerOrder++ });
    preserved.actions.forEach((action, actionIndex) => {
      if (action.kind !== "emit-environment-event" && !knownRuntimeLayerIds.has(action.layerId)) {
        diagnostic("unsupported-marker-action-target", `Marker target does not resolve to a V1 layer: ${action.layerId}`, { scope, chunkId, markerId: marker.id, actionIndex });
      }
    });
  };
  (scene.markers ?? []).forEach((marker) => visitMarker(marker, { kind: "global" }, globalMarkerRuntimeId(marker.id), marker.x, "global"));
  validChunks.forEach(({ chunk }) => (chunk.markers ?? []).forEach((marker) => visitMarker(marker, { kind: "chunk", chunkId: chunk.id, chunkStartX: chunk.startX, chunkLength: chunk.length }, chunkMarkerRuntimeId(chunk.id, marker.id), chunk.startX + marker.x, "chunk", chunk.id)));

  return {
    scene: { version: 2, id: `v1-compat:${scene.id}`, environment: {}, tracks },
    compatibility: { sourceMap, passthroughLayers, markers },
    diagnostics,
  };
}
