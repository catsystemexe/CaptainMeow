import { ENEMY_DEFS } from "../game/defs/EnemyDefs";
import { ENEMY_GROUP_FORMATION_IDS, ENEMY_GROUP_PARAM_LIMITS } from "../game/enemies/EnemyGroups";
import type { FormationId } from "../game/enemies/EnemyGroups";

export type EnemyLabMode = "simple" | "smart" | "fsm";

export interface EnemyLabBasicSetup {
  appearanceId: string;
  count: number;
  formationId?: FormationId;
  spacing?: number;
  elasticity?: number;
  followDelay?: number;
  baseSpeed: number;
  spawnY: number;
}

export interface EnemyLabPresetEnvelope<TBehavior = unknown> {
  id: string;
  label: string;
  mode: EnemyLabMode;
  source: "builtin" | "user";
  basicSetup: EnemyLabBasicSetup;
  behavior: TBehavior;
}

export interface EnemyLabBasicSetupValidationIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
}

export const ENEMY_LAB_BASIC_SETUP_LIMITS = Object.freeze({
  count: { min: 1, max: 10, default: 1, step: 1 },
  spacing: { ...ENEMY_GROUP_PARAM_LIMITS.formation.spacing, default: 18, step: 2 },
  elasticity: { min: 0, max: 10, default: 0, step: 1 },
  followDelay: { min: 0, max: 0.5, default: 0, step: 0.01 },
  baseSpeed: { min: 0, max: 720, default: 115, step: 5 },
  spawnY: { min: 0, max: 504, default: 260, step: 1 },
});

const DEFAULT_APPEARANCE_BY_MODE: Record<EnemyLabMode, string> = {
  simple: "red",
  smart: "red",
  fsm: "red",
};

const DEFAULT_BEHAVIOR_SPEED_BY_MODE: Record<EnemyLabMode, number> = {
  simple: 115,
  smart: 90,
  fsm: 115,
};

function finiteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number, integer = false): number {
  const n = finiteNumber(value, fallback);
  const clamped = Math.min(max, Math.max(min, n));
  return integer ? Math.floor(clamped) : clamped;
}

export function defaultBasicSetupForMode(mode: EnemyLabMode): EnemyLabBasicSetup {
  return {
    appearanceId: DEFAULT_APPEARANCE_BY_MODE[mode],
    count: ENEMY_LAB_BASIC_SETUP_LIMITS.count.default,
    formationId: "line.horizontal",
    spacing: ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.default,
    elasticity: ENEMY_LAB_BASIC_SETUP_LIMITS.elasticity.default,
    followDelay: ENEMY_LAB_BASIC_SETUP_LIMITS.followDelay.default,
    baseSpeed: DEFAULT_BEHAVIOR_SPEED_BY_MODE[mode],
    spawnY: ENEMY_LAB_BASIC_SETUP_LIMITS.spawnY.default,
  };
}

export function normalizeBasicSetup(input: unknown, mode: EnemyLabMode): EnemyLabBasicSetup {
  const src = input && typeof input === "object" ? input as Partial<Record<keyof EnemyLabBasicSetup, unknown>> : {};
  const defaults = defaultBasicSetupForMode(mode);
  const appearanceId = typeof src.appearanceId === "string" && ENEMY_DEFS[src.appearanceId] ? src.appearanceId : defaults.appearanceId;
  const formationCandidate = typeof src.formationId === "string" ? src.formationId : defaults.formationId;
  const formationId = (ENEMY_GROUP_FORMATION_IDS as readonly string[]).includes(formationCandidate ?? "") ? formationCandidate as FormationId : defaults.formationId;
  return {
    appearanceId,
    count: clamp(src.count, ENEMY_LAB_BASIC_SETUP_LIMITS.count.min, ENEMY_LAB_BASIC_SETUP_LIMITS.count.max, defaults.count, true),
    formationId,
    spacing: clamp(src.spacing, ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.min, ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.max, defaults.spacing ?? ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.default),
    elasticity: clamp(src.elasticity, ENEMY_LAB_BASIC_SETUP_LIMITS.elasticity.min, ENEMY_LAB_BASIC_SETUP_LIMITS.elasticity.max, defaults.elasticity ?? 0, true),
    followDelay: clamp(src.followDelay, ENEMY_LAB_BASIC_SETUP_LIMITS.followDelay.min, ENEMY_LAB_BASIC_SETUP_LIMITS.followDelay.max, defaults.followDelay ?? 0),
    baseSpeed: clamp(src.baseSpeed, ENEMY_LAB_BASIC_SETUP_LIMITS.baseSpeed.min, ENEMY_LAB_BASIC_SETUP_LIMITS.baseSpeed.max, defaults.baseSpeed),
    spawnY: clamp(src.spawnY, ENEMY_LAB_BASIC_SETUP_LIMITS.spawnY.min, ENEMY_LAB_BASIC_SETUP_LIMITS.spawnY.max, defaults.spawnY),
  };
}

export function cloneBasicSetup(setup: EnemyLabBasicSetup): EnemyLabBasicSetup {
  return { ...setup };
}

export function validateBasicSetup(setup: EnemyLabBasicSetup): EnemyLabBasicSetupValidationIssue[] {
  const issues: EnemyLabBasicSetupValidationIssue[] = [];
  if (!ENEMY_DEFS[setup.appearanceId]) issues.push({ severity: "error", code: "E_APPEARANCE_UNKNOWN", path: "basicSetup.appearanceId", message: `Unknown appearance/type ${setup.appearanceId}.` });
  if (!Number.isInteger(setup.count) || setup.count < 1 || setup.count > 10) issues.push({ severity: "error", code: "E_COUNT_RANGE", path: "basicSetup.count", message: "Count must be an integer in 1..10." });
  if (setup.count > 1 && (!setup.formationId || !(ENEMY_GROUP_FORMATION_IDS as readonly string[]).includes(setup.formationId))) issues.push({ severity: "error", code: "E_FORMATION_UNKNOWN", path: "basicSetup.formationId", message: "Formation is required and must be valid when Count is above 1." });
  if (setup.spacing !== undefined && (!Number.isFinite(setup.spacing) || setup.spacing < ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.min || setup.spacing > ENEMY_LAB_BASIC_SETUP_LIMITS.spacing.max)) issues.push({ severity: "error", code: "E_SPACING_RANGE", path: "basicSetup.spacing", message: "Spacing is outside the allowed range." });
  if (setup.elasticity !== undefined && (!Number.isInteger(setup.elasticity) || setup.elasticity < 0 || setup.elasticity > 10)) issues.push({ severity: "error", code: "E_ELASTICITY_RANGE", path: "basicSetup.elasticity", message: "Elasticity must be an integer in 0..10." });
  if (setup.followDelay !== undefined && (!Number.isFinite(setup.followDelay) || setup.followDelay < ENEMY_LAB_BASIC_SETUP_LIMITS.followDelay.min || setup.followDelay > ENEMY_LAB_BASIC_SETUP_LIMITS.followDelay.max)) issues.push({ severity: "error", code: "E_FOLLOW_DELAY_RANGE", path: "basicSetup.followDelay", message: "Follow must be finite and in range." });
  if (!Number.isFinite(setup.baseSpeed) || setup.baseSpeed < ENEMY_LAB_BASIC_SETUP_LIMITS.baseSpeed.min || setup.baseSpeed > ENEMY_LAB_BASIC_SETUP_LIMITS.baseSpeed.max) issues.push({ severity: "error", code: "E_BASE_SPEED_RANGE", path: "basicSetup.baseSpeed", message: "Base Speed must be finite and in range." });
  if (!Number.isFinite(setup.spawnY) || setup.spawnY < ENEMY_LAB_BASIC_SETUP_LIMITS.spawnY.min || setup.spawnY > ENEMY_LAB_BASIC_SETUP_LIMITS.spawnY.max) issues.push({ severity: "error", code: "E_SPAWN_Y_RANGE", path: "basicSetup.spawnY", message: "Spawn Y is outside the logical screen range." });
  return issues;
}

export function withNormalizedBasicSetup<T extends { basicSetup?: unknown }>(preset: T, mode: EnemyLabMode): T & { basicSetup: EnemyLabBasicSetup } {
  return { ...preset, basicSetup: normalizeBasicSetup(preset.basicSetup, mode) };
}
