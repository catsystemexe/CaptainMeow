import type { SceneLogicActionDefinition } from "./Action";
import type { SceneEventDefinition } from "./Event";
import {
  validateSequenceInstanceInputs,
  type SequenceDefinition,
  type SequenceReferences,
} from "./Sequence";

export type SequenceInstanceStatus = "idle" | "running" | "completed";

/** Mutable execution memory for one insertion/execution of a reusable Definition. */
export interface SequenceInstance {
  readonly id: string;
  readonly definition: SequenceDefinition;
  status: SequenceInstanceStatus;
  stepIndex: number;
  waitElapsedSec: number;
}

/**
 * Narrow ownership boundary: hosts bridge these calls to the existing Scene Event
 * dispatch and Action execution owners. Sequence owns neither a queue nor gameplay state.
 */
export interface SequenceRuntimeAdapters extends SequenceReferences {
  dispatchEvent(event: SceneEventDefinition, instance: SequenceInstance): void;
  executeAction(action: SceneLogicActionDefinition, instance: SequenceInstance): void;
}

export function createSequenceInstance(
  id: string,
  definition: SequenceDefinition,
  references: SequenceReferences,
): SequenceInstance {
  const validation = validateSequenceInstanceInputs(id, definition, references);
  if (!validation.valid) {
    const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Invalid Sequence Instance: ${detail}`);
  }
  return { id, definition, status: "idle", stepIndex: 0, waitElapsedSec: 0 };
}

export function startSequenceInstance(instance: SequenceInstance): void {
  if (instance.status === "idle") instance.status = "running";
}

/**
 * Advances a running instance using caller-supplied simulation time. Immediate steps
 * and zero waits execute in authored order. Positive waits consume dt; unused dt is
 * carried into following steps. At most Definition.steps.length steps are completed
 * per call, bounding immediate traversal even if malformed state reaches the runtime.
 */
export function updateSequenceInstance(
  instance: SequenceInstance,
  dt: number,
  adapters: SequenceRuntimeAdapters,
): void {
  if (typeof dt !== "number" || !Number.isFinite(dt) || dt < 0) {
    throw new Error("Sequence update dt must be a finite non-negative number");
  }
  if (instance.status !== "running") return;

  let remainingDt = dt;
  let completedSteps = 0;
  const traversalLimit = instance.definition.steps.length;
  while (instance.status === "running" && completedSteps < traversalLimit) {
    const step = instance.definition.steps[instance.stepIndex];
    if (!step) {
      instance.status = "completed";
      break;
    }
    if (step.kind === "event") {
      const event = adapters.events.find((candidate) => candidate.id === step.eventId);
      if (!event) throw new Error(`Sequence Event step references missing Scene Event "${step.eventId}"`);
      adapters.dispatchEvent(event, instance);
      advance(instance);
      completedSteps += 1;
      continue;
    }
    if (step.kind === "action") {
      const action = adapters.actions.find((candidate) => candidate.id === step.actionId);
      if (!action) throw new Error(`Sequence Action step references missing Action "${step.actionId}"`);
      adapters.executeAction(action, instance);
      advance(instance);
      completedSteps += 1;
      continue;
    }

    const needed = step.durationSec - instance.waitElapsedSec;
    if (needed > remainingDt) {
      instance.waitElapsedSec += remainingDt;
      break;
    }
    remainingDt -= Math.max(0, needed);
    advance(instance);
    completedSteps += 1;
  }
  if (instance.status === "running" && instance.stepIndex >= instance.definition.steps.length) {
    instance.status = "completed";
  }
}

function advance(instance: SequenceInstance): void {
  instance.stepIndex += 1;
  instance.waitElapsedSec = 0;
}
