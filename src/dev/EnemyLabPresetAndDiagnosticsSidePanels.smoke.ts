import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");

assert(!source.includes('textContent: "Override"'), "Override checkbox text is removed");
assert(!source.includes("formationOverrideCheck"), "formation override checkbox is removed");
assert(source.includes('formationControls.style.display = "flex"'), "formation controls are always visible");
assert(source.includes('button.addEventListener("click", (ev) => {') && source.includes("ev.stopPropagation()"), "first preset click is handled by the compact select button itself");
assert(source.includes('max-height:min(520px, calc(100vh - 16px))'), "preset side panel has viewport-safe capacity for at least 20 26px rows");
assert(source.includes('position:fixed') && source.includes('data-side", leftCandidate >= margin ? "left" : "right"'), "diagnostics uses fixed side-panel positioning and flips");
assert(source.includes('document.body.appendChild(runtimeDiagnosticsSection)'), "diagnostics panel is mounted outside STATES");
assert(source.includes('statesAndDiagnosticsDock.style.gridTemplateColumns = "minmax(0,1fr)"'), "STATES width is not reduced when diagnostics opens");
assert.equal((source.match(/runtimeDiagnosticsSection\.id = "ds-fsm-runtime-diagnostics"/g) ?? []).length, 1, "only one diagnostics panel instance is defined");
assert(source.includes('handleRuntimeDiagnosticsKeydown') && source.includes('ev.key === "Escape"'), "Escape closes diagnostics");
assert(source.includes('runtimeDiagnosticsToggle.addEventListener("click"'), "toggle closes diagnostics");
assert(source.includes('handleRuntimeDiagnosticsResize'), "resize repositions diagnostics");
assert(source.includes('findLatestFsmRuntimeDiagnostics'), "existing diagnostics refresh remains wired");

console.log("EnemyLabPresetAndDiagnosticsSidePanels smoke passed");
