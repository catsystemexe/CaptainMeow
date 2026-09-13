import assert from "node:assert/strict";
import type { Marker } from "./Space";
import { resolveTriggerMarker, validateMarkerCrossTrigger, type MarkerCrossTriggerDefinition } from "./Trigger";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger } from "./TriggerRuntime";

const marker: Marker = { id: "gate", position: 100 };
const once: MarkerCrossTriggerDefinition = {
  id: "cross_gate_once",
  kind: "space",
  relation: "cross",
  markerId: marker.id,
  mode: "once",
  enabled: true,
};
const repeat: MarkerCrossTriggerDefinition = { ...once, id: "cross_gate_repeat", mode: "repeat" };

function samples(trigger: MarkerCrossTriggerDefinition, positions: readonly number[]): Array<string | null> {
  const state = createMarkerCrossTriggerRuntimeState();
  return positions.map((currentX) => evaluateMarkerCrossTrigger(trigger, marker, state, currentX)?.triggerId ?? null);
}

assert.equal(validateMarkerCrossTrigger(once).valid, true);
for (const [field, value] of [
  ["id", ""],
  ["kind", "time"],
  ["relation", "inside"],
  ["markerId", "  "],
  ["mode", "many"],
  ["enabled", "yes"],
] as const) {
  const result = validateMarkerCrossTrigger({ ...once, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid ${field} is reported`);
}

assert.deepEqual(samples(repeat, [90, 100]), [null, repeat.id], "below to exact boundary fires");
assert.deepEqual(samples(repeat, [90, 110]), [null, repeat.id], "below to beyond boundary fires");
assert.deepEqual(samples(repeat, [90, 95]), [null, null], "movement wholly below does not fire");
assert.deepEqual(samples(repeat, [100, 110]), [null, null], "starting on the boundary does not fire");
assert.deepEqual(samples(repeat, [110, 120]), [null, null], "movement wholly above does not fire");
assert.deepEqual(samples(repeat, [110, 90]), [null, null], "backward crossing does not fire");
assert.deepEqual(samples(repeat, [150]), [null], "the first sample only establishes a baseline");
assert.deepEqual(samples(repeat, [99, 100, 100]), [null, repeat.id, null], "an exact crossing fires only once while at the boundary");
assert.deepEqual(samples(once, [90, 110, 80, 110]), [null, once.id, null, null], "once never re-arms");
assert.deepEqual(samples(repeat, [90, 110, 120, 80, 110]), [null, repeat.id, null, null, repeat.id], "repeat re-arms below the Marker");

const disabledState = createMarkerCrossTriggerRuntimeState();
const disabled: MarkerCrossTriggerDefinition = { ...repeat, enabled: false };
assert.equal(evaluateMarkerCrossTrigger(disabled, marker, disabledState, 90), null);
assert.equal(evaluateMarkerCrossTrigger(disabled, marker, disabledState, 110), null, "a disabled crossing does not fire");
assert.equal(evaluateMarkerCrossTrigger(repeat, marker, disabledState, 110), null, "enabling above does not retro-fire");
assert.equal(evaluateMarkerCrossTrigger(repeat, marker, disabledState, 80), null);
assert.deepEqual(evaluateMarkerCrossTrigger(repeat, marker, disabledState, 110), { triggerId: repeat.id });

const disabledOnceState = createMarkerCrossTriggerRuntimeState();
const disabledOnce: MarkerCrossTriggerDefinition = { ...once, enabled: false };
evaluateMarkerCrossTrigger(disabledOnce, marker, disabledOnceState, 90);
evaluateMarkerCrossTrigger(disabledOnce, marker, disabledOnceState, 110);
evaluateMarkerCrossTrigger(once, marker, disabledOnceState, 80);
assert.deepEqual(evaluateMarkerCrossTrigger(once, marker, disabledOnceState, 110), { triggerId: once.id }, "once may fire later if its disabled crossing was ignored");

assert.equal(resolveTriggerMarker(once, [marker]), marker);
assert.throws(() => resolveTriggerMarker({ ...once, markerId: "missing" }, [marker]), /missing Marker "missing"/);
assert.throws(() => evaluateMarkerCrossTrigger(once, { ...marker, id: "other" }, createMarkerCrossTriggerRuntimeState(), 90), /expected Marker/);

const markerBefore = { ...marker };
const triggerBefore = { ...repeat };
const purityState = createMarkerCrossTriggerRuntimeState();
evaluateMarkerCrossTrigger(repeat, marker, purityState, 90);
evaluateMarkerCrossTrigger(repeat, marker, purityState, 110);
assert.deepEqual(marker, markerBefore, "evaluation does not mutate Marker geometry");
assert.deepEqual(repeat, triggerBefore, "evaluation does not mutate authored Trigger data");
assert.deepEqual(purityState, { previousX: 110, fired: false }, "lifecycle mutation remains in separate runtime state");

console.log("[SMOKE] Scene Logic Marker cross Trigger runtime OK ✅");
