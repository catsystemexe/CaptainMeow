import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const lab = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");

assert.match(layout, /@media \(max-width: 1099px\)[\s\S]*?grid-template-columns: 190px minmax\(0, 1fr\) 220px;/, "~1050px keeps both narrower docks and gives the center all remaining width");
assert.match(layout, /@media \(max-width: 1499px\)[\s\S]*?grid-template-columns: 200px minmax\(0, 1fr\) 240px;/, "~1280px keeps a game-dominant composition");
assert.doesNotMatch(layout, /@media[\s\S]*?\.cm-bgr-workspace-(?:left|right)[^{]*\{[^}]*display:\s*none/, "responsive rules never hide a DEV dock");
assert.doesNotMatch(layout, /overflow-x:\s*auto/, "the workspace does not introduce page-like horizontal scrolling");
assert.match(layout, /data-timeline-mode="v2"[\s\S]*?149px/, "V2 timeline mode reserves 149px");
assert.match(layout, /grid-template-rows: minmax\(0, 1fr\) 30px;/, "disabled timeline mode reserves 30px");
assert.equal(lab.match(/workspace\.timeline\.replaceChildren\(\)/g)?.length, 1, "mode changes replace content inside the one owned timeline region");
assert.equal(lab.match(/appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "only one V2 timeline region is populated");
assert.match(layout, /is-dev \.cm-bgr-workspace-left > \.cm-pixel-bgr-lab[\s\S]*?padding-top:\s*40px/, "the left Lab reserves a non-overlapping inset for the compact toggle");
assert.match(layout, /\.cm-bgr-workspace-shell\.is-game[\s\S]*?grid-template-rows:\s*1fr/, "GAME mode continues to remove the timeline row");
assert(lab.includes("getGamePresentationRect(): GamePresentationRect"), "presentation geometry remains bridged through the existing API");

console.log("[SMOKE] PixelBgrDevWorkspaceProportions OK ✅");
