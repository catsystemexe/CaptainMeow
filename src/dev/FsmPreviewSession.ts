import type { EntityRef } from "../engine/ecs/EntityRef";
import type { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import attackProfilesJson from "../game/content/attackProfiles.json";
import { EnemyBehaviorPresets } from "../game/enemies/EnemyBehaviorPresets";
import { getFsmDebugSnapshot, type FsmDebugSnapshot } from "../game/enemies/fsm/FsmDebugSnapshot";
import { deepFreezeFsmValue, resolveFsmPreset, type ResolvedFsmPreset } from "../game/enemies/fsm/resolve";
import type { FsmPresetSchemaV1, ValidationIssue } from "../game/enemies/fsm/schema";
import { normalizeFsmPreset } from "../game/enemies/fsm/validate";

export type FsmPreviewSource = "draft" | "persisted";
export type FsmPreviewStatus = "idle" | "running" | "ended" | "invalid" | "error";
export interface FsmPreviewTraceEntry { readonly tick: number; readonly fromStateId: string | null; readonly toStateId: string; readonly entryCount: number; readonly stateAgeAtEntry: number; }
export interface FsmPreviewSessionSnapshot { readonly source: FsmPreviewSource | null; readonly status: FsmPreviewStatus; readonly presetId: string; readonly entityRef: EntityRef | null; readonly runtime: FsmDebugSnapshot | null; readonly diagnostics: readonly ValidationIssue[]; readonly startedAtTick?: number; readonly endedReason?: string; readonly trace: readonly FsmPreviewTraceEntry[]; readonly position?: { readonly x: number; readonly y: number; readonly pendingKill: boolean; readonly removed: boolean }; }
export interface FsmPreviewSessionDeps { store: EntityStore<any>; spawnPreviewEnemy(input: { typeId: string; spawn: { x: number; y: number }; fsmPresetId?: string; behaviorPresetId?: string; resolvedFsmPresetOverride: ResolvedFsmPreset; devManualSpawnId: number }): EntityRef; getTick?: () => number; previewTypeId?: string; previewX?: number; previewY?: number; traceLimit?: number; }

const clone = <T>(v: T): T => globalThis.structuredClone ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v));
const issue = (code: string, message: string, path = "", severity: ValidationIssue["severity"] = "error"): ValidationIssue => ({ severity, code, message, path });
const attackIds = new Set(Object.keys(attackProfilesJson as Record<string, unknown>));

export function resolveEphemeralFsmPreset(draft: FsmPresetSchemaV1): { ok: true; preset: ResolvedFsmPreset; diagnostics: readonly ValidationIssue[] } | { ok: false; diagnostics: readonly ValidationIssue[] } {
  const normalized = normalizeFsmPreset(clone(draft), { knownAttackProfileIds: attackIds });
  const diagnostics = [...normalized.issues];
  if (!normalized.preset) return { ok: false, diagnostics };
  for (const [i, state] of normalized.preset.graph.states.entries()) {
    const base = state.movement.base;
    if (base.type === "movementPreset" && !Object.prototype.hasOwnProperty.call(EnemyBehaviorPresets, base.params.presetId)) diagnostics.push(issue("E_UNKNOWN_MOVEMENT_PRESET", `Unknown movement preset ${base.params.presetId}.`, `graph.states[${i}].movement.base.params.presetId`));
  }
  if (diagnostics.some((d) => d.severity === "error")) return { ok: false, diagnostics };
  const previewDefinition = clone(normalized.preset);
  previewDefinition.metadata = { ...previewDefinition.metadata, source: "user" };
  const resolved = resolveFsmPreset(previewDefinition, { knownAttackProfileIds: attackIds }) as ResolvedFsmPreset;
  return { ok: true, preset: deepFreezeFsmValue({ ...resolved, source: "preview" as any }), diagnostics };
}

export class FsmPreviewSession {
  private snapshot: FsmPreviewSessionSnapshot = Object.freeze({ source: null, status: "idle", presetId: "", entityRef: null, runtime: null, diagnostics: [], trace: [] });
  private lastSource: { source: FsmPreviewSource; presetId: string; draft?: FsmPresetSchemaV1 } | null = null;
  private trace: FsmPreviewTraceEntry[] = [];
  private lastRuntimeKey = "";
  private manualSpawnId = 900000;
  constructor(private readonly deps: FsmPreviewSessionDeps) {}
  current(): FsmPreviewSessionSnapshot { return this.refresh(); }
  startDraftPreview(draft: FsmPresetSchemaV1 | null, editable = true): FsmPreviewSessionSnapshot { if (!draft || !editable) return this.invalid("E_PREVIEW_DRAFT_UNAVAILABLE", "Draft preview is available only for editable user presets."); const r = resolveEphemeralFsmPreset(draft); if (!r.ok) return this.invalid("E_PREVIEW_DRAFT_INVALID", "Draft preview blocked by validation errors.", r.diagnostics); this.lastSource = { source: "draft", presetId: r.preset.id, draft: clone(draft) }; return this.start("draft", r.preset, r.diagnostics); }
  startPersistedPreview(presetId: string): FsmPreviewSessionSnapshot { const preset = CONTENT.fsmPresets.get(presetId); if (!preset) return this.invalid("E_PREVIEW_SAVED_UNKNOWN", `Unknown persisted FSM preset ${presetId}.`); this.lastSource = { source: "persisted", presetId }; return this.start("persisted", preset, []); }
  restart(): FsmPreviewSessionSnapshot { const src = this.lastSource; if (!src) return this.snapshot; this.stop("restarted"); return src.source === "draft" ? this.startDraftPreview(src.draft ?? null, true) : this.startPersistedPreview(src.presetId); }
  stop(reason = "stopped"): FsmPreviewSessionSnapshot { const ref = this.snapshot.entityRef; const ent = ref ? this.deps.store.get(ref) : null; const runtime = ent ? getFsmDebugSnapshot(ent) ?? this.snapshot.runtime : this.snapshot.runtime; if (ref && ent && !ent.pendingKill) this.deps.store.markKill(ref); this.snapshot = Object.freeze({ ...this.snapshot, status: "ended", runtime, endedReason: reason, position: this.position(ref), trace: Object.freeze([...this.trace]) }); return this.snapshot; }
  refresh(): FsmPreviewSessionSnapshot { const ref = this.snapshot.entityRef; if (!ref || this.snapshot.status !== "running") return this.snapshot; const ent = this.deps.store.get(ref); if (!ent || ent.pendingKill) { this.snapshot = Object.freeze({ ...this.snapshot, status: "ended", endedReason: ent?.pendingKill ? "despawned" : "removed", position: this.position(ref), trace: Object.freeze([...this.trace]) }); return this.snapshot; } const runtime = getFsmDebugSnapshot(ent); if (runtime) this.recordTrace(runtime); this.snapshot = Object.freeze({ ...this.snapshot, runtime, position: this.position(ref), trace: Object.freeze([...this.trace]) }); return this.snapshot; }
  private start(source: FsmPreviewSource, preset: ResolvedFsmPreset, diagnostics: readonly ValidationIssue[]): FsmPreviewSessionSnapshot { if (this.snapshot.status === "running") this.stop("replaced"); this.trace = []; this.lastRuntimeKey = ""; const ref = this.deps.spawnPreviewEnemy({ typeId: this.deps.previewTypeId ?? "red", spawn: { x: this.deps.previewX ?? 760, y: this.deps.previewY ?? 260 }, fsmPresetId: preset.id, resolvedFsmPresetOverride: preset, devManualSpawnId: ++this.manualSpawnId }); const runtime = getFsmDebugSnapshot(this.deps.store.get(ref)); if (runtime) this.recordTrace(runtime); this.snapshot = Object.freeze({ source, status: "running", presetId: preset.id, entityRef: ref, runtime, diagnostics: Object.freeze([...diagnostics]), startedAtTick: this.tick(), trace: Object.freeze([...this.trace]), position: this.position(ref) }); return this.snapshot; }
  private invalid(code: string, message: string, diagnostics: readonly ValidationIssue[] = []): FsmPreviewSessionSnapshot { if (this.snapshot.status === "running") this.stop("invalidated"); this.snapshot = Object.freeze({ source: this.snapshot.source, status: "invalid", presetId: this.snapshot.presetId, entityRef: null, runtime: this.snapshot.runtime, diagnostics: Object.freeze([issue(code, message), ...diagnostics]), endedReason: message, trace: Object.freeze([...this.trace]) }); return this.snapshot; }
  private recordTrace(runtime: FsmDebugSnapshot): void { const key = `${runtime.stateId}:${runtime.entryCount}`; if (key === this.lastRuntimeKey) return; const from = this.trace.length ? this.trace[this.trace.length - 1].toStateId : null; this.trace.push(Object.freeze({ tick: this.tick(), fromStateId: from, toStateId: runtime.stateId, entryCount: runtime.entryCount, stateAgeAtEntry: runtime.stateAge })); const limit = this.deps.traceLimit ?? 32; if (this.trace.length > limit) this.trace.splice(0, this.trace.length - limit); this.lastRuntimeKey = key; }
  private position(ref: EntityRef | null): FsmPreviewSessionSnapshot["position"] { if (!ref) return undefined; const ent = this.deps.store.get(ref) as any; if (!ent) return { x: 0, y: 0, pendingKill: false, removed: true }; return { x: Number(ent.pos?.x ?? 0), y: Number(ent.pos?.y ?? 0), pendingKill: ent.pendingKill === true, removed: false }; }
  private tick(): number { return Math.floor(Number(this.deps.getTick?.() ?? 0)); }
}
