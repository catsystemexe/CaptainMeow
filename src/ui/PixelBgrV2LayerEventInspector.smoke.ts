import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
const method=(name:string,next:string)=>source.slice(source.indexOf(`private ${name}`),source.indexOf(`private ${next}`));

const eventEdit=method("applyV2EventEdit","beginV2EventDrag");
const eventDrag=method("beginV2EventDrag","onV2EventPointerMove");
for(const body of [eventEdit,eventDrag]) assert.doesNotMatch(body,/v2Selected(?:Track|Segment|Object)Id/,"Event selection preserves visual selection");
for(const name of ["selectV2Track","selectV2Segment","selectV2Object"]){const start=source.indexOf(`private ${name}`);const end=source.indexOf("\n  private ",start+10);assert.doesNotMatch(source.slice(start,end),/v2SelectedEventId/,`${name} preserves Event selection`);}
assert.match(source,/contextualY=this\.renderV2ContextualYSurface\(\)[\s\S]*?contextualEvent=this\.renderV2EventSurface/,"Layer and Event inspector sections render independently");
assert.match(source,/dataset\.inspectorSection="layer"/,"visual selection renders the Layer section");
assert.match(source,/dataset\.inspectorSection="event"/,"Event selection renders the Event section");
assert.match(source,/renderV2InspectorHeader\("LAYER"/,"Layer has enabled and delete controls");
assert.match(source,/renderV2InspectorHeader\("EVENT"/,"Event has enabled and delete controls");
assert.match(source,/this\.row\("type",document\.createTextNode\(event\.type\)\)/,"Event type remains read-only");
assert.match(source,/deleteV2SceneEvent\(scene,event\.id\)/,"Event delete uses existing immutable semantics");
assert.match(source,/if\(contextualY\).*renderV2YRail/,"only visual selection mounts the contextual Y rail");
for(const label of ["TRIGGER","MARKER"]){assert.match(source,new RegExp(`renderV2ReservedInspector\\(\\"${label}\\"\\)`));}
assert.match(source,/setAttribute\("aria-disabled","true"\)/,"reserved inspectors are accessibly disabled");
assert.match(source,/Reserved for future logic authoring/,"reserved inspectors explain their presentation-only purpose");
assert.doesNotMatch(source,/type V2(?:Trigger|Marker)|createV2(?:Trigger|Marker)|deleteV2(?:Trigger|Marker)/,"no Trigger or Marker entity API is introduced");

console.log("[SMOKE] PixelBgrV2LayerEventInspector OK ✅");
