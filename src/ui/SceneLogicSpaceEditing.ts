import type { SceneLogicDocumentV1 } from "../game/scene-logic/SceneLogicDocument";
import { validateMarker, validateRange, validateZone, type Marker, type Range, type Zone } from "../game/scene-logic/Space";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";

export type V2SpaceSelection = { kind: "marker"; id: string } | { kind: "range"; id: string } | { kind: "zone"; id: string };
export type SceneLogicSpace = Marker | Range | Zone;
export type SpaceEditResult = { ok: true; scene: BackgroundSceneV2; selection: V2SpaceSelection } | { ok: false; scene: BackgroundSceneV2; error: string };

export const DEFAULT_SPACE_WIDTH = 100;
export const DEFAULT_ZONE_MIN_Y_FACTOR = 0.25;
export const DEFAULT_ZONE_MAX_Y_FACTOR = 0.75;

export function ensureSceneLogicDocument(scene: BackgroundSceneV2): SceneLogicDocumentV1 {
  return scene.sceneLogic ?? { version: 1, spaces: { markers: [], ranges: [], zones: [] }, states: [], triggers: [], events: [], actions: [], triggerEventBindings: [], eventActionBindings: [] };
}

function ids(scene: BackgroundSceneV2): Set<string> {
  const spaces = scene.sceneLogic?.spaces;
  return new Set([...(spaces?.markers ?? []), ...(spaces?.ranges ?? []), ...(spaces?.zones ?? [])].map(space => space.id));
}
function nextId(scene: BackgroundSceneV2, stem: V2SpaceSelection["kind"]): string {
  const used = ids(scene); let index = 1;
  while (used.has(`${stem}_${index}`)) index += 1;
  return `${stem}_${index}`;
}
function replaceSpaces(scene: BackgroundSceneV2, spaces: SceneLogicDocumentV1["spaces"]): BackgroundSceneV2 {
  const logic = ensureSceneLogicDocument(scene);
  return { ...scene, sceneLogic: { ...logic, spaces } };
}
const fail = (scene: BackgroundSceneV2, error: string): SpaceEditResult => ({ ok: false, scene, error });
const success = (scene: BackgroundSceneV2, selection: V2SpaceSelection): SpaceEditResult => ({ ok: true, scene, selection });

export function createMarker(scene: BackgroundSceneV2, position: number): SpaceEditResult {
  const marker = { id: nextId(scene, "marker"), position }; const validation = validateMarker(marker);
  if (!validation.valid) return fail(scene, validation.issues[0].message);
  const logic = ensureSceneLogicDocument(scene);
  return success(replaceSpaces(scene, { ...logic.spaces, markers: [...logic.spaces.markers, marker] }), { kind: "marker", id: marker.id });
}
export function createRange(scene: BackgroundSceneV2, start: number, end = start + DEFAULT_SPACE_WIDTH): SpaceEditResult {
  const range = { id: nextId(scene, "range"), start, end }; const validation = validateRange(range);
  if (!validation.valid) return fail(scene, validation.issues[0].message);
  const logic = ensureSceneLogicDocument(scene);
  return success(replaceSpaces(scene, { ...logic.spaces, ranges: [...logic.spaces.ranges, range] }), { kind: "range", id: range.id });
}
export function createZone(scene: BackgroundSceneV2, minX: number, logicH: number, maxX = minX + DEFAULT_SPACE_WIDTH): SpaceEditResult {
  const zone = { id: nextId(scene, "zone"), minX, maxX, minY: logicH * DEFAULT_ZONE_MIN_Y_FACTOR, maxY: logicH * DEFAULT_ZONE_MAX_Y_FACTOR };
  const validation = validateZone(zone); if (!validation.valid) return fail(scene, validation.issues[0].message);
  const logic = ensureSceneLogicDocument(scene);
  return success(replaceSpaces(scene, { ...logic.spaces, zones: [...logic.spaces.zones, zone] }), { kind: "zone", id: zone.id });
}

export function findSpace(scene: BackgroundSceneV2, selection: V2SpaceSelection): SceneLogicSpace | null {
  const spaces = scene.sceneLogic?.spaces; if (!spaces) return null;
  return selection.kind === "marker" ? spaces.markers.find(item => item.id === selection.id) ?? null : selection.kind === "range" ? spaces.ranges.find(item => item.id === selection.id) ?? null : spaces.zones.find(item => item.id === selection.id) ?? null;
}
function update(scene: BackgroundSceneV2, selection: V2SpaceSelection, patch: Partial<SceneLogicSpace>): SpaceEditResult {
  const current = findSpace(scene, selection); if (!current || !scene.sceneLogic) return fail(scene, `Space '${selection.id}' was not found.`);
  const next = { ...current, ...patch } as SceneLogicSpace;
  const validation = selection.kind === "marker" ? validateMarker(next as Marker) : selection.kind === "range" ? validateRange(next as Range) : validateZone(next as Zone);
  if (!validation.valid) return fail(scene, validation.issues[0].message);
  const spaces = scene.sceneLogic.spaces;
  const nextSpaces = selection.kind === "marker" ? { ...spaces, markers: spaces.markers.map(item => item.id === selection.id ? next as Marker : item) } : selection.kind === "range" ? { ...spaces, ranges: spaces.ranges.map(item => item.id === selection.id ? next as Range : item) } : { ...spaces, zones: spaces.zones.map(item => item.id === selection.id ? next as Zone : item) };
  return success(replaceSpaces(scene, nextSpaces), selection);
}
export const updateMarker = (scene: BackgroundSceneV2, id: string, patch: Partial<Pick<Marker, "position">>): SpaceEditResult => update(scene, { kind: "marker", id }, patch);
export const updateRange = (scene: BackgroundSceneV2, id: string, patch: Partial<Pick<Range, "start" | "end">>): SpaceEditResult => update(scene, { kind: "range", id }, patch);
export const updateZone = (scene: BackgroundSceneV2, id: string, patch: Partial<Pick<Zone, "minX" | "maxX" | "minY" | "maxY">>): SpaceEditResult => update(scene, { kind: "zone", id }, patch);

function referenceField(kind: V2SpaceSelection["kind"]): "markerId" | "rangeId" | "zoneId" { return `${kind}Id` as "markerId" | "rangeId" | "zoneId"; }
export function deleteSpace(scene: BackgroundSceneV2, selection: V2SpaceSelection): SpaceEditResult {
  if (!findSpace(scene, selection) || !scene.sceneLogic) return fail(scene, `Space '${selection.id}' was not found.`);
  if (scene.sceneLogic.triggers.some(trigger => referenceField(selection.kind) in trigger && trigger[referenceField(selection.kind) as keyof typeof trigger] === selection.id)) return fail(scene, `Cannot delete ${selection.kind} '${selection.id}': it is referenced by a Trigger.`);
  const spaces = scene.sceneLogic.spaces;
  const next = selection.kind === "marker" ? { ...spaces, markers: spaces.markers.filter(item => item.id !== selection.id) } : selection.kind === "range" ? { ...spaces, ranges: spaces.ranges.filter(item => item.id !== selection.id) } : { ...spaces, zones: spaces.zones.filter(item => item.id !== selection.id) };
  return success(replaceSpaces(scene, next), selection);
}
export const deleteMarker = (scene: BackgroundSceneV2, id: string): SpaceEditResult => deleteSpace(scene, { kind: "marker", id });
export const deleteRange = (scene: BackgroundSceneV2, id: string): SpaceEditResult => deleteSpace(scene, { kind: "range", id });
export const deleteZone = (scene: BackgroundSceneV2, id: string): SpaceEditResult => deleteSpace(scene, { kind: "zone", id });
