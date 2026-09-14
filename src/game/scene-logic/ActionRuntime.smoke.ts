import assert from "node:assert/strict";
import type { PlayerData } from "../entities/PlayerTypes";
import { createWorldState } from "../data/WorldState";
import { WorldScrollSystem } from "../systems/WorldScrollSystem";
import {
  resolveBoundAction,
  resolveBoundWorldAction,
  validateFlowRestartLevelAction,
  validateStateDecrementAction,
  validateStateIncrementAction,
  validateStateSetAction,
  validateEventActionBinding,
  validateWorldStopScrollAction,
  type EventActionBinding,
  type WorldStopScrollActionDefinition,
} from "./Action";
import {
  createFlowActionRuntimeAdapter,
  createWorldActionRuntimeAdapter,
  executeFlowAction,
  executeStateAction,
  executeWorldAction,
  materializeAction,
  materializeWorldAction,
} from "./ActionRuntime";
import { resolveBoundSceneEvent, type SceneEventDefinition, type TriggerEventBinding } from "./Event";
import { materializeSceneEvent } from "./EventRuntime";
import type { Marker } from "./Space";
import { resolveTriggerMarker, type MarkerCrossTriggerDefinition } from "./Trigger";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger } from "./TriggerRuntime";
import { createSceneLogicStateRegistry, readStateValue, resolveStateReference } from "./StateRuntime";
import type { StateReferenceDefinition } from "./State";
import { resolveTriggerState, type StateTriggerDefinition } from "./Trigger";
import { createStateTriggerRuntimeState, evaluateStateTrigger } from "./TriggerRuntime";

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

const stateWorld = createWorldState();
const statePlayer = {
  kind: "player", pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, speed: 1, radius: 1,
  alive: true, pendingKill: false, gen: 0, id: 1, flags: 0, shield: 100, shieldMax: 100,
} satisfies PlayerData;
const stateRegistry = createSceneLogicStateRegistry({ world: stateWorld, player: statePlayer });
const states = [
  { id: "scroll_speed", address: "scene.scrollSpeed", valueType: "number" },
  { id: "player_alive", address: "player.alive", valueType: "boolean" },
  { id: "player_shield", address: "player.shield", valueType: "number" },
] as const satisfies readonly StateReferenceDefinition[];
const setAction = { id: "stop_by_state", category: "state", type: "set", stateId: "scroll_speed", value: 0 } as const;
const incrementAction = { id: "faster", category: "state", type: "increment", stateId: "scroll_speed", value: 15 } as const;
const decrementAction = { id: "slower", category: "state", type: "decrement", stateId: "scroll_speed", value: 15 } as const;

for (const [candidate, validate] of [
  [setAction, validateStateSetAction],
  [incrementAction, validateStateIncrementAction],
  [decrementAction, validateStateDecrementAction],
] as const) {
  assert.equal(validate(candidate).valid, true);
  assert.equal(validate(null).valid, false);
  assert.equal(validate([]).valid, false);
  for (const [field, value] of [["id", ""], ["category", "world"], ["type", "bad"], ["stateId", " "]] as const) {
    assert(validate({ ...candidate, [field]: value }).issues.some((issue) => issue.field === field));
  }
}
for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
  assert.equal(validateStateIncrementAction({ ...incrementAction, value }).valid, false);
  assert.equal(validateStateDecrementAction({ ...decrementAction, value }).valid, false);
}
assert.equal(validateStateIncrementAction({ ...incrementAction, value: 0 }).valid, true);
assert.equal(validateStateSetAction({ ...setAction, value: Number.NaN }).valid, false);

const setBefore = { ...setAction };
const stateBeforeAction = { ...states[0] };
stateWorld.speedX = 60;
const liveScroll = resolveStateReference(states[0], stateRegistry);
assert.equal(readStateValue(liveScroll), 60);
executeStateAction(setAction, states, stateRegistry);
assert.equal(stateWorld.speedX, 0);
assert.equal(readStateValue(liveScroll), 0, "State Action writes the authority observed by the same live reader");
stateWorld.speedX = 60;
executeStateAction(incrementAction, states, stateRegistry);
assert.equal(stateWorld.speedX, 75);
stateWorld.speedX = 60;
executeStateAction(decrementAction, states, stateRegistry);
assert.equal(stateWorld.speedX, 45);
executeStateAction({ ...incrementAction, value: 0 }, states, stateRegistry);
assert.equal(stateWorld.speedX, 45, "zero is a deterministic valid amount");
stateWorld.speedX = Number.MAX_VALUE;
assert.throws(
  () => executeStateAction({ ...incrementAction, value: Number.MAX_VALUE }, states, stateRegistry),
  /computed a non-finite number/,
);
assert.equal(stateWorld.speedX, Number.MAX_VALUE, "overflow does not mutate authoritative State");
assert.throws(() => executeStateAction({ ...setAction, stateId: "missing" }, states, stateRegistry), /missing State/);
assert.throws(() => executeStateAction({ ...setAction, stateId: "player_alive", value: false }, states, stateRegistry), /read-only/);
assert.throws(() => executeStateAction({ ...setAction, stateId: "player_shield" }, states, stateRegistry), /read-only/);
assert.throws(() => executeStateAction({ ...setAction, value: "0" }, states, stateRegistry), /value type does not match/);
assert.throws(
  () => executeStateAction(setAction, [{ ...states[0], address: "missing.address" }], stateRegistry),
  /not registered/,
);
assert.throws(
  () => executeStateAction(setAction, [{ ...states[0], valueType: "string" }], stateRegistry),
  /declares string/,
);
assert.deepEqual(setAction, setBefore, "State Action definition remains authored data");
assert.deepEqual(states[0], stateBeforeAction, "State reference remains authored data");

// Establish false, execute Event A -> State.set, then observe the same authority's false -> true edge.
stateWorld.speedX = 60;
const stoppedTrigger: StateTriggerDefinition = {
  id: "scroll_stopped", kind: "state", stateId: "scroll_speed", relation: "==", value: 0, mode: "repeat", enabled: true,
};
const stoppedRuntime = createStateTriggerRuntimeState();
assert.equal(evaluateStateTrigger(stoppedTrigger, resolveStateReference(resolveTriggerState(stoppedTrigger, states), stateRegistry), stoppedRuntime), null);
const stateEventOccurrence = { eventId: "set_scroll_event", type: "set_scroll", sourceTriggerId: "external_trigger" };
const stateBinding: EventActionBinding = { eventId: stateEventOccurrence.eventId, actionId: setAction.id };
const resolvedSet = resolveBoundAction(stateBinding, [setAction]);
assert.equal(resolvedSet.category, "state");
executeStateAction(materializeAction(stateEventOccurrence, stateBinding, setAction), states, stateRegistry);
const stoppedOccurrence = evaluateStateTrigger(
  stoppedTrigger,
  resolveStateReference(resolveTriggerState(stoppedTrigger, states), stateRegistry),
  stoppedRuntime,
);
assert.deepEqual(stoppedOccurrence, { triggerId: stoppedTrigger.id });
const stateChangedEvent = materializeSceneEvent(
  stoppedOccurrence!,
  { triggerId: stoppedTrigger.id, eventId: "scroll_stopped_event" },
  { id: "scroll_stopped_event", category: "scene", type: "scroll_stopped" },
);
assert.equal(stateChangedEvent.eventId, "scroll_stopped_event");

const restartAction = { id: "restart", category: "flow", type: "restart_level" } as const;
assert.equal(validateFlowRestartLevelAction(restartAction).valid, true);
for (const invalid of [null, [], { ...restartAction, id: "" }, { ...restartAction, category: "state" }, { ...restartAction, type: "complete_level" }]) {
  assert.equal(validateFlowRestartLevelAction(invalid).valid, false);
}
let restartCalls = 0;
const flowAdapter = createFlowActionRuntimeAdapter({ restartLevel: () => { restartCalls += 1; } });
const restartOccurrence = { eventId: "restart_event", type: "restart_requested", sourceTriggerId: "restart_trigger" };
const restartBinding: EventActionBinding = { eventId: restartOccurrence.eventId, actionId: restartAction.id };
assert.throws(() => materializeAction({ ...restartOccurrence, eventId: "wrong" }, restartBinding, restartAction), /does not match binding Event/);
assert.throws(() => materializeAction(restartOccurrence, restartBinding, { ...restartAction, id: "wrong" }), /does not match binding Action/);
assert.equal(restartCalls, 0, "binding failures occur before execution");
const restartBefore = { ...restartAction };
executeFlowAction(materializeAction(restartOccurrence, restartBinding, restartAction), flowAdapter);
assert.equal(restartCalls, 1, "Flow.restart_level delegates exactly once to its injected reset owner");
assert.deepEqual(restartAction, restartBefore);

console.log("[SMOKE] Scene Logic World, State, and Flow Action adapters OK ✅");
