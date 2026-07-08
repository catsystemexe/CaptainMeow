import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyChunkTimelineDrag, chunkEndX, chunkOverlapRanges, chunkTimelineBlocks, createTimelineScale, MIN_CHUNK_TIMELINE_LENGTH, shouldHandleTimelinePointerEvent, timelinePointerDeltaWorld, timelinePxToWorld, worldToTimelinePx, overlapsForChunk, snapTimelineValue } from "./PixelBgrTimeline";
import type { BackgroundChunk } from "../render/webgl/bg/layers/BackgroundSceneTypes";

const chunks: BackgroundChunk[] = [
  { id: "a", startX: 0, length: 100, layers: [] },
  { id: "b", startX: 80, length: 50, layers: [] },
  { id: "c", startX: 130, length: 70, layers: [] },
];
assert.equal(chunkEndX(chunks[0]), 100);
assert.deepEqual(chunkOverlapRanges(chunks), [{ startX: 80, endX: 100 }]);
assert.deepEqual(overlapsForChunk("a", chunks), [{ startX: 80, endX: 100 }]);
const scale = createTimelineScale(chunks, 40, 1000);
assert.equal(Math.round(timelinePxToWorld(worldToTimelinePx(80, scale), scale)), 80);
assert.equal(Math.round(timelinePointerDeltaWorld(200, 260, scale)), Math.round(timelinePxToWorld(60, scale) - timelinePxToWorld(0, scale)));
assert.equal(shouldHandleTimelinePointerEvent({ pointerId: 7, active: true }, 7), true);
assert.equal(shouldHandleTimelinePointerEvent({ pointerId: 7, active: true }, 8), false);
assert.equal(shouldHandleTimelinePointerEvent({ pointerId: 7, active: false }, 7), false);
assert.equal(shouldHandleTimelinePointerEvent(null, 7), false);
const blocks = chunkTimelineBlocks(chunks, "b", scale);
assert.equal(blocks.length, 3);
assert.equal(blocks[1].selected, true);
assert.ok(blocks[1].widthPx > 0);
assert.deepEqual(chunkOverlapRanges([{ id: "touch-a", startX: 0, length: 10 }, { id: "touch-b", startX: 10, length: 5 }]), []);

assert.equal(snapTimelineValue(23, 16), 16);
assert.equal(snapTimelineValue(25, 16), 32);
assert.deepEqual(applyChunkTimelineDrag({ startX: 100, length: 120 }, "move", 29, { snapPx: 16, minLength: 64 }), { startX: 128, length: 120 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 8, length: 120 }, "move", -50, { snapPx: 16, minLength: 64 }), { startX: 0, length: 120 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 100, length: 120 }, "resize-right", 37, { snapPx: 16, minLength: 64 }), { startX: 100, length: 156 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 100, length: 120 }, "resize-right", -200, { snapPx: 16, minLength: 64 }), { startX: 100, length: 64 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 100, length: 120 }, "resize-left", -37, { snapPx: 16, minLength: 64 }), { startX: 64, length: 156 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 100, length: 120 }, "resize-left", 200, { snapPx: 16, minLength: 64 }), { startX: 156, length: 64 });
assert.deepEqual(applyChunkTimelineDrag({ startX: 40, length: 100 }, "resize-left", -100, { snapPx: 16, minLength: MIN_CHUNK_TIMELINE_LENGTH }), { startX: 0, length: 140 });
const moved = chunks.map(c => c.id === "a" ? { ...c, ...applyChunkTimelineDrag(c, "move", 96, { snapPx: 16, minLength: 64 }) } : c);
assert.deepEqual(chunkOverlapRanges(moved), [{ startX: 96, endX: 130 }, { startX: 130, endX: 196 }]);
const sceneLabSource = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const enemyLabSource = readFileSync(new URL("../dev/DevSummoner.ts", import.meta.url), "utf8");
assert(sceneLabSource.includes("--cm-scene-lab-opacity"), "Scene Lab opacity uses a namespaced CSS variable");
assert(!sceneLabSource.includes("--cm-bgr-lab-opacity"), "Scene Lab no longer uses the previous shared opacity variable");
assert(!enemyLabSource.includes("--cm-scene-lab-opacity"), "Enemy Lab does not consume Scene Lab opacity state");
assert(sceneLabSource.includes("setPointerCapture") && sceneLabSource.includes("window.addEventListener(\"pointermove\", this.onTimelinePointerMove)"), "timeline drag uses pointer capture plus window-level move handling");
assert(sceneLabSource.includes("releasePointerCapture") && sceneLabSource.includes("window.removeEventListener(\"pointerup\", this.onTimelinePointerUp)"), "timeline drag cleans up window-level pointer listeners on pointerup/cancel");
assert(sceneLabSource.includes("beginCursorDrag"), "preview cursor has a drag path");
console.log("[SMOKE] PixelBgrTimeline OK ✅");
