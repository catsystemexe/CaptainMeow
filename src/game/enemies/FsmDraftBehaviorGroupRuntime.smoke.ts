import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createDevSummonerGroupSpawnPayload } from "../../dev/DevSummoner";
import { FsmPresetAuthoringModel } from "../../dev/FsmPresetAuthoringModel";
import { FsmPresetEditorModel } from "../../dev/FsmPresetEditorModel";
import { resolveEphemeralFsmPreset } from "../../dev/FsmPreviewSession";
import { CONTENT } from "../content/CONTENT";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";

const DT = 1 / 60;
const BUILTIN_PRESET_ID = "fsm.charge";
const USER_PRESET_ID = "fsm.charge-copy";
const SAVED_BEHAVIOR = "straight.drift";
const EDITED_BEHAVIOR = "sine.soft";

function harness() {
  const store = new EntityStore<any>(128);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  return { store, groups, spawn, enemy };
}
function liveEnemies(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
function draftOverride() {
  CONTENT.userFsmPresets.delete(USER_PRESET_ID);
  const editor = new FsmPresetEditorModel(CONTENT.userFsmPresets, BUILTIN_PRESET_ID);
  const duplicated = editor.duplicateForEdit(BUILTIN_PRESET_ID);
  assert.equal(duplicated.ok, true, "fixture duplicates built-in into editable user preset");
  assert.equal(duplicated.selectedId, USER_PRESET_ID, "fixture uses predictable user preset id");
  const model = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, USER_PRESET_ID);
  const first = model.draft?.preset.graph.states[0];
  assert(first, "known preset has a first state");
  assert.equal((first.movement.base as any).params.presetId, SAVED_BEHAVIOR, "fixture starts from saved behavior");
  model.selectState(first.id);
  model.setMovementPreset(first.id, EDITED_BEHAVIOR);
  const result = resolveEphemeralFsmPreset(model.draft!.preset);
  assert.equal(result.ok, true, "edited draft resolves without Save");
  return { model, override: result.preset };
}
function tick(enemy: EnemySystem, n = 1) { for (let i = 0; i < n; i++) enemy.update({ tick: i + 1, dt: DT } as any); }

const { model, override } = draftOverride();
assert.equal(CONTENT.fsmPresets.get(USER_PRESET_ID)?.states[0]?.movement.base.params.presetId, SAVED_BEHAVIOR, "saved registry remains unchanged after draft edit");

{
  const h = harness();
  h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: USER_PRESET_ID, resolvedFsmPresetOverride: override } }] as any);
  const [ent] = liveEnemies(h.store);
  assert.equal(getFsmDebugSnapshot(ent)?.movementPresetId, EDITED_BEHAVIOR, "Count 1 runtime uses edited draft movement");
  assert.notEqual(getFsmDebugSnapshot(ent)?.movementPresetId, SAVED_BEHAVIOR, "Count 1 does not fall back to saved graph");
}

for (const count of [2, 5]) {
  const h = harness();
  const payload = createDevSummonerGroupSpawnPayload({ enemyTypeId: "red", count, anchorX: 600, anchorY: 120, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", fsmPresetId: USER_PRESET_ID, resolvedFsmPresetOverride: override, devManualSpawnId: 44, params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } } });
  assert(payload, `Count ${count} creates payload`);
  assert.equal((payload as any).resolvedFsmPresetOverride, override, `Count ${count} payload preserves exact draft override object`);
  h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload }] as any);
  const group = h.groups.get(1) as any;
  assert.equal(group?.fsm?.preset, override, `Count ${count} group anchor uses exact draft override object`);
  assert.equal(group?.fsm?.movement?.base?.presetId, EDITED_BEHAVIOR, `Count ${count} group anchor runtime uses edited movement`);
  assert.notEqual(group?.fsm?.movement?.base?.presetId, SAVED_BEHAVIOR, `Count ${count} group anchor does not use saved preset graph`);
  assert.equal(group?.members.length, count, `Count ${count} creates requested member count`);
  tick(h.enemy);
  for (const ent of liveEnemies(h.store)) {
    assert.equal(ent.group?.groupId, 1, `Count ${count} member remains in group`);
    assert.equal(ent.fsm?.movement?.movementSuspended, true, `Count ${count} member remains cohesion-controlled`);
  }
}

const reloaded = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, USER_PRESET_ID);
assert.equal((reloaded.draft?.preset.graph.states[0].movement.base as any).params.presetId, SAVED_BEHAVIOR, "reload without Save restores saved behavior");
model.save();
assert.equal(CONTENT.fsmPresets.get(USER_PRESET_ID)?.states[0]?.movement.base.params.presetId, EDITED_BEHAVIOR, "Save persists edited behavior to user storage");

console.log("FsmDraftBehaviorGroupRuntime smoke passed");

CONTENT.userFsmPresets.delete(USER_PRESET_ID);
