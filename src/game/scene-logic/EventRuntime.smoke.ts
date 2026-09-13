import assert from "node:assert/strict";
import {
  resolveBoundSceneEvent,
  validateSceneEventDefinition,
  validateTriggerEventBinding,
  type SceneEventDefinition,
  type TriggerEventBinding,
} from "./Event";
import { materializeSceneEvent, type SceneEventOccurrence, type SceneEventRuntimeAdapter } from "./EventRuntime";
import type { Marker } from "./Space";
import type { MarkerCrossTriggerDefinition } from "./Trigger";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger } from "./TriggerRuntime";

const event: SceneEventDefinition = {
  id: "boss_start_event",
  category: "scene",
  type: "boss_encounter_started",
};
const binding: TriggerEventBinding = { triggerId: "cross_boss_gate", eventId: event.id };

assert.equal(validateSceneEventDefinition(event).valid, true);
assert.equal(validateSceneEventDefinition(null).valid, false, "an Event must be an object");
for (const [field, value] of [["id", ""], ["category", "gameplay"], ["type", "  "]] as const) {
  const result = validateSceneEventDefinition({ ...event, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid ${field} is reported`);
}

assert.equal(validateTriggerEventBinding(binding).valid, true);
assert.equal(validateTriggerEventBinding(undefined).valid, false, "a binding must be an object");
for (const [field, value] of [["triggerId", ""], ["eventId", "\t"]] as const) {
  const result = validateTriggerEventBinding({ ...binding, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid ${field} is reported`);
}

const triggerOccurrence = { triggerId: binding.triggerId };
const expected: SceneEventOccurrence = {
  eventId: event.id,
  type: event.type,
  sourceTriggerId: binding.triggerId,
};
const eventBefore = { ...event };
const bindingBefore = { ...binding };
const occurrenceBefore = { ...triggerOccurrence };
assert.deepEqual(materializeSceneEvent(triggerOccurrence, binding, event), expected);
assert.deepEqual(materializeSceneEvent(triggerOccurrence, binding, event), expected, "equivalent inputs are deterministic");
assert.deepEqual(event, eventBefore, "materialization does not mutate the Event definition");
assert.deepEqual(binding, bindingBefore, "materialization does not mutate the binding");
assert.deepEqual(triggerOccurrence, occurrenceBefore, "materialization does not mutate the Trigger occurrence");
assert.throws(() => materializeSceneEvent({ triggerId: "trigger_B" }, binding, event), /does not match binding Trigger/);
assert.throws(() => materializeSceneEvent(triggerOccurrence, binding, { ...event, id: "event_B" }), /does not match binding Event/);
assert.equal(resolveBoundSceneEvent(binding, [event]), event);
assert.throws(() => resolveBoundSceneEvent({ ...binding, eventId: "missing" }, [event]), /missing Scene Event "missing"/);

const marker: Marker = { id: "boss_gate", position: 100 };
const trigger: MarkerCrossTriggerDefinition = {
  id: binding.triggerId,
  kind: "space",
  relation: "cross",
  markerId: marker.id,
  mode: "once",
  enabled: true,
};
const state = createMarkerCrossTriggerRuntimeState();
assert.equal(evaluateMarkerCrossTrigger(trigger, marker, state, 90), null);
const crossing = evaluateMarkerCrossTrigger(trigger, marker, state, 110);
assert(crossing, "90 -> 110 produces a real SL-02 Trigger occurrence");
const semanticOccurrence = materializeSceneEvent(crossing, binding, resolveBoundSceneEvent(binding, [event]));
assert.deepEqual(semanticOccurrence, expected);

const noCrossState = createMarkerCrossTriggerRuntimeState();
evaluateMarkerCrossTrigger(trigger, marker, noCrossState, 90);
const noCross = evaluateMarkerCrossTrigger(trigger, marker, noCrossState, 95);
assert.equal(noCross, null, "movement wholly below the Marker produces no Trigger occurrence");
const noEvent = noCross === null ? null : materializeSceneEvent(noCross, binding, event);
assert.equal(noEvent, null, "no semantic Event is materialized without a Trigger occurrence");

const received: SceneEventOccurrence[] = [];
const adapter: SceneEventRuntimeAdapter = { dispatch: (occurrence) => received.push(occurrence) };
adapter.dispatch(semanticOccurrence);
assert.deepEqual(received, [expected], "the injected adapter receives exactly one occurrence");

console.log("[SMOKE] Scene Logic Event runtime adapter OK ✅");
