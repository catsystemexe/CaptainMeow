import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

assert(layout.includes("center.append(viewport, timeline)"), "the timeline is a child of the center column");
assert(layout.includes("main.append(left, center, right)"), "both side labs are siblings of the full-height center");
assert(!layout.includes("root.append(modeToggle, main, timeline)"), "the timeline is not a root full-width row");
assert.match(layout, /grid-template-columns: clamp\(150px, 15vw, 170px\) minmax\(0, 1fr\) clamp\(170px, 18vw, 190px\)/, "dock widths and flexible center are preserved");
assert.match(layout, /data-timeline-mode="v2"\] \.cm-bgr-workspace-center \{\s*grid-template-rows: minmax\(0, 1fr\) 149px;/, "V2 center owns game plus compact multitrack rows");
assert.match(layout, /data-timeline-mode="disabled"\] \.cm-bgr-workspace-center \{\s*grid-template-rows: minmax\(0, 1fr\) 0;/, "non-V2 center collapses the timeline row");
assert.doesNotMatch(ui, /Timeline unavailable for this scene format/, "there is no full-width disabled timeline message");
assert.match(layout, /\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-x: visible;[\s\S]*?overflow-y: hidden;/, "timeline overflow stays within its center viewport without vertical scrolling");
assert.equal(ui.match(/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "there is one timeline mount");
assert.equal(main.match(/document\.createElement\("canvas"\)/g)?.length, 1, "there is one game canvas");
assert.equal(main.match(/new WebGLSceneRenderer\(/g)?.length, 1, "there is one renderer");
assert.doesNotMatch(layout, /@media[\s\S]*?cm-bgr-workspace-(?:left|right)[\s\S]*?display:\s*none/, "responsive CSS never hides either lab");

console.log("[SMOKE] CenterOwnedMultitrack OK ✅");
