import type { BackgroundAssetRef, BackgroundObject, BackgroundSceneV2, BackgroundTrack } from "../render/bg/v2/BackgroundV2Types";

export const V2_OBJECT_DUPLICATE_OFFSET_PX = 16;

export type V2ObjectEditErrorCode = "track-not-found" | "object-not-found" | "invalid-value" | "duplicate-id" | "asset-required";
export type V2ObjectEditResult =
  | { ok: true; scene: BackgroundSceneV2; trackId: string; objectId: string }
  | { ok: false; scene: BackgroundSceneV2; code: V2ObjectEditErrorCode; error: string };
export type V2ObjectPatch = Partial<Omit<BackgroundObject, "id">>;

const fail = (scene: BackgroundSceneV2, code: V2ObjectEditErrorCode, error: string): V2ObjectEditResult => ({ ok: false, scene, code, error });
const success = (scene: BackgroundSceneV2, trackId: string, objectId: string): V2ObjectEditResult => ({ ok: true, scene, trackId, objectId });

export function findV2Object(scene: BackgroundSceneV2, trackId: string, objectId: string): BackgroundObject | null {
  return scene.tracks.find(track => track.id === trackId)?.objects.find(object => object.id === objectId) ?? null;
}

function uniqueObjectId(scene: BackgroundSceneV2, base: string): string {
  const ids = new Set(scene.tracks.flatMap(track => track.objects.map(object => object.id)));
  const stem = (base.trim() || "object").replace(/-copy(?:-\d+)?$/, "");
  let candidate = `${stem}-copy`;
  for (let suffix = 2; ids.has(candidate); suffix += 1) candidate = `${stem}-copy-${suffix}`;
  return candidate;
}

function replaceTrack(scene: BackgroundSceneV2, nextTrack: BackgroundTrack): BackgroundSceneV2 {
  return { ...scene, tracks: scene.tracks.map(track => track.id === nextTrack.id ? nextTrack : track) };
}

function editable(scene: BackgroundSceneV2, trackId: string, objectId?: string): { track: BackgroundTrack; object?: BackgroundObject } | V2ObjectEditResult {
  const ids = scene.tracks.flatMap(track => track.objects.map(object => object.id));
  if (new Set(ids).size !== ids.length) return fail(scene, "duplicate-id", "Object IDs must be unique across the V2 scene before editing.");
  const track = scene.tracks.find(item => item.id === trackId);
  if (!track) return fail(scene, "track-not-found", `Track '${trackId}' was not found.`);
  if (objectId === undefined) return { track };
  const object = track.objects.find(item => item.id === objectId);
  return object ? { track, object } : fail(scene, "object-not-found", `Object '${objectId}' was not found on track '${trackId}'.`);
}

function validateObject(object: BackgroundObject): string | null {
  if (!object.asset.id.trim() || !object.asset.url.trim()) return "Object asset id and URL are required.";
  if (!Number.isFinite(object.startTrackX) || !Number.isFinite(object.y) || !Number.isFinite(object.localZ)) return "startTrackX, y, and localZ must be finite.";
  if (object.width !== undefined && (!Number.isFinite(object.width) || object.width <= 0)) return "width must be finite and positive when present.";
  if (object.height !== undefined && (!Number.isFinite(object.height) || object.height <= 0)) return "height must be finite and positive when present.";
  if (!Number.isFinite(object.opacity) || object.opacity < 0 || object.opacity > 1) return "opacity must be finite and between 0 and 1.";
  return null;
}

export function createV2Object(scene: BackgroundSceneV2, trackId: string, asset: BackgroundAssetRef, startTrackX = 0, y = 0): V2ObjectEditResult {
  const target = editable(scene, trackId); if ("ok" in target) return target;
  if (!asset.id.trim() || !asset.url.trim()) return fail(scene, "asset-required", "Create requires an asset id and URL.");
  const object: BackgroundObject = { id: uniqueObjectId(scene, `${trackId}-object`), asset: { ...asset }, startTrackX, y, localZ: 0, opacity: 1, blend: "normal", enabled: true };
  const invalid = validateObject(object); if (invalid) return fail(scene, "invalid-value", invalid);
  return success(replaceTrack(scene, { ...target.track, objects: [...target.track.objects, object] }), trackId, object.id);
}

export function duplicateV2Object(scene: BackgroundSceneV2, trackId: string, objectId: string): V2ObjectEditResult {
  const target = editable(scene, trackId, objectId); if ("ok" in target) return target;
  const source = target.object!;
  const object = { ...source, asset: { ...source.asset }, id: uniqueObjectId(scene, source.id), startTrackX: source.startTrackX + V2_OBJECT_DUPLICATE_OFFSET_PX, y: source.y + V2_OBJECT_DUPLICATE_OFFSET_PX };
  return success(replaceTrack(scene, { ...target.track, objects: [...target.track.objects, object] }), trackId, object.id);
}

export function deleteV2Object(scene: BackgroundSceneV2, trackId: string, objectId: string): V2ObjectEditResult {
  const target = editable(scene, trackId, objectId); if ("ok" in target) return target;
  const index = target.track.objects.findIndex(item => item.id === objectId);
  const objects = target.track.objects.filter(item => item.id !== objectId);
  return success(replaceTrack(scene, { ...target.track, objects }), trackId, objects[Math.min(index, objects.length - 1)]?.id ?? "");
}

export function updateV2Object(scene: BackgroundSceneV2, trackId: string, objectId: string, patch: V2ObjectPatch): V2ObjectEditResult {
  const target = editable(scene, trackId, objectId); if ("ok" in target) return target;
  const object = { ...target.object!, ...patch, asset: { ...(patch.asset ?? target.object!.asset) } };
  const invalid = validateObject(object); if (invalid) return fail(scene, "invalid-value", invalid);
  return success(replaceTrack(scene, { ...target.track, objects: target.track.objects.map(item => item.id === objectId ? object : item) }), trackId, objectId);
}

export function moveV2Object(scene: BackgroundSceneV2, trackId: string, objectId: string, startTrackX: number, y: number): V2ObjectEditResult {
  return updateV2Object(scene, trackId, objectId, { startTrackX, y });
}
