import type { SceneEventDefinition, TriggerEventBinding } from "./Event";
import type { TriggerOccurrence } from "./TriggerRuntime";

/** Runtime semantic value, materialized only after its bound Trigger occurs. */
export interface SceneEventOccurrence {
  readonly eventId: string;
  readonly type: string;
  readonly sourceTriggerId: string;
}

/**
 * Integration boundary supplied by an authoritative runtime owner. It intentionally
 * defines no queue, phase ownership, history, or Action execution.
 */
export interface SceneEventRuntimeAdapter {
  dispatch(event: SceneEventOccurrence): void;
}

/** Purely materializes semantic meaning from a matching occurrence and authored binding. */
export function materializeSceneEvent(
  triggerOccurrence: TriggerOccurrence,
  binding: TriggerEventBinding,
  eventDefinition: SceneEventDefinition,
): SceneEventOccurrence {
  if (triggerOccurrence.triggerId !== binding.triggerId) {
    throw new Error(
      `Trigger occurrence "${triggerOccurrence.triggerId}" does not match binding Trigger "${binding.triggerId}"`,
    );
  }
  if (eventDefinition.id !== binding.eventId) {
    throw new Error(`Scene Event "${eventDefinition.id}" does not match binding Event "${binding.eventId}"`);
  }

  return {
    eventId: eventDefinition.id,
    type: eventDefinition.type,
    sourceTriggerId: triggerOccurrence.triggerId,
  };
}
