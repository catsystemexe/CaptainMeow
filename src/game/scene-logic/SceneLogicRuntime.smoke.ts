import assert from "node:assert/strict";
import { completeLevel, makeSessionState, resetLevel } from "../data/SessionState";
import type { SceneLogicDocumentV1 } from "./SceneLogicDocument";
import { SceneLogicRuntime } from "./SceneLogicRuntime";
import type { StateRegistry } from "./StateRuntime";

const document: SceneLogicDocumentV1 = {
  version: 1,
  spaces: { markers: [{ id: "end-marker", position: 100 }], ranges: [], zones: [] },
  states: [],
  triggers: [{ id: "end-trigger", kind: "space", relation: "cross", markerId: "end-marker", mode: "once", enabled: true }],
  events: [{ id: "end-event", category: "scene", type: "level_complete" }],
  actions: [{ id: "end-action", category: "flow", type: "complete_level" }],
  triggerEventBindings: [{ triggerId: "end-trigger", eventId: "end-event" }],
  eventActionBindings: [{ eventId: "end-event", actionId: "end-action" }],
};
const session = makeSessionState();
let completions = 0;
const events: string[] = [];
const runtime = new SceneLogicRuntime(
  { restartLevel: () => resetLevel(session), completeLevel: () => { completions++; completeLevel(session); } },
  { dispatch: event => events.push(event.type) },
);
runtime.activate(document);
assert.deepEqual(runtime.evaluatePlayerWorldX(90), []);
const occurrence = runtime.evaluatePlayerWorldX(100);
assert.deepEqual(occurrence, [{ eventId: "end-event", type: "level_complete", sourceTriggerId: "end-trigger" }]);
assert.equal(session.levelState, "active", "completion waits for Flow boundary");
runtime.flushFlowActions();
assert.equal(session.levelState, "completed");
assert.equal(completions, 1);
assert.deepEqual(events, ["level_complete"]);
runtime.evaluatePlayerWorldX(120); runtime.flushFlowActions();
assert.equal(completions, 1, "once Trigger does not repeat");

resetLevel(session); runtime.reset();
assert.deepEqual(runtime.evaluatePlayerWorldX(120), [], "restart first sample establishes a baseline");
runtime.evaluatePlayerWorldX(80); runtime.evaluatePlayerWorldX(100); runtime.flushFlowActions();
assert.equal(completions, 2, "restart re-arms once memory");
resetLevel(session); runtime.activate(document);
runtime.evaluatePlayerWorldX(110); runtime.flushFlowActions();
assert.equal(completions, 2, "Scene replacement baseline cannot synthesize a crossing");
runtime.reset(); runtime.evaluatePlayerWorldX(150); runtime.flushFlowActions();
assert.equal(completions, 2, "restart reset does not execute and its first sample rebaselines");

// Production authoring-seek lifecycle: teleport while paused, explicitly record
// the authoritative destination, then resume without evaluating the teleport.
let paused = true;
let authoritativePlayerX = 14_900;
const authoringSeekDocument: SceneLogicDocumentV1 = {
  ...document,
  spaces: { ...document.spaces, markers: [{ id: "end-marker", position: 17_920 }] },
};
runtime.activate(authoringSeekDocument);
runtime.evaluatePlayerWorldX(authoritativePlayerX);
authoritativePlayerX = 19_740;
runtime.rebaselinePlayerWorldX(authoritativePlayerX);
assert.equal(paused, true, "authoring seek keeps the requested paused state");
runtime.flushFlowActions();
assert.equal(completions, 2, "seek itself queues no Flow action");
paused = false;
assert.deepEqual(runtime.evaluatePlayerWorldX(authoritativePlayerX), [], "first resumed sample beyond Marker does not replay the seek crossing");
runtime.flushFlowActions();
runtime.evaluatePlayerWorldX(19_800); runtime.flushFlowActions();
assert.equal(completions, 2, "remaining beyond Marker cannot synthesize a historical crossing");
runtime.evaluatePlayerWorldX(17_000);
runtime.evaluatePlayerWorldX(17_920);
runtime.flushFlowActions();
assert.equal(completions, 3, "a genuine future crossing after authoring seek still fires");

let oncePreservingCompletions = 0;
const oncePreservingRuntime = new SceneLogicRuntime({
  restartLevel: () => {},
  completeLevel: () => { oncePreservingCompletions++; },
});
oncePreservingRuntime.activate(document);
oncePreservingRuntime.evaluatePlayerWorldX(90);
oncePreservingRuntime.evaluatePlayerWorldX(100);
oncePreservingRuntime.flushFlowActions();
assert.equal(oncePreservingCompletions, 1, "once Trigger fires on its initial genuine crossing");
oncePreservingRuntime.rebaselinePlayerWorldX(50);
oncePreservingRuntime.evaluatePlayerWorldX(50);
oncePreservingRuntime.evaluatePlayerWorldX(100);
oncePreservingRuntime.flushFlowActions();
assert.equal(oncePreservingCompletions, 1, "authoring seek preserves fired once memory");
oncePreservingRuntime.reset();
oncePreservingRuntime.evaluatePlayerWorldX(50);
oncePreservingRuntime.evaluatePlayerWorldX(100);
oncePreservingRuntime.flushFlowActions();
assert.equal(oncePreservingCompletions, 2, "restart reset re-arms fired once memory");

runtime.activate({ ...document, triggers: [{ ...document.triggers[0], enabled: false }] });
runtime.evaluatePlayerWorldX(90); runtime.evaluatePlayerWorldX(110); runtime.flushFlowActions();
assert.equal(completions, 3, "disabled crossing stays inert");
runtime.activate(document); runtime.evaluatePlayerWorldX(110); runtime.evaluatePlayerWorldX(90); runtime.flushFlowActions();
assert.equal(completions, 3, "backward crossing stays inert");
runtime.activate(undefined); runtime.evaluatePlayerWorldX(0); runtime.evaluatePlayerWorldX(1000); runtime.flushFlowActions();
assert.equal(completions, 3, "legacy-only Scene has no executable canonical document");
console.log("SceneLogicRuntime.smoke: PASS");

const sequenceDocument = {
  ...document,
  version: 2 as const,
  actions: [
    { id: "start", category: "flow" as const, type: "start_sequence" as const, sequenceInstanceId: "finish:a" },
    { id: "complete", category: "flow" as const, type: "complete_level" as const },
  ],
  eventActionBindings: [{ eventId: "end-event", actionId: "start" }],
  sequenceDefinitions: [{ id: "finish", steps: [{ kind: "wait" as const, durationSec: 0.1 }, { kind: "action" as const, actionId: "complete" }] }],
  sequenceInstances: [{ id: "finish:a", definitionId: "finish" }, { id: "finish:b", definitionId: "finish" }],
};
const sequenceSession = makeSessionState();
const sequenceEvents: unknown[] = [];
const sequenceRuntime = new SceneLogicRuntime(
  { restartLevel: () => { resetLevel(sequenceSession); sequenceRuntime.reset(); }, completeLevel: () => completeLevel(sequenceSession) },
  { dispatch: occurrence => sequenceEvents.push(occurrence) },
);
sequenceRuntime.activate(sequenceDocument);
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.status, "idle");
sequenceRuntime.evaluatePlayerWorldX(90);
sequenceRuntime.evaluatePlayerWorldX(100);
sequenceRuntime.updateFlow(0.05, () => sequenceSession.levelState === "active");
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.status, "running", "crossing action starts the instance in the same Flow phase");
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.waitElapsedSec, 0.05);
assert.equal(sequenceRuntime.getSequenceInstance("finish:b")?.status, "idle", "instances sharing a Definition are independent");
sequenceRuntime.startSequence("finish:a");
sequenceRuntime.updateFlow(0.05, () => sequenceSession.levelState === "active");
assert.equal(sequenceSession.levelState, "active", "Sequence direct Action is queued for the next Flow tick");
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.status, "completed");
sequenceRuntime.startSequence("finish:a");
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.status, "completed", "completed instances do not replay");
sequenceRuntime.updateFlow(1 / 60, () => sequenceSession.levelState === "active");
assert.equal(sequenceSession.levelState, "completed", "queued Sequence completion reaches the authoritative Flow owner");
sequenceRuntime.reset();
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.status, "idle", "restart recreates idle Sequence memory");
sequenceRuntime.startSequence("finish:a");
sequenceRuntime.updateFlow(0.04);
const progress = sequenceRuntime.getSequenceInstance("finish:a")?.waitElapsedSec;
sequenceRuntime.rebaselinePlayerWorldPosition(500, 100);
assert.equal(sequenceRuntime.getSequenceInstance("finish:a")?.waitElapsedSec, progress, "authoring seek preserves Sequence progress");
assert.equal(sequenceEvents.length, 1, "activation and Sequence wait/action steps dispatch no extra Events");

// Unified production sample: all Trigger families share authored-order dispatch
// and keep their consequences behind the Flow boundary.
let speed = 10;
const speedEntry = { valueType: "number" as const, writable: true as const, read: () => speed, write: (value: boolean | number | string) => { speed = Number(value); } };
const states: StateRegistry = {
  resolve: address => { if (address !== "scene.scrollSpeed") throw new Error("missing"); return speedEntry; },
  resolveWritable: address => { if (address !== "scene.scrollSpeed") throw new Error("missing"); return speedEntry; },
};
const integratedDocument: SceneLogicDocumentV1 = {
  version: 1,
  spaces: {
    markers: [{ id: "marker", position: 25 }],
    ranges: [{ id: "range", start: 10, end: 20 }],
    zones: [{ id: "zone", minX: 30, maxX: 40, minY: 5, maxY: 15 }],
  },
  states: [{ id: "speed", address: "scene.scrollSpeed", valueType: "number" }],
  triggers: [
    { id: "time", kind: "time", relation: "after", timeSec: 0.25, mode: "once", enabled: true },
    { id: "range", kind: "space", relation: "enter", rangeId: "range", mode: "repeat", enabled: true },
    { id: "zone", kind: "space", relation: "enter", zoneId: "zone", mode: "once", enabled: true },
    { id: "state", kind: "state", stateId: "speed", relation: "==", value: 30, mode: "once", enabled: true },
  ],
  events: ["time", "range", "zone", "state"].map(id => ({ id: `${id}-event`, category: "scene" as const, type: id })),
  actions: [
    { id: "set-speed", category: "state", type: "set", stateId: "speed", value: 30 },
    { id: "range-complete", category: "flow", type: "complete_level" },
    { id: "zone-complete", category: "flow", type: "complete_level" },
    { id: "state-complete", category: "flow", type: "complete_level" },
  ],
  triggerEventBindings: ["time", "range", "zone", "state"].map(id => ({ triggerId: id, eventId: `${id}-event` })),
  eventActionBindings: [
    { eventId: "time-event", actionId: "set-speed" },
    { eventId: "range-event", actionId: "range-complete" },
    { eventId: "zone-event", actionId: "zone-complete" },
    { eventId: "state-event", actionId: "state-complete" },
  ],
};
let integratedCompletions = 0;
const integratedEvents: string[] = [];
const integrated = new SceneLogicRuntime(
  { restartLevel: () => {}, completeLevel: () => { integratedCompletions++; } },
  { dispatch: occurrence => integratedEvents.push(occurrence.eventId) },
  { states },
);
integrated.activate(integratedDocument);
const sample = (playerWorldX: number, playerWorldY: number, sceneTimeSec: number) =>
  integrated.evaluateSimulationSample({ playerWorldX, playerWorldY, sceneTimeSec });
assert.deepEqual(sample(0, 0, 0), [], "first unified sample establishes every baseline");
assert.deepEqual(sample(15, 10, 0.3).map(item => item.eventId), ["time-event", "range-event"], "same-sample occurrences follow authored order");
assert.equal(speed, 10, "Time State Action waits for Flow");
assert.equal(integratedCompletions, 0, "Range Flow Action waits for Flow");
integrated.updateFlow();
assert.equal(speed, 30, "supplied simulation time crosses the threshold without a clock owned by Scene Logic");
assert.equal(integratedCompletions, 1);
assert.deepEqual(sample(15, 10, 0.31).map(item => item.eventId), ["state-event"], "following Simulation observes the authoritative State write");
assert.equal(integratedCompletions, 1, "State consequence remains queued until Flow");
integrated.updateFlow();
assert.equal(integratedCompletions, 2);
assert.deepEqual(sample(35, 10, 0.32).map(item => item.eventId), ["zone-event"], "Zone requires X/Y containment");
integrated.updateFlow();
assert.equal(integratedCompletions, 3);
sample(0, 0, 0.33); sample(15, 10, 0.34); integrated.updateFlow();
assert.equal(integratedCompletions, 4, "repeat Range re-enters while once Triggers remain fired");

// Spatial authoring seek rebaselines Range/Zone only and preserves once memory,
// Time/State history, pending actions, and Sequence state.
speed = 10;
integrated.activate(integratedDocument);
sample(0, 0, 0);
integrated.rebaselinePlayerWorldPosition(15, 10);
assert.deepEqual(sample(15, 10, 0.1), [], "seek directly inside Range does not synthesize enter");
sample(0, 0, 0.2);
assert.deepEqual(sample(15, 10, 0.21).map(item => item.eventId), ["range-event"], "a genuine Range re-entry still occurs");
integrated.rebaselinePlayerWorldPosition(35, 10);
assert.deepEqual(sample(35, 10, 0.22), [], "seek directly inside Zone does not synthesize enter");
sample(50, 10, 0.23);
assert.deepEqual(sample(35, 10, 0.24).map(item => item.eventId), ["zone-event"], "a genuine Zone re-entry still occurs");
integrated.rebaselinePlayerWorldPosition(50, 10);
sample(50, 10, 0.245);
assert.deepEqual(sample(35, 10, 0.246), [], "spatial seek does not re-arm an already-fired once Zone Trigger");
integrated.rebaselinePlayerWorldPosition(0, 0);
assert.deepEqual(sample(0, 0, 0.3).map(item => item.eventId), ["time-event"], "spatial seek preserves Time baseline and threshold progression");
integrated.updateFlow();
integrated.rebaselinePlayerWorldPosition(0, 0);
assert.deepEqual(sample(0, 0, 0.31).map(item => item.eventId), ["state-event"], "spatial seek preserves State matched history");

integrated.reset();
assert.deepEqual(sample(35, 10, 1), [], "reset re-arms once memory and first sample is a baseline");
integrated.activate(integratedDocument);
assert.deepEqual(sample(15, 10, 1), [], "replacement cannot synthesize spatial, Time, or State occurrences");

const missingStateOwner = new SceneLogicRuntime({ restartLevel: () => {}, completeLevel: () => {} });
missingStateOwner.activate(integratedDocument);
assert.throws(() => missingStateOwner.evaluateSimulationSample({ playerWorldX: 0, playerWorldY: 0, sceneTimeSec: 0 }), /State Trigger requires its runtime owner/);

const eventStepSession = makeSessionState();
const eventStepOccurrences: unknown[] = [];
const eventStepRuntime = new SceneLogicRuntime(
  { restartLevel: () => resetLevel(eventStepSession), completeLevel: () => completeLevel(eventStepSession) },
  { dispatch: occurrence => eventStepOccurrences.push(occurrence) },
);
eventStepRuntime.activate({
  ...sequenceDocument,
  triggers: [], triggerEventBindings: [],
  actions: [{ id: "complete", category: "flow", type: "complete_level" }],
  eventActionBindings: [{ eventId: "end-event", actionId: "complete" }],
  sequenceDefinitions: [{ id: "semantic", steps: [{ kind: "event", eventId: "end-event" }] }],
  sequenceInstances: [{ id: "semantic:a", definitionId: "semantic" }],
});
eventStepRuntime.startSequence("semantic:a");
eventStepRuntime.updateFlow(1 / 60, () => eventStepSession.levelState === "active");
assert.deepEqual(eventStepOccurrences, [{ eventId: "end-event", type: "level_complete", sourceSequenceInstanceId: "semantic:a" }]);
assert.equal(eventStepSession.levelState, "active", "Event-bound Action waits for the next Flow tick");
eventStepRuntime.updateFlow(1 / 60, () => eventStepSession.levelState === "active");
assert.equal(eventStepSession.levelState, "completed", "Sequence Event uses normal Event-to-Action binding");
