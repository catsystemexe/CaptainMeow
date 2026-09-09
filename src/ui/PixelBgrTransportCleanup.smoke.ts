import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
const preview=source.slice(source.indexOf("private renderPreview"),source.indexOf("private selectedChunkStart"));
assert.doesNotMatch(preview,/Stop|Square/);assert.match(preview,/const start=0/);assert.match(preview,/setCurrentX\(start,true\)/);assert.match(preview,/paused\?"Play":"Pause"/);assert.equal((preview.match(/this\.iconButton\(/g)??[]).length,2);
console.log("[SMOKE] PixelBgrTransportCleanup OK ✅");
