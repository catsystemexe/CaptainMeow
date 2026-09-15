import assert from "node:assert/strict";
import { completeLevel, makeSessionState, resetLevel } from "../data/SessionState";
import type { SceneLogicDocumentV1 } from "./SceneLogicDocument";
import { SceneLogicRuntime } from "./SceneLogicRuntime";

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
