import type { WorldState } from "../data/WorldState";
import type { EventActionBinding, WorldStopScrollActionDefinition } from "./Action";
import type { SceneEventOccurrence } from "./EventRuntime";

/** Explicit integration boundary for the authoritative horizontal world-scroll owner. */
export interface WorldActionRuntimeAdapter {
  stopScroll(): void;
}

export function createWorldActionRuntimeAdapter(world: WorldState): WorldActionRuntimeAdapter {
  return {
    stopScroll(): void {
      world.speedX = 0;
    },
  };
}

/** Resolves an executable Action from a matching semantic occurrence and authored binding. */
export function materializeWorldAction(
  eventOccurrence: SceneEventOccurrence,
  binding: EventActionBinding,
  actionDefinition: WorldStopScrollActionDefinition,
): WorldStopScrollActionDefinition {
  if (eventOccurrence.eventId !== binding.eventId) {
    throw new Error(`Scene Event occurrence "${eventOccurrence.eventId}" does not match binding Event "${binding.eventId}"`);
  }
  if (actionDefinition.id !== binding.actionId) {
    throw new Error(`World Action "${actionDefinition.id}" does not match binding Action "${binding.actionId}"`);
  }
  return actionDefinition;
}

/** Executes exactly one World.stop_scroll operation through the injected owner adapter. */
export function executeWorldAction(
  action: WorldStopScrollActionDefinition,
  adapter: WorldActionRuntimeAdapter,
): void {
  adapter.stopScroll();
}
