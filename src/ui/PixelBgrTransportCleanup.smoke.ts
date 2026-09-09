import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
const transport=source.slice(source.indexOf("private renderPreview"),source.indexOf("private syncOverlay"));
assert(transport.includes('"Reset to scene start"')&&transport.includes("getBackgroundSceneV2(globalThis)?0")&&transport.includes("this.setCurrentX(start,true)"));
assert(transport.includes('paused?"Play":"Pause"')&&transport.includes("setPaused?.(!paused)"));
assert(!transport.includes("Stop and return")&&!transport.includes('Square'));
console.log("PixelBgrTransportCleanup.smoke: PASS");
