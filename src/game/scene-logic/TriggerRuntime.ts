import { rangeContains, zoneContains, type Marker, type Range, type Zone } from "./Space";
import type {
  MarkerCrossTriggerDefinition,
  RangeSpaceTriggerDefinition,
  RangeZoneTriggerRelation,
  SpaceTriggerMode,
  TimeTriggerDefinition,
  ZoneSpaceTriggerDefinition,
  StateTriggerDefinition,
} from "./Trigger";
import { readStateValue, type ResolvedStateReference } from "./StateRuntime";
import { stateValueType, type StateValue } from "./State";

export interface TimeTriggerRuntimeState {
  previousTime: number | null;
  fired: boolean;
}

export interface MarkerCrossTriggerRuntimeState {
  previousX: number | null;
  fired: boolean;
}

export interface TriggerOccurrence {
  readonly triggerId: string;
}

export interface ContainmentTriggerRuntimeState {
  previousInside: boolean | null;
  fired: boolean;
}

export interface StateTriggerRuntimeState {
  previousMatched: boolean | null;
  fired: boolean;
}

export function createStateTriggerRuntimeState(): StateTriggerRuntimeState {
  return { previousMatched: null, fired: false };
}

export function compareStateValues(relation: StateTriggerDefinition["relation"], current: StateValue, expected: StateValue): boolean {
  if (stateValueType(current) !== stateValueType(expected)) {
    if (relation === "==") return false;
    if (relation === "!=") return true;
    throw new Error("State comparison values must have matching types");
  }
  if (relation === "==") return current === expected;
  if (relation === "!=") return current !== expected;
  if (typeof current !== "number" || typeof expected !== "number") {
    throw new Error("State ordering relations require number values");
  }
  if (relation === "<") return current < expected;
  if (relation === "<=") return current <= expected;
  if (relation === ">") return current > expected;
  return current >= expected;
}

/** Reads current authoritative State and emits only on false-to-true transitions. */
export function evaluateStateTrigger(
  trigger: StateTriggerDefinition,
  reference: ResolvedStateReference,
  state: StateTriggerRuntimeState,
): TriggerOccurrence | null {
  if (reference.definition.id !== trigger.stateId) {
    throw new Error(`State Trigger "${trigger.id}" expected State "${trigger.stateId}", received "${reference.definition.id}"`);
  }
  if (stateValueType(trigger.value) !== reference.definition.valueType) {
    throw new Error(`State Trigger "${trigger.id}" value type does not match State "${trigger.stateId}"`);
  }
  if (trigger.relation !== "==" && trigger.relation !== "!=" && reference.definition.valueType !== "number") {
    throw new Error("State ordering relations require a number State");
  }
  const matched = compareStateValues(trigger.relation, readStateValue(reference), trigger.value);
  const previousMatched = state.previousMatched;
  state.previousMatched = matched;
  if (previousMatched === null || !trigger.enabled || (trigger.mode === "once" && state.fired)) return null;
  if (previousMatched || !matched) return null;
  if (trigger.mode === "once") state.fired = true;
  return { triggerId: trigger.id };
}

export function createMarkerCrossTriggerRuntimeState(): MarkerCrossTriggerRuntimeState {
  return { previousX: null, fired: false };
}

export function createContainmentTriggerRuntimeState(): ContainmentTriggerRuntimeState {
  return { previousInside: null, fired: false };
}

export function createTimeTriggerRuntimeState(): TimeTriggerRuntimeState {
  return { previousTime: null, fired: false };
}

/** Evaluates caller-supplied authoritative simulation time, expressed in seconds. */
export function evaluateTimeTrigger(
  trigger: TimeTriggerDefinition,
  state: TimeTriggerRuntimeState,
  currentTime: number,
): TriggerOccurrence | null {
  const previousTime = state.previousTime;
  state.previousTime = currentTime;
  if (previousTime === null || !trigger.enabled || (trigger.mode === "once" && state.fired)) return null;

  const occurred = trigger.relation === "at"
    ? previousTime < trigger.timeSec && currentTime >= trigger.timeSec
    : previousTime <= trigger.timeSec && currentTime > trigger.timeSec;
  if (!occurred) return null;

  if (trigger.mode === "once") state.fired = true;
  return { triggerId: trigger.id };
}

function evaluateContainmentTransition(
  triggerId: string,
  relation: RangeZoneTriggerRelation,
  mode: SpaceTriggerMode,
  enabled: boolean,
  state: ContainmentTriggerRuntimeState,
  currentInside: boolean,
): TriggerOccurrence | null {
  const previousInside = state.previousInside;
  state.previousInside = currentInside;
  if (previousInside === null || !enabled || (mode === "once" && state.fired)) return null;

  const occurred = relation === "exit"
    ? previousInside && !currentInside
    : !previousInside && currentInside;
  if (!occurred) return null;

  if (mode === "once") state.fired = true;
  return { triggerId };
}

export function evaluateRangeSpaceTrigger(
  trigger: RangeSpaceTriggerDefinition,
  range: Range,
  state: ContainmentTriggerRuntimeState,
  currentX: number,
): TriggerOccurrence | null {
  if (range.id !== trigger.rangeId) {
    throw new Error(`Range Trigger "${trigger.id}" expected Range "${trigger.rangeId}", received "${range.id}"`);
  }
  return evaluateContainmentTransition(
    trigger.id,
    trigger.relation,
    trigger.mode,
    trigger.enabled,
    state,
    rangeContains(range, currentX),
  );
}

export function evaluateZoneSpaceTrigger(
  trigger: ZoneSpaceTriggerDefinition,
  zone: Zone,
  state: ContainmentTriggerRuntimeState,
  currentX: number,
  currentY: number,
): TriggerOccurrence | null {
  if (zone.id !== trigger.zoneId) {
    throw new Error(`Zone Trigger "${trigger.id}" expected Zone "${trigger.zoneId}", received "${zone.id}"`);
  }
  return evaluateContainmentTransition(
    trigger.id,
    trigger.relation,
    trigger.mode,
    trigger.enabled,
    state,
    zoneContains(zone, currentX, currentY),
  );
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
