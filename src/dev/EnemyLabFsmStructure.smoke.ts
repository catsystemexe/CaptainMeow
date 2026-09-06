import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../ui/PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

const at = (needle: string) => {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing FSM structure marker: ${needle}`);
  return index;
};

const setupStart = at('fsmGroupSetup.id = "ds-fsm-group-setup"');
const stateStart = at('textContent: "states:"');
const selectedEditorStart = at('editorSection.id = "ds-fsm-selected-state-editor"');

assert(setupStart < stateStart && stateStart < selectedEditorStart, "group setup precedes States and the selected-state editor");
assert(at('fsmGroupSetup.appendChild(fsmPresetSection)') < at('fsmGroupSetup.appendChild(fsmBasicSection)'), "Preset precedes the remaining global setup rows");

const basicOrder = [
  "fsmBasicSection.appendChild(fsmTypeRow)",
  "fsmBasicSection.appendChild(fsmFormationRow)",
  "fsmBasicSection.appendChild(fsmSpaceElasticRow)",
  "fsmBasicSection.appendChild(fsmFollowSpeedRow)",
].map(at);
assert.deepEqual(basicOrder, [...basicOrder].sort((a, b) => a - b), "global rows are mounted in Type/Count, Form/Coh, Space/Elast, Follow/Speed order");
assert(at("fsmBasicSection.appendChild(screenYControl.wrap)") < at("fsmBasicSection.appendChild(btn)"), "Y is mounted before Spawn and closes global setup");

assert(source.includes('fsmGroupSetup.setAttribute("data-fsm-scope", "global-preset")'), "global/preset ownership is explicit");
assert(source.includes('editorSection.setAttribute("data-fsm-scope", "selected-state")'), "selected-state ownership is explicit");
for (const id of ["ds-fsm-spacing", "ds-fsm-elasticity", "ds-fsm-follow", "ds-fsm-base-speed", "ds-screen-y"]) {
  assert(source.indexOf(`\"${id}\"`) < selectedEditorStart, `${id} is declared outside the selected-state editor`);
}
for (const id of ["ds-fsm-state-spacing", "ds-fsm-state-elasticity", "ds-fsm-state-follow", "ds-fsm-state-speed"]) {
  assert(source.indexOf(`\"${id}\"`) > selectedEditorStart, `${id} remains selected-state-specific`);
}
assert(at('statesSection.appendChild(stateList)') < at('statesSection.appendChild(editorSection)'), "state toolbar/strip precedes selected-state controls");
for (const action of ["addStateBtn", "dupStateBtn", "delStateBtn", "upStateBtn", "downStateBtn"]) assert(source.includes(`${action}.addEventListener("click"`), `${action} remains wired`);
assert(at('textContent: "behav:"') > selectedEditorStart && at('textContent: "trigger:"') > selectedEditorStart, "Behavior and Trigger remain state-level");

assert.match(layout, /clamp\(170px,\s*18vw,\s*190px\)/, "right dock remains 170–190px");
assert(source.includes('stateList.style.cssText = "display:flex;gap:2px;max-width:100%;overflow-x:auto;overflow-y:hidden'), "horizontal scrolling remains confined to the state strip");
assert(!source.includes("overflow-x:auto") || source.match(/overflow-x:auto/g)?.length === 1, "no horizontal panel scrolling was introduced");
for (const mode of ["simple", "smart"]) assert(source.includes(`${mode}ModeButton.addEventListener("click", () => { enemyLabMode = "${mode}"; refreshEnemyLabMode(); })`), `${mode.toUpperCase()} wiring is unchanged`);

assert(source.includes('groupOptionRow.style.cssText = "display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:5px;'), "Form/Coh use bounded adaptive columns");
assert(source.includes('primaryParamRow.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;'), "Space/Tight/Catch may wrap without structural collision");

console.log("EnemyLabFsmStructure smoke passed");
