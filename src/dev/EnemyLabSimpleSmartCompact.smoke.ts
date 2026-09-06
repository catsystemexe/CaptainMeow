import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../ui/PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

for (const [button, mode] of [["simpleModeButton", "simple"], ["smartModeButton", "smart"], ["fsmModeButton", "fsm"]] as const) {
  assert(source.includes(`${button}.addEventListener("click", () => { enemyLabMode = "${mode}"; refreshEnemyLabMode(); })`), `${mode.toUpperCase()} tab keeps its mode handler`);
}
assert(source.includes('"background:" + (active ? "#eee" : "transparent")') && source.includes('"color:" + (active ? "#000" : "#eee")'), "active tabs use borderless negative text styling");
assert(!source.includes('textContent = "SIMPLE LAB"') && !source.includes('textContent = "SMART LAB"'), "redundant mode headings are absent");
assert(!source.includes('spawnTitle.textContent = "Spawn"'), "redundant Spawn heading is absent");
assert(!source.includes("────────────"), "Enemy Lab title has no decorative separator");
assert(!source.includes('primitiveLabel = "Primitive"') && source.includes('"Formation:"'), "the operator-facing Primitive label is Formation");
assert(source.includes('enemyModeButton.textContent = "Single"') && source.includes('groupModeButton.textContent = "Group"'), "Single and Group choices remain wired");
assert(source.includes('dumbButton.addEventListener("click", () => setMovementClass("dumb"))') && source.includes('smartButton.addEventListener("click", () => setMovementClass("smart"))'), "Dumb and Smart movement choices remain wired");
for (const id of ["ds-enemy", "movement-primitive", "movement-preset", "screen-y"]) assert(source.includes(id), `${id} control remains present`);
assert(source.includes('btn.textContent = "RELEASE"') && source.includes('btn.addEventListener("click"'), "RELEASE action remains wired");
assert(source.includes('overflow:visible') && !source.includes('simpleLabSection.style.cssText = "overflow:auto') && !source.includes('smartLabSection.style.cssText = "overflow:auto'), "SIMPLE and SMART do not own nested scrolling");
assert.match(layout, /clamp\(170px, 18vw, 190px\)/, "right dock targets 170–190px");

console.log("EnemyLabSimpleSmartCompact smoke passed");
