import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");

for (const text of ["STATES", "ds-fsm-state-list", "ds-fsm-selected-state-editor", "Behavior", "Formation", "Trigger", "Advanced", "Override formation for this state", "Targets next state only"]) {
  assert(source.includes(text), `missing FSM LAB UI marker: ${text}`);
}
assert(source.indexOf("fsmLabSection.appendChild(fsmBasicSection)") < source.indexOf("fsmLabSection.appendChild(presetPanel)"), "FSM LAB authoring panel follows Basic Setup");
assert(!source.includes("fsmLabSection.appendChild(runtimeDiagnosticsSection)"), "Runtime Diagnostics panel is not mounted in normal FSM layout");
assert(!source.includes("textContent: \"FSM Presets\""), "legacy FSM Presets heading is not mounted in normal FSM layout");
assert(source.includes("stateList.appendChild(editorSection)"), "selected-state editor is rendered inline under the selected row");
assert(source.indexOf("fsmPresetToolbar.appendChild(fsmSpawnSelect.root)") < source.indexOf("presetPanel.appendChild(authoringSections)"), "Save/preset toolbar remains above FSM LAB authoring, not inside selected-state editor");
assert(!source.includes("const initialSelect = document.createElement"), "general initial-state selector is not exposed in simplified FSM LAB");
assert(!source.includes("targetingSection") && !source.includes("combatSection") && !source.includes("lifecycleSection") && !source.includes("transitionSection"), "advanced FSM details are not shown as always-open main sections");

console.log("EnemyLabFsmLabUiSource smoke passed");
