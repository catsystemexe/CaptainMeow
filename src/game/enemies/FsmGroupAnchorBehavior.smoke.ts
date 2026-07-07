import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { CONTENT } from "../content/CONTENT";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { FsmPresetEditorModel } from "../../dev/FsmPresetEditorModel";
import { defaultBasicSetupForMode } from "../../dev/EnemyLabPresetModel";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { getFsmDebugSnapshot } from "./fsm";

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

function spawnSingle(spawn: SpawnSystem, fsmPresetId = "fsm.charge") {
  spawn.update({ tick: 1, dt: DT }, [{ type: EventType.SPAWN_ENEMY, payload: {
    typeId: "red",
    spawn: { x: 600, y: 120 },
    fsmPresetId,
  } }] as any);
}

function spawnGroup(spawn: SpawnSystem, input: { fsmPresetId?: string; movementPresetId?: string; formationId?: string; spacing?: number } = {}) {
  spawn.update({ tick: 1, dt: DT }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: {
    enemyTypeId: "red",
    count: 2,
    anchor: { x: 600, y: 120 },
    formationId: input.formationId ?? "line.horizontal",
    movementPresetId: input.movementPresetId ?? "straight.basic",
    cohesionId: "rigid",
    params: { formation: { spacing: input.spacing ?? 18 }, cohesion: { maxCatchupSpeed: 600 } },
    ...(input.fsmPresetId ? { fsmPresetId: input.fsmPresetId } : {}),
  } }] as any);
}

function update(enemy: EnemySystem, ticks: number) {
  for (let i = 0; i < ticks; i++) enemy.update({ tick: i + 1, dt: DT } as any);
}

{
  const { store, spawn } = harness();
  spawnSingle(spawn);
  const [ent] = liveEnemies(store);
  assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.charge", "Count = 1 resolves selected fsm.charge runtime");
  assert.equal(getFsmDebugSnapshot(ent)?.movementPresetId, "straight.drift", "single starts on fsm.charge graph enter movement");
}

{
  const { store, groups, spawn } = harness();
  spawnGroup(spawn, { fsmPresetId: "fsm.charge" });
  const group = groups.get(1) as any;
  assert.equal(group?.fsm?.preset?.id, "fsm.charge", "Count > 1 group anchor resolves selected fsm.charge runtime");
  assert.equal(group?.movementPresetId, "none.hold", "FSM group anchor suppresses default group movement preset");
  for (const ent of liveEnemies(store)) {
    assert.equal(getFsmDebugSnapshot(ent)?.presetId, "fsm.charge", "member keeps selected FSM graph for combat/transition state");
    assert.equal(ent.behaviorId, "none", "member movement remains suppressed under group control");
  }
}

{
  const fsmHarness = harness();
  spawnGroup(fsmHarness.spawn, { fsmPresetId: "fsm.charge" });
  const fsmMembers = liveEnemies(fsmHarness.store);
  const fsmStartAnchor = (fsmHarness.groups.get(1) as any).anchor.x;
  const fsmStartMemberX = fsmMembers.map((e) => e.pos.x);
  update(fsmHarness.enemy, 20);
  const fsmGroup = fsmHarness.groups.get(1) as any;
  assert(fsmGroup.anchor.x < fsmStartAnchor - 30, "selected FSM moves the group anchor left");
  assert.equal(fsmGroup.fsm.preset.id, "fsm.charge", "active group anchor FSM identity remains fsm.charge after updates");
  assert.equal(fsmGroup.fsm.movement.base.presetId, "straight.charge", "group anchor transitions into fsm.charge graph movement");
  for (const ent of fsmMembers) {
    assert(ent.pos.x < fsmStartMemberX[ent.group.slotIndex] - 20, "each member moves with the FSM-controlled anchor");
    const offset = fsmGroup.members.find((m: any) => m.slotIndex === ent.group.slotIndex).offset;
    assert(Math.abs(ent.pos.x - (fsmGroup.anchor.x + offset.x)) < 0.001, "rigid member X remains at formation offset around anchor");
    assert(Math.abs(ent.pos.y - (fsmGroup.anchor.y + offset.y)) < 0.001, "rigid member Y remains at formation offset around anchor");
    assert.equal(ent.fsm.movement.movementSuspended, true, "member FSM movement is not independently integrated");
  }

  const defaultHarness = harness();
  spawnGroup(defaultHarness.spawn, { movementPresetId: "none.hold" });
  const defaultStart = (defaultHarness.groups.get(1) as any).anchor.x;
  update(defaultHarness.enemy, 20);
  const defaultGroup = defaultHarness.groups.get(1) as any;
  assert.equal(defaultGroup.fsm, undefined, "non-FSM default group has no anchor FSM runtime");
  assert.equal(defaultGroup.anchor.x, defaultStart, "default none.hold group anchor does not move like fsm.charge");
  assert.notEqual(Math.round(defaultGroup.anchor.x), Math.round(fsmGroup.anchor.x), "FSM group anchor movement differs from default group movement");
}

{
  const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
  model.select("fsm.charge");
  const selected = model.selectedId;
  const graph = model.registry().get(selected)?.definition.graph;
  assert.equal(selected, "fsm.charge", "test starts from selected fsm.charge");
  const setup = { ...defaultBasicSetupForMode("fsm"), appearanceId: "red", count: 1, formationId: "line.horizontal" as const, spacing: 18, elasticity: 0, baseSpeed: 115, spawnY: 260 };
  const edits = [
    { appearanceId: "blue" },
    { count: 2 },
    { count: 1 },
    { formationId: "wedge" as const },
    { spacing: 44 },
    { elasticity: 6 },
    { baseSpeed: 180 },
    { spawnY: 123 },
  ];
  let current = setup;
  for (const edit of edits) {
    current = { ...current, ...edit };
    model.setBasicSetup(current);
    assert.equal(model.selectedId, selected, "Basic Setup edit preserves selected FSM preset ID");
    assert.equal(model.registry().get(model.selectedId)?.definition.graph, graph, "Basic Setup edit preserves FSM graph object identity");
    assert.equal(model.registry().get(model.selectedId)?.definition.graph.initialStateId, "enter" as any, "Basic Setup edit does not reload another graph");
  }
  model.select("fsm.hover");
  assert.equal(model.selectedId, "fsm.hover", "only explicit preset selection changes behavior");
}

{
  const { spawn, groups } = harness();
  assert.throws(() => spawnGroup(spawn, { fsmPresetId: "fsm.missing.u1_3_1" }), /Unknown explicit fsmPresetId/, "invalid explicit FSM group ID fails clearly");
  assert.equal(groups.size(), 0, "invalid explicit FSM group ID does not silently create default group behavior");
}

console.log("FsmGroupAnchorBehavior smoke passed");
