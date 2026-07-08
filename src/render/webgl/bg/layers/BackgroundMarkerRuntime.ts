import type { ResolvedBackgroundMarker } from "./BackgroundMarkerTypes";

export interface BackgroundMarkerRuntime { sceneKey: string | null; previousScrollX: number | null; firedOnce: Set<string>; repeatArmed: Set<string> }
export const createBackgroundMarkerRuntime = (): BackgroundMarkerRuntime => ({ sceneKey: null, previousScrollX: null, firedOnce: new Set(), repeatArmed: new Set() });
export function resetBackgroundMarkerRuntime(rt: BackgroundMarkerRuntime, sceneKey: string | null = null, scrollX: number | null = null): void { rt.sceneKey = sceneKey; rt.previousScrollX = scrollX; rt.firedOnce.clear(); rt.repeatArmed.clear(); }
export function evaluateBackgroundMarkerCrossings(rt: BackgroundMarkerRuntime, sceneKey: string, scrollX: number, markers: ResolvedBackgroundMarker[]): ResolvedBackgroundMarker[] {
  if (rt.sceneKey !== sceneKey || rt.previousScrollX === null) { rt.sceneKey = sceneKey; rt.previousScrollX = scrollX; rt.firedOnce.clear(); rt.repeatArmed = new Set(markers.filter(m => !m.marker.once && scrollX < m.worldX).map(m => m.runtimeId)); return []; }
  const prev = rt.previousScrollX;
  for (const m of markers) if (!m.marker.once && scrollX < m.worldX) rt.repeatArmed.add(m.runtimeId);
  const fired: ResolvedBackgroundMarker[] = [];
  if (scrollX >= prev) {
    for (const m of markers) {
      if (!(prev < m.worldX && scrollX >= m.worldX)) continue;
      if (m.marker.once) { if (rt.firedOnce.has(m.runtimeId)) continue; rt.firedOnce.add(m.runtimeId); fired.push(m); }
      else if (rt.repeatArmed.has(m.runtimeId)) { rt.repeatArmed.delete(m.runtimeId); fired.push(m); }
    }
  }
  rt.previousScrollX = scrollX;
  return fired;
}
