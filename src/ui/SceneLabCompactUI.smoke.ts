import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPixelBgrDevWorkspaceShell } from "./PixelBgrDevWorkspaceLayout";

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
assert(lab.includes("cm-v2-transport-block .cm-transport-button{width:72px;min-width:72px;height:72px;min-height:72px}"), "transport buttons meet the primary 72px hit target");
assert(lab.includes("cm-v2-transport-block .cm-transport-icon{width:60px;height:60px}") && lab.includes("const iconSize=primary?60:16"), "the actual transport SVG inline size and selector both meet the 60px target");
assert(lab.includes("cm-v2-upper-content{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden}"), "V2 upper content shrinks and owns vertical overflow");
assert(lab.includes("cm-v2-transport-block{flex:0 0 72px;height:72px;overflow:hidden}") && lab.includes("cm-scene-transport{flex-wrap:nowrap;margin:0}"), "transport owns a fixed non-shrinking bottom slot");
assert(layout.includes("left.append(leftCanvas, gutter)") && lab.includes("this.workspace.leftCanvas.appendChild(this.root)"), "the left canvas region owns Scene Lab above its sibling multitrack gutter");
assert.match(layout,/\.cm-bgr-workspace-left-canvas \{[\s\S]*?display: flex;[\s\S]*?overflow: hidden;/,"the canvas-height region provides the flex containing block for bottom ownership");
assert.match(layout,/\.cm-bgr-workspace-left-canvas > \.cm-pixel-bgr-lab \{[\s\S]*?flex: 1 1 0;[\s\S]*?height: auto;/,"Scene Lab stretches as a flex item instead of relying on an unresolved percentage height");
assert.match(layout, /data-timeline-mode="v2"\] \.cm-bgr-workspace-left \{\s*grid-template-rows: minmax\(0, 1fr\) 176px;/, "the canvas-height left panel ends directly above the multitrack gutter");
assert(lab.includes('transportBlock.append(this.renderPreview([],projection.bounds,true))'), "only the V2 bottom-owned transport receives primary sizing");
assert.match(lab, /const upperContent=el\("div","cm-v2-upper-content"\);[\s\S]*?upperContent\.appendChild\(inspectorStack\);[\s\S]*?this\.root\.append\(upperContent,transportBlock\);\s*this\.syncOverlay\(\);\s*return;/, "all V2 header, source, Event, Trigger, and Marker content is contained above the transport sibling");
assert.equal((lab.match(/this\.root\.append\(upperContent,transportBlock\)/g) ?? []).length, 1, "transport is the final Scene Lab child with no trailing content");
assert(lab.indexOf('className="cm-v2-transport-block"') < lab.indexOf('const zoomControls=el("div","cm-v2-zoom-controls")'), "transport is rendered above the multitrack zoom row");
assert(lab.includes("Reset to scene start") && lab.includes("setPaused?.(!paused)") && lab.includes("setPaused?.(true);this.setCurrentX(start,true)") && !lab.includes("Stop and return to scene start"), "transport provides reset plus a single play/pause toggle");
assert(lab.includes("Drag Player X cursor") && lab.includes("seekGameplayToPlayerX"), "timeline Player X mapping remains authoritative");

type FakeElement = {
  className: string;
  dataset: Record<string, string>;
  children: FakeElement[];
  append: (...children: FakeElement[]) => void;
};
const fakeDocument = {
  createElement: (): FakeElement => {
    const element: FakeElement = { className: "", dataset: {}, children: [], append: (...children) => element.children.push(...children) };
    return element;
  },
} as unknown as Document;
const workspace = createPixelBgrDevWorkspaceShell(fakeDocument);
assert.deepEqual(workspace.left.children, [workspace.leftCanvas, workspace.gutter], "gutter is the immediate sibling below the canvas-height left region");
assert.deepEqual(workspace.center.children, [workspace.viewport, workspace.timeline], "left and center use matching canvas/timeline row ownership");

const title = lab.indexOf('h.textContent = "Scene Lab [F8]"');
const backdrop = lab.indexOf('backdropRow.append(backdropEye,`BGR:');
const environment = lab.indexOf('row.append(environmentEye,"ENV: starfield")');
assert(title >= 0 && lab.includes('headerBlock.append(titlebar,this.renderV2Toolbar(),summary)'), "Scene Lab header renders title, toolbar, then scene name");
assert(backdrop >= 0 && environment > backdrop, "background and environment render as compact BGR then ENV rows");
assert(lab.includes("backdropRow.append(backdropEye") && lab.includes("row.append(environmentEye"), "BGR and ENV rows render their eye controls first");
assert.match(lab, /upperContent\.append\(headerBlock,this\.v2Spacer\(\),sourceBlock,this\.v2Spacer\(\)\);[\s\S]*?upperContent\.appendChild\(inspectorStack\)/, "env and bgr source block precedes EVENT with compact spacer rows");
assert(lab.includes('this.renderV2ReservedInspector("TRIGGER"),this.renderV2ReservedInspector("MARKER")'), "TRIGGER and MARKER reserved placeholders remain visible");
assert(lab.includes('el("input","cm-v2-logic-name-edit")') && lab.includes('updateV2SceneEvent(scene,event.id,{name:value})'), "inline Event editing remains wired");

console.log("SceneLabCompactUI.smoke: PASS");
