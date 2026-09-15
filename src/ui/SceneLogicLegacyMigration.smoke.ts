import assert from "node:assert/strict";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { migrateLegacyLevelEndToSceneLogic, migrateLegacySignalToSceneLogic } from "./SceneLogicLegacyMigration";

const signalScene = (enabled = true): BackgroundSceneV2 => ({
  ...createBackgroundV2DesertTestScene(),
  events: [
    { id: "boss", type: "signal", worldX: 8200, enabled, name: "boss-start" },
    { id: "keep", type: "signal", worldX: 9000, enabled: true, name: "keep" },
    { id: "end", type: "level-end", worldX: 10000, enabled: true },
  ],
});

const basic = migrateLegacySignalToSceneLogic(signalScene(), "boss");
assert(basic.ok);
if (!basic.ok) throw new Error(basic.error);
assert.deepEqual([basic.markerId, basic.triggerId, basic.eventId], ["boss:marker", "boss:trigger", "boss:event"]);
assert.deepEqual(basic.scene.sceneLogic?.spaces.markers, [{ id: "boss:marker", position: 8200 }]);
assert.deepEqual(basic.scene.sceneLogic?.triggers, [{ id: "boss:trigger", kind: "space", relation: "cross", markerId: "boss:marker", mode: "once", enabled: true }]);
assert.deepEqual(basic.scene.sceneLogic?.events, [{ id: "boss:event", category: "scene", type: "boss-start" }]);
assert.deepEqual(basic.scene.sceneLogic?.triggerEventBindings, [{ triggerId: "boss:trigger", eventId: "boss:event" }]);
assert.deepEqual(basic.scene.sceneLogic?.eventActionBindings, []);
assert.deepEqual(basic.scene.events?.map(event => event.id), ["keep", "end"]);

const disabled = migrateLegacySignalToSceneLogic(signalScene(false), "boss");
assert(disabled.ok);
if (disabled.ok) assert.equal(disabled.scene.sceneLogic?.triggers[0].enabled, false);

const existing = signalScene();
existing.sceneLogic = {
  version: 1,
  spaces: { markers: [{ id: "old-marker", position: 10 }], ranges: [{ id: "old-range", start: 20, end: 30 }], zones: [{ id: "old-zone", minX: 40, maxX: 50, minY: 1, maxY: 2 }] },
  states: [{ id: "old-state", address: "scene.scrollSpeed", valueType: "number" }],
  triggers: [{ id: "old-trigger", kind: "time", relation: "at", timeSec: 1, mode: "once", enabled: true }],
  events: [{ id: "old-event", category: "scene", type: "old" }],
  actions: [{ id: "old-action", category: "world", type: "stop_scroll" }],
  triggerEventBindings: [{ triggerId: "old-trigger", eventId: "old-event" }],
  eventActionBindings: [{ eventId: "old-event", actionId: "old-action" }],
};
const existingResult = migrateLegacySignalToSceneLogic(existing, "boss");
assert(existingResult.ok);
if (existingResult.ok) {
  assert.deepEqual(existingResult.scene.sceneLogic?.spaces.ranges, existing.sceneLogic.spaces.ranges);
  assert.deepEqual(existingResult.scene.sceneLogic?.spaces.zones, existing.sceneLogic.spaces.zones);
  assert.deepEqual(existingResult.scene.sceneLogic?.states, existing.sceneLogic.states);
  assert.deepEqual(existingResult.scene.sceneLogic?.actions, existing.sceneLogic.actions);
  assert.deepEqual(existingResult.scene.sceneLogic?.eventActionBindings, existing.sceneLogic.eventActionBindings);
  assert.equal(existingResult.scene.sceneLogic?.triggers.length, 2);
  assert.equal(existingResult.scene.sceneLogic?.events.length, 2);
  assert.equal(existingResult.scene.sceneLogic?.triggerEventBindings.length, 2);
}

const collisions = signalScene();
collisions.sceneLogic = {
  version: 1,
  spaces: { markers: [{ id: "boss:marker", position: 1 }], ranges: [{ id: "boss:marker-2", start: 2, end: 3 }], zones: [] },
  states: [],
  triggers: [{ id: "boss:trigger", kind: "time", relation: "at", timeSec: 1, mode: "once", enabled: true }],
  events: [{ id: "boss:event", category: "scene", type: "existing" }],
  actions: [], triggerEventBindings: [], eventActionBindings: [],
};
const collisionResult = migrateLegacySignalToSceneLogic(collisions, "boss");
assert(collisionResult.ok);
if (collisionResult.ok) assert.deepEqual([collisionResult.markerId, collisionResult.triggerId, collisionResult.eventId], ["boss:marker-3", "boss:trigger-2", "boss:event-2"]);

for (const [scene, id, code] of [
  [{ ...signalScene(), events: [{ id: "boss", type: "signal" as const, worldX: 8200, enabled: true, name: "boss-start", locked: true }] }, "boss", "locked"],
  [signalScene(), "missing", "event-not-found"],
  [signalScene(), "end", "not-signal"],
] as const) {
  const snapshot = structuredClone(scene);
  const result = migrateLegacySignalToSceneLogic(scene, id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, code);
  assert.strictEqual(result.scene, scene);
  assert.deepEqual(scene, snapshot);
}

const invalid = signalScene();
invalid.tracks[1].id = invalid.tracks[0].id;
const invalidSnapshot = structuredClone(invalid);
const rollback = migrateLegacySignalToSceneLogic(invalid, "boss");
assert.equal(rollback.ok, false);
if (!rollback.ok) assert.equal(rollback.code, "invalid-scene");
assert.strictEqual(rollback.scene, invalid);
assert.deepEqual(invalid, invalidSnapshot);

const parsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(basic.scene));
assert(parsed.ok);
if (parsed.ok) {
  assert.deepEqual(parsed.scene.sceneLogic, basic.scene.sceneLogic);
  assert.equal(parsed.scene.events?.some(event => event.id === "boss"), false);
}
const levelEnd = migrateLegacyLevelEndToSceneLogic(signalScene(), "end");
assert(levelEnd.ok);
if (!levelEnd.ok) throw new Error(levelEnd.error);
assert.deepEqual([levelEnd.markerId, levelEnd.triggerId, levelEnd.eventId, levelEnd.actionId], ["end:marker", "end:trigger", "end:event", "end:action"]);
assert.deepEqual(levelEnd.scene.sceneLogic?.spaces.markers, [{ id: "end:marker", position: 10000 }]);
assert.deepEqual(levelEnd.scene.sceneLogic?.triggers, [{ id: "end:trigger", kind: "space", relation: "cross", markerId: "end:marker", mode: "once", enabled: true }]);
assert.deepEqual(levelEnd.scene.sceneLogic?.events, [{ id: "end:event", category: "scene", type: "level_complete" }]);
assert.deepEqual(levelEnd.scene.sceneLogic?.actions, [{ id: "end:action", category: "flow", type: "complete_level" }]);
assert.deepEqual(levelEnd.scene.sceneLogic?.triggerEventBindings, [{ triggerId: "end:trigger", eventId: "end:event" }]);
assert.deepEqual(levelEnd.scene.sceneLogic?.eventActionBindings, [{ eventId: "end:event", actionId: "end:action" }]);
assert.deepEqual(levelEnd.scene.events?.map(event => event.id), ["boss", "keep"]);
assert(parseBackgroundSceneV2(serializeBackgroundSceneV2(levelEnd.scene)).ok);

const disabledEnd = signalScene();
disabledEnd.events![2] = { ...disabledEnd.events![2], enabled: false };
const disabledEndResult = migrateLegacyLevelEndToSceneLogic(disabledEnd, "end");
assert(disabledEndResult.ok);
if (disabledEndResult.ok) assert.equal(disabledEndResult.scene.sceneLogic?.triggers[0].enabled, false);

const collisionEnd = signalScene();
collisionEnd.sceneLogic = {
  version: 1,
  spaces: { markers: [{ id: "end:marker", position: 1 }], ranges: [{ id: "end:marker-2", start: 2, end: 3 }], zones: [{ id: "end:marker-3", minX: 0, maxX: 1, minY: 0, maxY: 1 }] },
  states: [], triggers: [{ id: "end:trigger", kind: "time", relation: "at", timeSec: 1, mode: "once", enabled: true }],
  events: [{ id: "end:event", category: "scene", type: "existing" }], actions: [{ id: "end:action", category: "world", type: "stop_scroll" }],
  triggerEventBindings: [], eventActionBindings: [],
};
const collisionEndResult = migrateLegacyLevelEndToSceneLogic(collisionEnd, "end");
assert(collisionEndResult.ok);
if (collisionEndResult.ok) assert.deepEqual([collisionEndResult.markerId, collisionEndResult.triggerId, collisionEndResult.eventId, collisionEndResult.actionId], ["end:marker-4", "end:trigger-2", "end:event-2", "end:action-2"]);

for (const [scene, id, code] of [
  [{ ...signalScene(), events: [{ id: "end", type: "level-end" as const, worldX: 10, enabled: true, locked: true }] }, "end", "locked"],
  [signalScene(), "missing", "event-not-found"],
  [signalScene(), "boss", "not-level-end"],
] as const) {
  const snapshot = structuredClone(scene);
  const result = migrateLegacyLevelEndToSceneLogic(scene, id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, code);
  assert.strictEqual(result.scene, scene);
  assert.deepEqual(scene, snapshot);
}
const invalidEnd = signalScene();
invalidEnd.tracks[1].id = invalidEnd.tracks[0].id;
const invalidEndResult = migrateLegacyLevelEndToSceneLogic(invalidEnd, "end");
assert.equal(invalidEndResult.ok, false);
assert.strictEqual(invalidEndResult.scene, invalidEnd);
const existingCompletion = signalScene();
existingCompletion.sceneLogic = {
  version: 1, spaces: { markers: [], ranges: [], zones: [] }, states: [], triggers: [],
  events: [{ id: "complete", category: "scene", type: "level_complete" }],
  actions: [{ id: "complete", category: "flow", type: "complete_level" }],
  triggerEventBindings: [], eventActionBindings: [{ eventId: "complete", actionId: "complete" }],
};
const guarded = migrateLegacyLevelEndToSceneLogic(existingCompletion, "end");
assert.equal(guarded.ok, false);
if (!guarded.ok) assert.equal(guarded.code, "existing-completion-chain");
assert.strictEqual(guarded.scene, existingCompletion);
console.log("SceneLogicLegacyMigration.smoke: PASS");
