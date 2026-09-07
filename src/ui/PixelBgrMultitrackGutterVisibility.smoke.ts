import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const cssRule = (source: string, selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

assert.match(layout, /left\.append\(gutter\)/, "the gutter DOM is owned by workspace.left");
assert.match(ui, /this\.workspace\.gutter\.appendChild\(gutter\)/, "V2 rendering mounts the canonical gutter in the left region");
assert.match(ui, /this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/, "timeline lanes remain mounted in the center timeline region");
assert.doesNotMatch(ui, /margin-left:-100px|calc\(100% \+ (?:100px|var\(--cm-v2-gutter-width\))\)/, "there is no negative-offset or expanded-width gutter transport");
assert.doesNotMatch(cssRule(layout, ".cm-bgr-workspace-timeline"), /z-index/, "gutter visibility does not depend on a timeline stacking layer");
assert.match(layout, /data-timeline-mode="v2"\] \.cm-bgr-workspace-left \{\s*grid-template-rows: minmax\(0, 1fr\) 149px;/, "V2 reserves a fixed 149px bottom left-region surface");
assert.match(layout, /data-timeline-mode="disabled"\] \.cm-bgr-workspace-left \{\s*grid-template-rows: minmax\(0, 1fr\) 0;/, "non-V2 restores the full Scene Lab height");
assert.match(cssRule(ui, ".cm-v2-timeline-gutter"), /width:100%;height:128px/, "the canonical gutter uses the available left-region width");
assert.match(cssRule(ui, ".cm-v2-panel"), /width:100%/, "timeline content begins at the center/canvas origin");

const projection = projectBackgroundV2Timeline(createBackgroundV2DesertTestScene());
assert.deepEqual(projection.lanes.map(lane => lane.label), ["Front", "Near", "Mid", "Far"], "all canonical gutter roles are present");
assert.match(ui, /gutterRow\.append\(label,eye,parallax,add\)/, "each role keeps label, eye, parallax, add order");
assert.match(ui, /lane\.tracks\.length>1[\s\S]*?row\.appendChild\(trackSelect\)/, "selectors remain conditional on genuinely multitrack lanes");
assert.equal(projection.lanes.find(lane => lane.label === "Far")?.tracks.length, 1, "Desert no longer creates a selector for its single Far track");

console.log("[SMOKE] PixelBgrMultitrackGutterVisibility OK ✅");
