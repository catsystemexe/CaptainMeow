export interface FsmDebugSnapshot {
  presetId: string;
  stateId: string;
  stateLabel: string;
  stateIndex: number;
  stateAge: number;
  entryCount: number;
  combatMode: string;
  activeAttackProfileId: string | null;
  movementPresetId: string | null;
  modifierTypes: readonly string[];
  movementSuppressed: boolean;
  lastTransition?: { from: string; to: string; reason?: string; atStateAge?: number };
}

export function getFsmDebugSnapshot(entity: unknown): FsmDebugSnapshot | null {
  const runtime = (entity as { fsm?: any } | null | undefined)?.fsm;
  if (!runtime?.preset || !Array.isArray(runtime.preset.states)) return null;
  const stateIndex = Number.isInteger(runtime.stateIndex) ? runtime.stateIndex : runtime.preset.initialStateIndex;
  const resolvedState = runtime.preset.states[stateIndex] ?? runtime.preset.states[runtime.preset.initialStateIndex];
  if (!resolvedState) return null;
  const movement = runtime.movement;
  const activeCombat = runtime.activeCombat;
  return {
    presetId: String(runtime.preset.id ?? runtime.preset.definition?.metadata?.id ?? ""),
    stateId: String(resolvedState.id ?? ""),
    stateLabel: String(resolvedState.label ?? resolvedState.id ?? ""),
    stateIndex,
    stateAge: Number(runtime.age ?? 0),
    entryCount: Number(runtime.entryCount ?? 0),
    combatMode: String(activeCombat?.mode ?? resolvedState.combat?.mode ?? "disabled"),
    activeAttackProfileId: typeof activeCombat?.profileId === "string" ? activeCombat.profileId : null,
    movementPresetId: typeof movement?.base?.presetId === "string" ? movement.base.presetId : null,
    modifierTypes: Object.freeze(Array.isArray(movement?.modifiers) ? movement.modifiers.map((m: any) => String(m?.type ?? "unknown")) : []),
    movementSuppressed: movement?.movementSuspended === true,
    ...(runtime.lastTransition ? { lastTransition: { ...runtime.lastTransition } } : {}),
  };
}
