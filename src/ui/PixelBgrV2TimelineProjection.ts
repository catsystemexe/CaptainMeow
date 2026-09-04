import type { BackgroundSceneV2, BackgroundTrackRole } from "../render/bg/v2/BackgroundV2Types";

export interface GameplayTimelineRange { id: string; label: string; startX: number; endX: number }
export interface GameplayTimelineMarker { id: string; label: string; x: number }
export interface GameplayTimelineReference {
  ranges?: readonly GameplayTimelineRange[];
  markers?: readonly GameplayTimelineMarker[];
}

export interface V2ProjectedSegment {
  id: string; trackId: string; startX: number; endX: number; widthPx: number; enabled: boolean; effectiveZ: number;
}
export interface V2ProjectedObject {
  id: string; trackId: string; x: number; width: number | null; enabled: boolean; effectiveZ: number;
}
export interface V2ProjectedTrack {
  id: string; label: string; role: BackgroundTrackRole; mode: "sequence" | "repeat"; enabled: boolean; sceneIndex: number;
  segments: V2ProjectedSegment[]; objects: V2ProjectedObject[];
}
export interface V2ProjectedLane {
  id: string; label: string; role: BackgroundTrackRole | "environment" | "gameplay";
  tracks: V2ProjectedTrack[];
}
export interface V2TimelineProjection {
  sceneId: string;
  lanes: V2ProjectedLane[];
  environmentLabels: string[];
  gameplay: { ranges: GameplayTimelineRange[]; markers: GameplayTimelineMarker[]; available: boolean };
  bounds: { startX: number; endX: number };
  playerX: number;
}

const STANDARD_ROLES: readonly BackgroundTrackRole[] = ["far", "mid", "near"];
const roleLabel = (role: BackgroundTrackRole): string => role[0].toUpperCase() + role.slice(1);
const finite = (value: number): boolean => Number.isFinite(value);

export function projectBackgroundV2Timeline(
  scene: BackgroundSceneV2,
  gameplay: GameplayTimelineReference = {},
  playerX = 0,
): V2TimelineProjection {
  const tracks = scene.tracks.map((track, sceneIndex): V2ProjectedTrack => ({
    id: track.id,
    label: track.name,
    role: track.role,
    mode: track.mode,
    enabled: track.enabled,
    sceneIndex,
    segments: track.segments.map(segment => ({
      id: segment.id,
      trackId: track.id,
      startX: segment.startTrackX,
      endX: segment.startTrackX + segment.widthPx,
      widthPx: segment.widthPx,
      enabled: segment.enabled,
      effectiveZ: track.zBase + segment.localZ,
    })),
    objects: track.objects.map(object => ({
      id: object.id,
      trackId: track.id,
      x: object.startTrackX,
      width: finite(object.width ?? Number.NaN) ? object.width! : null,
      enabled: object.enabled,
      effectiveZ: track.zBase + object.localZ,
    })),
  }));

  const lanes: V2ProjectedLane[] = [{ id: "environment", label: "Environment", role: "environment", tracks: [] }];
  for (const role of STANDARD_ROLES) lanes.push({ id: role, label: roleLabel(role), role, tracks: tracks.filter(track => track.role === role) });
  for (const track of tracks.filter(item => item.role === "custom")) {
    lanes.push({ id: `custom:${track.id}`, label: `Custom — ${track.label}`, role: "custom", tracks: [track] });
  }
  lanes.push({ id: "gameplay", label: "Gameplay reference", role: "gameplay", tracks: [] });
  lanes.push({ id: "foreground", label: "Foreground", role: "foreground", tracks: tracks.filter(track => track.role === "foreground") });

  const ranges = (gameplay.ranges ?? []).map(range => ({ ...range }));
  const markers = (gameplay.markers ?? []).map(marker => ({ ...marker }));
  const points = [finite(playerX) ? playerX : 0];
  for (const track of tracks) {
    for (const segment of track.segments) if (finite(segment.startX) && finite(segment.endX)) points.push(segment.startX, segment.endX);
    for (const object of track.objects) if (finite(object.x)) points.push(object.x, object.width !== null ? object.x + object.width : object.x);
  }
  for (const range of ranges) if (finite(range.startX) && finite(range.endX)) points.push(range.startX, range.endX);
  for (const marker of markers) if (finite(marker.x)) points.push(marker.x);

  const environmentLabels = scene.environment.starfield
    ? [`Starfield · seed ${scene.environment.starfield.seed} · density ${scene.environment.starfield.density}`]
    : ["No environment features configured"];
  return {
    sceneId: scene.id,
    lanes,
    environmentLabels,
    gameplay: { ranges, markers, available: ranges.length > 0 || markers.length > 0 },
    bounds: { startX: Math.min(0, ...points), endX: Math.max(0, ...points) },
    playerX: finite(playerX) ? playerX : 0,
  };
}
