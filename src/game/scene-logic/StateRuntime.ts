import type { WorldState } from "../data/WorldState";
import type { PlayerData } from "../entities/PlayerTypes";
import { isStateValue, stateValueType, type StateReferenceDefinition, type StateValue, type StateValueType } from "./State";

export interface StateReader {
  readonly valueType: StateValueType;
  read(): StateValue;
}

export interface StateRegistry {
  resolve(address: string): StateReader;
}

export interface ResolvedStateReference {
  readonly definition: StateReferenceDefinition;
  readonly reader: StateReader;
}

function createRegistry(entries: ReadonlyArray<readonly [string, StateReader]>): StateRegistry {
  const readers = new Map(entries);
  return {
    resolve(address: string): StateReader {
      const reader = readers.get(address);
      if (!reader) throw new Error(`State address "${address}" is not registered`);
      return reader;
    },
  };
}

/** Creates bounded live readers over the injected authoritative runtime owners. */
export function createSceneLogicStateRegistry(owners: {
  readonly world: WorldState;
  readonly player: PlayerData;
}): StateRegistry {
  return createRegistry([
    ["scene.scrollSpeed", { valueType: "number", read: () => owners.world.speedX }],
    ["player.alive", { valueType: "boolean", read: () => owners.player.alive }],
    ["player.shield", { valueType: "number", read: () => owners.player.shield }],
  ]);
}

export function resolveStateReference(
  definition: StateReferenceDefinition,
  registry: StateRegistry,
): ResolvedStateReference {
  const reader = registry.resolve(definition.address);
  if (reader.valueType !== definition.valueType) {
    throw new Error(
      `State reference "${definition.id}" declares ${definition.valueType} but address "${definition.address}" provides ${reader.valueType}`,
    );
  }
  return { definition, reader };
}

export function readStateValue(reference: ResolvedStateReference): StateValue {
  const value = reference.reader.read();
  if (!isStateValue(value) || stateValueType(value) !== reference.definition.valueType) {
    throw new Error(`State reader for "${reference.definition.address}" returned an invalid ${reference.definition.valueType} value`);
  }
  return value;
}
