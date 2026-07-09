import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyChunkTimelineDrag, chunkEndX, chunkJumpState, chunkOverlapRanges, chunkTimelineBlocks, clickedTimelineCurrentX, createTimelineScale, cursorDragCurrentX, MIN_CHUNK_TIMELINE_LENGTH, sceneTimelineBounds, shouldHandleTimelinePointerEvent, timelinePointerDeltaWorld, timelinePxToWorld, worldToTimelinePx, overlapsForChunk, snapTimelineValue } from "./PixelBgrTimeline";
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

const dragScale = { minX: 0, maxX: 1000, widthPx: 1000 };
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: 140, dragStartCurrentX: 200, scale: dragScale }), 240, "positive mouse delta moves Current X forward from drag-start value");
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: 60, dragStartCurrentX: 200, scale: dragScale }), 160, "negative mouse delta moves Current X backward from drag-start value");
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: 120, dragStartCurrentX: 200, scale: dragScale }), 220, "first move uses total pointer delta");
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: 130, dragStartCurrentX: 200, scale: dragScale }), 230, "repeated pointermove events do not accumulate from previous mutations");
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: 130, dragStartCurrentX: 200, scale: dragScale }), 230, "mouseup recomputes the same value without another jump");
assert.equal(clickedTimelineCurrentX(250, 50, dragScale), 200, "click places cursor at expected timeline X");
assert.equal(cursorDragCurrentX({ dragStartClientX: 100, currentClientX: -100, dragStartCurrentX: 50, scale: dragScale, minX: 0, maxX: 1000 }), 0, "cursor drag clamps to scene start");
assert.deepEqual(sceneTimelineBounds(chunks, 0), { startX: 0, endX: 200 });
assert.deepEqual(chunkJumpState(chunks, 80), { previousX: 0, nextX: 130, canPrevious: true, canNext: true }, "previous and next chunk selection use sorted startX values");
assert.deepEqual(chunkJumpState(chunks, 0), { previousX: null, nextX: 80, canPrevious: false, canNext: true }, "previous edge button is disabled");
assert.deepEqual(chunkJumpState(chunks, 200), { previousX: 130, nextX: null, canPrevious: true, canNext: false }, "next edge button is disabled");
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
assert(sceneLabSource.includes("beginCursorDrag"), "Current X cursor has a drag path");
assert(sceneLabSource.includes("Current X"), "Scene Lab presents one user-facing Current X value");
assert(!sceneLabSource.includes(`scrollX",this.numericStepper`), "Scene Lab no longer exposes preview scrollX as a competing main control");
assert(sceneLabSource.includes("PREVIEW") && sceneLabSource.includes("GAMEPLAY"), "Scene Lab shows preview/gameplay mode indicator state");
assert(sceneLabSource.includes("Previous chunk") && sceneLabSource.includes("Stop and return to start") && sceneLabSource.includes("Next chunk"), "transport controls expose required labels");
assert(sceneLabSource.includes("startClientX:e.clientX") && sceneLabSource.includes("startCurrentX:this.currentX()"), "cursor drag stores drag-start pointer X and drag-start Current X");
assert(sceneLabSource.includes("cursorDragCurrentX"), "cursor drag uses drag-start value plus total pointer delta");
assert(sceneLabSource.includes("pointercancel") && sceneLabSource.includes("this.onCursorPointerUp"), "pointer cancel clears cursor drag state");
assert(sceneLabSource.includes("enabled:true,paused:!st.paused,scrollX:currentX"), "Play starts from Current X");
assert(sceneLabSource.includes("scrollX:start"), "Stop returns Current X to scene start");

console.log("[SMOKE] PixelBgrTimeline OK ✅");
