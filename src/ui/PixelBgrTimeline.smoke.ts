import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeBackgroundPreviewState, playerLevelXToPreviewScrollX, previewScrollXToPlayerLevelX, resolvePlayerScreenAnchorX, stepBackgroundPreviewState } from "../render/BackgroundState";
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

const anchorX = resolvePlayerScreenAnchorX(340, 220, 100);
assert.equal(anchorX, 120, "player screen anchor is live player world X minus gameplay scroll X");
assert.equal(resolvePlayerScreenAnchorX(Number.NaN, 220, 96), 96, "invalid anchor inputs fall back safely");
assert.equal(playerLevelXToPreviewScrollX(640, anchorX), 520, "player level X converts to preview background/camera scroll");
assert.equal(previewScrollXToPlayerLevelX(520, anchorX), 640, "preview background/camera scroll converts back to player level X");
assert.deepEqual(normalizeBackgroundPreviewState({ enabled: true, paused: true, scrollX: Number.NaN, playerLevelX: Number.POSITIVE_INFINITY, speed: Number.NaN }), { enabled: true, paused: true, scrollX: 0, playerLevelX: 0, speed: 90 }, "invalid preview coordinates normalize to finite safe values");
assert.deepEqual(stepBackgroundPreviewState({ enabled: true, paused: false, scrollX: 10, playerLevelX: 130, speed: 20 }, 0.5), { enabled: true, paused: false, scrollX: 20, playerLevelX: 140, speed: 20 }, "preview playback advances background scroll and player level X together");
assert.deepEqual(stepBackgroundPreviewState({ enabled: true, paused: true, scrollX: 10, playerLevelX: 130, speed: 20 }, 0.5), { enabled: true, paused: true, scrollX: 10, playerLevelX: 130, speed: 20 }, "paused preview freezes background scroll and player level X together");

const sceneLabSource = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const enemyLabSource = readFileSync(new URL("../dev/DevSummoner.ts", import.meta.url), "utf8");
assert(sceneLabSource.includes("--cm-scene-lab-opacity"), "Scene Lab opacity uses a namespaced CSS variable");
assert(!sceneLabSource.includes("--cm-bgr-lab-opacity"), "Scene Lab no longer uses the previous shared opacity variable");
assert(!enemyLabSource.includes("--cm-scene-lab-opacity"), "Enemy Lab does not consume Scene Lab opacity state");
assert(sceneLabSource.includes("setPointerCapture") && sceneLabSource.includes("window.addEventListener(\"pointermove\", this.onTimelinePointerMove)"), "timeline drag uses pointer capture plus window-level move handling");
assert(sceneLabSource.includes("releasePointerCapture") && sceneLabSource.includes("window.removeEventListener(\"pointerup\", this.onTimelinePointerUp)"), "timeline drag cleans up window-level pointer listeners on pointerup/cancel");
assert(sceneLabSource.includes("beginCursorDrag"), "Current X cursor has a drag path");
assert(sceneLabSource.includes("Player X:"), "Scene Lab presents the user-facing value as player level X");
assert(!sceneLabSource.includes(`scrollX",this.numericStepper`), "Scene Lab no longer exposes preview scrollX as a competing main control");
assert(sceneLabSource.includes("PREVIEW") && sceneLabSource.includes("GAMEPLAY"), "Scene Lab shows preview/gameplay mode indicator state");
assert(sceneLabSource.includes("Previous chunk") && sceneLabSource.includes("Stop and return to start") && sceneLabSource.includes("Next chunk"), "transport controls expose required labels");
assert(sceneLabSource.includes("startClientX:e.clientX") && sceneLabSource.includes("startCurrentX:this.currentX()"), "cursor drag stores drag-start pointer X and drag-start Current X");
assert(sceneLabSource.includes("cursorDragCurrentX"), "cursor drag uses drag-start value plus total pointer delta");
assert(sceneLabSource.includes("pointercancel") && sceneLabSource.includes("this.onCursorPointerUp"), "pointer cancel clears cursor drag state");
assert(sceneLabSource.includes("enabled:true,paused:!st.paused,playerLevelX:currentX,scrollX:this.previewScrollForPlayerX(currentX)"), "Play starts from Player X and synchronizes preview scroll");
assert(sceneLabSource.includes("playerLevelX:start,scrollX:this.previewScrollForPlayerX(start)"), "Stop returns Player X and preview scroll to scene start");
assert(sceneLabSource.includes("playerLevelX:x,scrollX:this.previewScrollForPlayerX(x)"), "timeline click/drag writes one canonical Player X and derived preview scroll");

const rendererSource = readFileSync(new URL("../render/webgl/WebGLSceneRenderer.ts", import.meta.url), "utf8");
assert(rendererSource.includes("if (kind === \"player\" && preview.enabled) ix = Math.round(previewPlayerLevelX);"), "renderer applies a preview-only player transform without mutating the entity");
assert(rendererSource.includes("resolveActiveBackgroundChunks(scene, preview.enabled ? levelX : sx, preview.enabled ? 0 : this.logicW, 0)"), "preview chunk evaluation uses canonical player level X");
assert(rendererSource.includes("evaluateBackgroundMarkerCrossings(this.markerRuntime, sceneKey, preview.enabled ? levelX : sx, markers)"), "preview marker evaluation uses canonical player level X");

console.log("[SMOKE] PixelBgrTimeline OK ✅");
