export interface TrackPoint {
  x: number;
  y: number;
}

/** @deprecated Prefer the coordinate-space-specific point types. */
export type BackgroundPoint = TrackPoint;

export interface CameraScroll {
  x: number;
  y: number;
}

export interface TrackParallax {
  x: number;
  y: number;
}

export interface TrackScroll {
  x: number;
  y: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface TrackXInterval {
  startTrackX: number;
  widthPx: number;
}

export type ProjectionResult<Value = number> =
  | { ok: true; value: Value }
  | { ok: false; reason: "non-invertible-parallax" };

export function isFiniteScalar(value: number): boolean {
  return Number.isFinite(value);
}

export function isInvertibleParallax(parallax: number): boolean {
  return Number.isFinite(parallax) && parallax !== 0;
}

export function calculateTrackScroll(cameraScroll: CameraScroll, parallax: TrackParallax): TrackScroll {
  return { x: cameraScroll.x * parallax.x, y: cameraScroll.y * parallax.y };
}

export function trackPointToScreen(
  trackPoint: TrackPoint,
  cameraScroll: CameraScroll,
  parallax: TrackParallax,
): ScreenPoint {
  const trackScroll = calculateTrackScroll(cameraScroll, parallax);
  return { x: trackPoint.x - trackScroll.x, y: trackPoint.y - trackScroll.y };
}

/** Projects a gameplay/world timeline position into stored track-space. */
export function worldXToTrackX(worldX: number, parallaxX: number): ProjectionResult {
  if (!isInvertibleParallax(parallaxX)) return { ok: false, reason: "non-invertible-parallax" };
  return { ok: true, value: worldX * parallaxX };
}

/** Projects stored track-space onto the gameplay/world authoring timeline. */
export function trackXToWorldX(trackX: number, parallaxX: number): ProjectionResult {
  if (!isInvertibleParallax(parallaxX)) return { ok: false, reason: "non-invertible-parallax" };
  return { ok: true, value: trackX / parallaxX };
}

export function calculateEffectiveZ(zBase: number, localZ: number): number {
  return zBase + localZ;
}

export function calculateSegmentOverlap(
  first: { startTrackX: number; widthPx: number },
  second: { startTrackX: number },
): number {
  return first.startTrackX + first.widthPx - second.startTrackX;
}

/** Rebase placement while retaining its position on the gameplay/world timeline. */
export function rebaseTrackXPreservingWorldTiming(
  oldTrackX: number,
  oldParallaxX: number,
  newParallaxX: number,
): ProjectionResult {
  const worldX = trackXToWorldX(oldTrackX, oldParallaxX);
  if (!worldX.ok) return worldX;
  return worldXToTrackX(worldX.value, newParallaxX);
}

/** Explicit alternative to rebasing: retain the authored track-space geometry. */
export function preserveTrackGeometry(oldTrackX: number): number {
  return oldTrackX;
}

/** Rebase both endpoints so the complete authored interval retains its world-timeline extent. */
export function rebaseTrackXIntervalPreservingWorldTiming(
  oldInterval: TrackXInterval,
  oldParallaxX: number,
  newParallaxX: number,
): ProjectionResult<TrackXInterval> {
  const newStartTrackX = rebaseTrackXPreservingWorldTiming(
    oldInterval.startTrackX,
    oldParallaxX,
    newParallaxX,
  );
  if (!newStartTrackX.ok) return newStartTrackX;

  const newEndTrackX = rebaseTrackXPreservingWorldTiming(
    oldInterval.startTrackX + oldInterval.widthPx,
    oldParallaxX,
    newParallaxX,
  );
  if (!newEndTrackX.ok) return newEndTrackX;

  return {
    ok: true,
    value: {
      startTrackX: newStartTrackX.value,
      widthPx: newEndTrackX.value - newStartTrackX.value,
    },
  };
}
