import type { Marker } from "./Space";

export type MarkerCrossTriggerMode = "once" | "repeat";

/** Authored activation condition. Marker geometry remains separately owned by Space. */
export interface MarkerCrossTriggerDefinition {
  readonly id: string;
  readonly kind: "space";
  readonly relation: "cross";
  readonly markerId: string;
  readonly mode: MarkerCrossTriggerMode;
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

/** Resolves an authored Marker reference or fails instead of inventing geometry. */
export function resolveTriggerMarker(trigger: MarkerCrossTriggerDefinition, markers: readonly Marker[]): Marker {
  const marker = markers.find((candidate) => candidate.id === trigger.markerId);
  if (!marker) throw new Error(`Marker cross Trigger "${trigger.id}" references missing Marker "${trigger.markerId}"`);
  return marker;
}
