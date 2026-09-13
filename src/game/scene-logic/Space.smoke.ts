import assert from "node:assert/strict";
import {
  rangeContains,
  validateMarker,
  validateRange,
  validateZone,
  zoneContains,
  type Marker,
  type Range,
  type Zone,
} from "./Space";

function invalidFields(result: ReturnType<typeof validateMarker>): string[] {
  return result.issues.map((issue) => issue.field);
}

const marker: Marker = { id: "boss_gate", position: 120 };
assert.equal(validateMarker(marker).valid, true, "a marker accepts a stable identity and finite position");
assert.equal(validateMarker({ ...marker, id: "  " }).valid, false, "a marker rejects an empty identity");
assert(invalidFields(validateMarker({ ...marker, position: Number.NaN })).includes("position"));
assert(invalidFields(validateMarker({ ...marker, position: Number.POSITIVE_INFINITY })).includes("position"));
assert(invalidFields(validateMarker({ ...marker, position: Number.NEGATIVE_INFINITY })).includes("position"));

const range: Range = { id: "arena_x", start: 10, end: 20 };
assert.equal(validateRange(range).valid, true);
assert.equal(validateRange({ ...range, id: "" }).valid, false, "a range rejects an empty identity");
assert.equal(rangeContains(range, 15), true, "range contains its interior");
assert.equal(rangeContains(range, 10), true, "range includes its lower boundary");
assert.equal(rangeContains(range, 20), true, "range includes its upper boundary");
assert.equal(rangeContains(range, 9), false, "range excludes values before it");
assert.equal(rangeContains(range, 21), false, "range excludes values after it");
assert.equal(validateRange({ ...range, start: 21 }).valid, false, "range rejects reversed boundaries");
assert.equal(validateRange({ ...range, start: Number.NaN }).valid, false);
assert.equal(validateRange({ ...range, end: Number.POSITIVE_INFINITY }).valid, false);
const zeroLengthRange: Range = { id: "single_x", start: 4, end: 4 };
assert.equal(validateRange(zeroLengthRange).valid, true, "zero-length ranges are valid closed intervals");
assert.equal(rangeContains(zeroLengthRange, 4), true);
assert.equal(rangeContains(zeroLengthRange, 4.01), false);

const zone: Zone = { id: "boss_arena", minX: 10, maxX: 20, minY: 30, maxY: 40 };
assert.equal(validateZone(zone).valid, true);
assert.equal(validateZone({ ...zone, id: "\t" }).valid, false, "a zone rejects an empty identity");
assert.equal(zoneContains(zone, 15, 35), true, "zone contains its interior");
assert.equal(zoneContains(zone, 10, 35), true, "zone includes its left boundary");
assert.equal(zoneContains(zone, 20, 35), true, "zone includes its right boundary");
assert.equal(zoneContains(zone, 15, 30), true, "zone includes its top boundary");
assert.equal(zoneContains(zone, 15, 40), true, "zone includes its bottom boundary");
assert.equal(zoneContains(zone, 10, 30), true, "zone includes boundary intersections");
assert.equal(zoneContains(zone, 9, 35), false, "zone excludes points outside X");
assert.equal(zoneContains(zone, 15, 41), false, "zone excludes points outside Y");
assert.equal(validateZone({ ...zone, minX: 21 }).valid, false, "zone rejects an inverted X interval");
assert.equal(validateZone({ ...zone, minY: 41 }).valid, false, "zone rejects an inverted Y interval");
assert.equal(validateZone({ ...zone, maxX: Number.NaN }).valid, false);
assert.equal(validateZone({ ...zone, minY: Number.NEGATIVE_INFINITY }).valid, false);
const zeroSizeZone: Zone = { id: "single_position", minX: 5, maxX: 5, minY: 8, maxY: 8 };
assert.equal(validateZone(zeroSizeZone).valid, true, "zero-size zones are valid closed areas");
assert.equal(zoneContains(zeroSizeZone, 5, 8), true);
assert.equal(zoneContains(zeroSizeZone, 5, 8.01), false);

const rangeBefore = { ...range };
const zoneBefore = { ...zone };
const firstRangeResult = rangeContains(range, 15);
const firstZoneResult = zoneContains(zone, 15, 35);
assert.equal(rangeContains(range, 15), firstRangeResult, "range containment is deterministic");
assert.equal(zoneContains(zone, 15, 35), firstZoneResult, "zone containment is deterministic");
assert.deepEqual(range, rangeBefore, "range containment does not mutate its definition");
assert.deepEqual(zone, zoneBefore, "zone containment does not mutate its definition");

console.log("[SMOKE] Scene Logic Space OK ✅");
