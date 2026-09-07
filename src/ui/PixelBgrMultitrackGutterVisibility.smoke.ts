import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const cssRule = (source: string, selector: string): string => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

const panel = cssRule(ui, ".cm-v2-panel");
assert.match(panel, /--cm-v2-gutter-width:100px/, "gutter has the approved fixed width");
assert.match(panel, /width:calc\(100% \+ var\(--cm-v2-gutter-width\)\)/, "gutter width is added outside the canvas-aligned track width");
assert.match(panel, /margin:0 0 0 calc\(-1 \* var\(--cm-v2-gutter-width\)\)/, "gutter right edge terminates at the timeline and canvas origin");

assert.match(layout, /\.cm-bgr-workspace-timeline \{[\s\S]*?position: relative;\s*z-index: 1;/, "timeline establishes the stacking layer needed to paint its left gutter above the positioned Scene Lab");
assert.match(layout, /\.cm-bgr-workspace-timeline \{[\s\S]*?overflow-x: visible;\s*overflow-y: hidden;/, "outer timeline does not clip its left gutter and retains no vertical scrollbar");
assert.match(cssRule(layout, ".cm-bgr-workspace-center"), /overflow: visible;/, "center permits the gutter to extend left without moving authored content");

assert.match(ui, /zoomOut=this\.iconButton\("Zoom out"/, "zoom out control has its accessible label");
assert.match(ui, /zoomIn=this\.iconButton\("Zoom in"/, "zoom in control has its accessible label");
assert.match(ui, /gutterRow\.append\(label,eye,parallax\)/, "each canonical row preserves label, eye, then parallax order");
assert.match(ui, /const labelTrack=lane\.tracks\.find[\s\S]*?button\(lane\.label/, "all role labels remain canonical gutter content regardless of track count");
assert.match(ui, /lane\.tracks\.length>1[\s\S]*?row\.appendChild\(trackSelect\)/, "multi-track selection lives in the timeline lane rather than the gutter label container");
assert.deepEqual([...ui.matchAll(/lane\.label/g)].length > 0, true, "projected Front, Near, Mid and Far labels remain the gutter label authority");
assert.match(ui, /panel\.append\(gutter,scroll\)/, "gutter stays outside horizontal scrolling and authored timeline content remains the second grid column");

console.log("[SMOKE] PixelBgrMultitrackGutterVisibility OK ✅");
