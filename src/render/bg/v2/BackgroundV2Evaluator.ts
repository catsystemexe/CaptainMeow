import type {
  BackgroundEvaluationContext,
  BackgroundRenderInstance,
  BackgroundSceneV2,
  BackgroundTrack,
  EvaluatedBackgroundFrame,
} from "./BackgroundV2Types";
import { calculateEffectiveZ, trackPointToScreen } from "./BackgroundV2Math";

interface OrderedInstance {
  instance: BackgroundRenderInstance;
  trackIndex: number;
  localIndex: number;
}

function compareInstances(a: OrderedInstance, b: OrderedInstance): number {
  return a.instance.effectiveZ - b.instance.effectiveZ
    || a.trackIndex - b.trackIndex
    || a.localIndex - b.localIndex
    || a.instance.instanceId.localeCompare(b.instance.instanceId);
}

function evaluateTrack(
  track: BackgroundTrack,
  trackIndex: number,
  context: BackgroundEvaluationContext,
): OrderedInstance[] {
  const cameraScroll = { x: context.cameraScrollX, y: context.cameraScrollY };
  const instances: OrderedInstance[] = [];

  track.segments.forEach((segment, segmentIndex) => {
    if (!segment.enabled) return;
    const screen = trackPointToScreen({ x: segment.startTrackX, y: segment.offsetY }, cameraScroll, track.parallax);
    instances.push({
      instance: {
        instanceId: `${track.id}:segment:${segment.id}`,
        asset: { ...segment.asset },
        screenX: screen.x,
        screenY: screen.y,
        width: segment.widthPx,
        opacity: segment.opacity,
        blend: segment.blend,
        effectiveZ: calculateEffectiveZ(track.zBase, segment.localZ),
        sourceTrackId: track.id,
        sourceSegmentId: segment.id,
      },
      trackIndex,
      localIndex: segmentIndex,
    });
  });

  track.objects.forEach((object, objectIndex) => {
    if (!object.enabled) return;
    const screen = trackPointToScreen({ x: object.startTrackX, y: object.y }, cameraScroll, track.parallax);
    instances.push({
      instance: {
        instanceId: `${track.id}:object:${object.id}`,
        asset: { ...object.asset },
        screenX: screen.x,
        screenY: screen.y,
        width: object.width,
        height: object.height,
        opacity: object.opacity,
        blend: object.blend,
        effectiveZ: calculateEffectiveZ(track.zBase, object.localZ),
        sourceTrackId: track.id,
        sourceObjectId: object.id,
      },
      trackIndex,
      localIndex: track.segments.length + objectIndex,
    });
  });

  return instances;
}

/**
 * Pure shared evaluation boundary for future runtime and authoring-preview consumers.
 * Repeat-mode expansion and viewport culling are intentionally deferred beyond M1.
 */
export function evaluateBackgroundScene(
  scene: BackgroundSceneV2,
  context: BackgroundEvaluationContext,
): EvaluatedBackgroundFrame {
  const behindGameplay: OrderedInstance[] = [];
  const foreground: OrderedInstance[] = [];

  scene.tracks.forEach((track, trackIndex) => {
    if (!track.enabled) return;
    const destination = track.role === "foreground" ? foreground : behindGameplay;
    destination.push(...evaluateTrack(track, trackIndex, context));
  });

  return {
    behindGameplay: behindGameplay.sort(compareInstances).map(({ instance }) => instance),
    foreground: foreground.sort(compareInstances).map(({ instance }) => instance),
    environment: {
      starfield: scene.environment.starfield ? { ...scene.environment.starfield } : undefined,
    },
  };
}
