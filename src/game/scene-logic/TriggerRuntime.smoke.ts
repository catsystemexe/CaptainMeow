import assert from "node:assert/strict";
import type { Marker, Range, Zone } from "./Space";
import {
  resolveTriggerMarker,
  resolveTriggerRange,
  resolveTriggerZone,
  validateMarkerCrossTrigger,
  validateRangeSpaceTrigger,
  validateZoneSpaceTrigger,
  type MarkerCrossTriggerDefinition,
  type RangeSpaceTriggerDefinition,
  type ZoneSpaceTriggerDefinition,
} from "./Trigger";
import {
  createContainmentTriggerRuntimeState,
  createMarkerCrossTriggerRuntimeState,
  evaluateMarkerCrossTrigger,
  evaluateRangeSpaceTrigger,
  evaluateZoneSpaceTrigger,
} from "./TriggerRuntime";

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

const range: Range = { id: "arena", start: 100, end: 200 };
const rangeTrigger: RangeSpaceTriggerDefinition = {
  id: "enter_arena",
  kind: "space",
  relation: "enter",
  rangeId: range.id,
  mode: "repeat",
  enabled: true,
};
function rangeSamples(
  trigger: RangeSpaceTriggerDefinition,
  positions: readonly number[],
): Array<string | null> {
  const state = createContainmentTriggerRuntimeState();
  return positions.map((x) => evaluateRangeSpaceTrigger(trigger, range, state, x)?.triggerId ?? null);
}

assert.equal(validateRangeSpaceTrigger(rangeTrigger).valid, true);
for (const [field, value] of [
  ["id", ""], ["kind", "time"], ["relation", "cross"], ["rangeId", " "], ["mode", "many"], ["enabled", 1],
] as const) {
  const result = validateRangeSpaceTrigger({ ...rangeTrigger, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid Range Trigger ${field} is reported`);
}
assert.deepEqual(rangeSamples(rangeTrigger, [150]), [null], "first Range sample inside establishes a baseline only");
assert.deepEqual(rangeSamples(rangeTrigger, [90, 100, 150]), [null, rangeTrigger.id, null], "Range enter includes its boundary");
assert.deepEqual(rangeSamples(rangeTrigger, [210, 150]), [null, rangeTrigger.id], "Range enter is direction-independent");
const rangeInside = { ...rangeTrigger, id: "inside_arena", relation: "inside" } as const;
assert.deepEqual(rangeSamples(rangeInside, [90, 150, 175, 210, 150]), [null, rangeInside.id, null, null, rangeInside.id], "inside is one occurrence per outside-to-inside transition");
const rangeExit = { ...rangeTrigger, id: "exit_arena", relation: "exit" } as const;
assert.deepEqual(rangeSamples(rangeExit, [150, 210, 220, 150, 90]), [null, rangeExit.id, null, null, rangeExit.id], "Range exit repeats on inside-to-outside transitions in either direction");
assert.deepEqual(rangeSamples({ ...rangeInside, mode: "once" }, [90, 150, 210, 150]), [null, rangeInside.id, null, null], "Range once latches only after an occurrence");

const disabledRangeState = createContainmentTriggerRuntimeState();
evaluateRangeSpaceTrigger({ ...rangeTrigger, enabled: false }, range, disabledRangeState, 90);
evaluateRangeSpaceTrigger({ ...rangeTrigger, enabled: false }, range, disabledRangeState, 150);
assert.equal(evaluateRangeSpaceTrigger(rangeTrigger, range, disabledRangeState, 150), null, "enabling inside does not retro-fire");
evaluateRangeSpaceTrigger(rangeTrigger, range, disabledRangeState, 210);
assert.deepEqual(evaluateRangeSpaceTrigger(rangeTrigger, range, disabledRangeState, 150), { triggerId: rangeTrigger.id });

const zone: Zone = { id: "room", minX: 10, maxX: 20, minY: 30, maxY: 40 };
const zoneTrigger: ZoneSpaceTriggerDefinition = {
  id: "enter_room",
  kind: "space",
  relation: "enter",
  zoneId: zone.id,
  mode: "repeat",
  enabled: true,
};
function zoneSamples(trigger: ZoneSpaceTriggerDefinition, points: ReadonlyArray<readonly [number, number]>): Array<string | null> {
  const state = createContainmentTriggerRuntimeState();
  return points.map(([x, y]) => evaluateZoneSpaceTrigger(trigger, zone, state, x, y)?.triggerId ?? null);
}

assert.equal(validateZoneSpaceTrigger(zoneTrigger).valid, true);
for (const [field, value] of [
  ["id", ""], ["kind", "state"], ["relation", "cross"], ["zoneId", "\t"], ["mode", "many"], ["enabled", "yes"],
] as const) {
  const result = validateZoneSpaceTrigger({ ...zoneTrigger, [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field), `invalid Zone Trigger ${field} is reported`);
}
assert.deepEqual(zoneSamples(zoneTrigger, [[15, 35]]), [null], "first Zone sample establishes a baseline only");
assert.deepEqual(zoneSamples(zoneTrigger, [[0, 35], [10, 30], [15, 35]]), [null, zoneTrigger.id, null], "Zone enter includes corners and does not fire continuously");
const zoneInside = { ...zoneTrigger, id: "inside_room", relation: "inside" } as const;
assert.deepEqual(zoneSamples(zoneInside, [[0, 35], [15, 35], [15, 45], [20, 40]]), [null, zoneInside.id, null, zoneInside.id], "Zone inside repeats only after leaving");
const zoneExit = { ...zoneTrigger, id: "exit_room", relation: "exit" } as const;
assert.deepEqual(zoneSamples(zoneExit, [[15, 35], [25, 35], [15, 35], [15, 25]]), [null, zoneExit.id, null, zoneExit.id], "Zone exit detects every inside-to-outside direction");

assert.equal(resolveTriggerRange(rangeTrigger, [range]), range);
assert.equal(resolveTriggerZone(zoneTrigger, [zone]), zone);
assert.throws(() => resolveTriggerRange({ ...rangeTrigger, rangeId: "missing" }, [range]), /missing Range "missing"/);
assert.throws(() => resolveTriggerZone({ ...zoneTrigger, zoneId: "missing" }, [zone]), /missing Zone "missing"/);
assert.throws(() => evaluateRangeSpaceTrigger(rangeTrigger, { ...range, id: "other" }, createContainmentTriggerRuntimeState(), 90), /expected Range/);
assert.throws(() => evaluateZoneSpaceTrigger(zoneTrigger, { ...zone, id: "other" }, createContainmentTriggerRuntimeState(), 0, 0), /expected Zone/);

const rangeBefore = { ...range };
const rangeTriggerBefore = { ...rangeTrigger };
const containmentState = createContainmentTriggerRuntimeState();
evaluateRangeSpaceTrigger(rangeTrigger, range, containmentState, 90);
evaluateRangeSpaceTrigger(rangeTrigger, range, containmentState, 150);
assert.deepEqual(range, rangeBefore, "evaluation does not mutate Range geometry");
assert.deepEqual(rangeTrigger, rangeTriggerBefore, "evaluation does not mutate authored Range Trigger data");
assert.deepEqual(containmentState, { previousInside: true, fired: false }, "containment lifecycle state remains separate");

console.log("[SMOKE] Scene Logic Space Trigger runtime OK ✅");
