import type { BuiltinFsmPresetRegistry } from "./FsmPresetRegistry";
import type { BehaviorGraph } from "./FsmTypes";
import { hasHardFsmMigrationErrors, migrateLegacyBehaviorGraph } from "./migrate";
import { resolveFsmPreset, type ResolvedFsmPreset } from "./resolve";
import { deepFreezeFsmValue } from "./resolve";
import { FSM_SCHEMA_VERSION, type FsmPresetSchemaV1, type ValidationIssue } from "./schema";
import { normalizeFsmPreset } from "./validate";

export const USER_FSM_PRESET_STORAGE_KEY = "captain-meow.fsm.user-presets.v1";
export const USER_FSM_PRESET_IMPORT_MAX_BYTES = 1024 * 1024;

export interface UserFsmPresetStorageV1 {
  storageVersion: 1;
  presets: FsmPresetSchemaV1[];
  updatedAt?: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type UserFsmPresetSource = "builtin" | "user";
export type ImportCollisionPolicy = "reject" | "replace-user" | "rename";
export type UserFsmPresetDiagnosticSeverity = "error" | "warning" | "normalized";

export interface UserFsmPresetDiagnostic {
  severity: UserFsmPresetDiagnosticSeverity;
  code: string;
  message: string;
  presetId?: string;
  path?: string;
  issues?: readonly ValidationIssue[];
}

export interface UserFsmPresetMutationResult {
  ok: boolean;
  diagnostics: readonly UserFsmPresetDiagnostic[];
}

export interface UserFsmPresetLoadResult extends UserFsmPresetMutationResult {
  loadedCount: number;
  rawStorage?: string;
}

export interface UserFsmPresetImportResult extends UserFsmPresetMutationResult {
  importedIds: readonly string[];
  renamed: Readonly<Record<string, string>>;
}

export interface UserFsmPresetExportResult {
  ok: boolean;
  text?: string;
  diagnostics: readonly UserFsmPresetDiagnostic[];
}

export interface CombinedFsmPresetRegistry {
  get(id: string): ResolvedFsmPreset | undefined;
  list(): readonly ResolvedFsmPreset[];
  sourceOf(id: string): UserFsmPresetSource | undefined;
}

export interface UserFsmPresetStoreOptions {
  storage?: KeyValueStorage | null;
  storageKey?: string;
  builtinRegistry: BuiltinFsmPresetRegistry;
  knownMovementPresetIds?: ReadonlySet<string> | readonly string[];
  knownAttackProfileIds?: ReadonlySet<string> | readonly string[];
  nowIso?: () => string;
}

function clonePlain<T>(value: T): T {
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function diag(severity: UserFsmPresetDiagnosticSeverity, code: string, message: string, extra: Partial<UserFsmPresetDiagnostic> = {}): UserFsmPresetDiagnostic {
  return { severity, code, message, ...extra };
}

function hasErrors(diags: readonly UserFsmPresetDiagnostic[]): boolean { return diags.some((d) => d.severity === "error"); }
function presetId(preset: unknown): string | undefined { return typeof (preset as any)?.metadata?.id === "string" ? (preset as any).metadata.id : undefined; }
function hasId(src: ReadonlySet<string> | readonly string[] | undefined, id: string): boolean { return !src ? true : "has" in src ? src.has(id) : src.includes(id); }
function sortedPresets(map: ReadonlyMap<string, FsmPresetSchemaV1>): FsmPresetSchemaV1[] { return [...map.values()].sort((a, b) => a.metadata.id.localeCompare(b.metadata.id)); }

function stableEnvelope(presets: readonly FsmPresetSchemaV1[], updatedAt?: string): UserFsmPresetStorageV1 {
  return updatedAt ? { storageVersion: 1, presets: [...presets], updatedAt } : { storageVersion: 1, presets: [...presets] };
}

function isStorageEnvelope(value: unknown): value is { storageVersion: unknown; presets: unknown } {
  return !!value && typeof value === "object" && !Array.isArray(value) && "storageVersion" in value && "presets" in value;
}

function isLegacyGraph(value: unknown): value is BehaviorGraph {
  return !!value && typeof value === "object" && !Array.isArray(value) && typeof (value as any).initial === "string" && !!(value as any).states && typeof (value as any).states === "object" && !Array.isArray((value as any).states);
}

function createBrowserLocalStorageAdapter(): KeyValueStorage | null {
  const w = globalThis.window as (Window & { localStorage?: Storage }) | undefined;
  return w?.localStorage ?? null;
}

export function getBrowserFsmUserPresetStorage(): KeyValueStorage | null {
  return createBrowserLocalStorageAdapter();
}

export class UserFsmPresetStore {
  readonly storageKey: string;
  private readonly storage: KeyValueStorage | null;
  private readonly builtinRegistry: BuiltinFsmPresetRegistry;
  private readonly knownMovementPresetIds?: ReadonlySet<string> | readonly string[];
  private readonly knownAttackProfileIds?: ReadonlySet<string> | readonly string[];
  private readonly nowIso: () => string;
  private userPresets = new Map<string, FsmPresetSchemaV1>();
  private resolvedUsers: readonly ResolvedFsmPreset[] = Object.freeze([]);
  private resolvedUserById = new Map<string, ResolvedFsmPreset>();
  private combined: CombinedFsmPresetRegistry;
  private lastDiagnostics: readonly UserFsmPresetDiagnostic[] = Object.freeze([]);

  constructor(options: UserFsmPresetStoreOptions) {
    this.storage = options.storage === undefined ? createBrowserLocalStorageAdapter() : options.storage;
    this.storageKey = options.storageKey ?? USER_FSM_PRESET_STORAGE_KEY;
    this.builtinRegistry = options.builtinRegistry;
    this.knownMovementPresetIds = options.knownMovementPresetIds;
    this.knownAttackProfileIds = options.knownAttackProfileIds;
    this.nowIso = options.nowIso ?? (() => new Date().toISOString());
    this.combined = this.rebuildCombined();
  }

  diagnostics(): readonly UserFsmPresetDiagnostic[] { return this.lastDiagnostics; }
  registry(): CombinedFsmPresetRegistry { return this.combined; }
  list(): readonly FsmPresetSchemaV1[] { return Object.freeze(sortedPresets(this.userPresets).map((p) => deepFreezeFsmValue(clonePlain(p)))); }
  get(id: string): Readonly<FsmPresetSchemaV1> | undefined { const p = this.userPresets.get(id); return p ? deepFreezeFsmValue(clonePlain(p)) : undefined; }

  inspectRawStorage(): { ok: boolean; raw: string | null; diagnostics: readonly UserFsmPresetDiagnostic[] } {
    if (!this.storage) return { ok: true, raw: null, diagnostics: [] };
    try { return { ok: true, raw: this.storage.getItem(this.storageKey), diagnostics: [] }; }
    catch (error) { return { ok: false, raw: null, diagnostics: [diag("error", "E_STORAGE_READ", `Could not read FSM user preset storage: ${String(error)}`)] }; }
  }

  load(): UserFsmPresetLoadResult {
    const rawResult = this.inspectRawStorage();
    if (!rawResult.ok) return this.remember({ ok: false, loadedCount: 0, rawStorage: rawResult.raw ?? undefined, diagnostics: rawResult.diagnostics });
    const raw = rawResult.raw;
    if (raw === null) { this.replaceMemory(new Map()); return this.remember({ ok: true, loadedCount: 0, diagnostics: [] }); }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { this.replaceMemory(new Map()); return this.remember({ ok: false, loadedCount: 0, rawStorage: raw, diagnostics: [diag("error", "E_STORAGE_JSON", "Stored FSM user presets are not valid JSON.")] }); }
    const envelope = this.parseEnvelope(parsed);
    if (!envelope.ok) { this.replaceMemory(new Map()); return this.remember({ ok: false, loadedCount: 0, rawStorage: raw, diagnostics: envelope.diagnostics }); }
    const next = new Map<string, FsmPresetSchemaV1>();
    const diagnostics: UserFsmPresetDiagnostic[] = [];
    for (const entry of envelope.presets) {
      const accepted = this.acceptPreset(entry, next, "replace-user");
      diagnostics.push(...accepted.diagnostics);
      if (accepted.ok && accepted.preset) next.set(accepted.preset.metadata.id, accepted.preset);
    }
    this.replaceMemory(next);
    return this.remember({ ok: !diagnostics.some((d) => d.severity === "error"), loadedCount: next.size, rawStorage: raw, diagnostics });
  }

  upsert(preset: FsmPresetSchemaV1): UserFsmPresetMutationResult {
    const next = new Map(this.userPresets);
    const accepted = this.acceptPreset(preset, next, "replace-user");
    if (!accepted.ok || !accepted.preset) return this.remember({ ok: false, diagnostics: accepted.diagnostics });
    next.set(accepted.preset.metadata.id, accepted.preset);
    return this.commit(next, accepted.diagnostics);
  }

  rename(oldId: string, newId: string, newLabel?: string): UserFsmPresetMutationResult {
    if (this.builtinRegistry.has(oldId)) return this.remember({ ok: false, diagnostics: [diag("error", "E_BUILTIN_READONLY", `FSM preset ID ${oldId} is built-in and cannot be renamed.`, { presetId: oldId })] });
    const existing = this.userPresets.get(oldId);
    if (!existing) return this.remember({ ok: false, diagnostics: [diag("error", "E_RENAME_UNKNOWN_ID", `FSM user preset ID ${oldId} does not exist.`, { presetId: oldId })] });
    if (newId !== oldId && (this.builtinRegistry.has(newId) || this.userPresets.has(newId))) return this.remember({ ok: false, diagnostics: [diag("error", "E_RENAME_ID_COLLISION", `FSM preset ID ${newId} already exists.`, { presetId: newId })] });
    const next = new Map(this.userPresets);
    next.delete(oldId);
    const candidate = clonePlain(existing);
    candidate.metadata = { ...candidate.metadata, id: newId, name: newLabel ?? candidate.metadata.name, source: "user", schemaVersion: FSM_SCHEMA_VERSION };
    const accepted = this.acceptPreset(candidate, next, "reject");
    if (!accepted.ok || !accepted.preset) return this.remember({ ok: false, diagnostics: accepted.diagnostics });
    next.set(accepted.preset.metadata.id, accepted.preset);
    return this.commit(next, accepted.diagnostics);
  }

  renameUserPreset(id: string, nextName: string): UserFsmPresetMutationResult {
    if (this.builtinRegistry.has(id)) return this.remember({ ok: false, diagnostics: [diag("error", "E_BUILTIN_READONLY", `FSM preset ID ${id} is built-in and cannot be renamed.`, { presetId: id })] });
    const trimmed = nextName.trim();
    if (!trimmed) return this.remember({ ok: false, diagnostics: [diag("error", "E_RENAME_EMPTY_NAME", "FSM user preset name cannot be empty.", { presetId: id })] });
    const existing = this.userPresets.get(id);
    if (!existing) return this.remember({ ok: false, diagnostics: [diag("error", "E_RENAME_UNKNOWN_ID", `FSM user preset ID ${id} does not exist.`, { presetId: id })] });
    if (existing.metadata.name === trimmed) return this.remember({ ok: true, diagnostics: [] });
    const next = new Map(this.userPresets);
    const candidate = clonePlain(existing);
    candidate.metadata = { ...candidate.metadata, name: trimmed, source: "user", schemaVersion: FSM_SCHEMA_VERSION };
    const accepted = this.acceptPreset(candidate, next, "replace-user");
    if (!accepted.ok || !accepted.preset) return this.remember({ ok: false, diagnostics: accepted.diagnostics });
    next.set(id, accepted.preset);
    return this.commit(next, accepted.diagnostics);
  }

  deleteUserPreset(id: string): UserFsmPresetMutationResult {
    if (this.builtinRegistry.has(id)) return this.remember({ ok: false, diagnostics: [diag("error", "E_BUILTIN_READONLY", `FSM preset ID ${id} is built-in and cannot be deleted.`, { presetId: id })] });
    if (!this.userPresets.has(id)) return this.remember({ ok: false, diagnostics: [diag("error", "E_DELETE_UNKNOWN_ID", `FSM user preset ID ${id} does not exist.`, { presetId: id })] });
    const next = new Map(this.userPresets);
    next.delete(id);
    return this.commit(next, []);
  }

  delete(id: string): UserFsmPresetMutationResult {
    return this.deleteUserPreset(id);
  }

  clear(): UserFsmPresetMutationResult {
    if (this.storage) {
      try { this.storage.removeItem(this.storageKey); } catch (error) { return this.remember({ ok: false, diagnostics: [diag("error", "E_STORAGE_REMOVE", `Could not clear FSM user preset storage: ${String(error)}`)] }); }
    }
    this.replaceMemory(new Map());
    return this.remember({ ok: true, diagnostics: [] });
  }

  importJson(text: string, options: { collisionPolicy?: ImportCollisionPolicy } = {}): UserFsmPresetImportResult {
    return this.applyImport(text, options.collisionPolicy ?? "reject", false);
  }

  replaceFromImport(text: string, options: { collisionPolicy?: ImportCollisionPolicy } = {}): UserFsmPresetImportResult {
    return this.applyImport(text, options.collisionPolicy ?? "reject", true);
  }

  exportJson(ids?: readonly string[]): UserFsmPresetExportResult {
    const selected = ids === undefined ? sortedPresets(this.userPresets) : ids.map((id) => this.userPresets.get(id)).filter((p): p is FsmPresetSchemaV1 => !!p).sort((a, b) => a.metadata.id.localeCompare(b.metadata.id));
    if (ids !== undefined && selected.length !== ids.length) return { ok: false, diagnostics: [diag("error", "E_EXPORT_UNKNOWN_ID", "One or more requested user preset IDs do not exist.")] };
    const payload = selected.length === 1 && ids?.length === 1 ? clonePlain(selected[0]) : stableEnvelope(selected.map((p) => clonePlain(p)));
    return { ok: true, text: JSON.stringify(payload, null, 2) + "\n", diagnostics: [] };
  }

  private applyImport(text: string, policy: ImportCollisionPolicy, replaceAll: boolean): UserFsmPresetImportResult {
    if (text.length > USER_FSM_PRESET_IMPORT_MAX_BYTES) return this.rememberImport(false, [], {}, [diag("error", "E_IMPORT_TOO_LARGE", "FSM preset import exceeds the 1 MB limit.")]);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return this.rememberImport(false, [], {}, [diag("error", "E_IMPORT_JSON", "Imported FSM preset JSON is invalid.")]); }
    const extracted = this.extractImportPresets(parsed);
    if (!extracted.ok) return this.rememberImport(false, [], {}, extracted.diagnostics);
    const next = replaceAll ? new Map<string, FsmPresetSchemaV1>() : new Map(this.userPresets);
    const importedIds: string[] = [];
    const renamed: Record<string, string> = {};
    const diagnostics: UserFsmPresetDiagnostic[] = [...extracted.diagnostics];
    for (const preset of extracted.presets) {
      const sourceId = presetId(preset) ?? "<unknown>";
      let candidate = preset;
      if (policy === "rename" && typeof candidate?.metadata?.id === "string") {
        const renamedId = this.nextAvailableUserId(candidate.metadata.id, next);
        if (renamedId !== candidate.metadata.id) {
          renamed[candidate.metadata.id] = renamedId;
          candidate = { ...clonePlain(candidate), metadata: { ...clonePlain(candidate.metadata), id: renamedId, source: "user" as const } };
          diagnostics.push(diag("warning", "W_IMPORT_RENAMED", `Renamed imported preset ${sourceId} to ${renamedId}.`, { presetId: renamedId }));
        }
      }
      const accepted = this.acceptPreset(candidate, next, policy === "replace-user" || policy === "rename" ? "replace-user" : "reject");
      diagnostics.push(...accepted.diagnostics);
      if (!accepted.ok || !accepted.preset) continue;
      next.set(accepted.preset.metadata.id, accepted.preset);
      importedIds.push(accepted.preset.metadata.id);
    }
    if (diagnostics.some((d) => d.severity === "error")) return this.rememberImport(false, importedIds, renamed, diagnostics);
    const committed = this.commit(next, diagnostics);
    return this.rememberImport(committed.ok, importedIds, renamed, committed.diagnostics);
  }

  private extractImportPresets(parsed: unknown): { ok: true; presets: FsmPresetSchemaV1[]; diagnostics: UserFsmPresetDiagnostic[] } | { ok: false; diagnostics: UserFsmPresetDiagnostic[] } {
    if (isStorageEnvelope(parsed)) {
      const envelope = this.parseEnvelope(parsed);
      return envelope.ok ? { ok: true, presets: envelope.presets, diagnostics: [] } : { ok: false, diagnostics: envelope.diagnostics };
    }
    if ((parsed as any)?.schemaVersion === FSM_SCHEMA_VERSION && (parsed as any)?.metadata) return { ok: true, presets: [parsed as FsmPresetSchemaV1], diagnostics: [] };
    if (isLegacyGraph(parsed)) {
      const migrated = migrateLegacyBehaviorGraph("imported", parsed, { presetId: "imported", displayName: "Imported legacy FSM", knownMovementPresetIds: this.knownMovementPresetIds, knownAttackProfileIds: this.knownAttackProfileIds });
      if (hasHardFsmMigrationErrors(migrated.issues)) return { ok: false, diagnostics: [diag("error", "E_IMPORT_LEGACY_MIGRATION", "Legacy FSM graph could not be migrated.", { presetId: migrated.preset.metadata.id, issues: migrated.issues })] };
      return { ok: true, presets: [migrated.preset], diagnostics: [diag("warning", "W_IMPORT_LEGACY_MIGRATED", "Legacy FSM graph was migrated to schema v1.", { presetId: migrated.preset.metadata.id, issues: migrated.issues })] };
    }
    return { ok: false, diagnostics: [diag("error", "E_IMPORT_FORMAT", "Import must be a schema-v1 preset, storage envelope, or supported legacy graph.")] };
  }

  private parseEnvelope(value: unknown): { ok: true; presets: FsmPresetSchemaV1[] } | { ok: false; diagnostics: UserFsmPresetDiagnostic[] } {
    if (!isStorageEnvelope(value)) return { ok: false, diagnostics: [diag("error", "E_STORAGE_ENVELOPE", "FSM user preset storage must be an envelope object.")] };
    if ((value as any).storageVersion !== 1) return { ok: false, diagnostics: [diag("error", "E_STORAGE_VERSION", "Unsupported FSM user preset storage version.")] };
    if (!Array.isArray((value as any).presets)) return { ok: false, diagnostics: [diag("error", "E_STORAGE_PRESETS", "FSM user preset storage presets must be an array.")] };
    return { ok: true, presets: (value as any).presets };
  }

  private acceptPreset(input: FsmPresetSchemaV1, current: ReadonlyMap<string, FsmPresetSchemaV1>, userCollisionPolicy: "reject" | "replace-user"): { ok: boolean; preset?: FsmPresetSchemaV1; diagnostics: UserFsmPresetDiagnostic[] } {
    const id = presetId(input);
    const diagnostics: UserFsmPresetDiagnostic[] = [];
    const normalized = normalizeFsmPreset(input, { knownAttackProfileIds: this.knownAttackProfileIds });
    diagnostics.push(...normalized.issues.map((issue) => diag(issue.severity, issue.code, issue.message, { presetId: id, path: issue.path, issues: [issue] })));
    if (!normalized.preset) return { ok: false, diagnostics };
    const preset = clonePlain(normalized.preset);
    preset.metadata = { ...preset.metadata, source: "user", schemaVersion: FSM_SCHEMA_VERSION };
    const presetDiagnostics = this.validateDomainPreset(preset);
    diagnostics.push(...presetDiagnostics);
    if (this.builtinRegistry.has(preset.metadata.id)) diagnostics.push(diag("error", "E_BUILTIN_ID_COLLISION", `FSM preset ID ${preset.metadata.id} is reserved by a built-in preset.`, { presetId: preset.metadata.id }));
    if (userCollisionPolicy === "reject" && current.has(preset.metadata.id)) diagnostics.push(diag("error", "E_USER_ID_COLLISION", `FSM user preset ID ${preset.metadata.id} already exists.`, { presetId: preset.metadata.id }));
    if (hasErrors(diagnostics)) return { ok: false, diagnostics };
    try { resolveFsmPreset(preset, { knownAttackProfileIds: this.knownAttackProfileIds }); } catch (error) { return { ok: false, diagnostics: [...diagnostics, diag("error", "E_RESOLVE", String(error), { presetId: preset.metadata.id })] }; }
    return { ok: true, preset: deepFreezeFsmValue(clonePlain(preset)), diagnostics };
  }

  private validateDomainPreset(preset: FsmPresetSchemaV1): UserFsmPresetDiagnostic[] {
    const diagnostics: UserFsmPresetDiagnostic[] = [];
    for (const [stateIndex, state] of preset.graph.states.entries()) {
      const base = state.movement.base;
      if (base.type === "movementPreset" && !hasId(this.knownMovementPresetIds, base.params.presetId)) diagnostics.push(diag("error", "E_UNKNOWN_MOVEMENT_PRESET", `Unknown movement preset ${base.params.presetId}.`, { presetId: preset.metadata.id, path: `graph.states[${stateIndex}].movement.base.params.presetId` }));
    }
    return diagnostics;
  }

  private nextAvailableUserId(baseId: string, current: ReadonlyMap<string, FsmPresetSchemaV1>): string {
    if (!this.builtinRegistry.has(baseId) && !current.has(baseId)) return baseId;
    for (let i = 2; ; i++) {
      const next = `${baseId}-${i}`;
      if (!this.builtinRegistry.has(next) && !current.has(next)) return next;
    }
  }

  private commit(next: Map<string, FsmPresetSchemaV1>, diagnostics: readonly UserFsmPresetDiagnostic[]): UserFsmPresetMutationResult {
    const serialized = JSON.stringify(stableEnvelope(sortedPresets(next).map((p) => clonePlain(p)), this.nowIso()), null, 2) + "\n";
    if (this.storage) {
      try { this.storage.setItem(this.storageKey, serialized); } catch (error) { return this.remember({ ok: false, diagnostics: [...diagnostics, diag("error", "E_STORAGE_WRITE", `Could not write FSM user preset storage: ${String(error)}`)] }); }
    }
    this.replaceMemory(next);
    return this.remember({ ok: !hasErrors(diagnostics), diagnostics });
  }

  private replaceMemory(next: Map<string, FsmPresetSchemaV1>): void {
    this.userPresets = new Map([...next.entries()].map(([id, preset]) => [id, deepFreezeFsmValue(clonePlain(preset))]));
    const resolved = sortedPresets(this.userPresets).map((preset) => resolveFsmPreset(preset, { knownAttackProfileIds: this.knownAttackProfileIds }));
    this.resolvedUsers = Object.freeze(resolved);
    this.resolvedUserById = new Map(resolved.map((entry) => [entry.id, entry]));
    this.combined = this.rebuildCombined();
  }

  private rebuildCombined(): CombinedFsmPresetRegistry {
    const builtin = this.builtinRegistry;
    const get = (id: string): ResolvedFsmPreset | undefined => builtin.get(id) ?? this.resolvedUserById.get(id);
    const list = Object.freeze([...builtin.list(), ...this.resolvedUsers]);
    return Object.freeze({ get, list: () => list, sourceOf: (id: string): UserFsmPresetSource | undefined => builtin.has(id) ? "builtin" : this.resolvedUserById.has(id) ? "user" : undefined });
  }

  private remember<T extends UserFsmPresetMutationResult>(result: T): T { this.lastDiagnostics = Object.freeze([...result.diagnostics]); return result; }
  private rememberImport(ok: boolean, importedIds: readonly string[], renamed: Readonly<Record<string, string>>, diagnostics: readonly UserFsmPresetDiagnostic[]): UserFsmPresetImportResult { return this.remember({ ok, importedIds: Object.freeze([...importedIds]), renamed: Object.freeze({ ...renamed }), diagnostics }); }
}

export function createUserFsmPresetStore(options: UserFsmPresetStoreOptions): UserFsmPresetStore {
  return new UserFsmPresetStore(options);
}
