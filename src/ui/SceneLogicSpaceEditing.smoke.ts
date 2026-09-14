import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import { createMarker, createRange, createZone, deleteMarker, deleteRange, deleteZone, updateMarker, updateRange, updateZone } from "./SceneLogicSpaceEditing";

const base: BackgroundSceneV2 = { version: 2, id: "authoring", environment: {}, tracks: [], events: [{ id: "legacy", type: "level-end", worldX: 900, enabled: true }] };
const marker = createMarker(base, 25); assert(marker.ok); assert.equal(base.sceneLogic, undefined, "creation does not mutate input");
assert.deepEqual(marker.scene.sceneLogic?.spaces.markers, [{ id: "marker_1", position: 25 }]);
const range = createRange(marker.scene, 50, 150); assert(range.ok);
const zone = createZone(range.scene, 75, 504, 175); assert(zone.ok);
assert.deepEqual([marker.selection.id, range.selection.id, zone.selection.id], ["marker_1", "range_1", "zone_1"]);
assert.equal(new Set(zone.scene.sceneLogic!.spaces.markers.concat(zone.scene.sceneLogic!.spaces.ranges, zone.scene.sceneLogic!.spaces.zones).map(item => item.id)).size, 3);
const updatedMarker = updateMarker(zone.scene, "marker_1", { position: 30 }); assert(updatedMarker.ok); assert.equal(updatedMarker.scene.sceneLogic!.spaces.markers[0].position, 30);
const updatedRange = updateRange(updatedMarker.scene, "range_1", { start: 60 }); assert(updatedRange.ok); assert.equal(updatedRange.scene.sceneLogic!.spaces.ranges[0].start, 60);
const updatedZone = updateZone(updatedRange.scene, "zone_1", { minY: 100 }); assert(updatedZone.ok); assert.equal(updatedZone.scene.sceneLogic!.spaces.zones[0].minY, 100);
assert.equal(updateMarker(zone.scene, "marker_1", { position: Number.NaN }).ok, false);
assert.equal(updateRange(zone.scene, "range_1", { start: 999 }).ok, false);
assert.equal(updateZone(zone.scene, "zone_1", { minX: 999 }).ok, false);
assert.equal(createRange(base, 2, 1).ok, false);assert.equal(createZone(base, Number.POSITIVE_INFINITY, 504).ok, false);
for (const [kind, field, remove] of [["marker", "markerId", deleteMarker], ["range", "rangeId", deleteRange], ["zone", "zoneId", deleteZone]] as const) {
  const id = `${kind}_1`; const referenced = { ...zone.scene, sceneLogic: { ...zone.scene.sceneLogic!, triggers: [{ id: `trigger_${kind}`, kind: "space", relation: kind === "marker" ? "cross" : "enter", [field]: id, mode: "once", enabled: true } as never] } };
  assert.equal(remove(referenced, id).ok, false, `referenced ${kind} delete is blocked`); assert.equal(remove(zone.scene, id).ok, true);
}
assert.deepEqual(zone.scene.events, base.events, "legacy events are preserved");assert.deepEqual(zone.scene.sceneLogic!.states, []);assert.deepEqual(zone.scene.sceneLogic!.actions, []);
const parsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(zone.scene));assert(parsed.ok);assert.deepEqual(parsed.scene.sceneLogic?.spaces, zone.scene.sceneLogic?.spaces, "authored Spaces round-trip through real V2 persistence");
console.log("SceneLogicSpaceEditing.smoke: PASS");
