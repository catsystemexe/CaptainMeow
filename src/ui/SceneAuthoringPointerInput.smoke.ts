import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
assert.match(layout, /\.cm-bgr-workspace-shell \{[\s\S]*pointer-events: none;/, "the full-screen Scene workspace is transparent to normal game input");
assert.match(layout, /\.cm-bgr-workspace-left,[\s\S]*\.cm-bgr-workspace-right \{\s*pointer-events: auto;/, "real dock controls remain interactive");
assert.match(layout, /\.cm-bgr-workspace-timeline \{[\s\S]*pointer-events: auto;/, "timeline controls remain interactive");
assert.match(ui, /\.cm-bgr-placement-overlay\{[^}]*pointer-events:none/, "authoring overlay is non-interactive by default");
const selection = ui.slice(ui.indexOf("private syncV2SelectionOverlay"), ui.indexOf("private syncV2Overlay"));
assert.match(selection, /overlay\.style\.pointerEvents="none"/);
assert.doesNotMatch(selection, /box\.style\.pointerEvents="auto"/);
const placement = ui.slice(ui.indexOf("private syncV2Overlay"), ui.indexOf("private pointerInternal"));
assert.match(placement, /overlay\.style\.pointerEvents="none"[\s\S]*box\.style\.pointerEvents="auto"/, "only an explicit placement box accepts authoring input");
assert.match(placement, /box\.style\.cursor="grab"/, "explicit drag affordance remains available");
console.log("[SMOKE] SceneAuthoringPointerInput OK ✅");
