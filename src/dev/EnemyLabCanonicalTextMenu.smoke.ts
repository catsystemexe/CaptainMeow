import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../ui/PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const at = (needle: string) => {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing canonical text-menu marker: ${needle}`);
  return index;
};

assert(source.includes('el.style.color = prominence === "primary" ? "#aaa" : "#929292"'), "all operator labels share subdued gray styling");
assert(source.includes('"background:" + (active ? "#eee" : "transparent")') && source.includes('"color:" + (disabled ? "#777" : active ? "#000" : "#eee")'), "selected choices use the shared inverse style");
assert.match(layout, /clamp\(170px,\s*18vw,\s*190px\)/, "right dock stays within 170–190px");
assert(source.includes('"overflow-x:hidden"') && source.match(/overflow-x:auto/g)?.length === 1, "Enemy Lab has no horizontal scroll outside its bounded state strip");
assert(!source.includes('textContent = "SIMPLE LAB"') && !source.includes('textContent = "SMART LAB"'), "mode-specific headings stay absent");
assert(source.includes('modeLabel.textContent = "mode:"') && source.includes('movementClassLabel.textContent = "move:"'), "SIMPLE and SMART use canonical lowercase labels");
assert(source.includes('makeMovementControls("ds-group", "Move", "path:")'), "group formation and movement primitive remain visibly distinct as form and path");

const setupMount = at("fsmLabSection.appendChild(fsmGroupSetup)");
const stateMount = at("fsmLabSection.appendChild(presetPanel)");
assert(source.includes("fsmBasicSection.appendChild(btn)") && setupMount < stateMount, "FSM global setup ends with SPAWN and mounts before states and selected-state controls");
for (const handler of ["topNewBtn", "topRenameBtn", "topDuplicateBtn", "topResetBtn", "topSaveBtn", "topDeleteBtn", "addStateBtn", "dupStateBtn", "delStateBtn", "upStateBtn", "downStateBtn"]) {
  assert(source.includes(`${handler}.addEventListener("click"`), `${handler} remains wired`);
}
for (const label of ["behav:", "spac:", "elast:", "follow:", "speed:", "trigger:"]) assert(source.includes(`textContent: "${label}"`) || source.includes(`, "${label}",`), `${label} remains in the selected-state language`);

console.log("EnemyLabCanonicalTextMenu smoke passed");
