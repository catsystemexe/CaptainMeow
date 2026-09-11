import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { v2EntityDisplayName } from "./PixelBgrV2EntityDisplayName";

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const projection = readFileSync(new URL("./PixelBgrV2TimelineProjection.ts", import.meta.url), "utf8");

assert.equal(v2EntityDisplayName({ id: "seg-id", name: "  Mountain  " }), "Mountain");
assert.equal(v2EntityDisplayName({ id: "obj-id", name: "   " }), "obj-id");
assert.match(ui, /sceneContentsVisualChild[\s\S]*?const label=v2EntityDisplayName\(\{id,name\}\)/, "tree SEG/OBJ use canonical names");
const treeChild = ui.slice(ui.indexOf("private sceneContentsVisualChild"), ui.indexOf("private sceneContentsEventChild"));
assert.doesNotMatch(treeChild, /createTextNode\([^)]*trackId|· locked/, "tree SEG/OBJ append no track or lock metadata");
assert.match(ui, /const displayName=v2EntityDisplayName\(segment\)/, "timeline SEG uses canonical names");
assert.match(ui, /const displayName=v2EntityDisplayName\(object\)/, "timeline OBJ uses canonical names");
assert.match(projection, /label: v2EntityDisplayName\(event\)/, "timeline Event uses canonical names");

const toolbar = ui.slice(ui.indexOf("private openV2EntityToolbar"), ui.indexOf("private openV2VisualContextMenu"));
assert.match(toolbar, /anchor:HTMLElement/, "toolbar requires an entity HTMLElement anchor");
assert.match(toolbar, /role","toolbar"/, "context control is a toolbar");
assert.doesNotMatch(toolbar, /append\(document\.createTextNode|menuitem|separator/, "toolbar buttons are icon-only");
assert.match(toolbar, /document\.body\.appendChild\(toolbar\)/, "toolbar is a body overlay");
assert.match(toolbar, /anchor\.getBoundingClientRect\(\)/, "position uses anchor geometry");
assert.match(toolbar, /desiredLeft=anchorRect\.left\+\(anchorRect\.width-toolbarRect\.width\)\/2/, "toolbar centers over its anchor");
assert.match(toolbar, /Math\.min\(maxLeft,Math\.max\(margin,desiredLeft\)\)/, "horizontal position is viewport-clamped");
assert.match(toolbar, /above=anchorRect\.top-toolbarRect\.height-gap/, "position prefers above");
assert.match(toolbar, /above>=margin\?above:anchorRect\.bottom\+gap/, "position falls back below");
assert.match(toolbar, /window\.innerHeight-toolbarRect\.height-margin/, "vertical position is viewport-clamped");
assert.match(toolbar, /document\.addEventListener\("pointerdown",outside\)/);
assert.match(toolbar, /event\.key==="Escape"/);

const visualActions = ui.slice(ui.indexOf("private openV2VisualContextMenu"), ui.indexOf("private openV2EventContextMenu"));
for (const action of ["Lock", "Unlock", "Duplicate", "Flip Horizontal", "Flip Vertical", "Rename", "Delete"]) assert(visualActions.includes(action), `visual toolbar includes ${action}`);
assert.match(visualActions, /const disabled=locked\|\|readonly/);
assert.match(visualActions, /disabled,action:[\s\S]*?disabled,action:[\s\S]*?disabled,action:[\s\S]*?disabled,action:[\s\S]*?disabled,destructive:true/, "locked visual actions stay disabled except Unlock");
const eventActions = ui.slice(ui.indexOf("private openV2EventContextMenu"), ui.indexOf("private applyV2EventEdit"));
assert.doesNotMatch(eventActions, /Flip Horizontal|Flip Vertical/, "Event toolbar has no flips");
assert.match(eventActions, /name:"Rename"[^}]*disabled:locked/);
assert.match(eventActions, /name:"Delete"[^}]*disabled:locked/, "locked Event rename/delete remain disabled");

assert.match(ui, /surface:"timeline"\|"tree"/, "rename state owns its presentation surface");
assert.match(ui, /this\.v2Rename=\{kind,trackId,id:itemId,surface\}/);
assert.match(ui, /this\.v2Rename=\{kind:"event",id:eventId,surface\}/);
assert.match(treeChild, /this\.v2Rename\?\.surface==="tree"/, "tree ignores timeline rename state");
for (const kind of ["segment", "object", "event"]) assert(ui.includes(`this.v2Rename.kind===\"${kind}\"`) || ui.includes(`this.v2Rename.kind==="${kind}"`), `timeline renders ${kind} rename`);
assert.match(ui, /updateV2Segment\(scene,track\.id,segment\.id,\{name:value\|\|undefined\}\)/);
assert.match(ui, /updateV2Object\(scene,track\.id,object\.id,\{name:value\|\|undefined\}\)/);
assert.match(ui, /updateV2SceneEvent\(scene,event\.id,\{name:value\|\|undefined\}\)/);
assert.doesNotMatch(ui, /updateV2(?:Segment|Object|SceneEvent)\([^\n]*\{id:/, "rename never patches identity");
assert.match(ui, /e\.key==="Enter"[\s\S]*?input\.blur\(\)/);
assert.match(ui, /e\.key==="Escape"[\s\S]*?cancelled=true/);
assert.match(ui, /input\.onblur=finish/);
assert.match(ui, /v2TimelineRenameInput[\s\S]*?isolateTimelinePointerEvent/, "timeline editor isolates authoring pointers");
assert.match(ui, /selectV2Event\(eventId:string,render=true\):void \{this\.v2SelectedEventId=eventId/);
assert.match(ui, /selectV2Segment\(trackId:string,segmentId:string,render=true\):void \{this\.v2SelectedTrackId=trackId/, "visual/Event selections remain independent");

console.log("PixelBgrV2ContextToolbarRename.smoke: PASS");
