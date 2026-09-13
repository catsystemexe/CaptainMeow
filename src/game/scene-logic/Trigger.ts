import type { Marker, Range, Zone } from "./Space";

export type SpaceTriggerMode = "once" | "repeat";
export type MarkerCrossTriggerMode = SpaceTriggerMode;
export type RangeZoneTriggerRelation = "enter" | "inside" | "exit";

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
