import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const cssRule = (selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`))?.[1] ?? "";

const workspaceRule = cssRule(".cm-v2-workspace");
assert.match(workspaceRule, /flex:1 1 auto;min-height:0/, "the V2 inspector workspace is bounded by the right region");
assert.match(workspaceRule, /overflow:visible/, "the V2 inspector delegates scrolling to the unchanged outer right dock");

const panelRule = cssRule(".cm-v2-panel");
assert.match(panelRule, /width:calc\(100% \+ var\(--cm-v2-gutter-width\)\).*grid-template-columns:var\(--cm-v2-gutter-width\) minmax\(0,1fr\)/, "the panel adds the gutter outside the game-aligned timeline width");
assert.match(panelRule, /margin:0 0 0 calc\(-1 \* var\(--cm-v2-gutter-width\)\).*box-sizing:border-box/, "the fixed gutter is offset left without shifting the timeline axis");

const scrollRule = cssRule(".cm-v2-timeline-scroll");
assert.match(scrollRule, /width:100%;max-width:100%;height:145px/, "the canonical ruler and four lanes stay within the compact height budget");
assert.match(scrollRule, /overflow-x:auto;overflow-y:hidden/, "the dedicated timeline viewport scrolls only in authored world X");

const mountedScrollRule = cssRule(".cm-bgr-workspace-timeline .cm-v2-timeline-scroll");
assert.match(mountedScrollRule, /flex:0 0 auto;min-height:0/, "timeline lane content keeps its compact authored height");
assert.match(layoutSource, /data-timeline-mode="v2"[\s\S]*?\.cm-bgr-workspace-center[\s\S]*?grid-template-rows: minmax\(0, 1fr\) 149px;/, "V2 mode retains its exact compact timeline band in the center");
assert.match(layoutSource, /\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-y: hidden;/, "the standard four-role timeline has no vertical scroll dependency");

const timelineRule = cssRule(".cm-v2-timeline");
assert.match(timelineRule, /height:128px/, "the visible timeline interaction band has a fixed compact height");
assert.match(timelineRule, /pointer-events:auto/, "the timeline remains directly pointer-interactive");

const gutterRule = cssRule(".cm-v2-timeline-gutter");
assert.match(gutterRule, /width:100px;height:128px;display:grid;grid-template-rows:20px repeat\(4,27px\);overflow:hidden/, "the fixed gutter shares the exact ruler plus four-lane geometry");
assert.match(gutterRule, /background:#000/, "the visible gutter uses compact monochrome presentation");
assert.match(source, /panel\.append\(gutter,scroll\)/, "the gutter is a sibling before the horizontal scroll owner");
assert.doesNotMatch(source, /position:sticky/, "lane labels no longer live inside the scrolling timeline");
assert.doesNotMatch(source, /cm-v2-track-label/, "same-role tracks do not create nested or additional visual rows");
assert.match(source, /lane\.tracks\.length===1[\s\S]*?button\(lane\.label,\(\)=>this\.selectV2Track\(track\.id\)\)/, "a single-track role lane exposes direct track-only selection on its label");
assert.match(source, /lane\.tracks\.length>1[\s\S]*?for\(const track of lane\.tracks\)[\s\S]*?option\.value=track\.id[\s\S]*?trackSelect\.onchange=\(\)=>this\.selectV2Track\(trackSelect\.value\)/, "a multi-track role lane exposes every underlying track through a deterministic same-row selector");
assert.match(cssRule(".cm-v2-lane-label"), /height:23px/, "track selection controls remain inside the existing compact lane row");

assert.match(source, /const rowHeight=27;[\s\S]*?const headerHeight=20;[\s\S]*?projection\.lanes\.length\*rowHeight/, "timeline height is one ruler plus exactly the projected role lanes");
assert.equal(source.match(/el\("div","cm-cursor cm-v2-cursor"\)/g)?.length, 1, "one Player X cursor is rendered");
assert.match(cssRule(".cm-v2-cursor"), /top:0;bottom:0;[\s\S]*border-left:2px solid/, "Player X cursor spans ruler and every lane above authored content");

assert.match(source, /cm-v2-segment-handle left[\s\S]*?beginV2SegmentDrag\(e,track\.id,segment\.id,"resize-left",scale\)/, "left resize handles retain their edit event wiring");
assert.match(source, /cm-v2-segment-handle right[\s\S]*?beginV2SegmentDrag\(e,track\.id,segment\.id,"resize-right",scale\)/, "right resize handles retain their edit event wiring");

const timelineMount = source.indexOf("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))");
const leftComposition = source.indexOf("this.root.append(this.renderV2Toolbar()", timelineMount);
assert.ok(timelineMount >= 0 && leftComposition > timelineMount, "timeline and left-side tools render from one Lab owner into their dedicated regions");

const timelineWidth = source.indexOf("timeline.style.width=`${scale.widthPx}px`");
const horizontalViewport = source.indexOf("scroll.appendChild(timeline)", timelineWidth);
assert.ok(timelineWidth >= 0 && horizontalViewport > timelineWidth, "authored timeline width is retained inside its dedicated horizontal viewport");

const selectionOverlayStart = source.indexOf("private syncV2SelectionOverlay");
const placementOverlayStart = source.indexOf("private syncV2Overlay", selectionOverlayStart);
const selectionOverlay = source.slice(selectionOverlayStart, placementOverlayStart);
assert.match(selectionOverlay, /overlay\.style\.pointerEvents="none"/, "normal V2 selection overlay is non-interactive");
assert.doesNotMatch(selectionOverlay, /box\.style\.pointerEvents="auto"|box\.onpointerdown/, "normal placement boxes cannot intercept timeline navigation");
const activePlacementOverlay = source.slice(placementOverlayStart, source.indexOf("private pointerInternal", placementOverlayStart));
assert.match(activePlacementOverlay, /overlay\.style\.pointerEvents="none"[\s\S]*box\.style\.pointerEvents="auto"/, "only the explicit placement handle remains interactive");

assert.equal(source.match(/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "the render contract creates only one V2 timeline instance");

console.log("[SMOKE] PixelBgrV2TimelineLayout OK ✅");
