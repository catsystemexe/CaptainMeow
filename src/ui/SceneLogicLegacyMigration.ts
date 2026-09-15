import { validateSceneLogicDocumentV1, type SceneLogicDocumentV1 } from "../game/scene-logic/SceneLogicDocument";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { validateBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Validation";
import { ensureSceneLogicDocument } from "./SceneLogicSpaceEditing";

export type LegacySignalMigrationResult =
  | { ok: true; scene: BackgroundSceneV2; sourceEventId: string; markerId: string; triggerId: string; eventId: string }
  | { ok: false; scene: BackgroundSceneV2; code: "event-not-found" | "not-signal" | "locked" | "invalid-scene"; error: string };

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
