import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const cssRule = (selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`))?.[1] ?? "";

const workspaceRule = cssRule(".cm-v2-workspace");
assert.match(workspaceRule, /flex:1 1 auto;min-height:0/, "the V2 inspector workspace is bounded by the right region");
assert.match(workspaceRule, /overflow:visible/, "the V2 inspector delegates scrolling to the unchanged outer right dock");

const panelRule = cssRule(".cm-v2-panel");
assert.match(panelRule, /width:100%.*display:block.*margin:0/, "the center panel occupies only the canvas-aligned timeline width");
assert.doesNotMatch(panelRule, /calc\(100% \+|margin-left:-100px|calc\(-1 \*/, "the panel uses no cross-column gutter transport");

const scrollRule = cssRule(".cm-v2-timeline-scroll");
assert.match(scrollRule, /width:100%;max-width:100%;height:172px/, "the canonical ruler and four role lanes plus Events stay within the compact height budget");
assert.match(scrollRule, /overflow-x:auto;overflow-y:hidden/, "the dedicated timeline viewport scrolls only in authored world X");

const mountedScrollRule = cssRule(".cm-bgr-workspace-timeline .cm-v2-timeline-scroll");
assert.match(mountedScrollRule, /flex:0 0 auto;min-height:0/, "timeline lane content keeps its compact authored height");
assert.match(layoutSource, /data-timeline-mode="v2"[\s\S]*?\.cm-bgr-workspace-center[\s\S]*?grid-template-rows: minmax\(0, 1fr\) 176px;/, "V2 mode retains its exact compact timeline band in the center");
assert.match(layoutSource, /\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-y: hidden;/, "the standard role/event timeline has no vertical scroll dependency");

const timelineRule = cssRule(".cm-v2-timeline");
assert.match(timelineRule, /height:155px/, "the visible timeline interaction band has a fixed compact height");
assert.match(timelineRule, /pointer-events:auto/, "the timeline remains directly pointer-interactive");

const gutterRule = cssRule(".cm-v2-timeline-gutter");
assert.match(gutterRule, /width:100%;height:144px;display:grid;grid-template-rows:20px repeat\(4,27px\) 16px;overflow:visible/, "the full-width gutter shares the ruler, four visual lanes, and compact Events lane geometry");
assert.match(gutterRule, /background:#000/, "the visible gutter uses compact monochrome presentation");
assert.match(source, /this\.workspace\.gutter\.appendChild\(gutter\)/, "the gutter mounts into the left workspace region");
assert.match(source, /panel\.appendChild\(scroll\)/, "the center timeline panel contains only the horizontal lane viewport");
assert.match(cssRule(".cm-v2-lane-track-select"), /position:sticky;left:3px/, "only the secondary multi-track selector stays visible with its timeline lane");
assert.doesNotMatch(source, /cm-v2-track-label/, "same-role tracks do not create nested or additional visual rows");
assert.match(source, /const labelTrack=lane\.tracks\.find[\s\S]*?button\(lane\.label,\(\)=>this\.selectV2Track\(labelTrack\.id\)\)/, "every gutter row keeps its canonical role label as the direct selection affordance");
assert.match(source, /lane\.tracks\.length>1[\s\S]*?el\("select","cm-v2-lane-track-select"\)[\s\S]*?trackSelect\.onchange=\(\)=>this\.selectV2Track\(trackSelect\.value\)/, "a multi-track role lane exposes every underlying track through a compact lane selector");
assert.match(cssRule(".cm-v2-lane-label"), /min-width:0;[\s\S]*height:23px/, "canonical role labels remain constrained within their grid column");

assert.match(source, /const rowHeight=27;[\s\S]*?const eventRowHeight=16;[\s\S]*?const headerHeight=20;[\s\S]*?projection\.lanes\.length\*rowHeight\+eventRowHeight/, "timeline height is one ruler plus the projected role lanes and compact Events lane");
assert.equal(source.match(/el\("div","cm-cursor cm-v2-cursor"\)/g)?.length, 1, "one Player X cursor is rendered");
assert.match(cssRule(".cm-v2-cursor"), /top:0;[\s\S]*bottom:0;[\s\S]*width:16px;[\s\S]*margin-left:-8px/, "Player X cursor spans every lane with a wide centered hit target");
assert.match(source, /cm-v2-cursor::before\{[^}]*border-left:4px solid/, "Player X retains a prominent canonical-position visual line");

assert.match(source, /cm-v2-segment-handle left[\s\S]*?beginV2SegmentDrag\(e,track\.id,segment\.id,"resize-left",scale\)/, "left resize handles retain their edit event wiring");
assert.match(source, /cm-v2-segment-handle right[\s\S]*?beginV2SegmentDrag\(e,track\.id,segment\.id,"resize-right",scale\)/, "right resize handles retain their edit event wiring");

const timelineMount = source.indexOf("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))");
const leftComposition = source.indexOf("headerBlock.append(titlebar,this.renderV2Toolbar())", timelineMount);
assert.ok(timelineMount >= 0 && leftComposition > timelineMount, "timeline and left-side tools render from one Lab owner into their dedicated regions");

const timelineWidth = source.indexOf("timeline.style.width=`${scale.widthPx}px`");
const horizontalViewport = source.indexOf("scroll.appendChild(timeline)", timelineWidth);
assert.ok(timelineWidth >= 0 && horizontalViewport > timelineWidth, "authored timeline width is retained inside its dedicated horizontal viewport");

const overlaySync = source.slice(source.indexOf("private syncOverlay"), source.indexOf("private pointerInternal"));
assert.doesNotMatch(source, /syncV2SelectionOverlay|V2 canvas selection/, "normal V2 selection has no generic canvas overlay path");
assert.match(overlaySync, /if\(v2Scene\)\{this\.removeOverlay\(\);return;\}/, "normal V2 state removes any authoring overlay");
const activePlacementOverlay = source.slice(source.indexOf("private syncV2Overlay"), source.indexOf("private pointerInternal"));
assert.match(activePlacementOverlay, /overlay\.style\.pointerEvents="none"[\s\S]*box\.style\.pointerEvents="auto"/, "only the explicit placement handle remains interactive");

assert.equal(source.match(/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "the render contract creates only one V2 timeline instance");

console.log("[SMOKE] PixelBgrV2TimelineLayout OK ✅");
