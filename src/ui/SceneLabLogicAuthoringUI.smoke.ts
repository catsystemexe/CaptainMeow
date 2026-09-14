import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(source,/sceneContentsLogicRow/);assert.match(source,/dataset\.inspector="logic"/);assert.match(source,/Trigger · Marker cross/);assert.match(source,/Event · Scene/);assert.match(source,/Action · World\.stop_scroll/);assert.match(source,/\+ bind Event/);assert.match(source,/\+ bind Action/);assert.doesNotMatch(source,/sceneContentsRow\("TRI"/);assert.match(source,/sceneContentsRow\("EVE"/);assert.match(source,/type V2RightContext = "scene-asset" \| "space" \| "logic"/);console.log("Scene Lab Logic authoring UI smoke passed");
