import assert from "node:assert/strict";
import {
  clickedTimelineCurrentX,
  createExactTimelineScale,
  createTimelineScale,
  timelineClientXToLocalPx,
  timelineLocalPxToWorld,
  worldToTimelinePx,
} from "./PixelBgrTimeline";

const scale = createExactTimelineScale(0, 3272, 3272);
assert.deepEqual(scale, { minX: 0, maxX: 3272, widthPx: 3272 }, "V2 scale uses the exact authored bounds");

for (const px of [0, 818, 1636, 3272]) {
  assert.equal(timelineLocalPxToWorld(px, scale), px, `timeline pixel ${px} maps to authored X ${px}`);
  assert.equal(worldToTimelinePx(px, scale), px, `authored X ${px} maps back to timeline pixel ${px}`);
}

const timelineLeft = 200;
assert.equal(clickedTimelineCurrentX(timelineLeft + 818, timelineLeft, scale), 818, "clientX is mapped relative to the timeline element bounds");
const scrolledTimelineLeft = -500;
assert.equal(clickedTimelineCurrentX(scrolledTimelineLeft + 818, scrolledTimelineLeft, scale), 818, "horizontal scrolling preserves timeline-element world mapping");
assert.equal(timelineClientXToLocalPx(scrolledTimelineLeft + 1636, scrolledTimelineLeft, scale.widthPx), 1636, "a scrolled bounding rect still produces the correct local pixel");

const v1Scale = createTimelineScale([{ startX: 0, length: 200 }], 40, 1000);
assert.deepEqual(v1Scale, { minX: -120, maxX: 840, widthPx: 1000 }, "V1 generic timeline padding remains unchanged");

assert.deepEqual(createExactTimelineScale(5, 5, 0), { minX: 5, maxX: 6, widthPx: 1 }, "exact scale protects its minimum span and width");

console.log("[SMOKE] PixelBgrV2TimelineScale OK ✅");
