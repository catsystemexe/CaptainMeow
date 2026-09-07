import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { clickedTimelineCurrentX, createExactTimelineScale, timelinePointerDeltaWorld, worldToTimelinePx } from "./PixelBgrTimeline";
import { projectBackgroundV2Timeline, setV2RoleTracksEnabled, v2RoleVisibility } from "./PixelBgrV2TimelineProjection";
import { PIXEL_BGR_TIMELINE_ZOOM_LEVELS } from "./PixelBgrLabUI";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const desert = createBackgroundV2DesertTestScene();
const far = projectBackgroundV2Timeline(desert).lanes.find(lane => lane.id === "far")!;
assert.deepEqual(far.tracks.map(track => track.id), ["desert-sky", "desert-far"], "Far represents both Desert tracks");
assert.equal(v2RoleVisibility(far.tracks), "all", "eye state derives as all enabled");
const mixed = setV2RoleTracksEnabled(desert, ["desert-sky"], false);
assert.equal(v2RoleVisibility(projectBackgroundV2Timeline(mixed).lanes.find(lane => lane.id === "far")!.tracks), "mixed", "mixed enabled values remain distinguishable");
const enabled = setV2RoleTracksEnabled(mixed, far.tracks.map(track => track.id), true);
assert.equal(v2RoleVisibility(projectBackgroundV2Timeline(enabled).lanes.find(lane => lane.id === "far")!.tracks), "all", "mixed click policy can enable every represented track");
assert(enabled.tracks.filter(track => track.role === "far").every(track => track.enabled), "mutation writes BackgroundTrack.enabled for every Far track");
assert.equal(mixed.tracks.find(track => track.id === "desert-far")?.enabled, true, "derivation does not silently normalize other tracks");

assert.deepEqual(PIXEL_BGR_TIMELINE_ZOOM_LEVELS, [0.75, 1, 1.25, 1.5, 2, 3, 4], "zoom is bounded and deterministic");
const scale1 = createExactTimelineScale(0, 1000, 1000, 1);
const scale2 = createExactTimelineScale(0, 1000, 1000, 2);
assert.equal(worldToTimelinePx(400, scale2), worldToTimelinePx(400, scale1) * 2, "zoom feeds the canonical exact scale");
assert.equal(clickedTimelineCurrentX(worldToTimelinePx(400, scale2), 0, scale2), 400, "zoomed seek remains the exact inverse mapping");
assert.equal(timelinePointerDeltaWorld(0, 200, scale2), 100, "zoomed editing uses that same scale authority");

assert.match(source, /private v2TimelineZoom = 1/, "zoom defaults in PixelBgrLabUI presentation state");
assert.match(source, /createExactTimelineScale\([^;]*this\.v2TimelineZoom\)/, "ruler, cursor, seek, drag and resize receive one zoomed scale");
assert.match(source, /cursorViewportX[\s\S]*this\.v2TimelineZoom=next;this\.render\(\)[\s\S]*newScroll\.scrollLeft/, "zoom preserves Player X's viewport position without seeking");
assert.doesNotMatch(source.slice(source.indexOf("private changeV2TimelineZoom"), source.indexOf("private selectV2Track")), /setCurrentX|setBackgroundSceneV2/, "zoom mutates neither Player X nor scene data");
assert.match(source, /eye\.onpointerdown=isolateTimelinePointerEvent/, "eye pointerdown uses timeline pointer isolation");
assert.match(source, /visibility!=="all"/, "mixed and disabled lanes deterministically enable all on click");
assert.equal((source.match(/for\(const lane of projection\.lanes\)/g) ?? []).length >= 2, true, "all four projected role lanes receive gutter controls and timeline rows");
assert.match(source, /panel\.append\(gutter,scroll\)/, "fixed gutter is outside the horizontal scroll owner");
assert.match(layout, /grid-template-rows: minmax\(0, 1fr\) 149px/, "center timeline allocation remains 149px");
assert.match(layout, /\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: hidden;/, "outer center timeline retains no vertical scrollbar");
console.log("[SMOKE] PixelBgrMultitrackControls OK ✅");
