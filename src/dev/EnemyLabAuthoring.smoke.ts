import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
for (const text of ["FSM Presets", "Preset Details", "States", "Selected State", "Movement", "Targeting", "Combat", "Lifecycle", "Transitions", "Diagnostics", "Save / Cancel", "BUILT-IN / READ ONLY", "FsmPresetAuthoringModel"]) assert(source.includes(text), `missing ${text}`);
assert(!source.includes("node graph"));
assert(!source.includes("preview sandbox"));
assert(!source.includes("createElement(\"canvas\")"));
console.log("EnemyLabAuthoring smoke passed");
