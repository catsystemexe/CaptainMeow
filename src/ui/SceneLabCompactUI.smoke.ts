import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPixelBgrDevWorkspaceShell } from "./PixelBgrDevWorkspaceLayout";
import { sceneContentsAggregateState } from "./PixelBgrLabUI";

assert.equal(sceneContentsAggregateState([]),"none");
assert.equal(sceneContentsAggregateState([true,true]),"all");
assert.equal(sceneContentsAggregateState([false,false]),"none");
assert.equal(sceneContentsAggregateState([true,false]),"mixed");

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
assert.match(lab, /const upperContent=el\("div","cm-v2-upper-content"\);[\s\S]*?this\.root\.append\(upperContent,transportBlock\);\s*this\.syncOverlay\(\);\s*return;/, "all V2 Scene Contents content remains above the transport sibling");
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

const scene = lab.indexOf('summary.append(`SCENE:');
assert(scene >= 0, "SCENE identity remains visible");
assert(!lab.includes("summary.append(sceneEye") && !lab.includes("Scene visibility is controlled"), "SCENE has no Eye or Power action");
const categories=["BGR","ENV","SEG","OBJ","EVE","TRI","MAR"];
let cursor=-1;for(const category of categories){const next=lab.indexOf(`this.sceneContentsRow("${category}"`,cursor+1);assert(next>cursor,`${category} appears in exact tree order`);cursor=next;}
for(const category of ["BGR","ENV","SEG","OBJ"])assert.match(lab,new RegExp(`sceneContentsRow\\("${category}","visibility"`),`${category} uses Eye visibility semantics`);
for(const category of ["EVE","TRI","MAR"])assert.match(lab,new RegExp(`sceneContentsRow\\("${category}","activation"`),`${category} uses Power activation semantics`);
assert(lab.includes('action.dataset.action=kind')&&lab.includes('labelButton.dataset.accordionAction="true"')&&lab.includes('toggle.dataset.accordionAction="true"'),"action icon and accordion targets are distinct");
assert(lab.includes("const expandable=count>=2")&&lab.includes("count===1||open"),"two-plus item categories expose accordion while a single item stays inline");
assert(lab.includes('private readonly sceneContentsExpanded = new Set<string>')&&!lab.includes("scene.contentsExpanded"),"accordion state is UI-only");
assert(lab.includes('sceneContentsAggregateState(events.map(event=>event.enabled))')&&lab.includes('!=="all"'),"EVE category aggregates all/mixed/none and applies all-enable policy");
assert(lab.includes("setV2EventsEnabled")&&lab.includes("updateV2SceneEvent(next,event.id,{enabled})"),"EVE bulk Power uses Event update authority");
assert(lab.includes("const result=updateV2SceneEvent(scene,event.id,{enabled:!event.enabled})"),"per-Event Power uses the same invariant-preserving helper");
assert(lab.includes('const ordinal=el("span","cm-scene-tree-ordinal");ordinal.textContent=`${index+1}.`')&&lab.includes("row.append(power,ordinal,label,type)"),"Event ordinal is independent of both editable signal names and level-end labels");
assert(lab.includes("row.replaceChild(input,label)")&&!lab.includes("row.replaceChild(input,ordinal)"),"signal name editing preserves the visible ordinal");
assert(lab.includes('sceneContentsRow("TRI","activation","none",0,()=>{},undefined,true,"reserved")')&&lab.includes('sceneContentsRow("MAR","activation","none",0,()=>{},undefined,true,"reserved")'),"TRI/MAR are disabled reserved rows without items");
assert(!lab.includes("renderV2EventSurface")&&!lab.includes("renderV2ReservedInspector")&&!lab.includes('plainV2InspectorHeader("EVENT")'),"standalone EVENT/TRIGGER/MARKER blocks are removed");
assert(lab.includes('private selectV2Event(eventId:string,render=true):void {this.v2SelectedEventId=eventId')&&lab.includes('private selectV2Segment(trackId:string,segmentId:string,render=true):void {this.v2SelectedTrackId=trackId'),"Event and visual selection remain independent");
assert(lab.includes('el("input","cm-v2-logic-name-edit")') && lab.includes('updateV2SceneEvent(scene,event.id,{name:value})')&&lab.includes("input.onfocus=select"), "inline Event editing and focus selection remain wired");

console.log("SceneLabCompactUI.smoke: PASS");
