import {
  validateFlowCompleteLevelAction,
  validateFlowRestartLevelAction,
  validateStateDecrementAction,
  validateStateIncrementAction,
  validateStateSetAction,
  validateWorldStopScrollAction,
  type SceneLogicActionDefinition,
} from "./Action";
import { validateSceneEventDefinition, type SceneEventDefinition } from "./Event";

export interface SequenceEventStep { readonly kind: "event"; readonly eventId: string }
export interface SequenceActionStep { readonly kind: "action"; readonly actionId: string }
export interface SequenceWaitStep { readonly kind: "wait"; readonly durationSec: number }

export type SequenceStep = SequenceEventStep | SequenceActionStep | SequenceWaitStep;

/** Reusable authored linear orchestration. Runtime execution never mutates this value. */
export interface SequenceDefinition {
  readonly id: string;
  readonly steps: readonly SequenceStep[];
}

export interface SequenceReferences {
  readonly events: readonly SceneEventDefinition[];
  readonly actions: readonly SceneLogicActionDefinition[];
}

export interface SequenceValidationIssue { readonly path: string; readonly message: string }
export interface SequenceValidationResult { readonly valid: boolean; readonly issues: readonly SequenceValidationIssue[] }

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const stableId = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function validateSequenceStep(step: unknown, references: SequenceReferences): SequenceValidationResult {
  const issues: SequenceValidationIssue[] = [];
  if (!object(step)) return { valid: false, issues: [{ path: "step", message: "must be an object" }] };

  if (step.kind === "event") {
    if (!stableId(step.eventId)) issues.push({ path: "eventId", message: "must be a non-empty string" });
    else {
      const event = references.events.find((candidate) => candidate.id === step.eventId);
      if (!event) issues.push({ path: "eventId", message: `references missing Scene Event "${step.eventId}"` });
      else if (!validateSceneEventDefinition(event).valid) issues.push({ path: "eventId", message: `references invalid Scene Event "${step.eventId}"` });
    }
  } else if (step.kind === "action") {
    if (!stableId(step.actionId)) issues.push({ path: "actionId", message: "must be a non-empty string" });
    else {
      const action = references.actions.find((candidate) => candidate.id === step.actionId);
      if (!action) issues.push({ path: "actionId", message: `references missing Action "${step.actionId}"` });
      else if (!validateReferencedAction(action)) issues.push({ path: "actionId", message: `references invalid Action "${step.actionId}"` });
    }
  } else if (step.kind === "wait") {
    if (typeof step.durationSec !== "number" || !Number.isFinite(step.durationSec) || step.durationSec < 0) {
      issues.push({ path: "durationSec", message: "must be a finite non-negative number" });
    }
  } else {
    issues.push({ path: "kind", message: "must be event, action, or wait" });
  }
  return { valid: issues.length === 0, issues };
}

function validateReferencedAction(action: SceneLogicActionDefinition): boolean {
  if (action.category === "world") return validateWorldStopScrollAction(action).valid;
  if (action.category === "state") {
    if (action.type === "set") return validateStateSetAction(action).valid;
    if (action.type === "increment") return validateStateIncrementAction(action).valid;
    return validateStateDecrementAction(action).valid;
  }
  return action.type === "restart_level"
    ? validateFlowRestartLevelAction(action).valid
    : validateFlowCompleteLevelAction(action).valid;
}

/** Empty Definitions are valid and complete on their first running update. */
export function validateSequenceDefinition(
  definition: unknown,
  references: SequenceReferences,
): SequenceValidationResult {
  const issues: SequenceValidationIssue[] = [];
  if (!object(definition)) return { valid: false, issues: [{ path: "definition", message: "must be an object" }] };
  if (!stableId(definition.id)) issues.push({ path: "id", message: "must be a non-empty string" });
  if (!Array.isArray(definition.steps)) issues.push({ path: "steps", message: "must be an ordered array" });
  else definition.steps.forEach((step, index) => {
    for (const issue of validateSequenceStep(step, references).issues) {
      issues.push({ path: `steps[${index}].${issue.path}`, message: issue.message });
    }
  });
  return { valid: issues.length === 0, issues };
}

export function validateSequenceInstanceInputs(
  instanceId: unknown,
  definition: unknown,
  references: SequenceReferences,
): SequenceValidationResult {
  const issues: SequenceValidationIssue[] = [];
  if (!stableId(instanceId)) issues.push({ path: "instanceId", message: "must be a non-empty string" });
  issues.push(...validateSequenceDefinition(definition, references).issues.map((issue) => ({
    path: `definition.${issue.path}`,
    message: issue.message,
  })));
  return { valid: issues.length === 0, issues };
}
