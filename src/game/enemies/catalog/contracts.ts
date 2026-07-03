import type { ConditionDescriptor, MovementBaseDescriptor, MovementModifierDescriptor, TargetingDescriptor } from "./descriptors";

export interface MutableVec2 { x: number; y: number; }
export interface ReadonlyVec2 { readonly x: number; readonly y: number; }

export interface EnemyLike {
  pos?: ReadonlyVec2;
  vel?: ReadonlyVec2;
  hp?: number | { value?: number; max?: number };
  maxHp?: number;
}

export interface MovementEnterContext {
  position: ReadonlyVec2;
  spawnOrdinal?: number;
  rng01?: () => number;
}

export interface MovementUpdateContext extends MovementEnterContext {
  playerPosition?: ReadonlyVec2;
  logicHeight?: number;
}

export interface CombatContext {
  enemy: EnemyLike;
  playerPosition?: ReadonlyVec2;
}

export interface ConditionContext {
  scrollX: number;
  logicW: number;
  playerPosition?: ReadonlyVec2;
}

export interface MovementBaseModule<C, S> {
  createState(config: C, ctx: MovementEnterContext): S;
  update(state: S, config: C, dt: number, ctx: MovementUpdateContext): void;
  getTarget(state: S, config: C, ctx: MovementUpdateContext, out: MutableVec2): boolean;
  getCullAnchorX?(state: S, config: C): number;
}

export interface MovementModifierModule<C, S> {
  createState(config: C, ctx: MovementEnterContext): S;
  apply(state: S, config: C, dt: number, ctx: MovementUpdateContext, target: MutableVec2): void;
}

export interface TargetingModule<C> {
  resolveAim(config: C, ctx: CombatContext, out: MutableVec2): void;
}

export interface ConditionModule<C> {
  evaluate(config: C, ent: EnemyLike, age: number, ctx: ConditionContext): boolean;
  isGuaranteedImmediate(config: C): boolean;
}

export interface MovementBaseEntry {
  descriptor: MovementBaseDescriptor;
  module: MovementBaseModule<unknown, unknown>;
}
export interface MovementModifierEntry {
  descriptor: MovementModifierDescriptor;
  module: MovementModifierModule<unknown, unknown>;
}
export interface TargetingEntry {
  descriptor: TargetingDescriptor;
  module: TargetingModule<unknown>;
}
export interface ConditionEntry {
  descriptor: ConditionDescriptor;
  module: ConditionModule<unknown>;
}

export function defineMovementBase<C, S>(entry: { descriptor: MovementBaseDescriptor; module: MovementBaseModule<C, S> }): MovementBaseEntry {
  if (entry.descriptor.cullReference === "moduleAnchor" && typeof entry.module.getCullAnchorX !== "function") {
    throw new Error(`[catalog] ${entry.descriptor.type}: moduleAnchor requires getCullAnchorX`);
  }
  return entry as unknown as MovementBaseEntry;
}

export function defineMovementModifier<C, S>(entry: { descriptor: MovementModifierDescriptor; module: MovementModifierModule<C, S> }): MovementModifierEntry {
  return entry as unknown as MovementModifierEntry;
}

export function defineTargeting<C>(entry: { descriptor: TargetingDescriptor; module: TargetingModule<C> }): TargetingEntry {
  return entry as unknown as TargetingEntry;
}

export function defineCondition<C>(entry: { descriptor: ConditionDescriptor; module: ConditionModule<C> }): ConditionEntry {
  return entry as unknown as ConditionEntry;
}
