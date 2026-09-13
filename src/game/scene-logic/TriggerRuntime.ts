import type { Marker } from "./Space";
import type { MarkerCrossTriggerDefinition } from "./Trigger";

export interface MarkerCrossTriggerRuntimeState {
  previousX: number | null;
  fired: boolean;
}

export interface TriggerOccurrence {
  readonly triggerId: string;
}

export function createMarkerCrossTriggerRuntimeState(): MarkerCrossTriggerRuntimeState {
  return { previousX: null, fired: false };
}

/**
 * Evaluates one supplied simulation position. Disabled samples still advance the
 * baseline, so enabling cannot synthesize a crossing that happened while disabled.
 */
export function evaluateMarkerCrossTrigger(
  trigger: MarkerCrossTriggerDefinition,
  marker: Marker,
  state: MarkerCrossTriggerRuntimeState,
  currentX: number,
): TriggerOccurrence | null {
  if (marker.id !== trigger.markerId) {
    throw new Error(`Marker cross Trigger "${trigger.id}" expected Marker "${trigger.markerId}", received "${marker.id}"`);
  }

  const previousX = state.previousX;
  state.previousX = currentX;
  if (previousX === null || !trigger.enabled || (trigger.mode === "once" && state.fired)) return null;

  const crossed = previousX < marker.position && currentX >= marker.position;
  if (!crossed) return null;

  if (trigger.mode === "once") state.fired = true;
  return { triggerId: trigger.id };
}
