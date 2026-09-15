import assert from "node:assert/strict";
import type { SceneLogicActionDefinition } from "./Action";
import type { SceneEventDefinition } from "./Event";
import {
  validateSequenceDefinition, validateSequenceInstanceInputs, validateSequenceStep, type SequenceDefinition,
} from "./Sequence";
import {
  createSequenceInstance, startSequenceInstance, updateSequenceInstance, type SequenceRuntimeAdapters,
} from "./SequenceRuntime";

const events = [
  { id: "opened", category: "scene", type: "door_opened" },
  { id: "ready", category: "scene", type: "room_ready" },
] as const satisfies readonly SceneEventDefinition[];
const actions = [
  { id: "stop", category: "world", type: "stop_scroll" },
  { id: "complete", category: "flow", type: "complete_level" },
] as const satisfies readonly SceneLogicActionDefinition[];
const references = { events, actions };
const calls: string[] = [];
const adapters: SequenceRuntimeAdapters = {
  ...references,
  dispatchEvent: (event, instance) => { calls.push(`event:${event.id}:${instance.id}`); },
  executeAction: (action, instance) => { calls.push(`action:${action.id}:${instance.id}`); },
};
const definition: SequenceDefinition = {
  id: "seq-door-open",
  steps: [
    { kind: "event", eventId: "opened" },
    { kind: "wait", durationSec: 1 },
    { kind: "action", actionId: "stop" },
  ],
};

assert.equal(validateSequenceDefinition({ id: "empty", steps: [] }, references).valid, true, "empty Definitions are valid");
assert.equal(validateSequenceDefinition(definition, references).valid, true);
assert.equal(validateSequenceDefinition({ ...definition, id: " " }, references).valid, false);
assert.equal(validateSequenceDefinition({ id: "bad", steps: {} }, references).valid, false);
assert.equal(validateSequenceInstanceInputs("seq-door-open:a", definition, references).valid, true);
assert.equal(validateSequenceInstanceInputs("", definition, references).valid, false);
for (const durationSec of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  assert.equal(validateSequenceStep({ kind: "wait", durationSec }, references).valid, false);
}
assert.equal(validateSequenceStep({ kind: "wait", durationSec: 0 }, references).valid, true);
assert.equal(validateSequenceStep({ kind: "event", eventId: "missing" }, references).valid, false);
assert.equal(validateSequenceStep({ kind: "action", actionId: "missing" }, references).valid, false);
for (const kind of ["trigger", "sequence", "branch", "parallel", "loop"]) {
  assert.equal(validateSequenceStep({ kind }, references).valid, false, `${kind} is not supported`);
}
assert.equal(validateSequenceStep({ kind: "event", eventId: "broken" }, {
  ...references, events: [...events, { id: "broken", category: "scene", type: "" }],
}).valid, false);
assert.equal(validateSequenceStep({ kind: "action", actionId: "broken" }, {
  ...references, actions: [...actions, { id: "broken", category: "world", type: "bad" } as never],
}).valid, false);

const authoredSnapshot = structuredClone(definition);
const instance = createSequenceInstance("seq-door-open:a", definition, references);
assert.equal(instance.id, "seq-door-open:a");
assert.equal(instance.definition, definition, "Instance retains its Definition reference rather than flattening steps");
assert.equal(instance.definition.id, "seq-door-open");
updateSequenceInstance(instance, 1, adapters);
assert.deepEqual(calls, [], "idle Instance does nothing");
startSequenceInstance(instance);
assert.equal(instance.status, "running");
updateSequenceInstance(instance, 0.25, adapters);
assert.deepEqual(calls, ["event:opened:seq-door-open:a"]);
assert.equal(instance.stepIndex, 1);
assert.equal(instance.waitElapsedSec, 0.25);
updateSequenceInstance(instance, 0.75, adapters);
assert.deepEqual(calls, ["event:opened:seq-door-open:a", "action:stop:seq-door-open:a"]);
assert.equal(instance.status, "completed", "exact remaining Wait dt carries forward to immediate steps");
updateSequenceInstance(instance, 100, adapters);
startSequenceInstance(instance);
assert.equal(instance.status, "completed", "completed Instances cannot restart or repeat steps");
assert.equal(calls.length, 2);
assert.deepEqual(definition, authoredSnapshot, "execution does not mutate the Definition");

const largerDt = createSequenceInstance("larger", definition, references);
startSequenceInstance(largerDt);
updateSequenceInstance(largerDt, 2, adapters);
assert.equal(largerDt.status, "completed", "leftover dt continues after a completed Wait");
const exactWait: SequenceDefinition = { id: "exact", steps: [{ kind: "wait", durationSec: 1 }] };
const exact = createSequenceInstance("exact:a", exactWait, references);
startSequenceInstance(exact);
updateSequenceInstance(exact, 1, adapters);
assert.equal(exact.status, "completed");

const zeroAndOrder: SequenceDefinition = {
  id: "zero-order",
  steps: [
    { kind: "event", eventId: "opened" }, { kind: "wait", durationSec: 0 },
    { kind: "action", actionId: "stop" }, { kind: "event", eventId: "ready" },
    { kind: "action", actionId: "complete" },
  ],
};
calls.length = 0;
const zero = createSequenceInstance("zero:a", zeroAndOrder, references);
startSequenceInstance(zero);
updateSequenceInstance(zero, 0, adapters);
assert.equal(zero.status, "completed", "zero Wait advances in the same update with zero dt");
assert.deepEqual(calls, [
  "event:opened:zero:a", "action:stop:zero:a", "event:ready:zero:a", "action:complete:zero:a",
], "immediate adapters execute once in authored order");

calls.length = 0;
const first = createSequenceInstance("shared:a", definition, references);
const second = createSequenceInstance("shared:b", definition, references);
startSequenceInstance(first);
startSequenceInstance(second);
updateSequenceInstance(first, 0.5, adapters);
updateSequenceInstance(second, 0.25, adapters);
assert.equal(first.waitElapsedSec, 0.5);
assert.equal(second.waitElapsedSec, 0.25);
assert.equal(first.definition, second.definition);
assert.deepEqual(calls, ["event:opened:shared:a", "event:opened:shared:b"]);

const empty = createSequenceInstance("empty:a", { id: "empty", steps: [] }, references);
startSequenceInstance(empty);
updateSequenceInstance(empty, 0, adapters);
assert.equal(empty.status, "completed");
for (const dt of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
  const invalidDt = createSequenceInstance(`invalid-dt-${String(dt)}`, exactWait, references);
  assert.throws(() => updateSequenceInstance(invalidDt, dt, adapters), /finite non-negative/);
}
assert.throws(() => createSequenceInstance("bad", {
  id: "bad", steps: [{ kind: "event", eventId: "missing" }],
}, references), /missing Scene Event/);

console.log("[SMOKE] Scene Logic linear Sequence runtime OK ✅");
