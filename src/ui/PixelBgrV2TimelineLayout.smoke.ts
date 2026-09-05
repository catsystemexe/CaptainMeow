import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const cssRule = (selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`))?.[1] ?? "";

const workspaceRule = cssRule(".cm-v2-workspace");
assert.match(workspaceRule, /flex:1 1 auto;min-height:0/, "the V2 workspace is bounded by the compact Lab");
assert.match(workspaceRule, /overflow-x:hidden;overflow-y:auto/, "one workspace owns vertical scrolling without adding horizontal overflow");

const panelRule = cssRule(".cm-v2-panel");
assert.match(panelRule, /flex:0 0 auto;overflow:visible/, "the timeline panel keeps its content height instead of shrinking and clipping it");

const scrollRule = cssRule(".cm-v2-timeline-scroll");
assert.match(scrollRule, /width:100%;max-width:100%;height:auto/, "the timeline viewport stays bounded to the available Lab width and its full interaction height");
assert.match(scrollRule, /overflow-x:auto;overflow-y:hidden/, "the dedicated timeline viewport scrolls only in authored world X");

const timelineRule = cssRule(".cm-v2-timeline");
assert.match(timelineRule, /min-height:136px/, "the visible timeline interaction band has a usable minimum height");
assert.match(timelineRule, /pointer-events:auto/, "the timeline remains directly pointer-interactive");

const workspaceCreation = source.indexOf('const workspace=el("div","cm-v2-workspace")');
const workspaceAppend = source.indexOf("workspace.append(this.renderV2Environment", workspaceCreation);
const rootAppend = source.indexOf("this.root.append(this.renderV2Toolbar(),workspace)", workspaceAppend);
assert.ok(workspaceCreation >= 0 && workspaceAppend > workspaceCreation && rootAppend > workspaceAppend, "V2 environment, timeline, and inspectors share the single vertical workspace below the toolbar");

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

const shortViewportHeight = 351;
const labTop = Math.min(156, Math.max(8, shortViewportHeight - 120));
const labHeight = shortViewportHeight - 8 - labTop;
assert.equal(labHeight, 187, "the repaired V2 workspace remains bounded by the existing short-height Lab docking contract");

console.log("[SMOKE] PixelBgrV2TimelineLayout OK ✅");
