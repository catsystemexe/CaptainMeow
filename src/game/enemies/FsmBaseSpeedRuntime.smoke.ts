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
function preset(id: string, baseSpeed: number, speedMultiplier = 1): any {
  const def: FsmPresetSchemaV1 = {
    schemaVersion: 1,
    metadata: { id, name: id, source: "draft", schemaVersion: 1 },
    basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, baseSpeed, spawnY: 120 },
    graph: { initialStateId: asFsmStateId("move"), states: [{
      id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [],
      formationOverride: { enabled: true, shape: "line.horizontal", spacing: 18, elasticity: 0, speedMultiplier },
    } as any] },
  };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness() { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, spawn, enemy }; }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
function mag(v: { x: number; y: number }) { return Math.hypot(v.x, v.y); }
function close(actual: number, expected: number, eps = 0.5) { assert(Math.abs(actual - expected) <= eps, `${actual} ~= ${expected}`); }
function tickSingle(baseSpeed: number, speedMultiplier = 1) { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`single.${baseSpeed}.${speedMultiplier}`, baseSpeed, speedMultiplier) } }] as any); const ent = live(h.store)[0]; h.enemy.update({ tick: 2, dt: DT } as any); return ent; }
function tickGroup(baseSpeed: number, speedMultiplier = 1, count = 2) { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count, anchor: { x: 600, y: 120 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`group.${baseSpeed}.${speedMultiplier}`, baseSpeed, speedMultiplier), devManualSpawnId: 7 } }] as any); h.enemy.update({ tick: 2, dt: DT } as any); return h; }

const e100 = tickSingle(100, 1); close(mag(e100.vel), 100); assert(e100.vel.x < 0, "single direction remains left");
const e200 = tickSingle(200, 1); close(mag(e200.vel), 200); assert(Math.sign(e200.vel.x) === Math.sign(e100.vel.x), "baseSpeed changes do not flip direction");
const e50 = tickSingle(100, 0.5); close(mag(e50.vel), 50);
const g = tickGroup(100, 0.5, 2); close(mag((g.groups.get(1) as any).vel), 50); assert.equal((g.groups.get(1) as any).members.length, 2, "group count creates actual members");
const g7 = tickGroup(100, 1, 7); assert.equal((g7.groups.get(1) as any).members.length, 7, "Count 7 creates seven actual group members");
assert.equal(live(g7.store).filter((e) => e.devManualSpawnId === 7).length, 7, "manual spawn correlation reaches all members");

console.log("FsmBaseSpeedRuntime smoke passed");
