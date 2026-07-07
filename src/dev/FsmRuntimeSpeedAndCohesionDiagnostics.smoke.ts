import assert from "node:assert/strict";
import { EventType } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { asFsmStateId, resolveFsmPreset, type FsmPresetSchemaV1 } from "../game/enemies/fsm";
import { EnemySystem } from "../game/systems/EnemySystem";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { findLatestFsmRuntimeDiagnostics, renderFsmRuntimeDiagnosticsText } from "./FsmRuntimeDiagnostics";

const DT = 1 / 60;
function preset(id: string, baseSpeed: number, movementPresetId = "straight.drift", followDelay = 0.1, elasticity = 3): any {
  const def: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id, name: id, source: "draft", schemaVersion: 1 }, basicSetup: { appearanceId: "red", count: 5, formationId: "line.horizontal", spacing: 40, elasticity, followDelay, baseSpeed, spawnY: 180 }, graph: { initialStateId: asFsmStateId("move"), states: [{ id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: movementPresetId } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], formationId: "line.horizontal", spacing: 40, elasticity, followDelay, speedMultiplier: 1.5 } as any] } };
  return resolveFsmPreset(def as any, { allowDraftSource: true } as any);
}
function harness(scrollX = 0) { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); (world as any).scrollX = scrollX; const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, 896, 504, world, groups); return { store, groups, world, spawn, enemy }; }
function live(store: EntityStore<any>): any[] { return ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy" && !e.pendingKill); }
{
  const h = harness(10);
  h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 700, y: 180 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset("single", 120), devManualSpawnId: 501 } }] as any);
  (h.world as any).scrollX = 13;
  h.enemy.update({ tick: 2, dt: DT } as any);
  (h.world as any).scrollX = 17;
  h.enemy.update({ tick: 3, dt: DT } as any);
  const s = findLatestFsmRuntimeDiagnostics({ store: h.store, groups: h.groups, latestManualSpawnId: 501, scrollX: h.world.scrollX }).primary!;
  assert.equal(s.kind, "single");
  assert.equal(s.baseSpeed, 120);
  assert.equal(s.speedMultiplier, 1.5);
  assert.equal(s.effectiveSpeed, 180);
  assert.equal(s.worldSpeedMagnitude, Math.hypot(s.finalVelocityX ?? 0, s.finalVelocityY ?? 0));
  assert.notEqual(s.screenVelocityX, s.finalVelocityX, "autoscroll makes screen and world velocity differ");
  const text = renderFsmRuntimeDiagnosticsText({ version: "A1.1", primary: s, member: null });
  assert(text.includes("World speed:"));
  assert(text.includes("Screen speed:"));
}
{
  const h = harness(0);
  h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 700, y: 180 }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset("hold", 200, "none.hold"), devManualSpawnId: 502 } }] as any);
  h.enemy.update({ tick: 2, dt: DT } as any);
  const s = findLatestFsmRuntimeDiagnostics({ store: h.store, groups: h.groups, latestManualSpawnId: 502, scrollX: 0 }).primary!;
  assert.equal(s.rawVelocityX, 0);
  assert.equal(s.finalVelocityX, 0);
  assert.equal(s.worldSpeedMagnitude, 0);
}
{
  const h = harness(5);
  h.spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count: 5, anchor: { x: 700, y: 180 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "elastic", params: { formation: { spacing: 40 }, cohesion: { maxCatchupSpeed: 600 } }, fsmPresetId: "draft", resolvedFsmPresetOverride: preset("group", 300, "sine.soft", 0.25, 8), devManualSpawnId: 503 } }] as any);
  for (let i = 0; i < 20; i++) h.enemy.update({ tick: i + 2, dt: DT } as any);
  const bundle = findLatestFsmRuntimeDiagnostics({ store: h.store, groups: h.groups, latestManualSpawnId: 503, scrollX: 5 });
  const g = bundle.primary!;
  const m = bundle.member!;
  assert.equal(g.kind, "group-anchor");
  assert(Number.isFinite(g.anchorSpeed), "anchor speed diagnostic present");
  assert(Number.isFinite(g.maxMemberTargetDistance), "max target distance present");
  assert(Number.isFinite(g.maxMemberCorrectionSpeed), "max correction speed present");
  assert(Number.isFinite(g.saturatedMembersCount), "saturation count present");
  assert.equal(m.kind, "group-member");
  assert(Number.isFinite(m.memberDistanceToTarget), "member target distance present");
  assert(Number.isFinite(m.memberCatchUpCap), "member cap present");
  assert(typeof m.memberSaturated === "boolean", "member saturation boolean present");
  assert(typeof m.memberOvershootPrevented === "boolean", "member overshoot boolean present");
  const rendered = renderFsmRuntimeDiagnosticsText(bundle);
  assert(rendered.includes("Catch-up cap:"));
  assert(rendered.includes("Saturated members:"));
  assert.equal(live(h.store).length, 5, "member count unchanged");
}
console.log("FsmRuntimeSpeedAndCohesionDiagnostics smoke passed");
