export const FSM_SCHEMA_VERSION = 1 as const;

export type FsmStateId = string & { readonly __brand: "FsmStateId" };

export function asFsmStateId(value: string): FsmStateId {
  return value as FsmStateId;
}

export type FsmPresetSource = "builtin" | "user" | "draft" | "imported";

export interface FsmPresetMetadata {
  id: string;
  name: string;
  description?: string;
  source: FsmPresetSource;
  schemaVersion: typeof FSM_SCHEMA_VERSION;
  author?: string;
}

export interface FsmPresetSchemaV1 {
  schemaVersion: typeof FSM_SCHEMA_VERSION;
  metadata: FsmPresetMetadata;
  graph: FsmGraphDefinition;
}

export interface FsmGraphDefinition {
  initialStateId: FsmStateId;
  states: FsmStateDefinition[];
}

export interface FsmStateDefinition {
  id: FsmStateId;
  label: string;
  movement: MovementConfig;
  targeting: TargetingConfig;
  combat: CombatConfig;
  lifecycle?: LifecycleConfig;
  transitions: TransitionConfig[];
}

export interface MovementConfig {
  base: MovementBaseConfig;
  modifiers?: MovementModifierConfig[];
}

export type MovementBaseConfig =
  | { type: "movementPreset"; params: { presetId: string } };

export type MovementModifierConfig =
  | { type: "sineOffset"; params: { ampX: number; ampY: number; freqHz: number } }
  | { type: "clampY"; params: { paddingPx: number } };

export type TargetingConfig =
  | { type: "forward" }
  | { type: "atPlayer" };

export type CombatConfig =
  | { mode: "disabled" }
  | { mode: "inherit" }
  | { mode: "profile"; profileId: string; runtimePolicy?: "reset" | "preserveIfSameProfile" };

export function getCombatRuntimePolicy(config: CombatConfig): "reset" | "preserveIfSameProfile" {
  return config.mode === "profile" ? config.runtimePolicy ?? "reset" : "reset";
}

export interface LifecycleConfig {
  enterActions?: EnterAction[];
}

export type EnterAction =
  | { type: "despawn" };

export interface TransitionConfig {
  condition: ConditionConfig;
  targetStateId: FsmStateId;
}

export type ConditionConfig =
  | { type: "timeInState"; params: { seconds: number } }
  | { type: "hpBelow"; params: { ratio: number } }
  | { type: "screenXBelow"; params: { x: number } }
  | { type: "offscreen"; params: { side: "left" | "right"; marginPx?: number } }
  | { type: "distanceToPlayer"; params: { op: "below" | "above"; px: number } };

export interface ValidationIssue {
  severity: "error" | "warning" | "normalized";
  code: string;
  path: string;
  message: string;
  location?: {
    stateId?: FsmStateId;
    transitionIndex?: number;
    field?: string;
  };
  originalValue?: unknown;
  normalizedValue?: unknown;
}
