import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeDisplay } from "../graphics/DisplayRenderer";

const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

assert.match(layout, /grid-template-columns:\s*clamp\(150px,\s*15vw,\s*170px\)\s+minmax\(0,\s*1fr\)\s+clamp\(170px,\s*18vw,\s*190px\)/, "the Enemy Lab dock returns width to the game while Scene Lab stays compact");
assert.doesNotMatch(layout, /overflow-x:\s*auto[\s\S]*?@media \(max-width: 1099px\)/, "the responsive shell does not introduce page-level horizontal scrolling");
assert.doesNotMatch(layout, /@media[\s\S]*?cm-bgr-workspace-(?:left|right)[\s\S]*?display:\s*none/, "responsive rules keep both DEV docks visible");
assert.match(layout, /data-timeline-mode="v2"[\s\S]*?149px/, "V2 scenes reserve the full timeline band");
assert.match(layout, /data-timeline-mode="disabled"[\s\S]*?30px/, "other scenes use only the compact disabled strip");
assert.match(layout, /\.cm-bgr-workspace-left \{[\s\S]*?padding-top:\s*36px/, "the left dock reserves a compact inset for the fixed mode toggle");
assert.match(layout, /\.cm-bgr-workspace-shell\.is-game \{[\s\S]*?grid-template-rows:\s*1fr/, "GAME mode removes timeline reservation");
assert.match(ui, /dataset\.timelineMode = v2Scene \? "v2" : "disabled"/, "one explicit UI state owns timeline occupancy");
assert.match(ui, /getPresentationVerticalAlign\(\): "top" \| "center" \{ return this\.displayMode === "dev" \? "top" : "center"; \}/, "DEV explicitly requests top presentation alignment");
assert.match(main, /gfx\.resize\(cssW, cssH, dpr, presentationGeometrySource\?\.getPresentationVerticalAlign\(\) \?\? "center"\)/, "the existing presentation bridge forwards alignment to Graphics");
assert.equal(main.match(/document\.createElement\("canvas"\)/g)?.length, 1, "startup still creates one game canvas");
assert.equal(main.match(/new WebGLSceneRenderer\(/g)?.length, 1, "startup still creates one renderer");

const centered = computeDisplay(896, 504, 700, 600, 1, "center");
const top = computeDisplay(896, 504, 700, 600, 1, "top");
assert.equal(top.viewportY, 96, "top alignment leaves the unused physical space below the image");
assert.equal(centered.viewportY, 48, "GAME retains centered presentation by default");
assert.equal(top.viewportW / top.viewportH, 896 / 504, "alignment does not stretch the logical image");

console.log("[SMOKE] PixelBgrDevWorkspaceProportions OK ✅");
