import { validateSceneLogicDocumentV1, type SceneLogicDocumentV1 } from "../game/scene-logic/SceneLogicDocument";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { validateBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Validation";
import { ensureSceneLogicDocument } from "./SceneLogicSpaceEditing";

export type LegacySignalMigrationResult =
  | { ok: true; scene: BackgroundSceneV2; sourceEventId: string; markerId: string; triggerId: string; eventId: string }
  | { ok: false; scene: BackgroundSceneV2; code: "event-not-found" | "not-signal" | "locked" | "invalid-scene"; error: string };

export type LegacyLevelEndMigrationResult =
  | { ok: true; scene: BackgroundSceneV2; sourceEventId: string; markerId: string; triggerId: string; eventId: string; actionId: string }
  | { ok: false; scene: BackgroundSceneV2; code: "event-not-found" | "not-level-end" | "locked" | "invalid-scene" | "existing-completion-chain"; error: string };

function firstFree(stem: string, used: ReadonlySet<string>): string {
  if (!used.has(stem)) return stem;
  let suffix = 2;
  while (used.has(`${stem}-${suffix}`)) suffix += 1;
  return `${stem}-${suffix}`;
}

const invalid = (scene: BackgroundSceneV2, error: string): LegacySignalMigrationResult =>
  ({ ok: false, scene, code: "invalid-scene", error });

/** Pure, atomic authoring migration for one selected unlocked legacy signal. */
export function migrateLegacySignalToSceneLogic(scene: BackgroundSceneV2, sourceEventId: string): LegacySignalMigrationResult {
  const source = scene.events?.find(event => event.id === sourceEventId);
  if (!source) return { ok: false, scene, code: "event-not-found", error: `Event '${sourceEventId}' was not found.` };
  if (source.type !== "signal") return { ok: false, scene, code: "not-signal", error: `Event '${sourceEventId}' is not a signal.` };
  if (source.locked === true) return { ok: false, scene, code: "locked", error: `Event '${sourceEventId}' is locked.` };

  const logic = ensureSceneLogicDocument(scene);
  const spaceIds = new Set([...logic.spaces.markers, ...logic.spaces.ranges, ...logic.spaces.zones].map(item => item.id));
  const markerId = firstFree(`${source.id}:marker`, spaceIds);
  const triggerId = firstFree(`${source.id}:trigger`, new Set(logic.triggers.map(item => item.id)));
  const eventId = firstFree(`${source.id}:event`, new Set(logic.events.map(item => item.id)));
  const candidateLogic: SceneLogicDocumentV1 = {
    ...logic,
    spaces: { ...logic.spaces, markers: [...logic.spaces.markers, { id: markerId, position: source.worldX }] },
    triggers: [...logic.triggers, { id: triggerId, kind: "space", relation: "cross", markerId, mode: "once", enabled: source.enabled }],
    events: [...logic.events, { id: eventId, category: "scene", type: source.name }],
    triggerEventBindings: [...logic.triggerEventBindings, { triggerId, eventId }],
  };
  const logicValidation = validateSceneLogicDocumentV1(candidateLogic);
  if (!logicValidation.valid) return invalid(scene, logicValidation.errors.map(item => `${item.path}: ${item.message}`).join("; "));

  const candidate: BackgroundSceneV2 = {
    ...scene,
    events: scene.events?.filter(event => event.id !== sourceEventId),
    sceneLogic: candidateLogic,
  };
  const sceneValidation = validateBackgroundSceneV2(candidate);
  if (!sceneValidation.valid) return invalid(scene, sceneValidation.errors.map(item => `${item.path}: ${item.message}`).join("; "));
  return { ok: true, scene: candidate, sourceEventId, markerId, triggerId, eventId };
}

/** Pure, atomic authoring migration for one selected unlocked legacy level-end. */
export function migrateLegacyLevelEndToSceneLogic(scene: BackgroundSceneV2, sourceEventId: string): LegacyLevelEndMigrationResult {
  const source = scene.events?.find(event => event.id === sourceEventId);
  if (!source) return { ok: false, scene, code: "event-not-found", error: `Event '${sourceEventId}' was not found.` };
  if (source.type !== "level-end") return { ok: false, scene, code: "not-level-end", error: `Event '${sourceEventId}' is not a level-end.` };
  if (source.locked === true) return { ok: false, scene, code: "locked", error: `Event '${sourceEventId}' is locked.` };

  const logic = ensureSceneLogicDocument(scene);
  const hasCompletionChain = logic.events.some(event => event.category === "scene" && event.type === "level_complete" &&
    logic.eventActionBindings.some(binding => binding.eventId === event.id &&
      logic.actions.some(action => action.id === binding.actionId && action.category === "flow" && action.type === "complete_level")));
  if (hasCompletionChain) return { ok: false, scene, code: "existing-completion-chain", error: "Scene Logic already contains a level-completion Event/Action chain." };
  const spaceIds = new Set([...logic.spaces.markers, ...logic.spaces.ranges, ...logic.spaces.zones].map(item => item.id));
  const markerId = firstFree(`${source.id}:marker`, spaceIds);
  const triggerId = firstFree(`${source.id}:trigger`, new Set(logic.triggers.map(item => item.id)));
  const eventId = firstFree(`${source.id}:event`, new Set(logic.events.map(item => item.id)));
  const actionId = firstFree(`${source.id}:action`, new Set(logic.actions.map(item => item.id)));
  const candidateLogic: SceneLogicDocumentV1 = {
    ...logic,
    spaces: { ...logic.spaces, markers: [...logic.spaces.markers, { id: markerId, position: source.worldX }] },
    triggers: [...logic.triggers, { id: triggerId, kind: "space", relation: "cross", markerId, mode: "once", enabled: source.enabled }],
    events: [...logic.events, { id: eventId, category: "scene", type: "level_complete" }],
    actions: [...logic.actions, { id: actionId, category: "flow", type: "complete_level" }],
    triggerEventBindings: [...logic.triggerEventBindings, { triggerId, eventId }],
    eventActionBindings: [...logic.eventActionBindings, { eventId, actionId }],
  };
  const logicValidation = validateSceneLogicDocumentV1(candidateLogic);
  if (!logicValidation.valid) return { ok: false, scene, code: "invalid-scene", error: logicValidation.errors.map(item => `${item.path}: ${item.message}`).join("; ") };
  const candidate: BackgroundSceneV2 = { ...scene, events: scene.events?.filter(event => event.id !== sourceEventId), sceneLogic: candidateLogic };
  const sceneValidation = validateBackgroundSceneV2(candidate);
  if (!sceneValidation.valid) return { ok: false, scene, code: "invalid-scene", error: sceneValidation.errors.map(item => `${item.path}: ${item.message}`).join("; ") };
  return { ok: true, scene: candidate, sourceEventId, markerId, triggerId, eventId, actionId };
}
