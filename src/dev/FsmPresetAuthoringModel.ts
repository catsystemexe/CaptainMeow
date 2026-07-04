import { CONTENT } from "../game/content/CONTENT";
import { CONDITION_DESCRIPTORS, MOVEMENT_MODIFIER_DESCRIPTORS, TARGETING_DESCRIPTORS, type ParamSpec } from "../game/enemies/catalog/descriptors";
import { FSM_SCHEMA_VERSION, asFsmStateId, type CombatConfig, type ConditionConfig, type EnterAction, type FsmPresetSchemaV1, type FsmStateDefinition, type MovementModifierConfig, type ValidationIssue } from "../game/enemies/fsm/schema";
import type { UserFsmPresetStore } from "../game/enemies/fsm/UserFsmPresetStore";
import { validateFsmPreset } from "../game/enemies/fsm/validate";

export interface FsmPresetAuthoringDraft { originalPresetId: string; preset: FsmPresetSchemaV1; selectedStateId: string | null; dirty: boolean; diagnostics: readonly ValidationIssue[]; }
export interface FsmAuthoringResult { ok: boolean; diagnostics: readonly ValidationIssue[]; message?: string; }
export interface DeleteStatePlan { stateId: string; incomingTransitions: readonly { stateId: string; transitionIndex: number }[]; requiresConfirmation: boolean; }
export type DirtySelectionPolicy = "allow" | "confirm-discard";

const clone = <T>(v: T): T => globalThis.structuredClone ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v));
const issue = (code: string, message: string, path = "", severity: ValidationIssue["severity"] = "error"): ValidationIssue => ({ severity, code, message, path });
const isStateId = (id: string): boolean => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id);

function defaultParams(specs?: Record<string, ParamSpec>): Record<string, unknown> { const out: Record<string, unknown> = {}; for (const [k, s] of Object.entries(specs ?? {})) out[k] = s.defaultValue; return out; }
function defaultState(id: string): FsmStateDefinition { return { id: asFsmStateId(id), label: id, movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] }; }

export class FsmPresetAuthoringModel {
  draft: FsmPresetAuthoringDraft | null = null;
  readonly dirtySelectionPolicy: DirtySelectionPolicy = "confirm-discard";
  constructor(private readonly store: UserFsmPresetStore, presetId: string) { this.load(presetId); }
  get readOnly(): boolean { return !this.draft || this.store.registry().sourceOf(this.draft.originalPresetId) !== "user"; }
  get canSave(): boolean { return !!this.draft && !this.readOnly && this.draft.dirty && !this.hasErrors(); }
  hasErrors(): boolean { return (this.draft?.diagnostics ?? []).some((d) => d.severity === "error"); }
  requireDiscardConfirmation(nextPresetId: string, nextStateId?: string): boolean { void nextPresetId; void nextStateId; return this.draft?.dirty === true; }
  load(presetId: string): FsmAuthoringResult { const source = this.store.registry().sourceOf(presetId); const preset = source === "user" ? this.store.get(presetId) : CONTENT.builtinFsmPresets.get(presetId)?.definition; if (!preset) return this.fail("E_AUTHORING_UNKNOWN_PRESET", `Unknown FSM preset ${presetId}.`); this.draft = { originalPresetId: presetId, preset: clone(preset) as FsmPresetSchemaV1, selectedStateId: String(preset.graph.initialStateId), dirty: false, diagnostics: [] }; this.revalidate(false); return { ok: true, diagnostics: this.draft.diagnostics }; }
  cancel(): FsmAuthoringResult { return this.draft ? this.load(this.draft.originalPresetId) : this.fail("E_NO_DRAFT", "No authoring draft is loaded."); }
  save(): FsmAuthoringResult { if (!this.draft) return this.fail("E_NO_DRAFT", "No authoring draft is loaded."); if (this.readOnly) return this.fail("E_BUILTIN_READONLY", "Built-in FSM presets are read-only."); this.revalidate(false); if (this.hasErrors()) return { ok: false, diagnostics: this.draft.diagnostics, message: "Save blocked by validation errors." }; if (!this.draft.dirty) return { ok: true, diagnostics: this.draft.diagnostics }; const r = this.store.upsert(clone(this.draft.preset)); if (!r.ok) return this.fail("E_STORE_SAVE", r.diagnostics.map((d) => d.message).join("\n")); return this.load(this.draft.preset.metadata.id); }
  setPresetLabel(name: string): FsmAuthoringResult { return this.mutate((p) => { p.metadata.name = name; }); }
  setPresetDescription(description: string): FsmAuthoringResult { return this.mutate((p) => { p.metadata.description = description; }); }
  setInitialState(id: string): FsmAuthoringResult { return this.mutate((p) => { p.graph.initialStateId = asFsmStateId(id); }); }
  selectState(id: string | null): FsmAuthoringResult { if (!this.draft) return this.fail("E_NO_DRAFT", "No authoring draft is loaded."); if (id !== null && !this.findState(id)) return this.fail("E_UNKNOWN_STATE", `Unknown state ${id}.`); this.draft = { ...this.draft, selectedStateId: id }; return { ok: true, diagnostics: this.draft.diagnostics }; }
  addState(): FsmAuthoringResult { return this.mutate((p) => { const id = this.nextStateId("state"); p.graph.states.push(defaultState(id)); if (!p.graph.initialStateId) p.graph.initialStateId = asFsmStateId(id); this.setSelected(id); }); }
  duplicateState(id = this.draft?.selectedStateId ?? ""): FsmAuthoringResult { return this.mutate((p) => { const s = this.requireState(id); const copy = clone(s); copy.id = asFsmStateId(this.nextStateId(String(s.id))); copy.label = `${s.label} Copy`; p.graph.states.splice(p.graph.states.indexOf(s) + 1, 0, copy); this.setSelected(String(copy.id)); }); }
  renameState(oldId: string, newId: string): FsmAuthoringResult { if (!isStateId(newId)) return this.fail("E_STATE_ID_FORMAT", "State ID must start with a letter and contain letters, numbers, _ or -."); if (oldId !== newId && this.findState(newId)) return this.fail("E_STATE_ID_COLLISION", `State ${newId} already exists.`); return this.mutate((p) => { const s = this.requireState(oldId); s.id = asFsmStateId(newId); if (p.graph.initialStateId === oldId) p.graph.initialStateId = asFsmStateId(newId); for (const state of p.graph.states) for (const t of state.transitions) if (t.targetStateId === oldId) t.targetStateId = asFsmStateId(newId); if (this.draft?.selectedStateId === oldId) this.setSelected(newId); }); }
  setStateLabel(id: string, label: string): FsmAuthoringResult { return this.mutate(() => { this.requireState(id).label = label; }); }
  planDeleteState(id: string): DeleteStatePlan { const incoming: { stateId: string; transitionIndex: number }[] = []; for (const s of this.draft?.preset.graph.states ?? []) s.transitions.forEach((t, i) => { if (t.targetStateId === id) incoming.push({ stateId: String(s.id), transitionIndex: i }); }); return { stateId: id, incomingTransitions: incoming, requiresConfirmation: incoming.length > 0 }; }
  deleteState(id: string, confirmed = false): FsmAuthoringResult { const plan = this.planDeleteState(id); if (plan.requiresConfirmation && !confirmed) return this.fail("E_DELETE_STATE_CONFIRM_REQUIRED", "Deleting this state requires confirmation because transitions target it."); return this.mutate((p) => { p.graph.states = p.graph.states.filter((s) => s.id !== id); for (const s of p.graph.states) s.transitions = s.transitions.filter((t) => t.targetStateId !== id); if (p.graph.initialStateId === id) p.graph.initialStateId = asFsmStateId(String(p.graph.states[0]?.id ?? "")); this.setSelected(String(p.graph.states[0]?.id ?? "") || null); }); }
  reorderState(id: string, toIndex: number): FsmAuthoringResult { return this.mutate((p) => moveById(p.graph.states, id, toIndex)); }
  setMovementPreset(stateId: string, presetId: string): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).movement.base = { type: "movementPreset", params: { presetId } }; }); }
  addModifier(stateId: string, type: keyof typeof MOVEMENT_MODIFIER_DESCRIPTORS): FsmAuthoringResult { return this.mutate(() => { const s = this.requireState(stateId); (s.movement.modifiers ??= []).push({ type, params: defaultParams(MOVEMENT_MODIFIER_DESCRIPTORS[type].params) } as MovementModifierConfig); }); }
  removeModifier(stateId: string, index: number): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).movement.modifiers?.splice(index, 1); }); }
  reorderModifier(stateId: string, from: number, to: number): FsmAuthoringResult { return this.mutate(() => moveIndex(this.requireState(stateId).movement.modifiers ?? [], from, to)); }
  setModifierType(stateId: string, index: number, type: keyof typeof MOVEMENT_MODIFIER_DESCRIPTORS): FsmAuthoringResult { return this.mutate(() => { (this.requireState(stateId).movement.modifiers ?? [])[index] = { type, params: defaultParams(MOVEMENT_MODIFIER_DESCRIPTORS[type].params) } as MovementModifierConfig; }); }
  setModifierParam(stateId: string, index: number, key: string, value: unknown): FsmAuthoringResult { return this.mutate(() => { ((this.requireState(stateId).movement.modifiers ?? [])[index] as any).params[key] = value; }); }
  setTargeting(stateId: string, type: keyof typeof TARGETING_DESCRIPTORS): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).targeting = { type } as any; }); }
  setCombat(stateId: string, combat: CombatConfig): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).combat = clone(combat); }); }
  addDespawnAction(stateId: string): FsmAuthoringResult { return this.mutate(() => { const s = this.requireState(stateId); (s.lifecycle ??= {}).enterActions ??= []; s.lifecycle.enterActions.push({ type: "despawn" }); }); }
  removeEnterAction(stateId: string, index: number): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).lifecycle?.enterActions?.splice(index, 1); }); }
  reorderEnterAction(stateId: string, from: number, to: number): FsmAuthoringResult { return this.mutate(() => moveIndex(this.requireState(stateId).lifecycle?.enterActions ?? [], from, to)); }
  addTransition(stateId: string): FsmAuthoringResult { return this.mutate(() => { const s = this.requireState(stateId); s.transitions.push({ condition: { type: "timeInState", params: defaultParams(CONDITION_DESCRIPTORS.timeInState.params) } as ConditionConfig, targetStateId: asFsmStateId(stateId) }); }); }
  duplicateTransition(stateId: string, index: number): FsmAuthoringResult { return this.mutate(() => { const s = this.requireState(stateId); s.transitions.splice(index + 1, 0, clone(s.transitions[index])); }); }
  deleteTransition(stateId: string, index: number): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).transitions.splice(index, 1); }); }
  reorderTransition(stateId: string, from: number, to: number): FsmAuthoringResult { return this.mutate(() => moveIndex(this.requireState(stateId).transitions, from, to)); }
  setTransitionTarget(stateId: string, index: number, targetId: string): FsmAuthoringResult { return this.mutate(() => { this.requireState(stateId).transitions[index].targetStateId = asFsmStateId(targetId); }); }
  setTransitionConditionType(stateId: string, index: number, type: keyof typeof CONDITION_DESCRIPTORS): FsmAuthoringResult { return this.mutate(() => { const t = this.requireState(stateId).transitions[index]; t.condition = { type, params: defaultParams(CONDITION_DESCRIPTORS[type].params) } as ConditionConfig; }); }
  setTransitionConditionParam(stateId: string, index: number, key: string, value: unknown): FsmAuthoringResult { return this.mutate(() => { ((this.requireState(stateId).transitions[index].condition as any).params ??= {})[key] = value; }); }
  private revalidate(normalize: boolean): void { if (!this.draft) return; const r = validateFsmPreset(this.draft.preset); this.draft = { ...this.draft, diagnostics: r.issues }; void normalize; }
  private mutate(fn: (preset: FsmPresetSchemaV1) => void): FsmAuthoringResult { if (!this.draft) return this.fail("E_NO_DRAFT", "No authoring draft is loaded."); if (this.readOnly) return this.fail("E_BUILTIN_READONLY", "Built-in FSM presets are read-only."); fn(this.draft.preset); this.draft = { ...this.draft, dirty: true }; this.revalidate(false); return { ok: !this.hasErrors(), diagnostics: this.draft.diagnostics }; }
  private fail(code: string, message: string): FsmAuthoringResult { const diagnostics = [issue(code, message)]; if (this.draft) this.draft = { ...this.draft, diagnostics }; return { ok: false, diagnostics, message }; }
  private findState(id: string): FsmStateDefinition | undefined { return this.draft?.preset.graph.states.find((s) => s.id === id); }
  private requireState(id: string): FsmStateDefinition { const s = this.findState(id); if (!s) throw new Error(`Unknown state ${id}`); return s; }
  private nextStateId(base: string): string { const ids = new Set(this.draft?.preset.graph.states.map((s) => String(s.id)) ?? []); const stem = isStateId(base) ? base : "state"; if (!ids.has(stem)) return stem; for (let i = 2; ; i++) { const id = `${stem}-${i}`; if (!ids.has(id)) return id; } }
  private setSelected(id: string | null): void { if (this.draft) this.draft.selectedStateId = id; }
}
function moveIndex<T>(items: T[], from: number, to: number): void { if (from < 0 || from >= items.length) return; const [x] = items.splice(from, 1); items.splice(Math.max(0, Math.min(to, items.length)), 0, x); }
function moveById(items: FsmStateDefinition[], id: string, to: number): void { moveIndex(items, items.findIndex((x) => x.id === id), to); }
