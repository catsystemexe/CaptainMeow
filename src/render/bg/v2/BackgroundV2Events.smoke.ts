import assert from "node:assert/strict";
import type { BackgroundSceneV2 } from "./BackgroundV2Types";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "./BackgroundV2Serialization";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";
import { createV2SceneEvent, deleteV2SceneEvent, getV2LevelEndWorldX, updateV2SceneEvent } from "../../../ui/PixelBgrV2SceneEvents";

const scene: BackgroundSceneV2 = { version: 2, id: "events", environment: {}, tracks: [] };
const assertValidEdit = (result: { ok: boolean; scene: BackgroundSceneV2 }, label: string): void => {
  if (result.ok) assert.equal(validateBackgroundSceneV2(result.scene).valid, true, `${label} success must satisfy the strict V2 validator`);
};
assert.equal(validateBackgroundSceneV2(scene).valid, true, "events remain optional");
const signal = createV2SceneEvent(scene, 33); assert.equal(signal.ok, true);
assertValidEdit(signal, "signal create");
if (!signal.ok) throw new Error(signal.error);
assert.deepEqual(signal.scene.events, [{ id: "event", type: "signal", worldX: 32, enabled: true, name: "event" }]);
assert.deepEqual(scene, { version: 2, id: "events", environment: {}, tracks: [] }, "creation is immutable");
const level = createV2SceneEvent(signal.scene, 12000, { type: "level-end" }); assert.equal(level.ok, true);
assertValidEdit(level, "level-end create");
if (!level.ok) throw new Error(level.error);
assert.equal(getV2LevelEndWorldX(level.scene), 12000);
assert.equal(createV2SceneEvent(level.scene, 13000, { type: "level-end" }).ok, false, "duplicate level-end explicitly fails");
const moved = updateV2SceneEvent(level.scene, "event", { worldX: 80 }); assert.equal(moved.ok, true);
assertValidEdit(moved, "worldX update");
if (!moved.ok) throw new Error(moved.error);
assert.equal(moved.scene.events?.[0].worldX, 80); assert.equal(level.scene.events?.[0].worldX, 32);
const renamed = updateV2SceneEvent(moved.scene, "event", { name: "boss-start" }); assert.equal(renamed.ok, true);
assertValidEdit(renamed, "signal name update");
if (renamed.ok) assert.equal(renamed.scene.events?.[0].type === "signal" && renamed.scene.events[0].name, "boss-start");
assert.equal(updateV2SceneEvent(level.scene, "level-end", { name: "invalid" }).ok, false, "level-end name patches explicitly fail");
if (false) {
  // @ts-expect-error Event type is immutable after creation in the public patch API.
  updateV2SceneEvent(level.scene, "event", { type: "level-end" });
}
const removed = deleteV2SceneEvent(moved.scene, "event"); assert.equal(removed.ok, true); if (removed.ok) assert.equal(removed.scene.events?.length, 1);
assertValidEdit(removed, "delete");
const roundTrip = parseBackgroundSceneV2(serializeBackgroundSceneV2(level.scene)); assert.equal(roundTrip.ok, true); if (roundTrip.ok) assert.deepEqual(roundTrip.scene, level.scene);
for (const invalid of [
  { ...scene, events: [{ id: "x", type: "signal", worldX: 0, enabled: true, name: "ok" }, { id: "x", type: "signal", worldX: 1, enabled: true, name: "ok" }] },
  { ...scene, events: [{ id: "end", type: "level-end", worldX: 1, enabled: true }, { id: "end-2", type: "level-end", worldX: 2, enabled: false }] },
  { ...scene, events: [{ id: "x", type: "signal", worldX: -1, enabled: true, name: "ok" }] },
  { ...scene, events: [{ id: "x", type: "signal", worldX: 1, enabled: true, name: "ok", extra: true }] },
]) assert.equal(validateBackgroundSceneV2(invalid).valid, false);
console.log("[SMOKE] BackgroundV2Events OK ✅");
