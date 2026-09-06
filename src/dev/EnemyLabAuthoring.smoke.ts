import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
for (const text of ["Preset:", "States", "Behavior:", "Trigger:", "Advanced", "Diagnostics", "BUILT-IN / READ ONLY", "FsmPresetAuthoringModel"]) assert(source.includes(text), `missing ${text}`);
for (const action of ["addStateBtn", "dupStateBtn", "delStateBtn", "upStateBtn", "downStateBtn"]) assert(source.includes(`${action}.addEventListener(\"click\"`), `missing ${action} handler`);
assert(!source.includes("node graph"));
assert(!source.includes("preview sandbox"));
assert(!source.includes("createElement(\"canvas\")"));
console.log("EnemyLabAuthoring smoke passed");
