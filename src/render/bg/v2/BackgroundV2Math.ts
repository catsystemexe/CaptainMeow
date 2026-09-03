export interface BackgroundPoint {
  x: number;
  y: number;
}

export type ProjectionResult =
  | { ok: true; value: number }
  | { ok: false; reason: "non-invertible-parallax" };

function isInvertibleParallax(parallax: number): boolean {
  return Number.isFinite(parallax) && parallax !== 0;
}

export function calculateTrackScroll(cameraScroll: BackgroundPoint, parallax: BackgroundPoint): BackgroundPoint {
  return { x: cameraScroll.x * parallax.x, y: cameraScroll.y * parallax.y };
}

export function trackPointToScreen(
  trackPoint: BackgroundPoint,
  cameraScroll: BackgroundPoint,
  parallax: BackgroundPoint,
): BackgroundPoint {
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
  trackX: number,
  oldParallaxX: number,
  newParallaxX: number,
): ProjectionResult {
  if (!isInvertibleParallax(oldParallaxX) || !isInvertibleParallax(newParallaxX)) {
    return { ok: false, reason: "non-invertible-parallax" };
  }
  return { ok: true, value: (trackX / oldParallaxX) * newParallaxX };
}

/** Explicit alternative to rebasing: retain the authored track-space geometry. */
export function preserveTrackGeometry(trackX: number): number {
  return trackX;
}
