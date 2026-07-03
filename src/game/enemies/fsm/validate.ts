import {
  asFsmStateId,
  FSM_SCHEMA_VERSION,
  type ConditionConfig,
  type FsmPresetSchemaV1,
  type FsmStateDefinition,
  type FsmStateId,
  type ValidationIssue,
} from "./schema";
import {
  getConditionDescriptor,
  getEnterActionDescriptor,
  getMovementBaseDescriptor,
  getMovementModifierDescriptor,
  getTargetingDescriptor,
  type ParamSpec,
} from "../catalog/descriptors";

export interface ValidateFsmPresetOptions {
  knownAttackProfileIds?: ReadonlySet<string> | readonly string[];
}

export interface ValidateFsmPresetResult { issues: ValidationIssue[]; }
export interface NormalizeFsmPresetResult { preset: FsmPresetSchemaV1 | null; issues: ValidationIssue[]; }

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj { return !!value && typeof value === "object" && !Array.isArray(value); }
function issue(severity: ValidationIssue["severity"], code: string, path: string, message: string, extra: Partial<ValidationIssue> = {}): ValidationIssue {
  return { severity, code, path, message, ...extra };
}
function hasErrors(issues: ValidationIssue[]): boolean { return issues.some((i) => i.severity === "error"); }
function profileKnown(opts: ValidateFsmPresetOptions, id: string): boolean {
  const src = opts.knownAttackProfileIds;
  if (!src) return true;
  return "has" in src ? src.has(id) : src.includes(id);
}

function validateParamSpec(value: unknown, spec: ParamSpec, path: string, issues: ValidationIssue[], normalize: boolean, setValue?: (v: unknown) => void): void {
  if (value === undefined && spec.optional) return;
  if (spec.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push(issue("error", "E_PARAM_TYPE", path, `${path} must be a finite number.`));
      return;
    }
    const min = spec.min;
    const max = spec.max;
    let next = value;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    if (next !== value) {
      if (normalize && setValue) {
        setValue(next);
        issues.push(issue("normalized", "N_PARAM_CLAMPED", path, `${path} was clamped to descriptor range.`, { originalValue: value, normalizedValue: next }));
      } else {
        issues.push(issue("error", "E_PARAM_RANGE", path, `${path} is outside descriptor range.`));
      }
    }
    return;
  }
  if (typeof value !== "string" || !spec.values.includes(value)) {
    issues.push(issue("error", "E_PARAM_ENUM", path, `${path} must be one of: ${spec.values.join(", ")}.`));
  }
}

function validateParams(params: unknown, specs: Record<string, ParamSpec> | undefined, path: string, issues: ValidationIssue[], normalize: boolean): void {
  if (!specs) return;
  if (!isObj(params)) {
    issues.push(issue("error", "E_PARAMS_SHAPE", path, `${path} must be an object.`));
    return;
  }
  for (const [key, spec] of Object.entries(specs)) {
    validateParamSpec(params[key], spec, `${path}.${key}`, issues, normalize, (v) => { params[key] = v; });
  }
}

function validateCondition(cond: unknown, path: string, issues: ValidationIssue[], normalize: boolean): cond is ConditionConfig {
  if (!isObj(cond) || typeof cond.type !== "string") {
    issues.push(issue("error", "E_CONDITION_SHAPE", path, `${path} must be a condition object.`));
    return false;
  }
  const descriptor = getConditionDescriptor(cond.type);
  if (!descriptor) {
    issues.push(issue("error", "E_UNKNOWN_CONDITION", `${path}.type`, `Unknown condition type ${String(cond.type)}.`));
    return false;
  }
  validateParams(cond.params, descriptor.params, `${path}.params`, issues, normalize);
  return true;
}

function validateState(state: unknown, path: string, issues: ValidationIssue[], opts: ValidateFsmPresetOptions, normalize: boolean): state is FsmStateDefinition {
  if (!isObj(state)) { issues.push(issue("error", "E_STATE_SHAPE", path, `${path} must be an object.`)); return false; }
  if (typeof state.id !== "string" || state.id.length === 0) issues.push(issue("error", "E_STATE_ID", `${path}.id`, "State id must be a non-empty string."));
  if (typeof state.label !== "string" || state.label.length === 0) issues.push(issue("error", "E_STATE_LABEL", `${path}.label`, "State label must be a non-empty string."));
  if (!isObj(state.movement)) {
    issues.push(issue("error", "E_MOVEMENT_SHAPE", `${path}.movement`, "State movement must be an object."));
  } else {
    const base = state.movement.base;
    if (!isObj(base) || typeof base.type !== "string") issues.push(issue("error", "E_MOVEMENT_BASE_SHAPE", `${path}.movement.base`, "Movement base must be an object with type."));
    else {
      const desc = getMovementBaseDescriptor(base.type);
      if (!desc) issues.push(issue("error", "E_UNKNOWN_MOVEMENT_BASE", `${path}.movement.base.type`, `Unknown movement base ${base.type}.`));
      else validateParams(base.params, desc.params, `${path}.movement.base.params`, issues, normalize);
      if (base.type === "movementPreset" && (!isObj(base.params) || typeof base.params.presetId !== "string" || base.params.presetId.length === 0)) {
        issues.push(issue("error", "E_MOVEMENT_PRESET_ID", `${path}.movement.base.params.presetId`, "movementPreset requires a non-empty presetId."));
      }
    }
    const modifiers = state.movement.modifiers;
    if (modifiers !== undefined) {
      if (!Array.isArray(modifiers)) issues.push(issue("error", "E_MODIFIERS_SHAPE", `${path}.movement.modifiers`, "Modifiers must be an array."));
      else {
        if (modifiers.length > 3) issues.push(issue("error", "E_TOO_MANY_MODIFIERS", `${path}.movement.modifiers`, "Movement supports at most 3 ordered modifiers."));
        modifiers.forEach((mod, i) => {
          const modPath = `${path}.movement.modifiers[${i}]`;
          if (!isObj(mod) || typeof mod.type !== "string") { issues.push(issue("error", "E_MODIFIER_SHAPE", modPath, "Modifier must be an object with type.")); return; }
          const desc = getMovementModifierDescriptor(mod.type);
          if (!desc) issues.push(issue("error", "E_UNKNOWN_MOVEMENT_MODIFIER", `${modPath}.type`, `Unknown movement modifier ${mod.type}.`));
          else validateParams(mod.params, desc.params, `${modPath}.params`, issues, normalize);
        });
      }
    }
  }
  if (!isObj(state.targeting) || typeof state.targeting.type !== "string" || !getTargetingDescriptor(state.targeting.type)) issues.push(issue("error", "E_UNKNOWN_TARGETING", `${path}.targeting.type`, "Targeting type must be forward or atPlayer."));
  if (!isObj(state.combat) || typeof state.combat.mode !== "string") issues.push(issue("error", "E_COMBAT_SHAPE", `${path}.combat`, "Combat must be an object with mode."));
  else if (state.combat.mode === "profile") {
    if (typeof state.combat.profileId !== "string" || state.combat.profileId.length === 0) issues.push(issue("error", "E_ATTACK_PROFILE_ID", `${path}.combat.profileId`, "Profile combat requires profileId."));
    else if (!profileKnown(opts, state.combat.profileId)) issues.push(issue("error", "E_UNKNOWN_ATTACK_PROFILE", `${path}.combat.profileId`, `Unknown attack profile ${state.combat.profileId}.`));
    if (state.combat.runtimePolicy !== undefined && state.combat.runtimePolicy !== "reset" && state.combat.runtimePolicy !== "preserveIfSameProfile") issues.push(issue("error", "E_COMBAT_POLICY", `${path}.combat.runtimePolicy`, "Invalid combat runtimePolicy."));
  } else if (state.combat.mode !== "disabled" && state.combat.mode !== "inherit") issues.push(issue("error", "E_COMBAT_MODE", `${path}.combat.mode`, "Unknown combat mode."));
  if (state.lifecycle !== undefined) {
    if (!isObj(state.lifecycle)) issues.push(issue("error", "E_LIFECYCLE_SHAPE", `${path}.lifecycle`, "Lifecycle must be an object."));
    else if (state.lifecycle.enterActions !== undefined) {
      if (!Array.isArray(state.lifecycle.enterActions)) issues.push(issue("error", "E_ENTER_ACTIONS_SHAPE", `${path}.lifecycle.enterActions`, "enterActions must be an array."));
      else {
        const enterActions = state.lifecycle.enterActions;
        enterActions.forEach((action, i) => {
          if (!isObj(action) || typeof action.type !== "string" || !getEnterActionDescriptor(action.type)) issues.push(issue("error", "E_UNKNOWN_ENTER_ACTION", `${path}.lifecycle.enterActions[${i}].type`, "Unknown enter action."));
          if (isObj(action) && action.type === "despawn" && enterActions.slice(0, i).some((previous: unknown) => isObj(previous) && previous.type === "despawn")) {
            issues.push(issue("warning", "W_DUPLICATE_DESPAWN_ACTION", `${path}.lifecycle.enterActions[${i}]`, "Duplicate despawn enter action is idempotent but redundant."));
          }
        });
      }
    }
  }
  if (!Array.isArray(state.transitions)) issues.push(issue("error", "E_TRANSITIONS_SHAPE", `${path}.transitions`, "Transitions must be an array."));
  else state.transitions.forEach((transition, i) => {
    const tPath = `${path}.transitions[${i}]`;
    if (!isObj(transition)) { issues.push(issue("error", "E_TRANSITION_SHAPE", tPath, "Transition must be an object.")); return; }
    validateCondition(transition.condition, `${tPath}.condition`, issues, normalize);
    if (typeof transition.targetStateId !== "string" || transition.targetStateId.length === 0) issues.push(issue("error", "E_TRANSITION_TARGET", `${tPath}.targetStateId`, "Transition target must be a non-empty state ID."));
  });
  return true;
}

function stateHasEnterActions(state: FsmStateDefinition): boolean {
  return (state.lifecycle?.enterActions ?? []).length > 0;
}

function collectCycleNodes(edges: Map<string, string[]>): Set<string> {
  const cycleNodes = new Set<string>();
  const stack: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dfs = (id: string): void => {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      for (const node of stack.slice(Math.max(0, start))) cycleNodes.add(node);
      cycleNodes.add(id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of edges.get(id) ?? []) dfs(next);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) dfs(id);
  return cycleNodes;
}

function classifyCycles(states: FsmStateDefinition[], issues: ValidationIssue[]): void {
  const ids = new Set(states.map((s) => s.id));
  const immediate = new Map<string, string[]>();
  const timeless = new Map<string, string[]>();
  for (const s of states) {
    immediate.set(s.id, []); timeless.set(s.id, []);
    for (const t of s.transitions) {
      if (!ids.has(t.targetStateId)) continue;
      const desc = getConditionDescriptor(t.condition.type);
      const positive = desc?.hasPositiveTimeBoundary?.(t.condition) === true;
      const imm = desc?.isGuaranteedImmediate?.(t.condition) === true;
      if (imm) immediate.get(s.id)?.push(t.targetStateId);
      if (!positive) timeless.get(s.id)?.push(t.targetStateId);
    }
  }
  const immediateCycleNodes = collectCycleNodes(immediate);
  if (immediateCycleNodes.size > 0) {
    issues.push(issue("error", "E_IMMEDIATE_CYCLE", "graph", "FSM contains a cycle composed only of guaranteed-immediate transitions."));
    if (states.some((state) => immediateCycleNodes.has(state.id) && stateHasEnterActions(state))) {
      issues.push(issue("error", "E_IMMEDIATE_ACTION_CYCLE", "graph", "Immediate transition cycles must not contain side-effecting entry actions."));
    }
  }
  if (hasCycle(timeless) && !issues.some((i) => i.code === "E_IMMEDIATE_CYCLE")) issues.push(issue("warning", "W_TIMELESS_CYCLE", "graph", "FSM contains a cycle with no positive time boundary."));
}

function hasCycle(edges: Map<string, string[]>): boolean {
  const visiting = new Set<string>(); const visited = new Set<string>();
  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) if (dfs(next)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  for (const id of edges.keys()) if (dfs(id)) return true;
  return false;
}

function validatePresetObject(input: unknown, issues: ValidationIssue[], opts: ValidateFsmPresetOptions, normalize: boolean): FsmPresetSchemaV1 | null {
  if (!isObj(input)) { issues.push(issue("error", "E_PRESET_SHAPE", "", "Preset must be an object.")); return null; }
  if (input.schemaVersion !== FSM_SCHEMA_VERSION) issues.push(issue("error", "E_SCHEMA_VERSION", "schemaVersion", "FSM preset schemaVersion must be 1."));
  if (!isObj(input.metadata)) issues.push(issue("error", "E_METADATA_SHAPE", "metadata", "Metadata must be an object."));
  else {
    if (typeof input.metadata.id !== "string" || input.metadata.id.length === 0) issues.push(issue("error", "E_PRESET_ID", "metadata.id", "Preset id is required."));
    if (typeof input.metadata.name !== "string" || input.metadata.name.length === 0) issues.push(issue("error", "E_PRESET_NAME", "metadata.name", "Preset name is required."));
    if (input.metadata.schemaVersion !== FSM_SCHEMA_VERSION) issues.push(issue("error", "E_METADATA_SCHEMA_VERSION", "metadata.schemaVersion", "Metadata schemaVersion must be 1."));
  }
  if (!isObj(input.graph)) { issues.push(issue("error", "E_GRAPH_SHAPE", "graph", "Graph must be an object.")); return null; }
  if (typeof input.graph.initialStateId !== "string" || input.graph.initialStateId.length === 0) issues.push(issue("error", "E_INITIAL_STATE_ID", "graph.initialStateId", "Initial state id is required."));
  if (!Array.isArray(input.graph.states) || input.graph.states.length === 0) { issues.push(issue("error", "E_STATES_SHAPE", "graph.states", "Graph states must be a non-empty array.")); return null; }
  const validStates: FsmStateDefinition[] = [];
  input.graph.states.forEach((s, i) => { if (validateState(s, `graph.states[${i}]`, issues, opts, normalize)) validStates.push(s); });
  const seen = new Set<string>();
  for (const s of validStates) {
    if (seen.has(s.id)) issues.push(issue("error", "E_DUPLICATE_STATE_ID", `graph.states.${s.id}`, `Duplicate state id ${s.id}.`, { location: { stateId: asFsmStateId(s.id) } }));
    seen.add(s.id);
  }
  if (typeof input.graph.initialStateId === "string" && !seen.has(input.graph.initialStateId)) issues.push(issue("error", "E_MISSING_INITIAL_STATE", "graph.initialStateId", "Initial state must reference an existing state."));
  for (const state of validStates) {
    state.transitions.forEach((t, i) => {
      if (!seen.has(t.targetStateId)) issues.push(issue("error", "E_DANGLING_TRANSITION", `graph.states.${state.id}.transitions[${i}].targetStateId`, `Transition targets missing state ${t.targetStateId}.`, { location: { stateId: state.id, transitionIndex: i, field: "targetStateId" } }));
    });
    if ((state.lifecycle?.enterActions ?? []).some((a) => a.type === "despawn") && state.transitions.length > 0) issues.push(issue("warning", "W_TERMINAL_STATE_TRANSITIONS", `graph.states.${state.id}.transitions`, "Despawn entry states should not have outgoing transitions.", { location: { stateId: state.id } }));
  }
  if (!hasErrors(issues)) classifyCycles(validStates, issues);
  return input as unknown as FsmPresetSchemaV1;
}

export function validateFsmPreset(input: unknown, options: ValidateFsmPresetOptions = {}): ValidateFsmPresetResult {
  const issues: ValidationIssue[] = [];
  validatePresetObject(input, issues, options, false);
  return { issues };
}

export function normalizeFsmPreset(input: unknown, options: ValidateFsmPresetOptions = {}): NormalizeFsmPresetResult {
  const cloned = globalThis.structuredClone ? globalThis.structuredClone(input) : JSON.parse(JSON.stringify(input));
  const issues: ValidationIssue[] = [];
  const preset = validatePresetObject(cloned, issues, options, true);
  return { preset: hasErrors(issues) ? null : preset, issues };
}
