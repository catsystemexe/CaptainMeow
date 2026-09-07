import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../ui/PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const fsm = source.slice(source.indexOf('const fsmLabSection'), source.indexOf('const labPanel'));

assert(source.includes('const fsmModeButton = document.createElement("button")') && source.includes('fsmModeButton.addEventListener("click"'), "FSM mode remains wired");
assert(!fsm.includes('textContent = "PRESETS"') && !fsm.includes('textContent = "BASIC SETUP"'), "redundant boxed headings are absent");
assert(fsm.includes('fsmPresetLabel.textContent = "preset:"') && fsm.includes('fsmPresetSection.appendChild(fsmPresetToolbar)'), "compact preset row and toolbar exist");
for (const action of ["topNewBtn", "topRenameBtn", "topDuplicateBtn", "topResetBtn", "topDeleteBtn", "topSaveBtn"]) assert(source.includes(`${action}.addEventListener("click"`), `${action} remains wired`);
assert(fsm.includes('fsmTypeRow.id = "ds-fsm-type-count-row"') && fsm.includes('fsmTypeLabel.textContent = "type:"'), "Type and Count row remains present");
assert(fsm.includes('fsmFormationRow.id = "ds-fsm-formation-row"') && fsm.includes('fsmCoherenceRow.id = "ds-fsm-coherence-row"'), "Form and coherence choices use separate rows");
for (const control of ["fsmSpacingSlider.wrap", "fsmElasticitySlider.wrap", "fsmFollowSlider.wrap", "fsmBaseSpeedSlider.wrap"]) {
  assert(fsm.includes(`fsmBasicSection.appendChild(${control})`), `${control} has a distinct global row`);
}
assert(source.includes('createSpawnYControl("ds")') && source.includes('btn.textContent = "SPAWN"'), "Y and spawn controls remain present");
for (const action of ["addStateBtn", "dupStateBtn", "delStateBtn", "upStateBtn", "downStateBtn"]) assert(source.includes(`${action}.addEventListener("click"`), `${action} remains wired`);
assert(fsm.includes('stateButton.setAttribute("aria-pressed", String(row.selected))') && fsm.includes('authoringModel.selectState(row.id)'), "compact active states remain selectable");
assert(fsm.includes('movementPresetInput.addEventListener("change"') && fsm.includes('authoringModel.setMovementPreset'), "behavior selector remains wired");
assert(fsm.includes('stateList.style.cssText = "display:flex;gap:2px;max-width:100%;overflow-x:auto;overflow-y:hidden') && source.includes('presetPanel.style.cssText = "display:flex;flex-direction:column;gap:3px;padding:0;background:transparent;font:12px monospace;overflow:visible'), "only the state strip owns FSM-local scrolling, and it is horizontal");
assert.match(layout, /clamp\(170px,\s*18vw,\s*190px\)/, "right dock remains 170–190px");
for (const mode of ["simple", "smart"]) assert(source.includes(`${mode}ModeButton.addEventListener("click", () => { enemyLabMode = "${mode}"; refreshEnemyLabMode(); })`), `${mode.toUpperCase()} mode path remains wired`);

console.log("EnemyLabFsmCompact smoke passed");
