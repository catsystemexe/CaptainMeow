import assert from "node:assert/strict";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "../../render/bg/v2/BackgroundV2Serialization";
import type { BackgroundSceneV2 } from "../../render/bg/v2/BackgroundV2Types";
import { validateSceneLogicDocumentV1, type SceneLogicDocumentV1 } from "./SceneLogicDocument";

const logic: SceneLogicDocumentV1 = {
  version: 1,
  spaces: {
    markers: [{ id: "boss_gate", position: 1000 }],
    ranges: [{ id: "arena", start: 900, end: 1200 }],
    zones: [{ id: "airspace", minX: 900, maxX: 1200, minY: 0, maxY: 600 }],
  },
  states: [{ id: "scroll_speed", address: "scene.scrollSpeed", valueType: "number" }],
  triggers: [
    { id: "boss_gate_cross", kind: "space", relation: "cross", markerId: "boss_gate", mode: "once", enabled: true },
    { id: "arena_enter", kind: "space", relation: "enter", rangeId: "arena", mode: "once", enabled: true },
    { id: "airspace_inside", kind: "space", relation: "inside", zoneId: "airspace", mode: "repeat", enabled: true },
    { id: "scroll_is_stopped", kind: "state", stateId: "scroll_speed", relation: "==", value: 0, mode: "once", enabled: true },
  ],
  events: [
    { id: "boss_encounter_started", category: "scene", type: "boss_encounter_started" },
    { id: "scroll_stopped", category: "scene", type: "scroll_stopped" },
  ],
  actions: [
    { id: "stop_scroll", category: "world", type: "stop_scroll" },
    { id: "set_scroll_speed_zero", category: "state", type: "set", stateId: "scroll_speed", value: 0 },
    { id: "complete_level", category: "flow", type: "complete_level" },
    { id: "restart_level", category: "flow", type: "restart_level" },
  ],
  triggerEventBindings: [
    { triggerId: "boss_gate_cross", eventId: "boss_encounter_started" },
    { triggerId: "scroll_is_stopped", eventId: "scroll_stopped" },
  ],
  eventActionBindings: [
    { eventId: "boss_encounter_started", actionId: "stop_scroll" },
    { eventId: "scroll_stopped", actionId: "set_scroll_speed_zero" },
  ],
};

const legacyEvent = { id: "legacy-signal", type: "signal" as const, worldX: 500, enabled: true, name: "legacy" };
const scene: BackgroundSceneV2 = { version: 2, id: "scene-logic-proof", environment: {}, tracks: [], events: [legacyEvent], sceneLogic: logic };
const json = serializeBackgroundSceneV2(scene);
const parsed = parseBackgroundSceneV2(json);
assert(parsed.ok);
if (parsed.ok) {
  assert.deepEqual(parsed.scene.sceneLogic, logic, "authored definitions and stable references round-trip unchanged");
  assert.deepEqual(parsed.scene.events, [legacyEvent], "legacy events coexist without reinterpretation");
  assert.equal(JSON.stringify(parsed.scene.sceneLogic).includes("previousInside"), false);
  assert.equal(JSON.stringify(parsed.scene.sceneLogic).includes("fired"), false);
}

const legacyOnly: BackgroundSceneV2 = { version: 2, id: "legacy-only", environment: {}, tracks: [], events: [legacyEvent] };
const legacyParsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(legacyOnly));
assert(legacyParsed.ok);
if (legacyParsed.ok) {
  assert.equal(legacyParsed.scene.sceneLogic, undefined, "absence remains absence");
  assert.deepEqual(legacyParsed.scene.events, [legacyEvent], "legacy events round-trip unchanged");
}
const minimal = parseBackgroundSceneV2(JSON.stringify({ version: 2, id: "minimal", environment: {}, tracks: [] }));
assert(minimal.ok && minimal.scene.sceneLogic === undefined);

type Mutable = Record<string, unknown>;
const clone = (): Mutable => structuredClone(logic) as unknown as Mutable;
const expectInvalid = (mutate: (document: Mutable) => void, path: RegExp): void => {
  const document = clone(); mutate(document);
  const result = validateSceneLogicDocumentV1(document);
  assert.equal(result.valid, false);
  assert(result.errors.some((error) => path.test(error.path)), `expected error path ${path}; got ${result.errors.map(({ path: p }) => p).join(", ")}`);
  assert.equal(parseBackgroundSceneV2(JSON.stringify({ version: 2, id: "invalid", environment: {}, tracks: [], sceneLogic: document })).ok, false);
};

expectInvalid((d) => { d.version = 2; }, /^version$/);
expectInvalid((d) => { d.sequenceDefinitions = []; }, /^sequenceDefinitions$/);
expectInvalid((d) => { (d.spaces as Mutable).runtimeState = {}; }, /^spaces\.runtimeState$/);
expectInvalid((d) => { ((d.spaces as Mutable).markers as Mutable[])[0].previousX = 0; }, /^spaces\.markers\[0\]\.previousX$/);
expectInvalid((d) => { ((d.triggers as Mutable[])[0]).fired = true; }, /^triggers\[0\]\.fired$/);
expectInvalid((d) => { ((d.actions as Mutable[])[0]).armed = true; }, /^actions\[0\]\.armed$/);
expectInvalid((d) => { ((d.actions as Mutable[])[2]).reward = 1; }, /^actions\[2\]\.reward$/);
expectInvalid((d) => { ((d.spaces as Mutable).ranges as Mutable[])[0].id = "boss_gate"; }, /^spaces\.ranges\[0\]\.id$/);
for (const collection of ["states", "triggers", "events", "actions"] as const) {
  expectInvalid((d) => { const values = d[collection] as Mutable[]; values.push(structuredClone(values[0])); }, new RegExp(`^${collection}\\[${(logic[collection] as readonly unknown[]).length}\\]\\.id$`));
}
expectInvalid((d) => { (d.triggers as Mutable[])[0].markerId = "missing"; }, /^triggers\[0\]\.markerId$/);
expectInvalid((d) => { (d.triggers as Mutable[])[1].rangeId = "boss_gate"; }, /^triggers\[1\]\.rangeId$/);
expectInvalid((d) => { (d.triggers as Mutable[])[2].zoneId = "arena"; }, /^triggers\[2\]\.zoneId$/);
expectInvalid((d) => { (d.triggers as Mutable[])[3].stateId = "missing"; }, /^triggers\[3\]\.stateId$/);
expectInvalid((d) => { (d.triggers as Mutable[])[3].value = false; }, /^triggers\[3\]\.value$/);
expectInvalid((d) => { (d.triggerEventBindings as Mutable[])[0].triggerId = "missing"; }, /^triggerEventBindings\[0\]\.triggerId$/);
expectInvalid((d) => { (d.triggerEventBindings as Mutable[])[0].eventId = "missing"; }, /^triggerEventBindings\[0\]\.eventId$/);
expectInvalid((d) => { (d.eventActionBindings as Mutable[])[0].eventId = "missing"; }, /^eventActionBindings\[0\]\.eventId$/);
expectInvalid((d) => { (d.eventActionBindings as Mutable[])[0].actionId = "missing"; }, /^eventActionBindings\[0\]\.actionId$/);
expectInvalid((d) => { (d.actions as Mutable[])[1].stateId = "missing"; }, /^actions\[1\]\.stateId$/);
expectInvalid((d) => { (d.actions as Mutable[])[1].value = "0"; }, /^actions\[1\]\.value$/);
expectInvalid((d) => { (d.states as Mutable[])[0].valueType = "string"; (d.actions as Mutable[])[1].type = "increment"; (d.actions as Mutable[])[1].value = 1; }, /^actions\[1\]\.stateId$/);
expectInvalid((d) => { const values = d.triggerEventBindings as Mutable[]; values.push(structuredClone(values[0])); }, /^triggerEventBindings\[2\]$/);
expectInvalid((d) => { const values = d.eventActionBindings as Mutable[]; values.push(structuredClone(values[0])); }, /^eventActionBindings\[2\]$/);

console.log("SceneLogicDocument.smoke: PASS");
