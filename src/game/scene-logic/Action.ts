import { isStateValue, type StateValue } from "./State";

/** Authored World Action. Event meaning and runtime state remain separately owned. */
export interface WorldStopScrollActionDefinition {
  readonly id: string;
  readonly category: "world";
  readonly type: "stop_scroll";
}

export interface StateSetActionDefinition {
  readonly id: string;
  readonly category: "state";
  readonly type: "set";
  readonly stateId: string;
  readonly value: StateValue;
}

export interface StateIncrementActionDefinition {
  readonly id: string;
  readonly category: "state";
  readonly type: "increment";
  readonly stateId: string;
  readonly value: number;
}

export interface StateDecrementActionDefinition {
  readonly id: string;
  readonly category: "state";
  readonly type: "decrement";
  readonly stateId: string;
  readonly value: number;
}

export interface FlowRestartLevelActionDefinition {
  readonly id: string;
  readonly category: "flow";
  readonly type: "restart_level";
}

export interface FlowCompleteLevelActionDefinition {
  readonly id: string;
  readonly category: "flow";
  readonly type: "complete_level";
}

export type FlowActionDefinition =
  | FlowRestartLevelActionDefinition
  | FlowCompleteLevelActionDefinition;

export type StateActionDefinition =
  | StateSetActionDefinition
  | StateIncrementActionDefinition
  | StateDecrementActionDefinition;

export type SceneLogicActionDefinition =
  | WorldStopScrollActionDefinition
  | StateActionDefinition
  | FlowActionDefinition;

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

function actionObject(action: unknown): Record<string, unknown> | null {
  return action !== null && typeof action === "object" && !Array.isArray(action)
    ? action as Record<string, unknown>
    : null;
}

function invalidObject(field = "action"): ActionValidationResult {
  return { valid: false, issues: [{ field, message: `${field} must be an object` }] };
}

/** Validates the single World Action supported by the current Scene Logic boundary. */
export function validateWorldStopScrollAction(action: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = actionObject(action);
  if (!value) return invalidObject();
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "world") issues.push({ field: "category", message: 'category must be "world"' });
  if (value.type !== "stop_scroll") issues.push({ field: "type", message: 'type must be "stop_scroll"' });
  return { valid: issues.length === 0, issues };
}

function validateStateAction(action: unknown, type: StateActionDefinition["type"]): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = actionObject(action);
  if (!value) return invalidObject();
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "state") issues.push({ field: "category", message: 'category must be "state"' });
  if (value.type !== type) issues.push({ field: "type", message: `type must be "${type}"` });
  if (!nonEmptyString(value.stateId)) issues.push({ field: "stateId", message: "stateId must be a non-empty string" });
  if (type === "set") {
    if (!isStateValue(value.value)) issues.push({ field: "value", message: "value must be a finite State value" });
  } else if (typeof value.value !== "number" || !Number.isFinite(value.value) || value.value < 0) {
    issues.push({ field: "value", message: "value must be a finite non-negative number" });
  }
  return { valid: issues.length === 0, issues };
}

export function validateStateSetAction(action: unknown): ActionValidationResult {
  return validateStateAction(action, "set");
}

export function validateStateIncrementAction(action: unknown): ActionValidationResult {
  return validateStateAction(action, "increment");
}

export function validateStateDecrementAction(action: unknown): ActionValidationResult {
  return validateStateAction(action, "decrement");
}

export function validateFlowRestartLevelAction(action: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = actionObject(action);
  if (!value) return invalidObject();
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "flow") issues.push({ field: "category", message: 'category must be "flow"' });
  if (value.type !== "restart_level") issues.push({ field: "type", message: 'type must be "restart_level"' });
  return { valid: issues.length === 0, issues };
}

export function validateFlowCompleteLevelAction(action: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = actionObject(action);
  if (!value) return invalidObject();
  if (!nonEmptyString(value.id)) issues.push({ field: "id", message: "id must be a non-empty string" });
  if (value.category !== "flow") issues.push({ field: "category", message: 'category must be "flow"' });
  if (value.type !== "complete_level") issues.push({ field: "type", message: 'type must be "complete_level"' });
  return { valid: issues.length === 0, issues };
}

/** Validates authored Event-to-Action composition without changing either definition. */
export function validateEventActionBinding(binding: unknown): ActionValidationResult {
  const issues: ActionValidationIssue[] = [];
  const value = actionObject(binding);
  if (!value) return invalidObject("binding");
  if (!nonEmptyString(value.eventId)) issues.push({ field: "eventId", message: "eventId must be a non-empty string" });
  if (!nonEmptyString(value.actionId)) issues.push({ field: "actionId", message: "actionId must be a non-empty string" });
  return { valid: issues.length === 0, issues };
}

/** Stable-ID lookup only; resolution performs no category-specific execution. */
export function resolveBoundAction(
  binding: EventActionBinding,
  actions: readonly SceneLogicActionDefinition[],
): SceneLogicActionDefinition {
  const action = actions.find((candidate) => candidate.id === binding.actionId);
  if (!action) throw new Error(`Event/Action binding references missing Action "${binding.actionId}"`);
  return action;
}

/** Compatibility helper for callers that only author World Actions. */
export function resolveBoundWorldAction(
  binding: EventActionBinding,
  actions: readonly WorldStopScrollActionDefinition[],
): WorldStopScrollActionDefinition {
  return resolveBoundAction(binding, actions) as WorldStopScrollActionDefinition;
}
