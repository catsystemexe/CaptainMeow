import type { BackgroundSceneV2, BackgroundTrackRole } from "../render/bg/v2/BackgroundV2Types";
import { trackXToWorldX } from "../render/bg/v2/BackgroundV2Math";
import { orderedV2SceneEvents } from "./PixelBgrV2SceneEvents";

export interface GameplayTimelineRange { id: string; label: string; startX: number; endX: number }
export interface GameplayTimelineMarker { id: string; label: string; x: number }
export interface GameplayTimelineReference {
  ranges?: readonly GameplayTimelineRange[];
  markers?: readonly GameplayTimelineMarker[];
}

export interface V2ProjectedSegment {
  id: string; name?: string; locked?: boolean; trackId: string; startX: number; endX: number; widthPx: number; enabled: boolean; effectiveZ: number;
}
export interface V2ProjectedObject {
  id: string; name?: string; locked?: boolean; trackId: string; x: number; width: number | null; enabled: boolean; effectiveZ: number;
}
export interface V2ProjectedTrack {
  id: string; label: string; role: BackgroundTrackRole; mode: "sequence" | "repeat"; enabled: boolean; sceneIndex: number; parallaxX: number; projectable: boolean;
  segments: V2ProjectedSegment[]; objects: V2ProjectedObject[];
}
export interface V2ProjectedLane {
  id: string; label: string; role: Exclude<BackgroundTrackRole, "custom">;
  tracks: V2ProjectedTrack[];
}
export interface V2ProjectedEvent { id: string; type: "signal" | "level-end"; label: string; worldX: number; enabled: boolean; locked?: boolean }
export interface V2TimelineProjection {
  sceneId: string;
  lanes: V2ProjectedLane[];
  events: V2ProjectedEvent[];
  environmentLabels: string[];
  gameplay: { ranges: GameplayTimelineRange[]; markers: GameplayTimelineMarker[]; available: boolean };
  bounds: { startX: number; endX: number };
  playerX: number;
}

export type V2RoleVisibility = "all" | "none" | "mixed";

/** Derives lane visibility exclusively from the represented tracks' enabled fields. */
export function v2RoleVisibility(tracks: readonly Pick<V2ProjectedTrack, "enabled">[]): V2RoleVisibility {
  if (tracks.length === 0 || tracks.every(track => !track.enabled)) return "none";
  return tracks.every(track => track.enabled) ? "all" : "mixed";
}

/** Materializes a scene edit against BackgroundTrack.enabled; mixed lanes are enabled on click. */
export function setV2RoleTracksEnabled(scene: BackgroundSceneV2, trackIds: readonly string[], enabled: boolean): BackgroundSceneV2 {
  const ids = new Set(trackIds);
  return { ...scene, tracks: scene.tracks.map(track => ids.has(track.id) ? { ...track, enabled } : track) };
}

const STANDARD_ROLES = ["foreground", "near", "mid", "far"] as const;
const roleLabel = (role: BackgroundTrackRole): string => role === "foreground" ? "Front" : role[0].toUpperCase() + role.slice(1);
const finite = (value: number): boolean => Number.isFinite(value);

export function projectBackgroundV2Timeline(
  scene: BackgroundSceneV2,
  gameplay: GameplayTimelineReference = {},
  playerX = 0,
): V2TimelineProjection {
  const tracks = scene.tracks.map((track, sceneIndex): V2ProjectedTrack => {
    const project = (trackX: number): number | null => {
      const result = trackXToWorldX(trackX, track.parallax.x);
      return result.ok ? result.value : null;
    };
    const projectable = project(0) !== null;
    return {
      id: track.id, label: track.name, role: track.role, mode: track.mode, enabled: track.enabled, sceneIndex,
      parallaxX: track.parallax.x, projectable,
      segments: projectable ? track.segments.flatMap(segment => {
        const startX = project(segment.startTrackX);
        const endX = project(segment.startTrackX + segment.widthPx);
        return startX === null || endX === null ? [] : [{
          id: segment.id, name: segment.name, locked: segment.locked, trackId: track.id, startX, endX, widthPx: endX - startX,
          enabled: segment.enabled, effectiveZ: track.zBase + segment.localZ,
        }];
      }) : [],
      objects: projectable ? track.objects.flatMap(object => {
        const x = project(object.startTrackX);
        if (x === null) return [];
        const endX = finite(object.width ?? Number.NaN) ? project(object.startTrackX + object.width!) : null;
        return [{ id: object.id, name: object.name, locked: object.locked, trackId: track.id, x, width: endX === null ? null : endX - x, enabled: object.enabled, effectiveZ: track.zBase + object.localZ }];
      }) : [],
    };
  });

  // The canonical timeline is a projection by depth role, not by track. Custom
  // tracks remain in the scene model but have no evidence-backed depth mapping.
  const lanes: V2ProjectedLane[] = [];
  for (const role of STANDARD_ROLES) lanes.push({ id: role, label: roleLabel(role), role, tracks: tracks.filter(track => track.role === role) });

  const ranges = (gameplay.ranges ?? []).map(range => ({ ...range }));
  const markers = (gameplay.markers ?? []).map(marker => ({ ...marker }));
  const points = [finite(playerX) ? playerX : 0];
  for (const track of tracks) {
    for (const segment of track.segments) if (finite(segment.startX) && finite(segment.endX)) points.push(segment.startX, segment.endX);
    for (const object of track.objects) if (finite(object.x)) points.push(object.x, object.width !== null ? object.x + object.width : object.x);
  }
  for (const range of ranges) if (finite(range.startX) && finite(range.endX)) points.push(range.startX, range.endX);
  for (const marker of markers) if (finite(marker.x)) points.push(marker.x);
  const events = orderedV2SceneEvents(scene).map(event => ({ id: event.id, type: event.type, label: event.name || (event.type === "level-end" ? "END" : event.id), worldX: event.worldX, enabled: event.enabled, locked: event.locked }));
  for (const event of events) if (finite(event.worldX)) points.push(event.worldX);

  const environmentLabels = scene.environment.starfield
    ? [`Starfield · seed ${scene.environment.starfield.seed} · density ${scene.environment.starfield.density}`]
    : ["No environment features configured"];
  return {
    sceneId: scene.id,
    lanes,
    events,
    environmentLabels,
    gameplay: { ranges, markers, available: ranges.length > 0 || markers.length > 0 },
    bounds: { startX: Math.min(0, ...points), endX: Math.max(0, ...points) },
    playerX: finite(playerX) ? playerX : 0,
  };
}
