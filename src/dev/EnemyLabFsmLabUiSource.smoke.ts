import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");

for (const text of ["STATES", "ds-fsm-state-list", "ds-fsm-selected-state-editor", "Behavior", "Formation", "Trigger", "Advanced"]) {
  assert(source.includes(text), `missing FSM LAB UI marker: ${text}`);
}
assert(source.indexOf("fsmGroupSetup.appendChild(fsmBasicSection)") < source.indexOf("fsmLabSection.appendChild(presetPanel)"), "FSM LAB authoring panel follows Basic Setup");
assert(!source.includes("fsmLabSection.appendChild(runtimeDiagnosticsSection)"), "Runtime Diagnostics panel is not mounted in normal FSM layout");
assert(!source.includes("textContent: \"FSM Presets\""), "legacy FSM Presets heading is not mounted in normal FSM layout");
assert(source.includes("statesSection.appendChild(editorSection)"), "selected-state editor is rendered below the state strip");
assert(source.includes('stateToolButton(ICONS.new, "Add state")'), "compact add-state toolbar action is present");
assert(source.includes("screenXBelow","scrX"), "screenXBelow is labeled scrX in UI");
assert(source.indexOf("fsmPresetSection.appendChild(fsmSpawnSelect.root)") < source.indexOf("presetPanel.appendChild(authoringSections)"), "Save/preset toolbar remains above FSM LAB authoring, not inside selected-state editor");
assert(!source.includes("const initialSelect = document.createElement"), "general initial-state selector is not exposed in simplified FSM LAB");
assert(!source.includes("targetingSection") && !source.includes("combatSection") && !source.includes("lifecycleSection") && !source.includes("transitionSection"), "advanced FSM details are not shown as always-open main sections");

console.log("EnemyLabFsmLabUiSource smoke passed");
