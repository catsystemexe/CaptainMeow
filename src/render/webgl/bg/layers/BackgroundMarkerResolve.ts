import type { BackgroundScene } from "./BackgroundSceneTypes";
import type { BackgroundMarker, ResolvedBackgroundMarker } from "./BackgroundMarkerTypes";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
export const globalMarkerRuntimeId = (markerId: string): string => `global-marker:${markerId}`;
export const chunkMarkerRuntimeId = (chunkId: string, markerId: string): string => `chunk-marker:${chunkId}:${markerId}`;

export function isValidBackgroundMarker(value: unknown): value is BackgroundMarker {
  return isObj(value) && typeof value.id === "string" && value.id.length > 0 && Number.isFinite(value.x) && typeof value.enabled === "boolean" && typeof value.once === "boolean" && Array.isArray(value.actions);
}

export function resolveBackgroundMarkers(scene: BackgroundScene | null | undefined): ResolvedBackgroundMarker[] {
  if (!scene || typeof scene.id !== "string") return [];
  const out: ResolvedBackgroundMarker[] = [];
  const add = (marker: unknown, runtimeId: string, worldX: number, owner: ResolvedBackgroundMarker["owner"], sourceIndex: number, ownerIndex: number) => {
    if (!isValidBackgroundMarker(marker) || !marker.enabled) return;
    out.push({ runtimeId, marker: { ...marker, actions: marker.actions.slice() }, owner, worldX, sourceIndex, ownerIndex });
  };
  (Array.isArray(scene.markers) ? scene.markers : []).forEach((m, i) => {
    if (isObj(m) && typeof m.id === "string") add(m, globalMarkerRuntimeId(m.id), Number((m as any).x), { kind: "global" }, i, -1);
  });
  (Array.isArray(scene.chunks) ? scene.chunks : []).forEach((chunk, ci) => {
    if (!chunk || typeof chunk.id !== "string" || !Number.isFinite(chunk.startX) || !Number.isFinite(chunk.length)) return;
    (Array.isArray(chunk.markers) ? chunk.markers : []).forEach((m, mi) => {
      if (isObj(m) && typeof m.id === "string") add(m, chunkMarkerRuntimeId(chunk.id, m.id), chunk.startX + Number((m as any).x), { kind: "chunk", chunkId: chunk.id, chunkStartX: chunk.startX, chunkLength: chunk.length }, mi, ci);
    });
  });
  return out.sort((a, b) => a.worldX - b.worldX || a.ownerIndex - b.ownerIndex || a.sourceIndex - b.sourceIndex || a.runtimeId.localeCompare(b.runtimeId));
}
