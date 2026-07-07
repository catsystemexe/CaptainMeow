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
function preset(id: string, baseSpeed: number, speedMultiplier = 1, movementPresetId = "straight.drift"): any {
  const def: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id, name: id, source: "draft", schemaVersion: 1 }, basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, baseSpeed, spawnY: 120 }, graph: { initialStateId: asFsmStateId("move"), states: [{ id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], formationId: "line.horizontal", spacing: 18, elasticity: 0, speedMultiplier } as any] } };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness() { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, spawn, enemy }; }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
function close(actual: number, expected: number, eps = 0.75) { assert(Math.abs(actual - expected) <= eps, `${actual} ~= ${expected}`); }
function stepSingle(base: number, mult = 1, move = "straight.drift") { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 600, y: 120 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`single.${base}.${mult}.${move}`, base, mult, move), devManualSpawnId: 9 } }] as any); const ent = live(h.store)[0]; const x0 = ent.pos.x, y0 = ent.pos.y; h.enemy.update({ tick: 2, dt: DT } as any); return { ent, dx: ent.pos.x - x0, dy: ent.pos.y - y0, mag: Math.hypot(ent.pos.x - x0, ent.pos.y - y0) }; }
function stepGroup(base: number, mult = 1, move = "straight.drift") { const h = harness(); h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 3, anchor: { x: 600, y: 120 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset(`group.${base}.${mult}.${move}`, base, mult, move), devManualSpawnId: 10 } }] as any); const group = h.groups.get(1) as any; const x0 = group.anchor.x, y0 = group.anchor.y; h.enemy.update({ tick: 2, dt: DT } as any); return { group, dx: group.anchor.x - x0, dy: group.anchor.y - y0, mag: Math.hypot(group.anchor.x - x0, group.anchor.y - y0) }; }

for (const base of [50, 100, 200]) close(stepSingle(base).mag / DT, base);
for (const mult of [0.5, 1, 2]) close(stepSingle(100, mult).mag / DT, 100 * mult);
for (const base of [50, 100, 200]) close(stepGroup(base).mag / DT, base);
for (const mult of [0.5, 1, 2]) close(stepGroup(100, mult).mag / DT, 100 * mult);
const sine50 = stepSingle(50, 1, "sine.soft"); const sine200 = stepSingle(200, 1, "sine.soft");
close(Math.abs(sine200.dx / sine50.dx), 4, 0.15); assert.notEqual(Math.sign(sine50.dy), Number.NaN, "sine keeps vertical component path available");
close(stepSingle(100, 1, "straight.charge").mag / DT, 100);
close(stepSingle(200, 1, "none.hold").mag, 0, 0.000001);
assert.equal(stepSingle(100).ent.fsm.speedDiagnostics.effectiveSpeed, 100);
assert.equal(stepGroup(100).group.fsm.speedDiagnostics.effectiveSpeed, 100);
console.log("FsmSpeedAuthoritativeRuntime smoke passed");
