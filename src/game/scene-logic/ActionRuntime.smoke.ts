import assert from "node:assert/strict";
import type { PlayerData } from "../entities/PlayerTypes";
import { createWorldState } from "../data/WorldState";
import { WorldScrollSystem } from "../systems/WorldScrollSystem";
import {
  resolveBoundWorldAction,
  validateEventActionBinding,
  validateWorldStopScrollAction,
  type EventActionBinding,
  type WorldStopScrollActionDefinition,
} from "./Action";
import { createWorldActionRuntimeAdapter, executeWorldAction, materializeWorldAction } from "./ActionRuntime";
import { resolveBoundSceneEvent, type SceneEventDefinition, type TriggerEventBinding } from "./Event";
import { materializeSceneEvent } from "./EventRuntime";
import type { Marker } from "./Space";
import { resolveTriggerMarker, type MarkerCrossTriggerDefinition } from "./Trigger";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger } from "./TriggerRuntime";

const action: WorldStopScrollActionDefinition = { id: "stop_scroll", category: "world", type: "stop_scroll" };
const actionBinding: EventActionBinding = { eventId: "boss_start_event", actionId: action.id };

assert.equal(validateWorldStopScrollAction(action).valid, true);
assert.equal(validateWorldStopScrollAction(null).valid, false, "an Action must be an object");
for (const [field, value] of [["id", ""], ["category", "entity"], ["type", "start_scroll"]] as const) {
  const result = validateWorldStopScrollAction({ ...action, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid ${field} is reported`);
}

assert.equal(validateEventActionBinding(actionBinding).valid, true);
assert.equal(validateEventActionBinding(undefined).valid, false, "a binding must be an object");
for (const [field, value] of [["eventId", ""], ["actionId", "  "]] as const) {
  const result = validateEventActionBinding({ ...actionBinding, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid ${field} is reported`);
}

const eventOccurrence = {
  eventId: actionBinding.eventId,
  type: "boss_encounter_started",
  sourceTriggerId: "cross_boss_gate",
};
assert.equal(materializeWorldAction(eventOccurrence, actionBinding, action), action);
assert.throws(
  () => materializeWorldAction({ ...eventOccurrence, eventId: "event_B" }, actionBinding, action),
  /does not match binding Event/,
);
assert.throws(() => materializeWorldAction(eventOccurrence, actionBinding, { ...action, id: "action_B" }), /does not match binding Action/);
assert.equal(resolveBoundWorldAction(actionBinding, [action]), action);
assert.throws(() => resolveBoundWorldAction({ ...actionBinding, actionId: "missing" }, [action]), /missing Action "missing"/);

const player = { pos: { x: 100, y: 252 } } as PlayerData;
const executionWorld = createWorldState();
executionWorld.scrollX = 25;
executeWorldAction(action, createWorldActionRuntimeAdapter(executionWorld));
assert.equal(executionWorld.speedX, 0, "World.stop_scroll clears authoritative horizontal speed");
assert.equal(executionWorld.scrollX, 25, "the Action does not move the world");
new WorldScrollSystem(executionWorld, player, 896, 504).update(1 / 60);
assert.equal(executionWorld.scrollX, 25, "authoritative WorldScrollSystem does not advance after the Action");

const marker: Marker = { id: "boss_gate", position: 100 };
const trigger: MarkerCrossTriggerDefinition = {
  id: "cross_boss_gate",
  kind: "space",
  relation: "cross",
  markerId: marker.id,
  mode: "once",
  enabled: true,
};
const event: SceneEventDefinition = { id: actionBinding.eventId, category: "scene", type: "boss_encounter_started" };
const eventBinding: TriggerEventBinding = { triggerId: trigger.id, eventId: event.id };
const authoredBefore = {
  marker: { ...marker },
  trigger: { ...trigger },
  event: { ...event },
  action: { ...action },
  eventBinding: { ...eventBinding },
  actionBinding: { ...actionBinding },
};

const world = createWorldState();
world.speedX = 60;
world.scrollX = 40;
const triggerState = createMarkerCrossTriggerRuntimeState();
assert.equal(evaluateMarkerCrossTrigger(trigger, resolveTriggerMarker(trigger, [marker]), triggerState, 90), null);
const triggerOccurrence = evaluateMarkerCrossTrigger(trigger, marker, triggerState, 110);
assert(triggerOccurrence, "90 -> 110 produces the real Marker cross Trigger occurrence");
const semanticEvent = materializeSceneEvent(triggerOccurrence, eventBinding, resolveBoundSceneEvent(eventBinding, [event]));
const executableAction = materializeWorldAction(
  semanticEvent,
  actionBinding,
  resolveBoundWorldAction(actionBinding, [action]),
);
executeWorldAction(executableAction, createWorldActionRuntimeAdapter(world));
assert.equal(world.speedX, 0, "the full Marker -> Trigger -> Event -> Action chain stops authoritative scroll");
new WorldScrollSystem(world, player, 896, 504).update(1 / 60);
assert.equal(world.scrollX, 40, "the full vertical slice prevents real horizontal scroll advancement");

const noCrossWorld = createWorldState();
noCrossWorld.speedX = 60;
noCrossWorld.scrollX = 40;
const noCrossState = createMarkerCrossTriggerRuntimeState();
evaluateMarkerCrossTrigger(trigger, marker, noCrossState, 90);
const noCross = evaluateMarkerCrossTrigger(trigger, marker, noCrossState, 95);
assert.equal(noCross, null);
const noEvent = noCross === null ? null : materializeSceneEvent(noCross, eventBinding, event);
const noAction = noEvent === null ? null : materializeWorldAction(noEvent, actionBinding, action);
if (noAction) executeWorldAction(noAction, createWorldActionRuntimeAdapter(noCrossWorld));
assert.equal(noCrossWorld.speedX, 60, "no crossing leaves authoritative speed unchanged");
new WorldScrollSystem(noCrossWorld, player, 896, 504).update(1 / 60);
assert.equal(noCrossWorld.scrollX, 41, "normal authoritative scrolling continues without a crossing");

assert.deepEqual(marker, authoredBefore.marker);
assert.deepEqual(trigger, authoredBefore.trigger);
assert.deepEqual(event, authoredBefore.event);
assert.deepEqual(action, authoredBefore.action);
assert.deepEqual(eventBinding, authoredBefore.eventBinding);
assert.deepEqual(actionBinding, authoredBefore.actionBinding);

console.log("[SMOKE] Scene Logic World.stop_scroll vertical slice OK ✅");
