import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
for(const contract of ["Environment","Starfield seed","Starfield density","Randomize starfield seed","Load current scene","Duplicate scene","Reset or delete scene","Export scene","Import scene","renderV2SegmentInspector","renderV2ObjectInspector","renderSceneToolbar","shouldApplyPixelBgrV1Draft"])assert(source.includes(contract),`missing UI contract: ${contract}`);
console.log("PixelBgrV2EnvironmentAuthoringUI.smoke: PASS");
