import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lab = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

assert(!lab.includes("V2 · SCENE AUTHORING") && !lab.includes("V2 · ENVIRONMENT"), "operator labels omit V2 jargon");
assert(!lab.includes("SCENE / ASSETS / ENVIRONMENT"), "redundant navigation description is absent");
assert(!lab.includes("const segmentCount=") && lab.includes('inspector.append(this.inspectorHeading("SCENE",""),this.renderPreview([],bounds))'), "permanent scene statistics are absent");
for (const action of ["Open scene", "Save scene", "Duplicate scene", "Close Scene Lab", "Delete scene"]) assert(lab.includes(`this.iconButton("${action}"`), `${action} remains wired`);
assert(lab.includes('actions=el("div","cm-scene-action-row")') && lab.includes("flex-wrap:nowrap"), "six actions share one non-wrapping compact row");
assert(lab.includes("this.setDisplayMode(this.displayMode === \"dev\" ? \"game\" : \"dev\")") && lab.includes("setPixelBgrWorkspaceDisplayMode(this.workspace.root, mode)"), "compact switch retains the existing display-mode owner");
assert.match(layout, /\.cm-bgr-workspace-mode-toggle \{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/, "mode toggle has no card wrapper");
assert.match(lab, /\.cm-v2-workspace\{[^}]*overflow:visible/, "Scene Lab workspace does not create a nested vertical scroller");
assert(!lab.includes('el("div","cm-pixel-panel cm-scene-toolbar")\n    const badge'), "compact V2 sections do not depend on decorative pixel panels or badges");
assert(lab.includes("Reset to scene start") && lab.includes("setPaused?.(!paused)") && !lab.includes("Stop and return to scene start"), "transport remains connected to the existing runtime controls");
assert(lab.includes("Drag Player X cursor") && lab.includes("seekGameplayToPlayerX"), "timeline Player X mapping remains authoritative");

console.log("SceneLabCompactUI.smoke: PASS");
