import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { CONTENT } from "../content/CONTENT";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { FSM_SCHEMA_VERSION, asFsmStateId, type FsmPresetSchemaV1 } from "./fsm/schema";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";
import { FsmPresetEditorModel } from "../../dev/FsmPresetEditorModel";
import { defaultBasicSetupForMode } from "../../dev/EnemyLabPresetModel";

const DT = 1 / 60;


function harness() {
  const store = new EntityStore<any>(128);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  return { store, groups, spawn, enemy };
}

function liveEnemies(store: EntityStore<any>): any[] {
  return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill);
}

function update(enemy: EnemySystem, ticks: number) {
  for (let i = 0; i < ticks; i++) enemy.update({ tick: i + 1, dt: DT } as any);
}

function spawnGroup(spawn: SpawnSystem, fsmPresetId: string, count: number) {
  spawn.update({ tick: 1, dt: DT }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: {
    enemyTypeId: "red",
    count,
    anchor: { x: 850, y: 120 },
    formationId: "line.horizontal",
    movementPresetId: "straight.basic",
    cohesionId: "rigid",
    params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } },
    fsmPresetId,
  } }] as any);
}

function spawnSingle(spawn: SpawnSystem, fsmPresetId: string) {
  spawn.update({ tick: 1, dt: DT }, [{ type: EventType.SPAWN_ENEMY, payload: {
    typeId: "red",
    spawn: { x: 850, y: 120 },
    fsmPresetId,
  } }] as any);
}

function assertFsmGroup(input: { presetId: string; count: number; expectedInitialMovement: string; expectedLaterMovement?: string; expectMovement?: boolean }) {
  const { store, groups, spawn, enemy } = harness();
  spawnGroup(spawn, input.presetId, input.count);
  const group = groups.get(1) as any;
  assert(group?.fsm, `${input.presetId} Count > 1 creates a group anchor FSM runtime`);
  assert.equal(group.fsm.preset.id, input.presetId, `${input.presetId} group runtime uses requested selected preset`);
  assert.equal(group.fsm.preset.states[group.fsm.stateIndex]?.id, CONTENT.fsmPresets.get(input.presetId)?.definition.graph.initialStateId, `${input.presetId} initial state matches selected graph`);
  assert.equal(group.fsm.movement.base.presetId, input.expectedInitialMovement, `${input.presetId} initial movement comes from selected graph`);
  assert.equal(group.movementPresetId, "none.hold", `${input.presetId} default group movement is suppressed once FSM runtime exists`);
  assert.equal(group.behaviorId, "none", `${input.presetId} default normal movement branch is not authoritative`);
  const members = liveEnemies(store);
  assert.equal(members.length, input.count, `${input.presetId} spawns requested current draft Count`);
  for (const ent of members) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, input.presetId, `${input.presetId} member retains selected FSM identity`);
    assert.equal(ent.behaviorId, "none", `${input.presetId} member normal movement is suppressed for group ownership`);
  }
  const startAnchorX = group.anchor.x;
  const startMemberX = members.map((e) => e.pos.x);
  update(enemy, 100);
  const updated = groups.get(1) as any;
  if (input.expectMovement !== false) assert(updated.anchor.x !== startAnchorX || updated.anchor.y !== 120, `${input.presetId} anchor movement is produced by selected FSM branch`);
  if (input.expectedLaterMovement) assert.equal(updated.fsm.movement.base.presetId, input.expectedLaterMovement, `${input.presetId} later movement remains selected graph movement`);
  for (const ent of members) {
    if (input.expectMovement !== false) assert(ent.pos.x !== startMemberX[ent.group.slotIndex] || ent.pos.y !== 120, `${input.presetId} members follow moving anchor`);
    const offset = updated.members.find((m: any) => m.slotIndex === ent.group.slotIndex).offset;
    assert(Math.abs(ent.pos.x - (updated.anchor.x + offset.x)) < 0.001, `${input.presetId} member X follows formation offset`);
    assert(Math.abs(ent.pos.y - (updated.anchor.y + offset.y)) < 0.001, `${input.presetId} member Y follows formation offset`);
  }
}

assertFsmGroup({ presetId: "fsm.turret", count: 2, expectedInitialMovement: "straight.basic" });
assertFsmGroup({ presetId: "fsm.charge", count: 2, expectedInitialMovement: "straight.drift" });
assertFsmGroup({ presetId: "fsm.hover", count: 3, expectedInitialMovement: "sine.soft" });

{
  const { store, spawn } = harness();
  spawnSingle(spawn, "fsm.charge");
  const [ent] = liveEnemies(store);
  assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.charge", "Charge Count = 1 remains a single selected-FSM enemy");
}

{
  const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
  model.select("fsm.charge");
  const graph = model.registry().get("fsm.charge")?.definition.graph;
  for (const count of [2, 1, 3]) {
    model.setBasicSetup({ ...defaultBasicSetupForMode("fsm"), count });
    assert.equal(model.selectedId, "fsm.charge", "Charge remains selected across Count 2 -> 1 -> 3 draft edits");
    assert.equal(model.registry().get(model.selectedId)?.definition.graph, graph, "Charge graph identity remains active across unsaved Count edits");
  }
}

{
  const legacyPreset: FsmPresetSchemaV1 = {
    schemaVersion: FSM_SCHEMA_VERSION,
    metadata: { id: "fsm.user.legacy-count-override", name: "legacy count override", source: "user", schemaVersion: FSM_SCHEMA_VERSION },
    graph: { initialStateId: asFsmStateId("enter"), states: [{ id: asFsmStateId("enter"), label: "enter", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions: [] }] },
  };
  assert.equal(CONTENT.userFsmPresets.upsert(legacyPreset).ok, true, "legacy preset without stored Basic Setup is accepted");
  const legacyModel = new FsmPresetEditorModel(CONTENT.userFsmPresets, legacyPreset.metadata.id);
  assert.equal(legacyModel.draft?.basicSetup.count, 1, "legacy preset normalizes to default Count 1 in the draft");
  legacyModel.setBasicSetup({ count: 2 });
  const beforeSaveRaw = CONTENT.userFsmPresets.inspectRawStorage().raw;
  const { store, groups, spawn } = harness();
  spawn.update({ tick: 1, dt: DT }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: {
    enemyTypeId: "red",
    count: legacyModel.draft?.basicSetup.count,
    anchor: { x: 850, y: 120 },
    formationId: "line.horizontal",
    movementPresetId: "straight.basic",
    cohesionId: "rigid",
    fsmPresetId: legacyPreset.metadata.id,
  } }] as any);
  const group = groups.get(1) as any;
  assert.equal(group?.fsm?.preset?.id, legacyPreset.metadata.id, "legacy/no-basicSetup Count > 1 creates selected FSM anchor runtime without saving");
  assert.equal(liveEnemies(store).length, 2, "legacy current draft Count drives group cardinality");
  assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, beforeSaveRaw, "legacy unsaved Count override does not require saving before spawn");
  CONTENT.userFsmPresets.delete(legacyPreset.metadata.id);
}

console.log("FsmGroupPresetCountOverride smoke passed");
