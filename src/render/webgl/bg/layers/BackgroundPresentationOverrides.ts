import type { BackgroundLayer, SpriteBackgroundLayer } from "./BackgroundLayerTypes";
import type { BackgroundEnvironmentEvent, BackgroundMarkerAction, ResolvedBackgroundMarker } from "./BackgroundMarkerTypes";

export interface BackgroundOpacityPulse { layerId: string; from: number; to: number; durationMs: number; elapsedMs: number }
export interface BackgroundPresentationOverrides { layerEnabled: Map<string, boolean>; layerOpacity: Map<string, number>; pulses: Map<string, BackgroundOpacityPulse>; lastEnvironmentEvent: BackgroundEnvironmentEvent | null; lastFiredMarker: string | null; missingTargets: string[] }
export const createBackgroundPresentationOverrides = (): BackgroundPresentationOverrides => ({ layerEnabled: new Map(), layerOpacity: new Map(), pulses: new Map(), lastEnvironmentEvent: null, lastFiredMarker: null, missingTargets: [] });
export function resetBackgroundPresentationOverrides(o: BackgroundPresentationOverrides): void { o.layerEnabled.clear(); o.layerOpacity.clear(); o.pulses.clear(); o.lastEnvironmentEvent = null; o.lastFiredMarker = null; o.missingTargets = []; }
const clamp01 = (v: unknown): number => Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : 0;
function hasTarget(targets: Set<string>, id: string): boolean { return targets.has(id); }
export function applyBackgroundMarkerActions(o: BackgroundPresentationOverrides, marker: ResolvedBackgroundMarker, sceneId: string, presentationTimeMs: number, layerIds: Set<string>): void {
  o.lastFiredMarker = marker.runtimeId;
  for (const action of marker.marker.actions as BackgroundMarkerAction[]) {
    if (action.kind === "emit-environment-event") { if (action.event.trim()) o.lastEnvironmentEvent = { name: action.event, markerRuntimeId: marker.runtimeId, sceneId, worldX: marker.worldX, presentationTimeMs }; continue; }
    const layerId = (action as any).layerId;
    if (typeof layerId !== "string" || !hasTarget(layerIds, layerId)) { if (typeof layerId === "string") o.missingTargets = [layerId]; continue; }
    if (action.kind === "set-layer-enabled") o.layerEnabled.set(layerId, action.enabled === true);
    else if (action.kind === "set-layer-opacity") { o.layerOpacity.set(layerId, clamp01(action.opacity)); o.pulses.delete(layerId); }
    else if (action.kind === "pulse-layer-opacity") {
      const durationMs = Number(action.durationMs);
      if (Number.isFinite(durationMs) && durationMs > 0) o.pulses.set(layerId, { layerId, from: clamp01(action.from), to: clamp01(action.to), durationMs, elapsedMs: 0 });
    }
  }
}
export function stepBackgroundPresentationOverrides(o: BackgroundPresentationOverrides, dtMs: number): void {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
  for (const [id, pulse] of [...o.pulses]) {
    pulse.elapsedMs = Math.min(pulse.durationMs, pulse.elapsedMs + dt);
    const t = pulse.durationMs > 0 ? pulse.elapsedMs / pulse.durationMs : 1;
    o.layerOpacity.set(id, pulse.from + (pulse.to - pulse.from) * t);
    if (pulse.elapsedMs >= pulse.durationMs) { o.layerOpacity.set(id, pulse.to); o.pulses.delete(id); }
  }
}
export function applyBackgroundPresentationOverrides(layers: BackgroundLayer[], o: BackgroundPresentationOverrides): BackgroundLayer[] {
  return layers.map((layer) => {
    const enabled = o.layerEnabled.get(layer.id);
    const opacity = o.layerOpacity.get(layer.id);
    let next: BackgroundLayer = enabled === undefined ? layer : ({ ...layer, enabled } as BackgroundLayer);
    if (opacity !== undefined && next.kind === "sprite") next = { ...(next as SpriteBackgroundLayer), opacity: clamp01(opacity) };
    return next;
  });
}
