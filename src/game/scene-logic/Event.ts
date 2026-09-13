/** Authored semantic occurrence. Geometry, activation, and consequences live elsewhere. */
export interface SceneEventDefinition {
  readonly id: string;
  readonly category: "scene";
  readonly type: string;
}

/** Authored composition between reusable Trigger activation and Event meaning. */
export interface TriggerEventBinding {
  readonly triggerId: string;
  readonly eventId: string;
}

export interface SceneEventValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface SceneEventValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SceneEventValidationIssue[];
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validates an authored Scene Event at the Scene Logic boundary. */
export function validateSceneEventDefinition(event: unknown): SceneEventValidationResult {
  const issues: SceneEventValidationIssue[] = [];
  const value = event as Partial<Record<keyof SceneEventDefinition, unknown>> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "event", message: "event must be an object" }] };
  }
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "scene") issues.push({ field: "category", message: 'category must be "scene"' });
  if (!nonEmptyString(value.type)) issues.push({ field: "type", message: "type must be a non-empty string" });

  return { valid: issues.length === 0, issues };
}

/** Validates authored Trigger-to-Event composition without changing either definition. */
export function validateTriggerEventBinding(binding: unknown): SceneEventValidationResult {
  const issues: SceneEventValidationIssue[] = [];
  const value = binding as Partial<Record<keyof TriggerEventBinding, unknown>> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "binding", message: "binding must be an object" }] };
  }
  if (!nonEmptyString(value.triggerId)) {
    issues.push({ field: "triggerId", message: "triggerId must be a non-empty string" });
  }
  if (!nonEmptyString(value.eventId)) {
    issues.push({ field: "eventId", message: "eventId must be a non-empty string" });
  }

  return { valid: issues.length === 0, issues };
}

/** Resolves the Event referenced by a binding or fails instead of inventing meaning. */
export function resolveBoundSceneEvent(
  binding: TriggerEventBinding,
  events: readonly SceneEventDefinition[],
): SceneEventDefinition {
  const event = events.find((candidate) => candidate.id === binding.eventId);
  if (!event) throw new Error(`Trigger/Event binding references missing Scene Event "${binding.eventId}"`);
  return event;
}
