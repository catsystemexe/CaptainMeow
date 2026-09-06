import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const cssRule = (selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`))?.[1] ?? "";

const workspaceRule = cssRule(".cm-v2-workspace");
assert.match(workspaceRule, /flex:1 1 auto;min-height:0/, "the V2 inspector workspace is bounded by the right region");
assert.match(workspaceRule, /overflow-x:hidden;overflow-y:auto/, "one workspace owns vertical scrolling without adding horizontal overflow");

const panelRule = cssRule(".cm-v2-panel");
assert.match(panelRule, /height:100%;overflow:hidden;display:flex;flex-direction:column/, "the timeline panel fills its persistent bottom region");

const scrollRule = cssRule(".cm-v2-timeline-scroll");
assert.match(scrollRule, /width:100%;max-width:100%;height:auto/, "the timeline viewport stays bounded to the available Lab width and its full interaction height");
assert.match(scrollRule, /overflow-x:auto;overflow-y:hidden/, "the dedicated timeline viewport scrolls only in authored world X");

const timelineRule = cssRule(".cm-v2-timeline");
assert.match(timelineRule, /min-height:136px/, "the visible timeline interaction band has a usable minimum height");
assert.match(timelineRule, /pointer-events:auto/, "the timeline remains directly pointer-interactive");

const timelineMount = source.indexOf("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))");
const inspectorCreation = source.indexOf('const inspector=el("div","cm-v2-workspace")', timelineMount);
const inspectorAppend = source.indexOf("inspector.append(this.renderV2SegmentInspector()", inspectorCreation);
assert.ok(timelineMount >= 0 && inspectorCreation > timelineMount && inspectorAppend > inspectorCreation, "timeline and inspector render from one Lab owner into their dedicated regions");

const timelineWidth = source.indexOf("timeline.style.width=`${widthPx}px`");
const horizontalViewport = source.indexOf("scroll.appendChild(timeline)", timelineWidth);
assert.ok(timelineWidth >= 0 && horizontalViewport > timelineWidth, "authored timeline width is retained inside its dedicated horizontal viewport");

const selectionOverlayStart = source.indexOf("private syncV2SelectionOverlay");
const placementOverlayStart = source.indexOf("private syncV2Overlay", selectionOverlayStart);
const selectionOverlay = source.slice(selectionOverlayStart, placementOverlayStart);
assert.match(selectionOverlay, /overlay\.style\.pointerEvents="none"/, "normal V2 selection overlay is non-interactive");
assert.doesNotMatch(selectionOverlay, /box\.style\.pointerEvents="auto"|box\.onpointerdown/, "normal placement boxes cannot intercept timeline navigation");
const activePlacementOverlay = source.slice(placementOverlayStart, source.indexOf("private pointerInternal", placementOverlayStart));
assert.match(activePlacementOverlay, /overlay\.style\.pointerEvents="auto"/, "explicit canvas placement mode remains interactive");

assert.equal(source.match(/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "the render contract creates only one V2 timeline instance");

console.log("[SMOKE] PixelBgrV2TimelineLayout OK ✅");
