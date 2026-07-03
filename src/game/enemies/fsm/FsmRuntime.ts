import type { ConditionConfig } from "./schema";
import type { ResolvedFsmPreset, ResolvedFsmState } from "./resolve";

export interface FsmRuntimeSnapshot {
  readonly preset: ResolvedFsmPreset;
  stateIndex: number;
  age: number;
}

export interface FsmRuntimeInitHooks {
  onInit?: () => void;
}

export interface FsmRuntimeUpdateContext {
  scrollX: number;
  logicW: number;
  dt: number;
}

export interface FsmRuntimeStepResult {
  switched: boolean;
  previous: string;
  current: string;
  state: ResolvedFsmState;
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

export function createFsmRuntimeSnapshot(preset: ResolvedFsmPreset, hooks: FsmRuntimeInitHooks = {}): FsmRuntimeSnapshot {
  hooks.onInit?.();
  return {
    preset,
    stateIndex: preset.initialStateIndex,
    age: 0,
  };
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

export function updateResolvedFsmLegacySemantics(ent: any, runtime: FsmRuntimeSnapshot, ctx: FsmRuntimeUpdateContext): FsmRuntimeStepResult {
  const preset = runtime.preset;
  const currentState = getFsmRuntimeState(runtime);
  const previous = currentState.label;

  // S3 deliberately preserves legacy timing: transitions are evaluated before age
  // increments, the first matching transition wins, and only one transition may
  // occur per tick. Lifecycle enter actions remain data-only until S4/S6.
  for (const transition of currentState.transitions) {
    if (evalResolvedCondition(transition.condition, ent, { scrollX: ctx.scrollX, logicW: ctx.logicW, age: runtime.age })) {
      runtime.stateIndex = transition.targetStateIndex;
      runtime.age = 0;
      const nextState = getFsmRuntimeState(runtime);
      return { switched: true, previous, current: nextState.label, state: nextState };
    }
  }

  runtime.age += ctx.dt;
  return { switched: false, previous, current: previous, state: currentState };
}
