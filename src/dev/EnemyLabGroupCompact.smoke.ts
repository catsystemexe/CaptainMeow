import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../ui/PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

assert(source.includes('groupOptionRow.id = "ds-group-form-coh-row"'), "Form and Coh expose one focused compact row");
assert(source.includes("groupOptionRow.appendChild(formationWrap)") && source.includes("groupOptionRow.appendChild(cohesionWrap)"), "Form and Coh remain children of the same row");
assert(source.includes('primaryParamRow.id = "ds-group-space-tight-catch-row"'), "primary group parameters expose one focused compact row");
for (const control of ["spacingStepper.wrap", "responseStepper.wrap", "catchStepper.wrap"]) {
  assert(source.includes(`primaryParamRow.appendChild(${control})`), `${control} remains in the shared compact row`);
}

assert(source.includes('groupTypeRow.id = "ds-group-type-count-row"') && source.includes("groupTypeRow.appendChild(countSegment)"), "Count remains alongside group Type");
assert(source.includes('countDecButton.addEventListener("click"') && source.includes('countIncButton.addEventListener("click"'), "Count decrement and increment handlers remain connected");
assert(source.includes('decButton.addEventListener("click", () => { value = stepGroupParamValue') && source.includes('incButton.addEventListener("click", () => { value = stepGroupParamValue'), "group parameter stepper handlers remain connected");
assert(source.includes('ENEMY_GROUP_COHESION_IDS.map((id) => ({ value: id, label: id === "rigid" ? "Rigid" : "Elastic" }))'), "Rigid and Elastic choices remain functional options");
assert(source.includes('cohesionChoice.addEventListener(refreshGroupParamVisibility)'), "coherence choice changes remain connected");

const countBlock = source.slice(source.indexOf('countSegment.id = "ds-group-count"'), source.indexOf("const groupOptionRow"));
const paramBlock = source.slice(source.indexOf("const makeParamStepper"), source.indexOf("const spacingStepper"));
for (const block of [countBlock, paramBlock]) {
  assert(!/border:(?!0)/.test(block), "group steppers have no permanent bordered chrome");
  assert(!/background:(?!transparent)/.test(block), "group steppers have no permanent background chrome");
}

assert.match(layout, /clamp\(170px, 18vw, 190px\)/, "right dock remains 170–190px");
assert.equal(source.match(/overflow-x:auto/g)?.length, 1, "horizontal scrolling is confined to the FSM state strip");

console.log("EnemyLabGroupCompact smoke passed");
