import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lab = readFileSync(new URL("./SceneLogicSequenceLab.ts", import.meta.url), "utf8");
const sceneLab = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const host = readFileSync(new URL("../dev/UnifiedDevLabHost.ts", import.meta.url), "utf8");
assert(host.includes('["scene", "sequence", "enemy", "hud"]'), "the unified host retains all existing Labs and adds Sequence");
assert(lab.includes('textContent="SEQUENCES"') && lab.includes('textContent=`Selected Definition:'), "Sequence Lab renders its Definition list/editor");
assert(lab.includes('button("Enable Sequences"') && lab.includes('button("+ WAIT"') && lab.includes('button("+ EVENT"') && lab.includes('button("+ ACTION"'), "Sequence Lab exposes the MVP authoring controls");
assert(sceneLab.includes('heading.textContent="SEQUENCE INSTANCES"') && sceneLab.includes('button("+ Instance"'), "Scene Lab owns Instance insertion");
assert(sceneLab.includes('Action · Flow.start_sequence') && sceneLab.includes('this.select(action.sequenceInstanceId'), "start_sequence creation and target editing are exposed");
assert(!lab.includes("localStorage"), "Sequence Lab introduces no independent persistence authority");
console.log("SceneLogicSequenceLab.smoke: PASS");
