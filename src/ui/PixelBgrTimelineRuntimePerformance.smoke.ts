import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExactTimelineScale, timelineViewportRange, worldToTimelinePx } from "./PixelBgrTimeline";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const update = source.slice(source.indexOf("private updateV2TimelineIndicators"), source.indexOf("private toggleV2RoleVisibility"));
const render = source.slice(source.indexOf("private renderV2Timeline"), source.indexOf("private updateV2TimelineIndicators"));

assert.doesNotMatch(update, /querySelector/, "game-frame indicator sync performs no timeline DOM queries");
assert.match(update, /setV2IndicatorX\(this\.v2ViewportEl/, "viewport runtime movement uses its cached element reference");
assert.match(update, /setV2IndicatorX\(this\.v2CursorEl/, "cursor runtime movement uses its cached element reference");
assert.doesNotMatch(update, /style\.(?:left|width)|\.title\s*=/, "game-frame sync writes neither layout properties nor titles");
assert.match(source, /element\.style\.transform=`translate3d\(\$\{pixelX\}px, 0, 0\)`/, "runtime X changes are compositor transforms");
assert.match(source, /pixelX!==lastPixelX/, "unchanged projected positions skip redundant transform writes");

assert.match(render, /this\.v2ViewportEl=viewport;this\.v2LastViewportPx=viewportPx/, "render caches the new viewport indicator and its position");
assert.match(render, /this\.v2CursorEl=cursor;this\.v2LastCursorPx=cursorPx/, "render caches the new cursor indicator and its position");
assert.match(render, /viewport\.style\.width=/, "viewport width is established during timeline render");
assert.match(render, /viewport\.style\.left="0px"[\s\S]*cursor\.style\.left="0px"/, "both transformed indicators retain a static zero origin");
assert.match(source, /private clearV2TimelineIndicatorRefs\(\).*cursorEl===this\.v2CursorEl.*cursorEl=null.*v2CursorEl=null.*v2ViewportEl=null.*v2LastCursorPx=null.*v2LastViewportPx=null.*v2RenderedTimelineScale=null/, "rerender and disposal clear every cached V2 indicator reference and presentation value");
assert.match(source, /this\.clearV2TimelineIndicatorRefs\(\);\s*this\.workspace\.timeline\.replaceChildren\(\)/, "rerender clears stale references before replacing timeline children");
assert.match(source, /dispose\(\).*this\.clearV2TimelineIndicatorRefs\(\)/, "disposal clears indicator references");

const scale = createExactTimelineScale(0, 20_000, 20_000, 0.05);
assert.equal(scale.widthPx, 1_000, "the valid 0.05 zoom remains geometrically unchanged");
assert.equal(worldToTimelinePx(7_654, scale), 382.7, "Player world X mapping stays exact at low zoom");
const viewport = timelineViewportRange(7_654, 896);
assert.deepEqual(viewport, { startX: 7_654, endX: 8_550 }, "viewport remains world.scrollX through world.scrollX + 896");
assert(Math.abs(worldToTimelinePx(viewport.endX, scale) - worldToTimelinePx(viewport.startX, scale) - 44.8) < Number.EPSILON * 100, "viewport projected width stays exact");

assert.match(source, /cursorViewportX=oldScroll&&this\.v2LastCursorPx!==null\?this\.v2LastCursorPx-oldScroll\.scrollLeft/, "zoom preservation reads the transformed cursor's canonical cached X rather than stale offsetLeft");
assert.doesNotMatch(source.slice(source.indexOf("private changeV2TimelineZoom"), source.indexOf("private selectV2Track")), /offsetLeft/, "zoom never reads the transformed cursor's static offsetLeft");
assert.match(source, /if\(this\.cursorEl===this\.v2CursorEl\)this\.v2LastCursorPx=this\.setV2IndicatorX/, "V2 cursor dragging updates the transform and its presentation cache exactly");
assert.match(source, /clickedTimelineCurrentX\(e\.clientX,rect\.left,scale,projection\.bounds\.startX,projection\.bounds\.endX,rect\.width\)/, "timeline seeking retains the canonical exact inverse mapping");
assert.match(source, /applyV2SegmentDrag\(/, "segment drag and resize remain on their existing editing path");

assert.match(source, /\.cm-v2-viewport-range\{[^}]*will-change:transform/, "viewport transform receives narrow compositor guidance");
assert.match(source, /\.cm-v2-cursor\{[^}]*will-change:transform/, "cursor transform receives narrow compositor guidance");
console.log("[SMOKE] PixelBgrTimelineRuntimePerformance OK ✅");
