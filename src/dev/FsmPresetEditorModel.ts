import { CONTENT } from "../game/content/CONTENT";
import { FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1 } from "../game/enemies/fsm/schema";
import type { CombinedFsmPresetRegistry, ImportCollisionPolicy, UserFsmPresetDiagnostic, UserFsmPresetStore } from "../game/enemies/fsm/UserFsmPresetStore";
import { cloneBasicSetup, defaultBasicSetupForMode, normalizeBasicSetup, validateBasicSetup, type EnemyLabBasicSetup } from "./EnemyLabPresetModel";

export interface FsmPresetListItem { id: string; label: string; source: "builtin" | "user"; readOnly: boolean; stateCount: number; valid: boolean; }
export interface FsmPresetEditorDraft { originalId: string; id: string; label: string; dirty: boolean; source: "builtin" | "user"; basicSetup: EnemyLabBasicSetup; }
export interface FsmPresetDetails { source: "builtin" | "user"; schemaVersion: number; stateCount: number; initialState: string; validationStatus: "valid" | "invalid"; states: readonly string[]; }
export interface FsmPresetOperationResult { ok: boolean; selectedId: string; diagnostics: readonly UserFsmPresetDiagnostic[]; exportedText?: string; importedIds?: readonly string[]; rawStorage?: string | null; }

const clone = <T>(v: T): T => globalThis.structuredClone ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v));
const error = (code: string, message: string, presetId?: string): UserFsmPresetDiagnostic => ({ severity: "error", code, message, presetId });

export class FsmPresetEditorModel {
  selectedId = "";
  draft: FsmPresetEditorDraft | null = null;
  diagnostics: readonly UserFsmPresetDiagnostic[] = Object.freeze([]);
  rawStorage: string | null = null;

  constructor(private readonly store: UserFsmPresetStore, selectedId?: string) {
    this.selectedId = selectedId || this.list()[0]?.id || "";
    this.loadDraft();
    this.diagnostics = store.diagnostics();
  }

  registry(): CombinedFsmPresetRegistry { return this.store.registry(); }
  list(): FsmPresetListItem[] { return this.store.registry().list().map((p) => { const source = this.store.registry().sourceOf(p.id) ?? "builtin"; return { id: p.id, label: p.definition.metadata.name, source, readOnly: source === "builtin", stateCount: p.states.length, valid: true }; }); }
  details(id = this.selectedId): FsmPresetDetails | null { const p = this.store.registry().get(id); const source = this.store.registry().sourceOf(id); if (!p || !source) return null; return { source, schemaVersion: FSM_SCHEMA_VERSION, stateCount: p.states.length, initialState: String(p.definition.graph.initialStateId), validationStatus: "valid", states: p.states.map((s) => `${s.id} (${s.label})`) }; }
  select(id: string): FsmPresetOperationResult { if (!this.store.registry().get(id)) return this.fail("E_SELECT_UNKNOWN_ID", `FSM preset ID ${id} does not exist.`, id); this.selectedId = id; this.loadDraft(); return this.ok(); }
  setDraftId(id: string): void { if (!this.draft || this.draft.source === "builtin") return; this.draft = { ...this.draft, id, dirty: id !== this.draft.originalId || this.draft.label !== this.currentLabel(this.draft.originalId) }; }
  setDraftLabel(label: string): void { if (!this.draft || this.draft.source === "builtin") return; this.draft = { ...this.draft, label, dirty: this.draft.id !== this.draft.originalId || label !== this.currentLabel(this.draft.originalId) }; }
  setBasicSetup(next: Partial<EnemyLabBasicSetup>): void { if (!this.draft) return; const basicSetup = normalizeBasicSetup({ ...this.draft.basicSetup, ...next }, "fsm"); this.draft = { ...this.draft, basicSetup, dirty: true }; }
  duplicateForEdit(id = this.selectedId): FsmPresetOperationResult { return this.duplicate(id); }
  cancel(): FsmPresetOperationResult { this.loadDraft(); return this.ok(); }

  create(): FsmPresetOperationResult {
    const id = this.nextId("fsm.user.new");
    const preset: FsmPresetSchemaV1 = { schemaVersion: FSM_SCHEMA_VERSION, metadata: { id, name: "New FSM preset", source: "user", schemaVersion: FSM_SCHEMA_VERSION }, basicSetup: defaultBasicSetupForMode("fsm"), graph: { initialStateId: asFsmStateId("idle"), states: [{ id: asFsmStateId("idle"), label: "Idle", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } } }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [] }] } };
    return this.afterMutation(this.store.upsert(preset), id);
  }

  duplicate(id = this.selectedId): FsmPresetOperationResult {
    const source = this.store.registry().sourceOf(id); const resolved = this.store.registry().get(id);
    const original = source === "user" ? this.store.get(id) : CONTENT.builtinFsmPresets.get(id)?.definition;
    if (!resolved || !original) return this.fail("E_DUPLICATE_UNKNOWN_ID", `FSM preset ID ${id} does not exist.`, id);
    const copy = clone(original) as FsmPresetSchemaV1;
    copy.metadata = { ...copy.metadata, id: this.nextId(`${id}-copy`), name: `${resolved.definition.metadata.name} Copy`, source: "user", schemaVersion: FSM_SCHEMA_VERSION };
    copy.basicSetup = normalizeBasicSetup((copy as any).basicSetup, "fsm");
    return this.afterMutation(this.store.upsert(copy), copy.metadata.id);
  }

  save(): FsmPresetOperationResult {
    const d = this.draft;
    if (!d || !d.dirty) return this.ok();
    if (d.source === "builtin") return this.fail("E_BUILTIN_READONLY", "Built-in presets are read-only.", d.originalId);
    const basicIssues = validateBasicSetup(d.basicSetup);
    if (basicIssues.some((x) => x.severity === "error")) return this.fail("E_BASIC_SETUP_INVALID", basicIssues.map((x) => x.message).join("\n"), d.originalId);
    const preset = this.store.get(d.originalId);
    if (!preset) return this.fail("E_SAVE_UNKNOWN_ID", `FSM user preset ID ${d.originalId} does not exist.`, d.originalId);
    const next = clone(preset) as FsmPresetSchemaV1;
    next.metadata = { ...next.metadata, id: d.id.trim(), name: d.label.trim(), source: "user", schemaVersion: FSM_SCHEMA_VERSION };
    next.basicSetup = cloneBasicSetup(d.basicSetup);
    const renamed = d.id.trim() !== d.originalId ? this.store.delete(d.originalId) : { ok: true, diagnostics: [] };
    if (!renamed.ok) return this.afterMutation(renamed, d.originalId);
    return this.afterMutation(this.store.upsert(next), d.id.trim());
  }

  delete(id = this.selectedId, confirmed = false): FsmPresetOperationResult {
    if (!confirmed) return this.fail("E_DELETE_CONFIRM_REQUIRED", "Deleting a user preset requires confirmation.", id);
    if (this.store.registry().sourceOf(id) === "builtin") return this.fail("E_BUILTIN_READONLY", "Built-in presets cannot be deleted.", id);
    const before = this.list(); const index = before.findIndex((x) => x.id === id);
    const fallback = before[index - 1]?.id || before.find((x) => x.source === "builtin")?.id || "";
    return this.afterMutation(this.store.delete(id), fallback);
  }

  importJson(text: string, collisionPolicy: ImportCollisionPolicy): FsmPresetOperationResult { const r = this.store.importJson(text, { collisionPolicy }); return this.afterMutation(r, r.importedIds[0] || this.selectedId, { importedIds: r.importedIds }); }
  exportSelected(): FsmPresetOperationResult { if (this.store.registry().sourceOf(this.selectedId) !== "user") return this.fail("E_EXPORT_READONLY", "Only user presets can be exported from this control.", this.selectedId); return this.withExport(this.store.exportJson([this.selectedId])); }
  exportAllUsers(): FsmPresetOperationResult { return this.withExport(this.store.exportJson()); }
  clearUserPresets(confirmed = false): FsmPresetOperationResult { if (!confirmed) return this.fail("E_CLEAR_CONFIRM_REQUIRED", "Clearing user presets requires confirmation."); return this.afterMutation(this.store.clear(), this.list().find((x) => x.source === "builtin")?.id || ""); }
  inspectRawStorage(): FsmPresetOperationResult { const r = this.store.inspectRawStorage(); this.rawStorage = r.raw; this.diagnostics = r.diagnostics; return { ok: r.ok, selectedId: this.selectedId, diagnostics: r.diagnostics, rawStorage: r.raw }; }

  private currentLabel(id: string): string { return this.store.registry().get(id)?.definition.metadata.name ?? ""; }
  private loadDraft(): void { const p = this.store.registry().get(this.selectedId); const source = this.store.registry().sourceOf(this.selectedId); this.draft = p && source ? { originalId: p.id, id: p.id, label: p.definition.metadata.name, dirty: false, source, basicSetup: normalizeBasicSetup((p.definition as any).basicSetup, "fsm") } : null; }
  private nextId(base: string): string { if (!this.store.registry().get(base)) return base; for (let i = 2; ; i++) { const id = `${base}-${i}`; if (!this.store.registry().get(id)) return id; } }
  private ok(extra: Partial<FsmPresetOperationResult> = {}): FsmPresetOperationResult { this.diagnostics = []; return { ok: true, selectedId: this.selectedId, diagnostics: [], ...extra }; }
  private fail(code: string, message: string, presetId?: string): FsmPresetOperationResult { this.diagnostics = [error(code, message, presetId)]; return { ok: false, selectedId: this.selectedId, diagnostics: this.diagnostics }; }
  private afterMutation(result: { ok: boolean; diagnostics: readonly UserFsmPresetDiagnostic[] }, selectedId: string, extra: Partial<FsmPresetOperationResult> = {}): FsmPresetOperationResult { this.diagnostics = result.diagnostics; if (result.ok) { this.selectedId = selectedId || this.list()[0]?.id || ""; this.loadDraft(); } return { ok: result.ok, selectedId: this.selectedId, diagnostics: result.diagnostics, ...extra }; }
  private withExport(result: { ok: boolean; text?: string; diagnostics: readonly UserFsmPresetDiagnostic[] }): FsmPresetOperationResult { this.diagnostics = result.diagnostics; return { ok: result.ok, selectedId: this.selectedId, diagnostics: result.diagnostics, exportedText: result.text }; }
}
