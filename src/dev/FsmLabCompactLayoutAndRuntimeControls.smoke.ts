import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");

assert(source.includes('width:100%;max-width:100%'), "FSM LAB section inherits the wider Enemy Lab panel width");
assert(source.includes('border:1px solid transparent'), "icon buttons avoid fixed visible borders while retaining button states");
assert(!source.includes('handle.textContent = "↕"'), "state rows no longer render a non-functional drag handle");
assert(!source.includes('textContent: "Override"'), "formation override copy is removed");
assert(source.includes('["screenXBelow","scrX"]'), "screenXBelow runtime id is labeled scrX in UI");
assert(source.includes('makeTriggerStepper("Time", 1, 0'), "Time stepper uses integer seconds with min 0");
assert(source.includes('seconds: Math.max(0, Math.round(n))'), "Time commits whole seconds");
assert(source.includes('makeTriggerStepper("scrX", 10, 0'), "scrX stepper uses step 10");
assert(source.includes('makeTriggerStepper("Hit", 1, 1'), "Hit stepper uses step 1 and min 1");
assert(source.includes('grid-template-columns:40px 26px minmax(38px,1fr) 26px'), "trigger steppers render label, decrement, value, increment on one row");
assert.equal((source.match(/runtimeDiagnosticsSection\.id = "ds-fsm-runtime-diagnostics"/g) ?? []).length, 1, "exactly one Runtime Diagnostics panel is defined");
assert.equal((source.match(/document\.body\.appendChild\(runtimeDiagnosticsSection\)/g) ?? []).length, 1, "exactly one Runtime Diagnostics panel is mounted as a body side panel");
assert(source.indexOf('fsmPresetSection.id = "ds-fsm-preset-section"') < source.indexOf('fsmBasicSection.id = "ds-fsm-basic-setup"'), "PRESETS precede BASIC SETUP");
assert(source.indexOf('fsmBasicSection.id = "ds-fsm-basic-setup"') < source.indexOf('authoringSections.id = "ds-fsm-authoring-sections"'), "BASIC SETUP precedes FSM LAB authoring");
assert(source.indexOf('authoringSections.id = "ds-fsm-authoring-sections"') < source.indexOf('document.body.appendChild(runtimeDiagnosticsSection)'), "FSM LAB authoring owns the Runtime Diagnostics side panel");
assert(source.includes('findLatestFsmRuntimeDiagnostics'), "existing runtime diagnostics implementation remains wired");

console.log("FsmLabCompactLayoutAndRuntimeControls smoke passed");
