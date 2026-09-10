import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lab = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

assert(!lab.includes("V2 · SCENE AUTHORING") && !lab.includes("V2 · ENVIRONMENT"), "operator labels omit V2 jargon");
assert(!lab.includes("SCENE / ASSETS / ENVIRONMENT"), "redundant navigation description is absent");
assert(!lab.includes("const segmentCount=") && lab.includes('inspector.append(this.inspectorHeading("SCENE",""),this.renderPreview([],bounds))'), "permanent scene statistics are absent");
for (const action of ["Open scene", "Save scene", "Duplicate scene", "Close Scene Lab", "Delete saved scene"]) assert(lab.includes(`this.iconButton("${action}"`), `${action} remains wired`);
assert(lab.includes('actions=el("div","cm-scene-action-row")') && lab.includes("flex-wrap:nowrap"), "five primary actions share one non-wrapping compact row");
assert(lab.includes('deleteAction.classList.add("cm-scene-delete")') && lab.includes("Delete the saved Scene Lab scene?"), "the final delete action is visually separated and requires confirmation");
assert(lab.includes("this.setDisplayMode(this.displayMode === \"dev\" ? \"game\" : \"dev\")") && lab.includes("setPixelBgrWorkspaceDisplayMode(this.workspace.root, mode)"), "compact switch retains the existing display-mode owner");
assert.match(layout, /\.cm-bgr-workspace-mode-toggle \{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/, "mode toggle has no card wrapper");
assert.match(lab, /\.cm-v2-workspace\{[^}]*overflow:visible/, "Scene Lab workspace does not create a nested vertical scroller");
assert(!lab.includes('el("div","cm-pixel-panel cm-scene-toolbar")\n    const badge'), "compact V2 sections do not depend on decorative pixel panels or badges");
assert(lab.includes("cm-v2-transport-block .cm-transport-button svg{width:44px;height:44px}"), "transport icons are deliberately large primary controls");
assert(lab.includes("cm-v2-transport-block{margin-top:auto;flex:0 0 auto}"), "transport is anchored to the bottom of the canvas-height left panel region");
assert.match(layout, /data-timeline-mode="v2"\] \.cm-bgr-workspace-left \{\s*grid-template-rows: minmax\(0, 1fr\) 176px;/, "the canvas-height left panel ends directly above the multitrack gutter");
assert(lab.indexOf('className="cm-v2-transport-block"') < lab.indexOf('const zoomControls=el("div","cm-v2-zoom-controls")'), "transport is rendered above the multitrack zoom row");
assert(lab.includes("Reset to scene start") && lab.includes("setPaused?.(!paused)") && lab.includes("setPaused?.(true);this.setCurrentX(start,true)") && !lab.includes("Stop and return to scene start"), "transport provides reset plus a single play/pause toggle");
assert(lab.includes("Drag Player X cursor") && lab.includes("seekGameplayToPlayerX"), "timeline Player X mapping remains authoritative");

const title = lab.indexOf('h.textContent = "Scene Lab [F8]"');
const environment = lab.indexOf('row.append("env: starfield"');
const backdrop = lab.indexOf('backdropRow.append("bgr:")');
assert(title >= 0 && lab.includes('headerBlock.append(titlebar,this.renderV2Toolbar(),summary)'), "Scene Lab header renders title, toolbar, then scene name");
assert(environment >= 0 && backdrop > environment, "environment renders compact env and bgr rows in order");
assert.match(lab, /this\.root\.append\(headerBlock,this\.v2Spacer\(\),sourceBlock,this\.v2Spacer\(\)\);[\s\S]*?this\.root\.appendChild\(inspectorStack\)/, "env and bgr source block precedes EVENT with compact spacer rows");
assert(lab.includes('this.renderV2ReservedInspector("TRIGGER"),this.renderV2ReservedInspector("MARKER")'), "TRIGGER and MARKER reserved placeholders remain visible");
assert(lab.includes('el("input","cm-v2-logic-name-edit")') && lab.includes('updateV2SceneEvent(scene,event.id,{name:value})'), "inline Event editing remains wired");

console.log("SceneLabCompactUI.smoke: PASS");
