import type { Marker, Range, Zone } from "./Space";
import { isStateValue, stateValueType, type StateReferenceDefinition, type StateValue } from "./State";

export type TriggerMode = "once" | "repeat";
export type SpaceTriggerMode = TriggerMode;
export type MarkerCrossTriggerMode = SpaceTriggerMode;
export type RangeZoneTriggerRelation = "enter" | "inside" | "exit";
export type TimeTriggerRelation = "at" | "after";
export type StateTriggerRelation = "==" | "!=" | "<" | "<=" | ">" | ">=";

export interface StateTriggerDefinition {
  readonly id: string;
  readonly kind: "state";
  readonly stateId: string;
  readonly relation: StateTriggerRelation;
  readonly value: StateValue;
  readonly mode: TriggerMode;
  readonly enabled: boolean;
}

/** Authored time threshold in seconds; the runtime clock remains caller-owned. */
export interface TimeTriggerDefinition {
  readonly id: string;
  readonly kind: "time";
  readonly relation: TimeTriggerRelation;
  readonly timeSec: number;
  readonly mode: TriggerMode;
  readonly enabled: boolean;
}

/** Authored activation condition. Marker geometry remains separately owned by Space. */
export interface MarkerCrossTriggerDefinition {
  readonly id: string;
  readonly kind: "space";
  readonly relation: "cross";
  readonly markerId: string;
  readonly mode: SpaceTriggerMode;
  readonly enabled: boolean;
}

export interface RangeSpaceTriggerDefinition {
  readonly id: string;
  readonly kind: "space";
  readonly relation: RangeZoneTriggerRelation;
  readonly rangeId: string;
  readonly mode: SpaceTriggerMode;
  readonly enabled: boolean;
}

export interface ZoneSpaceTriggerDefinition {
  readonly id: string;
  readonly kind: "space";
  readonly relation: RangeZoneTriggerRelation;
  readonly zoneId: string;
  readonly mode: SpaceTriggerMode;
  readonly enabled: boolean;
}

export interface TriggerValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface TriggerValidationResult {
  readonly valid: boolean;
  readonly issues: readonly TriggerValidationIssue[];
}

export function validateTimeTrigger(trigger: unknown): TriggerValidationResult {
  const issues: TriggerValidationIssue[] = [];
  const value = trigger as Record<string, unknown> | null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, issues: [{ field: "trigger", message: "trigger must be an object" }] };
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ field: "id", message: "id must be a non-empty string" });
  }
  if (value.kind !== "time") issues.push({ field: "kind", message: 'kind must be "time"' });
  if (value.relation !== "at" && value.relation !== "after") {
    issues.push({ field: "relation", message: 'relation must be "at" or "after"' });
  }
  if (typeof value.timeSec !== "number" || !Number.isFinite(value.timeSec) || value.timeSec < 0) {
    issues.push({ field: "timeSec", message: "timeSec must be a finite non-negative number" });
  }
  if (value.mode !== "once" && value.mode !== "repeat") {
    issues.push({ field: "mode", message: 'mode must be "once" or "repeat"' });
  }
  if (typeof value.enabled !== "boolean") {
    issues.push({ field: "enabled", message: "enabled must be a boolean" });
  }

  return { valid: issues.length === 0, issues };
}

/** Validates a State Trigger and, when supplied, its binding to an authored State reference. */
export function validateStateTrigger(
  trigger: unknown,
  states: readonly StateReferenceDefinition[] = [],
): TriggerValidationResult {
  const issues: TriggerValidationIssue[] = [];
  const value = trigger as Record<string, unknown> | null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, issues: [{ field: "trigger", message: "trigger must be an object" }] };
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.kind !== "state") issues.push({ field: "kind", message: 'kind must be "state"' });
  if (typeof value.stateId !== "string" || value.stateId.trim().length === 0) issues.push({ field: "stateId", message: "stateId must be a non-empty string" });
  const relations: readonly unknown[] = ["==", "!=", "<", "<=", ">", ">="];
  if (!relations.includes(value.relation)) issues.push({ field: "relation", message: "relation is not supported" });
  if (!isStateValue(value.value)) issues.push({ field: "value", message: "value must be a boolean, finite number, or string" });
  if (value.mode !== "once" && value.mode !== "repeat") issues.push({ field: "mode", message: 'mode must be "once" or "repeat"' });
  if (typeof value.enabled !== "boolean") issues.push({ field: "enabled", message: "enabled must be a boolean" });

  if (typeof value.stateId === "string" && value.stateId.trim() && states.length > 0) {
    const state = states.find((candidate) => candidate.id === value.stateId);
    if (!state) {
      issues.push({ field: "stateId", message: `references missing State "${value.stateId}"` });
    } else if (isStateValue(value.value)) {
      if (stateValueType(value.value) !== state.valueType) issues.push({ field: "value", message: `value type must match State type ${state.valueType}` });
      if (value.relation !== "==" && value.relation !== "!=" && state.valueType !== "number") {
        issues.push({ field: "relation", message: "ordering relations require a number State" });
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

export function resolveTriggerState(
  trigger: StateTriggerDefinition,
  states: readonly StateReferenceDefinition[],
): StateReferenceDefinition {
  const state = states.find((candidate) => candidate.id === trigger.stateId);
  if (!state) throw new Error(`State Trigger "${trigger.id}" references missing State "${trigger.stateId}"`);
  return state;
}

/** Validates authored/external data without expanding into a generic Trigger schema. */
export function validateMarkerCrossTrigger(trigger: unknown): TriggerValidationResult {
  const issues: TriggerValidationIssue[] = [];
  const value = trigger as Partial<Record<keyof MarkerCrossTriggerDefinition, unknown>> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "trigger", message: "trigger must be an object" }] };
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ field: "id", message: "id must be a non-empty string" });
  }
  if (value.kind !== "space") issues.push({ field: "kind", message: 'kind must be "space"' });
  if (value.relation !== "cross") issues.push({ field: "relation", message: 'relation must be "cross"' });
  if (typeof value.markerId !== "string" || value.markerId.trim().length === 0) {
    issues.push({ field: "markerId", message: "markerId must be a non-empty string" });
  }
  if (value.mode !== "once" && value.mode !== "repeat") {
    issues.push({ field: "mode", message: 'mode must be "once" or "repeat"' });
  }
  if (typeof value.enabled !== "boolean") {
    issues.push({ field: "enabled", message: "enabled must be a boolean" });
  }

  return { valid: issues.length === 0, issues };
}

function validateRangeZoneTrigger(
  trigger: unknown,
  referenceField: "rangeId" | "zoneId",
): TriggerValidationResult {
  const issues: TriggerValidationIssue[] = [];
  const value = trigger as Record<string, unknown> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "trigger", message: "trigger must be an object" }] };
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ field: "id", message: "id must be a non-empty string" });
  }
  if (value.kind !== "space") issues.push({ field: "kind", message: 'kind must be "space"' });
  if (value.relation !== "enter" && value.relation !== "inside" && value.relation !== "exit") {
    issues.push({ field: "relation", message: 'relation must be "enter", "inside", or "exit"' });
  }
  const reference = value[referenceField];
  if (typeof reference !== "string" || reference.trim().length === 0) {
    issues.push({ field: referenceField, message: `${referenceField} must be a non-empty string` });
  }
  if (value.mode !== "once" && value.mode !== "repeat") {
    issues.push({ field: "mode", message: 'mode must be "once" or "repeat"' });
  }
  if (typeof value.enabled !== "boolean") {
    issues.push({ field: "enabled", message: "enabled must be a boolean" });
  }
  return { valid: issues.length === 0, issues };
}

export function validateRangeSpaceTrigger(trigger: unknown): TriggerValidationResult {
  return validateRangeZoneTrigger(trigger, "rangeId");
}

export function validateZoneSpaceTrigger(trigger: unknown): TriggerValidationResult {
  return validateRangeZoneTrigger(trigger, "zoneId");
}

/** Resolves an authored Marker reference or fails instead of inventing geometry. */
export function resolveTriggerMarker(trigger: MarkerCrossTriggerDefinition, markers: readonly Marker[]): Marker {
  const marker = markers.find((candidate) => candidate.id === trigger.markerId);
  if (!marker) throw new Error(`Marker cross Trigger "${trigger.id}" references missing Marker "${trigger.markerId}"`);
  return marker;
}

/** Resolves an authored Range reference or fails instead of inventing geometry. */
export function resolveTriggerRange(trigger: RangeSpaceTriggerDefinition, ranges: readonly Range[]): Range {
  const range = ranges.find((candidate) => candidate.id === trigger.rangeId);
  if (!range) throw new Error(`Range Trigger "${trigger.id}" references missing Range "${trigger.rangeId}"`);
  return range;
}

/** Resolves an authored Zone reference or fails instead of inventing geometry. */
export function resolveTriggerZone(trigger: ZoneSpaceTriggerDefinition, zones: readonly Zone[]): Zone {
  const zone = zones.find((candidate) => candidate.id === trigger.zoneId);
  if (!zone) throw new Error(`Zone Trigger "${trigger.id}" references missing Zone "${trigger.zoneId}"`);
  return zone;
}
