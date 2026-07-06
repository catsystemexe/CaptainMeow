import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");

assert(source.includes('"width:clamp(220px, 32vw, 264px)"'), "Enemy Lab panel uses wider responsive clamp width");
assert(source.includes('fsmLabSection.style.cssText = "display:none;flex-direction:column;gap:6px;width:100%;max-width:100%;"'), "FSM inner panel no longer independently caps width");
assert(source.includes('"max-width:min(264px, calc(100vw - 16px))"'), "narrow viewport fallback caps panel to viewport");
assert(source.indexOf('fsmPresetHeading.textContent = "PRESETS"') < source.indexOf('fsmPresetSection.appendChild(fsmPresetToolbar)'), "PRESETS heading appears first");
assert(source.indexOf('fsmPresetSection.appendChild(fsmPresetToolbar)') < source.indexOf('fsmPresetSection.appendChild(fsmSpawnSelect.root)'), "preset toolbar is above current preset control");
assert(!source.includes('textContent = "Preset"'), "redundant Preset label is absent");
assert(source.includes('"position:fixed"') && source.includes('list.setAttribute("data-side", fitsRight ? "right" : "left")'), "preset list is a fixed side popover with flip metadata");
assert(source.includes('!root.contains(ev.target as Node) && !list.contains(ev.target as Node)'), "outside click closes popover without treating list clicks as outside");
assert(source.includes('document.addEventListener("keydown", handleDocumentKeydown)'), "Escape closes custom preset popover");
assert(source.includes('fsmTypeRow.appendChild(countSegment)') && source.includes('grid-template-columns:auto minmax(0,1fr) auto'), "Type and count share one Basic Setup row");
assert(!source.includes('fsmCountLabel.textContent = "Count"'), "visible Count label is absent from FSM Basic Setup");
assert(source.includes('editFsmBasicSetupDraft?.()'), "count/type changes still mark FSM draft dirty through Basic Setup draft edit");
assert(source.includes('runtimeDiagnosticsToggle.title = "Toggle Runtime Diagnostics"'), "diagnostics toggle icon is in STATES heading");
assert(source.includes('let runtimeDiagnosticsDockOpen = false'), "diagnostics are hidden by default for the current Enemy Lab session");
assert(source.includes('statesAndDiagnosticsDock.style.gridTemplateColumns = runtimeDiagnosticsDockOpen ? "minmax(0, 2fr) minmax(120px, 1fr)" : "minmax(0,1fr)"'), "diagnostics dock beside states at roughly 2:1 split when open");
assert.equal((source.match(/runtimeDiagnosticsSection\.id = "ds-fsm-runtime-diagnostics"/g) ?? []).length, 1, "only one diagnostics DOM node is defined");
assert(source.includes('findLatestFsmRuntimeDiagnostics'), "existing diagnostics refresh source is reused");
assert(source.includes('minmax(120px, 1fr)'), "diagnostics dock has compact responsive fallback sizing");

console.log("EnemyLabLayoutAndDiagnosticsDock smoke passed");
