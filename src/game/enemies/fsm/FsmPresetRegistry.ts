import type { BehaviorGraph } from "./FsmTypes";
import { hasHardFsmMigrationErrors, migrateLegacyBehaviorGraph } from "./migrate";
import { resolveFsmPreset, type ResolvedFsmPreset } from "./resolve";
import type { FsmPresetSchemaV1, ValidationIssue } from "./schema";
import { validateFsmPreset } from "./validate";

export type BuiltinContentErrorPolicy = "throw" | "omit-invalid";
export interface MigratedBuiltinPreset { readonly legacyGraphId: string; readonly preset: FsmPresetSchemaV1; readonly issues: readonly ValidationIssue[]; }
export interface BuiltinFsmPresetSource { readonly schemaVersion: 1; readonly presets: readonly FsmPresetSchemaV1[]; }
export interface BuildBuiltinFsmRegistryDependencies { knownMovementPresetIds?: ReadonlySet<string> | readonly string[]; knownAttackProfileIds?: ReadonlySet<string> | readonly string[]; }
export interface BuildBuiltinFsmRegistryOptions { errorPolicy?: BuiltinContentErrorPolicy; logger?: Pick<Console, "warn">; }
export interface BuiltinFsmPresetRegistry { readonly size: number; get(id: string): ResolvedFsmPreset | undefined; has(id: string): boolean; list(): readonly ResolvedFsmPreset[]; }

function formatIssues(id: string, issues: readonly ValidationIssue[]): string { return `${id}: ${issues.map((i) => `${i.code}@${i.path}`).join(", ")}`; }
function presetId(preset: FsmPresetSchemaV1): string { return preset?.metadata?.id ?? "<unknown>"; }

export function migrateBuiltinFsmPresets(legacyGraphs: Readonly<Record<string, BehaviorGraph>>, deps: BuildBuiltinFsmRegistryDependencies = {}): readonly MigratedBuiltinPreset[] {
  return Object.keys(legacyGraphs).map((legacyGraphId) => ({ legacyGraphId, ...migrateLegacyBehaviorGraph(legacyGraphId, legacyGraphs[legacyGraphId], { knownMovementPresetIds: deps.knownMovementPresetIds, knownAttackProfileIds: deps.knownAttackProfileIds }) }));
}

export function buildBuiltinFsmPresetRegistryFromPresets(source: BuiltinFsmPresetSource | readonly FsmPresetSchemaV1[], deps: BuildBuiltinFsmRegistryDependencies = {}, options: BuildBuiltinFsmRegistryOptions = {}): BuiltinFsmPresetRegistry {
  const policy = options.errorPolicy ?? "throw";
  const presets: readonly FsmPresetSchemaV1[] = "presets" in (source as BuiltinFsmPresetSource) ? (source as BuiltinFsmPresetSource).presets : (source as readonly FsmPresetSchemaV1[]);
  const validated: { preset: FsmPresetSchemaV1; issues: readonly ValidationIssue[] }[] = presets.map((preset: FsmPresetSchemaV1) => ({ preset, issues: validateFsmPreset(preset, { knownAttackProfileIds: deps.knownAttackProfileIds }).issues }));
  const invalid = validated.filter((entry) => entry.issues.some((i) => i.severity === "error"));
  if (invalid.length && policy === "throw") throw new Error(`[fsm] invalid builtin FSM presets: ${invalid.map((entry) => formatIssues(presetId(entry.preset), entry.issues.filter((i) => i.severity === "error"))).join(" | ")}`);
  if (invalid.length) (options.logger ?? console).warn(`[fsm] omitted invalid builtin FSM presets: ${invalid.map((entry) => formatIssues(presetId(entry.preset), entry.issues.filter((i) => i.severity === "error"))).join(" | ")}`);
  const valid = validated.filter((entry) => !entry.issues.some((i) => i.severity === "error"));
  const entries = valid.map((entry) => resolveFsmPreset(entry.preset, { knownAttackProfileIds: deps.knownAttackProfileIds }));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const list = Object.freeze([...entries]);
  return Object.freeze({ get size() { return list.length; }, get: (id: string) => byId.get(id), has: (id: string) => byId.has(id), list: () => list });
}

export function buildBuiltinFsmPresetRegistry(legacyGraphs: Readonly<Record<string, BehaviorGraph>>, deps: BuildBuiltinFsmRegistryDependencies = {}, options: BuildBuiltinFsmRegistryOptions = {}): BuiltinFsmPresetRegistry {
  const policy = options.errorPolicy ?? "throw";
  const migrated = migrateBuiltinFsmPresets(legacyGraphs, deps);
  const invalid = migrated.filter((m) => hasHardFsmMigrationErrors(m.issues));
  if (invalid.length && policy === "throw") throw new Error(`[fsm] invalid builtin FSM presets: ${invalid.map((m) => formatIssues(m.legacyGraphId, m.issues.filter((i) => i.severity === "error"))).join(" | ")}`);
  if (invalid.length) (options.logger ?? console).warn(`[fsm] omitted invalid builtin FSM presets: ${invalid.map((m) => formatIssues(m.legacyGraphId, m.issues.filter((i) => i.severity === "error"))).join(" | ")}`);
  const entries = migrated.filter((m) => !hasHardFsmMigrationErrors(m.issues)).map((m) => resolveFsmPreset(m.preset, { knownAttackProfileIds: deps.knownAttackProfileIds }));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const list = Object.freeze([...entries]);
  return Object.freeze({ get size() { return list.length; }, get: (id: string) => byId.get(id), has: (id: string) => byId.has(id), list: () => list });
}
