import type { BackgroundSceneEvent, BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { validateBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Validation";
import { snapTimelineValue } from "./PixelBgrTimeline";

export const V2_EVENT_SNAP_WORLD_X = 16;
export type V2SceneEventCreate = { type?: "signal"; name?: string } | { type: "level-end" };
export type V2SceneEventPatch = { worldX?: number; enabled?: boolean; name?: string; locked?: boolean };
export type V2SceneEventEditResult =
  | { ok: true; scene: BackgroundSceneV2; eventId: string }
  | { ok: false; scene: BackgroundSceneV2; code: "event-not-found" | "locked" | "invalid-value" | "duplicate-level-end"; error: string };

const fail = (scene: BackgroundSceneV2, code: V2SceneEventEditResult extends infer R ? R extends { ok: false; code: infer C } ? C : never : never, error: string): V2SceneEventEditResult => ({ ok: false, scene, code, error });
const validated = (scene: BackgroundSceneV2, next: BackgroundSceneV2, eventId: string): V2SceneEventEditResult => {
  const result = validateBackgroundSceneV2(next);
  return result.valid
    ? { ok: true, scene: next, eventId }
    : fail(scene, "invalid-value", result.errors.map(({ path, message }) => `${path}: ${message}`).join("; "));
};
const uniqueId = (scene: BackgroundSceneV2, stem: string): string => {
  const ids = new Set((scene.events ?? []).map(event => event.id));
  if (!ids.has(stem)) return stem;
  let suffix = 2;
  while (ids.has(`${stem}-${suffix}`)) suffix += 1;
  return `${stem}-${suffix}`;
};
const valid = (event: BackgroundSceneEvent): string | null => {
  if (!event.id.trim()) return "Event id is required.";
  if (!Number.isFinite(event.worldX) || event.worldX < 0) return "Event worldX must be finite and non-negative.";
  if (event.type === "signal" && !event.name.trim()) return "Signal name is required.";
  return null;
};

export function createV2SceneEvent(scene: BackgroundSceneV2, playerWorldX: number, options: V2SceneEventCreate = {}): V2SceneEventEditResult {
  const type = options.type ?? "signal";
  if (type === "level-end" && (scene.events ?? []).some(event => event.type === "level-end")) return fail(scene, "duplicate-level-end", "Scene already has a level-end event.");
  const worldX = snapTimelineValue(playerWorldX, V2_EVENT_SNAP_WORLD_X);
  const id = uniqueId(scene, type === "level-end" ? "level-end" : "event");
  const event: BackgroundSceneEvent = type === "level-end" ? { id, type, worldX, enabled: true } : { id, type, worldX, enabled: true, name: ("name" in options ? options.name : undefined)?.trim() || "event" };
  const error = valid(event); if (error) return fail(scene, "invalid-value", error);
  return validated(scene, { ...scene, events: [...(scene.events ?? []), event] }, id);
}

export function updateV2SceneEvent(scene: BackgroundSceneV2, eventId: string, patch: V2SceneEventPatch): V2SceneEventEditResult {
  const source = (scene.events ?? []).find(event => event.id === eventId);
  if (!source) return fail(scene, "event-not-found", `Event '${eventId}' was not found.`);
  if (source.locked && Object.keys(patch).some(key => key !== "locked" && key !== "enabled")) return fail(scene, "locked", `Event '${eventId}' is locked.`);
  const normalizedPatch = Object.prototype.hasOwnProperty.call(patch, "name")
    ? { ...patch, name: patch.name?.trim() || (source.type === "signal" ? source.id : undefined) }
    : patch;
  const event = { ...source, ...normalizedPatch } as BackgroundSceneEvent;
  if (event.type === "level-end" && (scene.events ?? []).some(item => item.id !== eventId && item.type === "level-end")) return fail(scene, "duplicate-level-end", "Scene already has a level-end event.");
  const error = valid(event); if (error) return fail(scene, "invalid-value", error);
  return validated(scene, { ...scene, events: (scene.events ?? []).map(item => item.id === eventId ? event : item) }, eventId);
}

export function deleteV2SceneEvent(scene: BackgroundSceneV2, eventId: string): V2SceneEventEditResult {
  const source = (scene.events ?? []).find(event => event.id === eventId);
  if (!source) return fail(scene, "event-not-found", `Event '${eventId}' was not found.`);
  if (source.locked) return fail(scene, "locked", `Event '${eventId}' is locked.`);
  return validated(scene, { ...scene, events: (scene.events ?? []).filter(event => event.id !== eventId) }, "");
}

export function duplicateV2SceneEvent(scene: BackgroundSceneV2, eventId: string): V2SceneEventEditResult {
  const source = (scene.events ?? []).find(event => event.id === eventId);
  if (!source) return fail(scene, "event-not-found", `Event '${eventId}' was not found.`);
  if (source.locked) return fail(scene, "locked", `Event '${eventId}' is locked.`);
  if (source.type === "level-end") return fail(scene, "duplicate-level-end", "Scene already has a level-end event.");
  const { locked: _locked, ...copy } = source;
  const event: BackgroundSceneEvent = { ...copy, id: uniqueId(scene, source.id), worldX: source.worldX + V2_EVENT_SNAP_WORLD_X };
  return validated(scene, { ...scene, events: [...(scene.events ?? []), event] }, event.id);
}

/** Deterministic presentation order; the returned ordinal is never scene data. */
export function orderedV2SceneEvents(scene: BackgroundSceneV2): BackgroundSceneEvent[] {
  return [...(scene.events ?? [])].sort((a, b) => a.worldX - b.worldX || a.id.localeCompare(b.id));
}

export function getV2LevelEndWorldX(scene: BackgroundSceneV2): number | null {
  return scene.events?.find(event => event.type === "level-end" && event.enabled)?.worldX ?? null;
}
