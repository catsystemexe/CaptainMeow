export type ParamSpec = NumberParamSpec | EnumParamSpec;

export interface NumberParamSpec {
  kind: "number";
  label: string;
  description?: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  optional?: boolean;
}

export interface EnumParamSpec {
  kind: "enum";
  label: string;
  description?: string;
  defaultValue: string;
  values: readonly string[];
  unit?: string;
  optional?: boolean;
}

export type DescriptorCategory = "movementBase" | "movementModifier" | "targeting" | "combat" | "condition" | "enterAction";
export type CullReference = "entityPosition" | "moduleAnchor";

export interface FsmDescriptor {
  type: string;
  label: string;
  description: string;
  category: DescriptorCategory;
  params?: Record<string, ParamSpec>;
  runtime?: Record<string, unknown>;
  compatibility?: Record<string, unknown>;
}

export interface MovementBaseDescriptor extends FsmDescriptor {
  category: "movementBase";
  cullReference: CullReference;
}

export interface MovementModifierDescriptor extends FsmDescriptor { category: "movementModifier"; }
export interface TargetingDescriptor extends FsmDescriptor { category: "targeting"; }
export interface ConditionDescriptor extends FsmDescriptor {
  category: "condition";
  hasPositiveTimeBoundary?: (config: unknown) => boolean;
  isGuaranteedImmediate?: (config: unknown) => boolean;
}
export interface EnterActionDescriptor extends FsmDescriptor { category: "enterAction"; }

export const MOVEMENT_BASE_DESCRIPTORS = {
  movementPreset: {
    type: "movementPreset",
    label: "Movement preset",
    description: "References an existing normalized movement preset ID without converting legacy movement in S1.",
    category: "movementBase",
    cullReference: "entityPosition",
    params: {},
  },
} satisfies Record<string, MovementBaseDescriptor>;

export const MOVEMENT_MODIFIER_DESCRIPTORS = {
  sineOffset: {
    type: "sineOffset",
    label: "Sine offset",
    description: "Adds an ordered sinusoidal target offset in pixels.",
    category: "movementModifier",
    params: {
      ampX: { kind: "number", label: "X amplitude", defaultValue: 0, min: -400, max: 400, step: 1, unit: "px" },
      ampY: { kind: "number", label: "Y amplitude", defaultValue: 32, min: -400, max: 400, step: 1, unit: "px" },
      freqHz: { kind: "number", label: "Frequency", defaultValue: 1, min: 0, max: 12, step: 0.05, unit: "Hz" },
    },
  },
  clampY: {
    type: "clampY",
    label: "Clamp Y",
    description: "Constrains the target Y inside the playfield with a pixel padding.",
    category: "movementModifier",
    params: {
      paddingPx: { kind: "number", label: "Padding", defaultValue: 16, min: 0, max: 240, step: 1, unit: "px" },
    },
  },
} satisfies Record<string, MovementModifierDescriptor>;

export const TARGETING_DESCRIPTORS = {
  forward: { type: "forward", label: "Forward", description: "Aim along the default -X enemy forward direction.", category: "targeting" },
  atPlayer: { type: "atPlayer", label: "At player", description: "Aim at the player; runtime later falls back to forward if unavailable.", category: "targeting" },
} satisfies Record<string, TargetingDescriptor>;

export const COMBAT_MODE_DESCRIPTORS = {
  disabled: { type: "disabled", label: "Disabled", description: "No FSM combat output.", category: "combat" },
  inherit: { type: "inherit", label: "Inherit", description: "Use the enemy definition attack profile.", category: "combat" },
  profile: { type: "profile", label: "Profile", description: "Use an explicit attack profile ID.", category: "combat" },
} satisfies Record<string, FsmDescriptor>;

export const CONDITION_DESCRIPTORS = {
  timeInState: {
    type: "timeInState", label: "Time in state", description: "True once state age in seconds reaches the threshold.", category: "condition",
    params: { seconds: { kind: "number", label: "Seconds", defaultValue: 1, min: 0, max: 120, step: 0.05, unit: "s" } },
    hasPositiveTimeBoundary: (config: unknown) => Number((config as { params?: { seconds?: unknown } })?.params?.seconds) > 0,
    isGuaranteedImmediate: (config: unknown) => Number((config as { params?: { seconds?: unknown } })?.params?.seconds) <= 0,
  },
  hpBelow: { type: "hpBelow", label: "HP below", description: "True when current HP ratio is strictly below the configured ratio.", category: "condition", params: { ratio: { kind: "number", label: "Ratio", defaultValue: 0.5, min: 0, max: 1, step: 0.01, unit: "ratio" } } },
  screenXBelow: { type: "screenXBelow", label: "Screen X below", description: "True when entity screen-space X is below a pixel threshold.", category: "condition", params: { x: { kind: "number", label: "Screen X", defaultValue: 0, min: -400, max: 1600, step: 1, unit: "screen px" } } },
  offscreen: { type: "offscreen", label: "Offscreen", description: "True when the entity is past a horizontal screen side plus margin.", category: "condition", params: { side: { kind: "enum", label: "Side", defaultValue: "left", values: ["left", "right"] }, marginPx: { kind: "number", label: "Margin", defaultValue: 96, min: 0, max: 1000, step: 1, unit: "px", optional: true } } },
  distanceToPlayer: { type: "distanceToPlayer", label: "Distance to player", description: "True when world-space Euclidean distance to player compares against a pixel threshold.", category: "condition", params: { op: { kind: "enum", label: "Operator", defaultValue: "below", values: ["below", "above"] }, px: { kind: "number", label: "Distance", defaultValue: 240, min: 0, max: 4000, step: 1, unit: "world px" } } },
} satisfies Record<string, ConditionDescriptor>;

export const ENTER_ACTION_DESCRIPTORS = {
  despawn: { type: "despawn", label: "Despawn", description: "Marks the enemy for normal cleanup on state entry.", category: "enterAction" },
} satisfies Record<string, EnterActionDescriptor>;

export function getMovementBaseDescriptor(type: string): MovementBaseDescriptor | undefined { return (MOVEMENT_BASE_DESCRIPTORS as Record<string, MovementBaseDescriptor>)[type]; }
export function getMovementModifierDescriptor(type: string): MovementModifierDescriptor | undefined { return (MOVEMENT_MODIFIER_DESCRIPTORS as Record<string, MovementModifierDescriptor>)[type]; }
export function getTargetingDescriptor(type: string): TargetingDescriptor | undefined { return (TARGETING_DESCRIPTORS as Record<string, TargetingDescriptor>)[type]; }
export function getCombatModeDescriptor(type: string): FsmDescriptor | undefined { return (COMBAT_MODE_DESCRIPTORS as Record<string, FsmDescriptor>)[type]; }
export function getConditionDescriptor(type: string): ConditionDescriptor | undefined { return (CONDITION_DESCRIPTORS as Record<string, ConditionDescriptor>)[type]; }
export function getEnterActionDescriptor(type: string): EnterActionDescriptor | undefined { return (ENTER_ACTION_DESCRIPTORS as Record<string, EnterActionDescriptor>)[type]; }
