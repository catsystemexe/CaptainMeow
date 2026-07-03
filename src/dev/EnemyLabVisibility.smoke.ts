import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { createDevSummonerPanelStyle, DEV_SUMMONER_PANEL_ID, ENEMY_LAB_DEBUG_PANEL_ID, FSM_PRESET_EDITOR_ID } from "./DevSummoner";

const source = readFileSync("src/dev/DevSummoner.ts", "utf8");
const style = createDevSummonerPanelStyle();

assert.equal(DEV_SUMMONER_PANEL_ID, "dev-summoner", "DevSummoner keeps the existing body mount id");
assert.equal(FSM_PRESET_EDITOR_ID, "ds-fsm-preset-editor", "Enemy Lab preset editor keeps a discoverable container id");
assert.equal(ENEMY_LAB_DEBUG_PANEL_ID, "ds-enemy-lab-debug", "Enemy Lab debug panel keeps a discoverable container id");
assert(source.includes("Enemy Lab"), "DevSummoner renders a visible Enemy Lab title/entry");
assert(source.includes("document.body.appendChild(panel)"), "Enemy Lab mounts through the existing DevSummoner lifecycle");
assert.equal((source.match(/document\.body\.appendChild\(panel\)/g) ?? []).length, 1, "Enemy Lab panel mounts exactly once");
assert(source.includes("panel.id = DEV_SUMMONER_PANEL_ID"), "Enemy Lab panel id is assigned through the exported mount contract");
assert(source.includes("presetPanel.id = FSM_PRESET_EDITOR_ID"), "S9 preset-management panel is mounted into the Enemy Lab panel");
assert(source.includes("FSM Presets"), "S9 preset list heading remains present");
assert(source.includes("USER") && source.includes("BUILT-IN"), "built-in/user labels remain available");
assert(CONTENT.fsmPresets.list().length > 0, "combined FSM preset registry is available to the mounted panel");
assert(style.includes("max-height:calc(100vh - 16px)"), "Enemy Lab panel is bounded to the viewport");
assert(style.includes("overflow-y:auto"), "Enemy Lab panel can scroll to the S9 preset editor instead of clipping it");
assert(!style.includes("overflow:hidden"), "Enemy Lab panel is not permanently clipped after activation");
assert(source.includes("if (this.panel) return;"), "missing duplicate mount attempts are prevented by the existing lifecycle guard");
assert(source.includes("if (!out) return;"), "missing debug container fails locally without preventing preset editor mount");
assert(!source.includes("draggable") && !source.includes("transition-line") && !source.includes("state author"), "S9.1 does not add S10 graph/state authoring controls");

console.log("EnemyLabVisibility smoke passed");
