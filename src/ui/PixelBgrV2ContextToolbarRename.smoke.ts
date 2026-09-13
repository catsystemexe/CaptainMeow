import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { v2EntityDisplayName } from "./PixelBgrV2EntityDisplayName";

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const projection = readFileSync(new URL("./PixelBgrV2TimelineProjection.ts", import.meta.url), "utf8");

assert.equal(v2EntityDisplayName({ id: "event-id", name: "  Event Name  " }), "Event Name", "Event naming remains unchanged");
assert.match(ui, /sceneContentsVisualChild\("segment",track\.id,segment\.id,segment\.asset\.id,segment\.enabled\)/, "tree SEG uses asset ID");
assert.match(ui, /sceneContentsVisualChild\("object",track\.id,object\.id,object\.asset\.id,object\.enabled\)/, "tree OBJ uses asset ID");
assert.match(ui, /const displayName=segment\.assetId;label\.textContent=displayName/, "timeline SEG uses asset ID");
assert.match(ui, /const displayName=object\.assetId;marker\.textContent=displayName/, "timeline OBJ uses asset ID");
assert.match(projection, /assetId: segment\.asset\.id/);
assert.match(projection, /assetId: object\.asset\.id/);
assert.match(projection, /label: v2EntityDisplayName\(event\)/, "timeline Event naming is unchanged");
const visualActions = ui.slice(ui.indexOf("private openV2VisualContextMenu"), ui.indexOf("private openV2EventContextMenu"));
for (const action of ["Lock", "Unlock", "Duplicate", "Flip Horizontal", "Flip Vertical", "Delete"]) assert(visualActions.includes(action), `visual toolbar includes ${action}`);
assert(!visualActions.includes('name:"Rename"'), "SEG/OBJ Rename action is absent");
const eventActions = ui.slice(ui.indexOf("private openV2EventContextMenu"), ui.indexOf("private applyV2EventEdit"));
assert.match(eventActions, /name:"Rename"[^}]*disabled:locked/, "Event Rename remains present");
assert.match(ui, /type V2RenameTarget = \{ kind:"event"/, "rename state is Event-only");
assert.match(ui, /updateV2SceneEvent\(scene,event\.id,\{name:value\|\|undefined\}\)/);
assert(!ui.includes("updateV2Segment(scene,track.id,segment.id,{name:value||undefined})") && !ui.includes("updateV2Object(scene,track.id,object.id,{name:value||undefined})"), "Scene Lab does not author SEG/OBJ names");
console.log("PixelBgrV2ContextToolbarRename.smoke: PASS");
