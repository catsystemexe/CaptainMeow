import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
for(const contract of ["V2 · ENVIRONMENT","starfield enabled","seed","density","randomize seed","save V2","load saved V2","clear saved V2","export V2","import V2","renderV2SegmentInspector","renderV2ObjectInspector","renderSceneToolbar","shouldApplyPixelBgrV1Draft"])assert(source.includes(contract),`missing UI contract: ${contract}`);
console.log("PixelBgrV2EnvironmentAuthoringUI.smoke: PASS");
