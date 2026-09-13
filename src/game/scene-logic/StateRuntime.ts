import type { WorldState } from "../data/WorldState";
import type { PlayerData } from "../entities/PlayerTypes";
import { isStateValue, stateValueType, type StateReferenceDefinition, type StateValue, type StateValueType } from "./State";

export interface StateReader {
  readonly valueType: StateValueType;
  readonly writable: false;
  read(): StateValue;
}

export interface StateWriter {
  readonly valueType: StateValueType;
  readonly writable: true;
  read(): StateValue;
  write(value: StateValue): void;
}

export type StateRegistryEntry = StateReader | StateWriter;

export interface StateRegistry {
  resolve(address: string): StateRegistryEntry;
  resolveWritable(address: string): StateWriter;
}

export interface ResolvedStateReference {
  readonly definition: StateReferenceDefinition;
  readonly reader: StateRegistryEntry;
}

function createRegistry(entries: ReadonlyArray<readonly [string, StateRegistryEntry]>): StateRegistry {
  const readers = new Map(entries);
  function resolve(address: string): StateRegistryEntry {
    const reader = readers.get(address);
    if (!reader) throw new Error(`State address "${address}" is not registered`);
    return reader;
  }
  return {
    resolve,
    resolveWritable(address: string): StateWriter {
      const entry = resolve(address);
      if (!entry.writable) throw new Error(`State address "${address}" is read-only`);
      return entry;
    },
  };
}

/** Creates bounded live adapters over the injected authoritative runtime owners. */
export function createSceneLogicStateRegistry(owners: {
  readonly world: WorldState;
  readonly player: PlayerData;
}): StateRegistry {
  return createRegistry([
    ["scene.scrollSpeed", {
      valueType: "number", writable: true,
      read: () => owners.world.speedX,
      write: (value) => { owners.world.speedX = value as number; },
    }],
    ["player.alive", { valueType: "boolean", writable: false, read: () => owners.player.alive }],
    ["player.shield", { valueType: "number", writable: false, read: () => owners.player.shield }],
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
