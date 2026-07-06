import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { EnemySystem } from "../systems/EnemySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { EnemyGroupRegistry } from "./EnemyGroups";
import { asFsmStateId, resolveFsmPreset, type FsmPresetSchemaV1 } from "./fsm";

const DT = 1 / 60;
function preset(id: string, baseSpeed = 100, speedMultiplier = 1, movementPresetId = "straight.basic", legacy = false): any {
  const stateFormation = legacy
    ? { formationOverride: { enabled: true, shape: "line.horizontal", spacing: 40, elasticity: 0, speedMultiplier } }
    : { formationId: "line.horizontal", spacing: 40, elasticity: 0, speedMultiplier };
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id, name: id, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 40, elasticity: 0, baseSpeed, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("line"), states: [
      { id: asFsmStateId("line"), label: "Line", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [{ condition: { type: "screenXBelow", params: { x: 999 } } as any, targetStateId: asFsmStateId("ring") }], ...stateFormation } as any,
      { id: asFsmStateId("ring"), label: "Ring", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], formationId: "ring", spacing: 80, elasticity: 8, speedMultiplier } as any,
    ] },
  };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness() { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, spawn, enemy }; }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
function mag(v: { x: number; y: number }) { return Math.hypot(v.x, v.y); }
function close(actual: number, expected: number, eps = 0.75) { assert(Math.abs(actual - expected) <= eps, `${actual} ~= ${expected}`); }
function tickSingle(baseSpeed: number, speedMultiplier = 1, movementPresetId = "straight.basic", legacy = false) { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`single.${baseSpeed}.${speedMultiplier}.${movementPresetId}.${legacy}`, baseSpeed, speedMultiplier, movementPresetId, legacy) } }] as any); const ent = live(h.store)[0]; h.enemy.update({ tick: 2, dt: DT } as any); return ent; }
function tickGroup(baseSpeed: number, speedMultiplier = 1, movementPresetId = "straight.basic", legacy = false) { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 5, anchor: { x: 600, y: 120 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { formation: { spacing: 40 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`group.${baseSpeed}.${speedMultiplier}.${movementPresetId}.${legacy}`, baseSpeed, speedMultiplier, movementPresetId, legacy), devManualSpawnId: 7 } }] as any); h.enemy.update({ tick: 2, dt: DT } as any); return h; }

const h = harness();
h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 5, anchor: { x: 600, y: 120 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { formation: { spacing: 40 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset("formation", 100, 1), devManualSpawnId: 7 } }] as any);
const groupBefore = h.groups.get(1) as any;
assert.equal(groupBefore.formationId, "line.horizontal", "spawn starts from Basic Setup line formation");
const beforeRefs = groupBefore.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`);
const beforeOffsets = groupBefore.members.map((m: any) => ({ ...m.offset }));
h.enemy.update({ tick: 2, dt: DT } as any);
const groupAfter = h.groups.get(1) as any;
assert.equal(groupAfter.formationId, "ring", "active state formation switches line to ring on transition");
assert.equal(groupAfter.params.formation.radius, 80, "state spacing 80 maps to ring radius");
assert.equal(groupAfter.params.formation.spacing, 80, "state spacing 80 is active");
assert.equal(groupAfter.cohesionId, "elastic", "elasticity 8 maps to elastic cohesion");
assert.equal(groupAfter.members.length, 5, "Count remains unchanged");
assert.deepEqual(groupAfter.members.map((m: any) => `${m.ref.slot}:${m.ref.gen}`), beforeRefs, "member IDs remain unchanged");
assert.notDeepEqual(groupAfter.members.map((m: any) => m.offset), beforeOffsets, "target offsets changed");
assert.equal(groupAfter.id, 1, "group ID remains unchanged");

close(mag(tickSingle(100, 1).vel), 100);
close(mag(tickSingle(200, 1).vel), 200);
close(mag(tickSingle(100, 0.5).vel), 50);
close(mag((tickGroup(200, 1).groups.get(1) as any).vel), 200);
close(mag((tickGroup(100, 0.5).groups.get(1) as any).vel), 50);
close(mag(tickSingle(120, 1, "sine.soft").vel), 120);
close(mag((tickGroup(120, 1, "sine.soft").groups.get(1) as any).vel), 120);
close(mag(tickSingle(100, 0.5, "straight.basic", true).vel), 50);
assert(tickSingle(100, 1).vel.x < 0, "direction remains leftward");

console.log("FsmStateFormationRuntime smoke passed");
