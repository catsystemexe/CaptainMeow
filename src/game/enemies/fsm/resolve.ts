import { getConditionDescriptor, getEnterActionDescriptor, getMovementBaseDescriptor, getTargetingDescriptor, type ConditionDescriptor, type EnterActionDescriptor, type MovementBaseDescriptor, type TargetingDescriptor } from "../catalog/descriptors";
import type { CombatConfig, FsmPresetSchemaV1, FsmStateDefinition, FsmStateId, TransitionConfig } from "./schema";
import { validateFsmPreset, type ValidateFsmPresetOptions } from "./validate";

export interface ResolvedFsmTransition { readonly condition: TransitionConfig["condition"]; readonly conditionDescriptor?: ConditionDescriptor; readonly targetStateId: FsmStateId; readonly targetStateIndex: number; }
export interface ResolvedFsmState { readonly id: FsmStateId; readonly label: string; readonly movement: FsmStateDefinition["movement"]; readonly movementBaseDescriptor?: MovementBaseDescriptor; readonly targeting: FsmStateDefinition["targeting"]; readonly targetingDescriptor?: TargetingDescriptor; readonly combat: CombatConfig; readonly lifecycle: FsmStateDefinition["lifecycle"]; readonly enterActionDescriptors: readonly EnterActionDescriptor[]; readonly transitions: readonly ResolvedFsmTransition[]; }
export interface ResolvedFsmPreset { readonly id: string; readonly source: "builtin" | "user"; readonly schemaVersion: 1; readonly definition: FsmPresetSchemaV1; readonly initialStateIndex: number; readonly states: readonly ResolvedFsmState[]; getStateIndex(id: FsmStateId | string): number | undefined; getState(id: FsmStateId | string): ResolvedFsmState | undefined; }

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value as Record<string, unknown>)) freezeDeep((value as Record<string, unknown>)[key]);
    Object.freeze(value);
  }
  return value;
}
export { freezeDeep as deepFreezeFsmValue };

function resolveStateFormationFields(state: any): Record<string, unknown> {
  const legacy = state?.formationOverride && typeof state.formationOverride === "object" ? state.formationOverride : {};
  const out: Record<string, unknown> = {};
  if (state?.formationId !== undefined || legacy.shape !== undefined) out.formationId = String(state?.formationId ?? legacy.shape);
  if (state?.spacing !== undefined || legacy.spacing !== undefined) out.spacing = Number(state?.spacing ?? legacy.spacing);
  if (state?.elasticity !== undefined || legacy.elasticity !== undefined) out.elasticity = Number(state?.elasticity ?? legacy.elasticity);
  if (state?.followDelay !== undefined || legacy.followDelay !== undefined) out.followDelay = Number(state?.followDelay ?? legacy.followDelay);
  if (state?.speedMultiplier !== undefined || legacy.speedMultiplier !== undefined) out.speedMultiplier = Number(state?.speedMultiplier ?? legacy.speedMultiplier);
  return out;
}

export function resolveFsmPreset(preset: FsmPresetSchemaV1, options: ValidateFsmPresetOptions = {}): ResolvedFsmPreset {
  const errors = validateFsmPreset(preset, options).issues.filter((i) => i.severity === "error");
  if (errors.length) throw new Error(`[fsm] cannot resolve invalid preset ${preset.metadata.id}: ${errors.map((i) => `${i.code}:${i.path}`).join(", ")}`);
  const definition = freezeDeep(structuredClone(preset));
  const index = new Map<string, number>();
  definition.graph.states.forEach((s, i) => index.set(s.id, i));
  const states: ResolvedFsmState[] = definition.graph.states.map((state) => freezeDeep({
    id: state.id,
    label: state.label,
    movement: state.movement,
    movementBaseDescriptor: getMovementBaseDescriptor(state.movement.base.type),
    targeting: state.targeting,
    targetingDescriptor: getTargetingDescriptor(state.targeting.type),
    combat: state.combat,
    lifecycle: state.lifecycle,
    enterActionDescriptors: Object.freeze((state.lifecycle?.enterActions ?? []).map((a) => getEnterActionDescriptor(a.type)).filter((x): x is EnterActionDescriptor => !!x)),
    ...resolveStateFormationFields(state as any),
    transitions: state.transitions.map((t) => {
      const targetStateIndex = index.get(t.targetStateId);
      if (targetStateIndex === undefined) throw new Error(`[fsm] unresolved transition target ${String(t.targetStateId)} in ${preset.metadata.id}`);
      return freezeDeep({ condition: t.condition, conditionDescriptor: getConditionDescriptor(t.condition.type), targetStateId: t.targetStateId, targetStateIndex });
    }),
  }));
  const initialStateIndex = index.get(definition.graph.initialStateId);
  if (initialStateIndex === undefined) throw new Error(`[fsm] unresolved initial state ${String(definition.graph.initialStateId)} in ${preset.metadata.id}`);
  return freezeDeep({ id: definition.metadata.id, source: (definition.metadata.source === "user" ? "user" : "builtin") as "builtin" | "user", schemaVersion: 1 as const, definition, initialStateIndex, states: Object.freeze(states), getStateIndex: (id: FsmStateId | string) => index.get(String(id)), getState: (id: FsmStateId | string) => { const i = index.get(String(id)); return i === undefined ? undefined : states[i]; } });
}
