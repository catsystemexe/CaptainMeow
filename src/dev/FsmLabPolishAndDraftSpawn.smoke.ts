import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { EventType } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { getFsmDebugSnapshot } from "../game/enemies/fsm";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { createAuthoring } from "./FsmAuthoringSmokeHelpers";
import { resolveEphemeralFsmPreset } from "./FsmPreviewSession";

const src = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
for (const text of ["width:100%;box-sizing:border-box", "Behavior", "scrX", "makeTriggerStepper", "0.25", "10", "ICONS.duplicate", "ICONS.delete", "ICONS.up", "ICONS.down", "+ New state", "resolvedFsmPresetOverride", "stopLatestManualSpawn", "topRestartBtn"]) assert(src.includes(text), `missing polish marker ${text}`);
assert(!src.includes("selectedStateTitle.textContent = view ? `State"), "expanded editor no longer renders redundant state title");
assert(!src.includes("Targets next state only:"), "expanded editor no longer renders redundant target hint");
assert(!src.includes("addAuthoringSection(\"Preview\")"), "old preview controls are not mounted");
assert(src.includes("title = label") && src.includes("aria-label"), "icon-only buttons have title and aria-label wiring");
assert(readFileSync(new URL("../../package.json", import.meta.url), "utf8").includes('"tone"') && !readFileSync(new URL("../../package.json", import.meta.url), "utf8").includes("lucide"), "no additional icon library installed; vanilla icon set is used");

const { model } = createAuthoring("fsm.user.polish");
model.setMovementPreset("idle", "sine.tight");
model.setLabTrigger("idle", "time", { seconds: 5 });
model.setLabTrigger("idle", "screenXBelow", { x: 750 });
assert.equal(model.selectedStateView()?.triggerType, "screenXBelow", "runtime trigger id remains screenXBelow");
const beforeCount = model.draft!.preset.graph.states.length;
assert.equal(model.duplicateState("idle").ok, true, "Duplicate action works");
assert.equal(model.draft!.preset.graph.states.length, beforeCount + 1, "Duplicate adds state");
const dupId = model.draft!.selectedStateId!;
assert.equal(model.deleteState(dupId, true).ok, true, "Delete removes a state");
assert.equal(model.draft!.preset.graph.states.length, beforeCount, "Delete reconciles state count");
model.deleteState("exit", true);
assert.equal(model.deleteState("idle", true).ok, false, "Delete disabled/model-blocked for one remaining state");
assert.equal(model.addState().ok, true, "New state appends valid default");
assert.equal(model.draft!.selectedStateId, model.draft!.preset.graph.states.at(-1)!.id, "New state is selected");
model.normalizeSequentialTriggers();
assert.equal(model.draft!.preset.graph.initialStateId, model.draft!.preset.graph.states[0].id, "initialStateId reconciles");

const savedBefore = CONTENT.userFsmPresets.inspectRawStorage().raw;
model.setMovementPreset(String(model.draft!.preset.graph.states[0].id), "sine.tight");
const override = resolveEphemeralFsmPreset(model.draft!.preset);
assert.equal(override.ok, true, "changed Behavior resolves without Save");
const resolved = override.ok ? override.preset : null;
assert(resolved);
function harness() { const store = new EntityStore<any>(64); const groups = new EnemyGroupRegistry(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState(), groups); return { store, groups, spawn }; }
{
  const h = harness();
  h.spawn.update({ tick: 1, dt: 1 / 60 } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 10, y: 20 }, fsmPresetId: resolved.id, resolvedFsmPresetOverride: resolved, devManualSpawnId: 7001 } }] as any);
  const ent = ((h.store as any).entities as any[]).find((e) => e?.alive && e.kind === "enemy");
  assert.equal(getFsmDebugSnapshot(ent)?.movementPresetId, "sine.tight", "single SPAWN uses current draft graph");
}
{
  const h = harness();
  h.spawn.update({ tick: 1, dt: 1 / 60 } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 2, anchor: { x: 10, y: 20 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", fsmPresetId: resolved.id, resolvedFsmPresetOverride: resolved, devManualSpawnId: 7002 } }] as any);
  assert.equal((h.groups.get(1) as any)?.fsm?.movement?.base?.presetId, "sine.tight", "group anchor SPAWN uses current draft graph");
  const enemies = ((h.store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy");
  for (const ent of enemies) h.store.markKill({ slot: ent.slot, gen: ent.gen } as any);
  assert.equal(enemies.filter((e) => e.devManualSpawnId === 7002).length, 2, "Stop correlation can target only latest manual group members");
}
assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, savedBefore, "saved storage remains unchanged by draft spawn");
console.log("FsmLabPolishAndDraftSpawn smoke passed");
