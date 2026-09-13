/** Authored World Action. Event meaning and runtime state remain separately owned. */
export interface WorldStopScrollActionDefinition {
  readonly id: string;
  readonly category: "world";
  readonly type: "stop_scroll";
}

/** Authored composition between a semantic Event and one executable Action. */
export interface EventActionBinding {
  readonly eventId: string;
  readonly actionId: string;
}

export interface ActionValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface ActionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ActionValidationIssue[];
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validates the single World Action supported by the current Scene Logic boundary. */
export function validateWorldStopScrollAction(action: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = action as Partial<Record<keyof WorldStopScrollActionDefinition, unknown>> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "action", message: "action must be an object" }] };
  }
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "world") issues.push({ field: "category", message: 'category must be "world"' });
  if (value.type !== "stop_scroll") issues.push({ field: "type", message: 'type must be "stop_scroll"' });

  return { valid: issues.length === 0, issues };
}

/** Validates authored Event-to-Action composition without changing either definition. */
export function validateEventActionBinding(binding: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = binding as Partial<Record<keyof EventActionBinding, unknown>> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, issues: [{ field: "binding", message: "binding must be an object" }] };
  }
  if (!nonEmptyString(value.eventId)) {
    issues.push({ field: "eventId", message: "eventId must be a non-empty string" });
  }
  if (!nonEmptyString(value.actionId)) {
    issues.push({ field: "actionId", message: "actionId must be a non-empty string" });
  }

  return { valid: issues.length === 0, issues };
}

/** Resolves the Action referenced by a binding or fails instead of inventing a consequence. */
export function resolveBoundWorldAction(
  binding: EventActionBinding,
  actions: readonly WorldStopScrollActionDefinition[],
): WorldStopScrollActionDefinition {
  const action = actions.find((candidate) => candidate.id === binding.actionId);
  if (!action) throw new Error(`Event/Action binding references missing Action "${binding.actionId}"`);
  return action;
}
