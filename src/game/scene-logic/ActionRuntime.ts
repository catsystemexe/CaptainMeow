import type { WorldState } from "../data/WorldState";
import { stateValueType, type StateReferenceDefinition } from "./State";
import type { StateRegistry } from "./StateRuntime";
import type {
  EventActionBinding, FlowRestartLevelActionDefinition, SceneLogicActionDefinition,
  StateActionDefinition, WorldStopScrollActionDefinition,
} from "./Action";
import type { SceneEventOccurrence } from "./EventRuntime";

export interface WorldActionRuntimeAdapter { stopScroll(): void; }

export function createWorldActionRuntimeAdapter(world: WorldState): WorldActionRuntimeAdapter {
  return { stopScroll(): void { world.speedX = 0; } };
}

export interface FlowActionRuntimeAdapter { restartLevel(): void; }

export function createFlowActionRuntimeAdapter(owner: { readonly restartLevel: () => void }): FlowActionRuntimeAdapter {
  return { restartLevel: owner.restartLevel };
}

/** Checks the Event/Action composition boundary without executing the Action. */
export function materializeAction<T extends SceneLogicActionDefinition>(
  eventOccurrence: SceneEventOccurrence,
  binding: EventActionBinding,
  actionDefinition: T,
): T {
  if (eventOccurrence.eventId !== binding.eventId) {
    throw new Error(`Scene Event occurrence "${eventOccurrence.eventId}" does not match binding Event "${binding.eventId}"`);
  }
  if (actionDefinition.id !== binding.actionId) {
    throw new Error(`Scene Logic Action "${actionDefinition.id}" does not match binding Action "${binding.actionId}"`);
  }
  return actionDefinition;
}

export function materializeWorldAction(
  eventOccurrence: SceneEventOccurrence,
  binding: EventActionBinding,
  actionDefinition: WorldStopScrollActionDefinition,
): WorldStopScrollActionDefinition {
  return materializeAction(eventOccurrence, binding, actionDefinition);
}

export function executeWorldAction(action: WorldStopScrollActionDefinition, adapter: WorldActionRuntimeAdapter): void {
  adapter.stopScroll();
}

export function executeStateAction(
  action: StateActionDefinition,
  states: readonly StateReferenceDefinition[],
  registry: StateRegistry,
): void {
  const definition = states.find((candidate) => candidate.id === action.stateId);
  if (!definition) throw new Error(`State Action references missing State "${action.stateId}"`);
  const writer = registry.resolveWritable(definition.address);
  if (writer.valueType !== definition.valueType) {
    throw new Error(`State reference "${definition.id}" declares ${definition.valueType} but address "${definition.address}" provides ${writer.valueType}`);
  }
  if (action.type === "set") {
    if (stateValueType(action.value) !== definition.valueType) {
      throw new Error(`State Action "${action.id}" value type does not match State "${definition.id}"`);
    }
    writer.write(action.value);
    return;
  }
  if (definition.valueType !== "number") {
    throw new Error(`State Action "${action.id}" requires a number State`);
  }
  const current = writer.read();
  if (typeof current !== "number" || !Number.isFinite(current)) {
    throw new Error(`State writer for "${definition.address}" returned an invalid number value`);
  }
  const target = action.type === "increment" ? current + action.value : current - action.value;
  if (!Number.isFinite(target)) {
    throw new Error(`State Action "${action.id}" computed a non-finite number`);
  }
  writer.write(target);
}

export function executeFlowAction(action: FlowRestartLevelActionDefinition, adapter: FlowActionRuntimeAdapter): void {
  adapter.restartLevel();
}
