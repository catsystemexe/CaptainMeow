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
assert.equal(completions, 2, "authoring seek reset does not execute and resumed sample rebaselines");
runtime.activate({ ...document, triggers: [{ ...document.triggers[0], enabled: false }] });
runtime.evaluatePlayerWorldX(90); runtime.evaluatePlayerWorldX(110); runtime.flushFlowActions();
assert.equal(completions, 2, "disabled crossing stays inert");
runtime.activate(document); runtime.evaluatePlayerWorldX(110); runtime.evaluatePlayerWorldX(90); runtime.flushFlowActions();
assert.equal(completions, 2, "backward crossing stays inert");
runtime.activate(undefined); runtime.evaluatePlayerWorldX(0); runtime.evaluatePlayerWorldX(1000); runtime.flushFlowActions();
assert.equal(completions, 2, "legacy-only Scene has no executable canonical document");
console.log("SceneLogicRuntime.smoke: PASS");
