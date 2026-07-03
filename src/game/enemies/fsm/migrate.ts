import type { BehaviorGraph, BehaviorState, Trigger } from "./FsmTypes";
import { asFsmStateId, FSM_SCHEMA_VERSION, type ConditionConfig, type FsmPresetSchemaV1, type FsmStateId, type TransitionConfig, type ValidationIssue } from "./schema";
import { validateFsmPreset, type ValidateFsmPresetOptions } from "./validate";

export interface MigrateLegacyGraphOptions extends ValidateFsmPresetOptions { presetId?: string; displayName?: string; knownMovementPresetIds?: ReadonlySet<string> | readonly string[]; }
export interface MigrateLegacyGraphResult { preset: FsmPresetSchemaV1; issues: ValidationIssue[]; }

type Obj = Record<string, unknown>;
const STATE_KEYS = new Set(["movementPresetId", "attackProfileId", "transitions"]);
const TRANSITION_KEYS = new Set(["when", "goto"]);

function issue(severity: ValidationIssue["severity"], code: string, path: string, message: string, extra: Partial<ValidationIssue> = {}): ValidationIssue {
  return { severity, code, path, message, ...extra };
}
function isObj(value: unknown): value is Obj { return !!value && typeof value === "object" && !Array.isArray(value); }
function hasId(src: ReadonlySet<string> | readonly string[] | undefined, id: string): boolean { return !src || ("has" in src ? src.has(id) : src.includes(id)); }

export function makeStableFsmStateIds(stateNames: readonly string[]): Map<string, FsmStateId> {
  const used = new Map<string, number>();
  const out = new Map<string, FsmStateId>();
  for (const name of stateNames) {
    const base = slugStateName(name);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    out.set(name, asFsmStateId(count === 0 ? base : `${base}_${count + 1}`));
  }
  return out;
}

export function slugStateName(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "state";
}

function conditionFromTrigger(trigger: Trigger, path: string, issues: ValidationIssue[]): ConditionConfig {
  switch (trigger.kind) {
    case "timeInState": return { type: "timeInState", params: { seconds: trigger.seconds } };
    case "hpBelow": return { type: "hpBelow", params: { ratio: trigger.ratio } };
    case "xLessThan": return { type: "screenXBelow", params: { x: trigger.x } };
    case "offscreen": return { type: "offscreen", params: { side: trigger.side, marginPx: 96 } };
    default:
      issues.push(issue("error", "E_MIGRATE_UNSUPPORTED_TRIGGER", `${path}.kind`, `Unsupported legacy trigger kind ${String((trigger as any)?.kind)}.`));
      return { type: "timeInState", params: { seconds: 0 } };
  }
}

function checkUnsupportedStateFields(state: BehaviorState, path: string, issues: ValidationIssue[]): void {
  if (!isObj(state)) { issues.push(issue("error", "E_MIGRATE_STATE_SHAPE", path, "Legacy state must be an object.")); return; }
  for (const key of Object.keys(state)) if (!STATE_KEYS.has(key)) issues.push(issue("error", "E_MIGRATE_UNSUPPORTED_STATE_FIELD", `${path}.${key}`, `Unsupported legacy state field ${key}.`));
}
function checkUnsupportedTransitionFields(transition: unknown, path: string, issues: ValidationIssue[]): transition is { when: Trigger; goto: string } {
  if (!isObj(transition)) { issues.push(issue("error", "E_MIGRATE_TRANSITION_SHAPE", path, "Legacy transition must be an object.")); return false; }
  for (const key of Object.keys(transition)) if (!TRANSITION_KEYS.has(key)) issues.push(issue("error", "E_MIGRATE_UNSUPPORTED_TRANSITION_FIELD", `${path}.${key}`, `Unsupported legacy transition field ${key}.`));
  if (!isObj(transition.when) || typeof transition.when.kind !== "string") issues.push(issue("error", "E_MIGRATE_TRIGGER_SHAPE", `${path}.when`, "Legacy transition requires a trigger."));
  if (typeof transition.goto !== "string" || transition.goto.length === 0) issues.push(issue("error", "E_MIGRATE_TRANSITION_TARGET", `${path}.goto`, "Legacy transition goto must be a non-empty string."));
  return true;
}

export function migrateLegacyBehaviorGraph(legacyGraphId: string, legacyGraph: BehaviorGraph, options: MigrateLegacyGraphOptions = {}): MigrateLegacyGraphResult {
  const issues: ValidationIssue[] = [];
  const presetId = options.presetId ?? legacyGraphId;
  const stateEntries = Object.entries(legacyGraph.states ?? {});
  const stateIds = makeStableFsmStateIds(stateEntries.map(([name]) => name));
  const initialStateId = stateIds.get(legacyGraph.initial) ?? asFsmStateId(legacyGraph.initial ?? "");
  if (!stateIds.has(legacyGraph.initial)) issues.push(issue("error", "E_MIGRATE_MISSING_INITIAL", "initial", `Legacy initial state ${String(legacyGraph.initial)} is missing.`));

  const states = stateEntries.map(([legacyStateName, state], stateIndex) => {
    const statePath = `states.${legacyStateName}`;
    checkUnsupportedStateFields(state, statePath, issues);
    let movementPresetId = state.movementPresetId;
    if (typeof movementPresetId !== "string" || movementPresetId.length === 0) {
      if (hasId(options.knownMovementPresetIds, "none.hold")) {
        movementPresetId = "none.hold";
        issues.push(issue("warning", "W_MIGRATE_MISSING_MOVEMENT_HOLD", `${statePath}.movementPresetId`, "Legacy state has no movementPresetId; mapped to canonical none.hold preset."));
      } else {
        issues.push(issue("error", "E_MIGRATE_MISSING_MOVEMENT", `${statePath}.movementPresetId`, "Legacy state has no movementPresetId and canonical none.hold is unavailable."));
      }
    } else if (!hasId(options.knownMovementPresetIds, movementPresetId)) {
      issues.push(issue("error", "E_MIGRATE_UNKNOWN_MOVEMENT_PRESET", `${statePath}.movementPresetId`, `Unknown movement preset ${movementPresetId}.`));
    }
    const transitions: TransitionConfig[] = (Array.isArray(state.transitions) ? state.transitions : []).map((transition, transitionIndex) => {
      const transitionPath = `${statePath}.transitions[${transitionIndex}]`;
      if (!checkUnsupportedTransitionFields(transition, transitionPath, issues)) return { condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("") };
      const targetStateId = stateIds.get(transition.goto);
      if (!targetStateId) issues.push(issue("error", "E_MIGRATE_UNKNOWN_TRANSITION_TARGET", `${transitionPath}.goto`, `Transition targets missing legacy state ${transition.goto}.`));
      return { condition: conditionFromTrigger(transition.when, `${transitionPath}.when`, issues), targetStateId: targetStateId ?? asFsmStateId(transition.goto) };
    });
    const lifecycle = legacyStateName === "despawn" && transitions.length === 0 ? { enterActions: [{ type: "despawn" as const }] } : undefined;
    if (lifecycle) issues.push(issue("warning", "W_MIGRATE_DESPAWN_CONVENTION", statePath, "Legacy despawn terminal naming convention made explicit."));
    return {
      id: stateIds.get(legacyStateName) ?? asFsmStateId(`state_${stateIndex + 1}`),
      label: legacyStateName,
      movement: { base: { type: "movementPreset" as const, params: { presetId: typeof movementPresetId === "string" ? movementPresetId : "" } } },
      targeting: { type: "forward" as const },
      combat: typeof state.attackProfileId === "string" && state.attackProfileId.length > 0 ? { mode: "profile" as const, profileId: state.attackProfileId, runtimePolicy: "reset" as const } : { mode: "inherit" as const },
      ...(lifecycle ? { lifecycle } : {}),
      transitions,
    };
  });
  const preset: FsmPresetSchemaV1 = { schemaVersion: FSM_SCHEMA_VERSION, metadata: { id: presetId, name: options.displayName ?? legacyGraphId, source: "builtin", schemaVersion: FSM_SCHEMA_VERSION }, graph: { initialStateId, states } };
  issues.push(...validateFsmPreset(preset, options).issues);
  return { preset, issues };
}

export function hasHardFsmMigrationErrors(issues: readonly ValidationIssue[]): boolean { return issues.some((i) => i.severity === "error"); }
