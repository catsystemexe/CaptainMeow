import { getCombatRuntimePolicy, type CombatConfig, type ConditionConfig } from "./schema";
import type { ResolvedFsmPreset, ResolvedFsmState } from "./resolve";

export type CombatRuntimePolicy = "reset" | "preserveIfSameProfile";

export interface ResolvedCombatSelection {
  mode: "disabled" | "inherit" | "profile";
  profileId: string | null;
  runtimePolicy: CombatRuntimePolicy;
}

export interface FsmRuntimeSnapshot {
  readonly preset: ResolvedFsmPreset;
  stateIndex: number;
  age: number;
  activeCombat: ResolvedCombatSelection;
  entryCount: number;
}

export interface FsmRuntimeInitHooks {
  onInit?: () => void;
  onEnter?: (result: FsmEnterResult) => void;
}

export interface FsmRuntimeUpdateContext {
  scrollX: number;
  logicW: number;
  dt: number;
  inheritedAttackProfileId?: string | null;
  onEnter?: (result: FsmEnterResult) => void;
}

export interface FsmEnterContext {
  inheritedAttackProfileId?: string | null;
  onEnter?: (result: FsmEnterResult) => void;
}

export interface FsmEnterResult {
  previousStateIndex: number | null;
  nextStateIndex: number;
  selfTransition: boolean;
  combat: ResolvedCombatSelection;
  combatRuntimeReset: boolean;
  combatRuntimeCleared: boolean;
}

export interface FsmRuntimeStepResult {
  switched: boolean;
  previous: string;
  current: string;
  state: ResolvedFsmState;
  entry?: FsmEnterResult;
}

function getHpRatio(ent: any): number {
  const hp = Number(ent?.hp?.value ?? ent?.hp ?? 1);
  const maxHp = Number(ent?.hp?.max ?? ent?.maxHp ?? (hp || 1));
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 1;
  return hp / maxHp;
}

function getX(ent: any): number {
  return Number(ent?.pos?.x ?? ent?.x ?? 0);
}

function isOffscreen(ent: any, ctx: { scrollX: number; logicW: number }, side: "left" | "right"): boolean {
  const x = getX(ent);
  if (side === "left") return x < ctx.scrollX - 96;
  return x > ctx.scrollX + ctx.logicW + 96;
}

function evalResolvedCondition(condition: ConditionConfig, ent: any, ctx: { scrollX: number; logicW: number; age: number }): boolean {
  switch (condition.type) {
    case "timeInState":
      return ctx.age >= condition.params.seconds;
    case "hpBelow":
      return getHpRatio(ent) < condition.params.ratio;
    case "screenXBelow":
      return getX(ent) - ctx.scrollX < condition.params.x;
    case "offscreen":
      return isOffscreen(ent, ctx, condition.params.side);
    default:
      return false;
  }
}

export function resolveCombatSelection(config: CombatConfig, inheritedAttackProfileId?: string | null): ResolvedCombatSelection {
  if (config.mode === "disabled") return { mode: "disabled", profileId: null, runtimePolicy: "reset" };
  if (config.mode === "inherit") {
    const profileId = typeof inheritedAttackProfileId === "string" && inheritedAttackProfileId.length ? inheritedAttackProfileId : null;
    return { mode: "inherit", profileId, runtimePolicy: "reset" };
  }
  return {
    mode: "profile",
    profileId: config.profileId.length ? config.profileId : null,
    runtimePolicy: getCombatRuntimePolicy(config),
  };
}

export function resetAttackRuntime(ent: any): void {
  if (ent?.bState && typeof ent.bState === "object") delete ent.bState.attack;
}

function shouldPreserveCombatRuntime(previous: ResolvedCombatSelection, next: ResolvedCombatSelection, selfTransition: boolean): boolean {
  return !selfTransition
    && next.mode === "profile"
    && next.runtimePolicy === "preserveIfSameProfile"
    && previous.profileId !== null
    && previous.profileId === next.profileId;
}

export function createFsmRuntimeSnapshot(preset: ResolvedFsmPreset, hooks: FsmRuntimeInitHooks = {}, ent?: any, ctx: FsmEnterContext = {}): FsmRuntimeSnapshot {
  hooks.onInit?.();
  const runtime: FsmRuntimeSnapshot = {
    preset,
    stateIndex: preset.initialStateIndex,
    age: 0,
    activeCombat: { mode: "disabled", profileId: null, runtimePolicy: "reset" },
    entryCount: 0,
  };
  enterResolvedFsmState(ent, runtime, preset.initialStateIndex, { ...ctx, onEnter: hooks.onEnter ?? ctx.onEnter });
  return runtime;
}

export function getFsmRuntimeState(runtime: FsmRuntimeSnapshot): ResolvedFsmState {
  return runtime.preset.states[runtime.stateIndex] ?? runtime.preset.states[runtime.preset.initialStateIndex];
}

export function getFsmRuntimeStateLabel(runtime: FsmRuntimeSnapshot): string {
  return getFsmRuntimeState(runtime)?.label ?? "";
}

export function getLegacyMovementPresetId(state: ResolvedFsmState): string | undefined {
  const base = state.movement.base;
  if (base.type !== "movementPreset") return undefined;
  return typeof base.params.presetId === "string" && base.params.presetId.length ? base.params.presetId : undefined;
}

export function getLegacyAttackProfileId(state: ResolvedFsmState): string | undefined {
  return state.combat.mode === "profile" && state.combat.profileId.length ? state.combat.profileId : undefined;
}

export function enterResolvedFsmState(ent: any, runtime: FsmRuntimeSnapshot, nextStateIndex: number, ctx: FsmEnterContext = {}): FsmEnterResult {
  const previousStateIndex = runtime.entryCount === 0 ? null : runtime.stateIndex;
  const selfTransition = previousStateIndex !== null && previousStateIndex === nextStateIndex;
  const nextState = runtime.preset.states[nextStateIndex] ?? runtime.preset.states[runtime.preset.initialStateIndex];
  const previousCombat = runtime.activeCombat;
  const nextCombat = resolveCombatSelection(nextState.combat, ctx.inheritedAttackProfileId);
  const preserveCombat = shouldPreserveCombatRuntime(previousCombat, nextCombat, selfTransition);

  runtime.stateIndex = runtime.preset.states[nextStateIndex] ? nextStateIndex : runtime.preset.initialStateIndex;
  runtime.age = 0;
  runtime.activeCombat = nextCombat;
  runtime.entryCount += 1;

  // S4 internal entry cleanup: movement preset application compatibility and
  // profile-scoped attack runtime never cross formal entries unless the explicit
  // same-profile preservation policy allows it.
  if (ent && typeof ent === "object") {
    delete ent.fsmAppliedMovementPresetId;
    if (!preserveCombat) resetAttackRuntime(ent);
  }

  const result: FsmEnterResult = {
    previousStateIndex,
    nextStateIndex: runtime.stateIndex,
    selfTransition,
    combat: nextCombat,
    combatRuntimeReset: !preserveCombat && nextCombat.profileId !== null,
    combatRuntimeCleared: !preserveCombat && nextCombat.profileId === null,
  };
  ctx.onEnter?.(result);
  return result;
}

export function updateResolvedFsm(ent: any, runtime: FsmRuntimeSnapshot, ctx: FsmRuntimeUpdateContext): FsmRuntimeStepResult {
  const currentState = getFsmRuntimeState(runtime);
  const previous = currentState.label;
  let entry: FsmEnterResult | undefined;

  // S4 timing: transitions observe the age already accumulated at tick start.
  // The selected target enters immediately, executes in this tick, and then the
  // executed state's age increments once. Condition comparison operators are the
  // ones encoded by ConditionConfig evaluation here, e.g. timeInState uses >=.
  for (const transition of currentState.transitions) {
    if (evalResolvedCondition(transition.condition, ent, { scrollX: ctx.scrollX, logicW: ctx.logicW, age: runtime.age })) {
      entry = enterResolvedFsmState(ent, runtime, transition.targetStateIndex, ctx);
      break;
    }
  }

  const executedState = getFsmRuntimeState(runtime);
  runtime.age += ctx.dt;
  return { switched: !!entry, previous, current: executedState.label, state: executedState, ...(entry ? { entry } : {}) };
}

export const updateResolvedFsmLegacySemantics = updateResolvedFsm;
