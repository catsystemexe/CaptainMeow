import { EnemyBehaviorDB } from "../EnemyBehaviorDB";
import behaviorPresetsRaw from "../../content/behaviorPresets.json";
import type { BehaviorPreset } from "../EnemyBehaviorTypes";
import { resolveMovementCullReferenceX } from "../EnemyCullReference";
import type { MovementBaseConfig, MovementModifierConfig } from "./schema";
import type { ResolvedFsmState } from "./resolve";

export interface MutableVec2 { x: number; y: number; }

export interface ResolvedMovementBaseRuntime {
  readonly type: "movementPreset";
  readonly presetId: string;
  readonly behaviorId: string;
  readonly params: Record<string, unknown>;
  state: Record<string, unknown>;
  readonly cullReference: "entityPosition" | "moduleAnchor";
}

export interface ResolvedMovementModifierRuntime {
  readonly type: "sineOffset" | "clampY";
  readonly params: Record<string, unknown>;
  state: Record<string, unknown>;
}

export interface FsmMovementRuntime {
  readonly base: ResolvedMovementBaseRuntime;
  readonly modifiers: readonly ResolvedMovementModifierRuntime[];
  readonly target: MutableVec2;
  movementSuspended: boolean;
}

export interface MovementExecutionContext {
  dt: number;
  playerPos?: { x: number; y: number } | null;
  logicW: number;
  logicH: number;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cloneParams(params: unknown): Record<string, unknown> {
  return params && typeof params === "object" ? { ...(params as Record<string, unknown>) } : {};
}

function makeProxyEntity(ent: any, base: ResolvedMovementBaseRuntime): any {
  return {
    ...ent,
    behaviorId: base.behaviorId,
    behavior: base.params,
    bState: base.state,
  };
}

const MOVEMENT_PRESETS: Record<string, BehaviorPreset> = Object.fromEntries(((behaviorPresetsRaw as { behaviorPresets: BehaviorPreset[] }).behaviorPresets).map((preset) => [preset.id, preset]));

function cullReferenceForBehavior(behaviorId: string): "entityPosition" | "moduleAnchor" {
  return behaviorId === "loop" || behaviorId === "sine" || behaviorId === "orbitTarget" ? "moduleAnchor" : "entityPosition";
}

function createMovementPresetBase(config: MovementBaseConfig, ent: any): ResolvedMovementBaseRuntime {
  if (config.type !== "movementPreset") throw new Error(`[fsm movement] unsupported base ${String((config as any).type)}`);
  const presetId = config.params.presetId;
  const preset = MOVEMENT_PRESETS[presetId];
  if (!preset) throw new Error(`[fsm movement] unknown movement preset ${presetId}`);
  const base: ResolvedMovementBaseRuntime = {
    type: "movementPreset",
    presetId,
    behaviorId: preset.behaviorId,
    params: cloneParams(preset.params),
    state: { t: 0 },
    cullReference: cullReferenceForBehavior(preset.behaviorId),
  };
  const behavior = EnemyBehaviorDB[preset.behaviorId];
  behavior?.init?.(makeProxyEntity(ent, base));
  return base;
}

function createModifier(config: MovementModifierConfig): ResolvedMovementModifierRuntime {
  if (config.type === "sineOffset") return { type: "sineOffset", params: cloneParams(config.params), state: { phase: 0 } };
  if (config.type === "clampY") return { type: "clampY", params: cloneParams(config.params), state: {} };
  throw new Error(`[fsm movement] unsupported modifier ${String((config as any).type)}`);
}

export function createFsmMovementRuntime(state: ResolvedFsmState, ent: any): FsmMovementRuntime {
  const modifiers = state.movement.modifiers ?? [];
  return {
    base: createMovementPresetBase(state.movement.base, ent),
    modifiers: modifiers.map(createModifier),
    target: { x: num(ent?.pos?.x, 0), y: num(ent?.pos?.y, 0) },
    movementSuspended: false,
  };
}

export function resetFsmMovementRuntime(runtime: FsmMovementRuntime, state: ResolvedFsmState, ent: any): FsmMovementRuntime {
  const next = createFsmMovementRuntime(state, ent);
  next.movementSuspended = runtime.movementSuspended;
  return next;
}

function updateBase(runtime: FsmMovementRuntime, ent: any, ctx: MovementExecutionContext): boolean {
  const behavior = EnemyBehaviorDB[runtime.base.behaviorId as keyof typeof EnemyBehaviorDB];
  const proxy = makeProxyEntity(ent, runtime.base);
  const behaviorCtx = { dt: ctx.dt, playerPos: ctx.playerPos, logicW: ctx.logicW, logicH: ctx.logicH } as any;
  behavior?.update?.(proxy, behaviorCtx);
  const target = behavior?.getTarget?.(proxy, behaviorCtx) ?? { x: num(ent?.pos?.x, 0), y: num(ent?.pos?.y, 0) };
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;
  runtime.target.x = target.x;
  runtime.target.y = target.y;
  return true;
}

function applyModifier(modifier: ResolvedMovementModifierRuntime, target: MutableVec2, ctx: MovementExecutionContext): void {
  if (modifier.type === "sineOffset") {
    const phase = num(modifier.state.phase, 0);
    const ampX = num(modifier.params.ampX, 0);
    const ampY = num(modifier.params.ampY, 0);
    const freqHz = num(modifier.params.freqHz, 0);
    const wave = Math.sin(phase);
    target.x += wave * ampX;
    target.y += wave * ampY;
    modifier.state.phase = phase + Math.PI * 2 * freqHz * ctx.dt;
    return;
  }
  const paddingPx = Math.max(0, num(modifier.params.paddingPx, 0));
  const minY = paddingPx;
  const maxY = Math.max(minY, ctx.logicH - paddingPx);
  target.y = Math.max(minY, Math.min(maxY, target.y));
}

export function executeFsmMovement(runtime: FsmMovementRuntime, ent: any, ctx: MovementExecutionContext): MutableVec2 | null {
  if (!updateBase(runtime, ent, ctx)) return null;
  for (const modifier of runtime.modifiers) applyModifier(modifier, runtime.target, ctx);
  return runtime.target;
}

export function getFsmMovementCullReferenceX(runtime: FsmMovementRuntime | undefined, ent: any): number {
  const fallback = num(ent?.pos?.x, 0);
  if (!runtime || runtime.base.cullReference === "entityPosition") return fallback;
  return resolveMovementCullReferenceX(runtime.base.behaviorId, runtime.base.state, fallback);
}

export function isFsmIndividualMovementSuppressed(ent: any, groupExists: (groupId: string | number) => boolean): boolean {
  const groupId = ent?.group?.groupId;
  return (typeof groupId === "string" || typeof groupId === "number") && groupExists(groupId);
}
