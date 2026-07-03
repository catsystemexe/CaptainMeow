import assert from "node:assert/strict";
import fs from "node:fs";
import { EnemyBehaviorDB } from "./EnemyBehaviorDB";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";
import { buildBuiltinFsmPresetRegistry, createFsmRuntimeSnapshot, getLegacyMovementPresetId, updateFsm, updateResolvedFsm, type BehaviorGraph } from "./fsm";

interface FsmTraceFrame { tick: number; state: string; age: number; x: number; y: number; vx: number; vy: number; fired?: boolean; switched?: boolean; movement?: string; }

const dt = 1 / 60;
const knownMovementPresetIds = new Set(Object.keys(EnemyBehaviorPresets));
const knownAttackProfileIds = new Set(["single_basic", "spread_test_slow", "spread_test_fast"]);

function applyStateBehavior(e: any, movementPresetId?: string): void {
  if (!movementPresetId) return;
  if (e.fsmAppliedMovementPresetId === movementPresetId) return;
  const preset = EnemyBehaviorPresets[movementPresetId] ?? EnemyBehaviorPresets["none.hold"];
  const nextBehaviorId = preset.behaviorId;
  const behavior = EnemyBehaviorDB[nextBehaviorId] ?? EnemyBehaviorDB.none;
  const attack = e.bState?.attack;
  e.behaviorId = nextBehaviorId;
  e.behavior = preset.params ?? {};
  e.bState = { t: 0 };
  if (attack) e.bState.attack = attack;
  if (nextBehaviorId === "none" && e.vel) { e.vel.x = 0; e.vel.y = 0; }
  e.fsmAppliedMovementPresetId = movementPresetId;
  behavior?.init?.(e);
}

function runLegacy(graph: BehaviorGraph, ticks: number, startX = 820): FsmTraceFrame[] {
  const ent: any = { pos: { x: startX, y: 120 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: { t: 0 } };
  const out: FsmTraceFrame[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    const r = updateFsm({ ent, graph, scrollX: 0, logicW: 800, dt });
    applyStateBehavior(ent, r.state.movementPresetId);
    const behavior = EnemyBehaviorDB[ent.behaviorId] ?? EnemyBehaviorDB.none;
    behavior?.update?.(ent, { dt, playerPos: { x: 0, y: 120 }, logicW: 800, logicH: 600 } as any);
    ent.pos.x += ent.vel.x * dt;
    ent.pos.y += ent.vel.y * dt;
    out.push({ tick, state: r.current, age: ent.fsm.age, x: ent.pos.x, y: ent.pos.y, vx: ent.vel.x, vy: ent.vel.y, fired: !!r.state.attackProfileId, switched: r.switched, movement: r.state.movementPresetId });
  }
  return out;
}

function runResolved(graphId: string, graph: BehaviorGraph, ticks: number, startX = 820): FsmTraceFrame[] {
  const preset = buildBuiltinFsmPresetRegistry({ [graphId]: graph }, { knownMovementPresetIds, knownAttackProfileIds }, { errorPolicy: "throw" }).get(graphId)!;
  const ent: any = { pos: { x: startX, y: 120 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: { t: 0 }, pendingKill: false };
  const lifecycle = { markKill: () => { ent.pendingKill = true; }, isKilled: () => ent.pendingKill === true };
  ent.fsm = createFsmRuntimeSnapshot(preset, {}, ent, { lifecycle });
  const out: FsmTraceFrame[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    const r = updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt, lifecycle });
    const movement = getLegacyMovementPresetId(r.state);
    const attack = ent.fsm.activeCombat.profileId;
    applyStateBehavior(ent, movement);
    const behavior = EnemyBehaviorDB[ent.behaviorId] ?? EnemyBehaviorDB.none;
    behavior?.update?.(ent, { dt, playerPos: { x: 0, y: 120 }, logicW: 800, logicH: 600 } as any);
    ent.pos.x += ent.vel.x * dt;
    ent.pos.y += ent.vel.y * dt;
    out.push({ tick, state: r.current, age: ent.fsm.age, x: ent.pos.x, y: ent.pos.y, vx: ent.vel.x, vy: ent.vel.y, fired: !!attack, switched: r.switched, movement });
  }
  return out;
}

const timeGraph: BehaviorGraph = { initial: "wait", states: { wait: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: dt * 2 }, goto: "go" }] }, go: { movementPresetId: "straight.basic" } } };
const posGraph: BehaviorGraph = { initial: "enter", states: { enter: { movementPresetId: "straight.basic", transitions: [{ when: { kind: "xLessThan", x: 818 }, goto: "hold" }, { when: { kind: "timeInState", seconds: 0 }, goto: "late" }] }, hold: { movementPresetId: "none.hold" }, late: { movementPresetId: "straight.charge" } } };
const attackGraph: BehaviorGraph = { initial: "enter", states: { enter: { movementPresetId: "none.hold", attackProfileId: "single_basic", transitions: [{ when: { kind: "timeInState", seconds: dt }, goto: "retreat" }] }, retreat: { movementPresetId: "straight.charge" } } };
const despawnGraph: BehaviorGraph = { initial: "enter", states: { enter: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "despawn" }] }, despawn: {} } };

for (const [id, graph, ticks] of [["position", posGraph, 8], ["attack", attackGraph, 8]] as const) {
  const resolved = runResolved(id, graph, ticks);
  const legacy = runLegacy(graph, ticks);
  assert.deepEqual(resolved.map(({ age: _age, ...rest }) => rest), legacy.map(({ age: _age, ...rest }) => rest), `${id} resolved runtime must preserve non-age legacy behavior`);
}
const resolvedTime = runResolved("time", timeGraph, 8);
const legacyTime = runLegacy(timeGraph, 8);
assert.deepEqual(resolvedTime.map((f) => f.state), legacyTime.map((f) => f.state), "S4 keeps state order for the legacy time scenario");
assert.equal(legacyTime[2].age, 0, "legacy transition tick reset age without incrementing");
assert.equal(resolvedTime[2].age, dt, "S4 semantic delta: transition target age is dt after same-tick execution");

const positionTrace = runResolved("position-priority", posGraph, 3, 817);
assert.equal(positionTrace[1].state, "hold", "first matching transition wins and at most one transition occurs under S4 timing");
assert(!positionTrace.some((f) => f.state === "late"), "second same-tick transition is not evaluated after first match");
const despawnTrace = runResolved("despawn-active", despawnGraph, 2);
assert.equal(despawnTrace[1].state, "despawn", "legacy migrated despawn state is still entered explicitly");
assert.equal(despawnTrace[1].age, 0, "S6 despawn action skips same-tick age increment after kill");
assert(!fs.readFileSync("src/game/systems/EnemySystem.ts", "utf8").includes("BEHAVIOR_GRAPHS["), "EnemySystem must not perform per-tick raw graph lookup");
assert.deepEqual(runResolved("non-fsm-a", { initial: "only", states: { only: { movementPresetId: "none.hold" } } }, 1)[0].movement, "none.hold", "movement preset bridge remains active");
const canonical = JSON.parse(fs.readFileSync("src/game/content/fsmPresets.json", "utf8"));
assert.equal(canonical.schemaVersion, 1, "canonical FSM preset JSON is readable as schema v1");
assert.equal(canonical.presets.length, 10, "canonical FSM preset JSON contains all built-ins");
console.log("FsmRuntimeParity smoke passed");
