import type { CameraScroll, ScreenPoint, TrackParallax, TrackPoint } from "../render/bg/v2/BackgroundV2Math";
import { trackPointToScreen } from "../render/bg/v2/BackgroundV2Math";

/** Inverse of BackgroundV2Evaluator's trackPointToScreen projection: authored = screen + camera * parallax. */
export function screenPointToV2TrackPoint(screen: ScreenPoint, camera: CameraScroll, parallax: TrackParallax): TrackPoint {
  return { x: screen.x + camera.x * parallax.x, y: screen.y + camera.y * parallax.y };
}

export function v2TrackPointToScreen(track: TrackPoint, camera: CameraScroll, parallax: TrackParallax): ScreenPoint {
  return trackPointToScreen(track, camera, parallax);
}
