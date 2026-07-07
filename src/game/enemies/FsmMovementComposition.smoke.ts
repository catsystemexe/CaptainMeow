import { strict as assert } from "node:assert";
import { createFsmRuntimeSnapshot, executeFsmMovement, enterResolvedFsmState } from "./fsm";
import { migrateLegacyBehaviorGraph } from "./fsm/migrate";
import { resolveFsmPreset } from "./fsm/resolve";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";
import { EnemyBehaviorDB } from "./EnemyBehaviorDB";
import { validateFsmPreset } from "./fsm/validate";
import type { FsmPresetSchemaV1, FsmStateDefinition } from "./fsm/schema";

const knownMovementPresetIds = new Set(Object.keys(EnemyBehaviorPresets));
const knownAttackProfileIds = new Set(["single_basic", "spread_test_fast", "spread_test_slow"]);
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
function state(id: string, movement: FsmStateDefinition["movement"], transitions: FsmStateDefinition["transitions"] = []): FsmStateDefinition {
  return { id: id as any, label: id, movement, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [] }, transitions };
}
function preset(states: FsmStateDefinition[], initialStateId = states[0].id): FsmPresetSchemaV1 {
  return { schemaVersion: 1, metadata: { id: "test", name: "test", source: "builtin", schemaVersion: 1 }, graph: { initialStateId, states } };
}
function runtime(movement: FsmStateDefinition["movement"], ent: any = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 } }) {
  const p = preset([state("a", movement)]);
  const validation = validateFsmPreset(p, { knownMovementPresetIds, knownAttackProfileIds });
  assert.equal(validation.issues.filter((i) => i.severity === "error").length, 0, JSON.stringify(validation.issues));
  const resolved = resolveFsmPreset(p);
  return { ent, rt: createFsmRuntimeSnapshot(resolved, {}, ent), resolved };
}

{
  const { ent, rt } = runtime({ base: { type: "movementPreset", params: { presetId: "straight.basic" } } });
  const before = rt.movement.base;
  executeFsmMovement(rt.movement, ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 });
  executeFsmMovement(rt.movement, ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 });
  assert.equal(rt.movement.base, before, "base preset resolves once on entry and runtime is reused on no-transition ticks");
  assert.equal(rt.movement.base.presetId, "straight.basic");
}

{
  const a = runtime({ base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [{ type: "sineOffset", params: { ampX: 0, ampY: 10, freqHz: 1 } }] });
  const b = runtime({ base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [{ type: "sineOffset", params: { ampX: 0, ampY: 10, freqHz: 1 } }] });
  assert.notEqual(a.rt.movement.base.state, b.rt.movement.base.state, "base runtime is entity-local");
  assert.notEqual(a.rt.movement.modifiers[0].state, b.rt.movement.modifiers[0].state, "modifier runtime is entity-local");
  const baseline = runtime({ base: { type: "movementPreset", params: { presetId: "straight.basic" } } });
  const baseT0 = executeFsmMovement(baseline.rt.movement, baseline.ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 })!;
  const t0 = executeFsmMovement(a.rt.movement, a.ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 })!;
  assert(close(t0.y, baseT0.y), "sineOffset starts at initial phase 0");
  const phase = a.rt.movement.modifiers[0].state.phase;
  executeFsmMovement(a.rt.movement, a.ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 });
  assert(Number(a.rt.movement.modifiers[0].state.phase) > Number(phase), "no-transition ticks advance modifier phase");
}

{
  const { ent, rt, resolved } = runtime({ base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [{ type: "sineOffset", params: { ampX: 0, ampY: 10, freqHz: 1 } }] });
  executeFsmMovement(rt.movement, ent, { dt: 0.25, playerPos: null, logicW: 320, logicH: 180 });
  assert(Number(rt.movement.modifiers[0].state.phase) > 0);
  enterResolvedFsmState(ent, rt, resolved.initialStateIndex);
  assert.equal(rt.movement.modifiers[0].state.phase, 0, "formal self-transition resets modifier phase");
}

{
  const { ent, rt } = runtime({ base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [{ type: "clampY", params: { paddingPx: 16 } }] }, { pos: { x: 100, y: -20 }, vel: { x: 7, y: 9 }, bState: { t: 0 } });
  const target = executeFsmMovement(rt.movement, ent, { dt: 1 / 60, playerPos: null, logicW: 320, logicH: 180 })!;
  assert.equal(target.x, 100, "clampY preserves X");
  assert.equal(target.y, 16, "clampY clamps low bound");
  ent.pos.y = 999;
  enterResolvedFsmState(ent, rt, rt.stateIndex);
  const high = executeFsmMovement(rt.movement, ent, { dt: 1 / 60, playerPos: null, logicW: 320, logicH: 180 })!;
  assert.equal(high.y, 164, "clampY clamps high bound");
}

{
  const lowThenSine = runtime({ base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [{ type: "clampY", params: { paddingPx: 16 } }, { type: "sineOffset", params: { ampX: 0, ampY: 20, freqHz: 1 } }] }, { pos: { x: 100, y: 10 }, vel: { x: 0, y: 0 }, bState: { t: 0 } });
  lowThenSine.rt.movement.modifiers[1].state.phase = Math.PI / 2;
  const sineThenLow = runtime({ base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [{ type: "sineOffset", params: { ampX: 0, ampY: 20, freqHz: 1 } }, { type: "clampY", params: { paddingPx: 16 } }] }, { pos: { x: 100, y: 10 }, vel: { x: 0, y: 0 }, bState: { t: 0 } });
  sineThenLow.rt.movement.modifiers[0].state.phase = Math.PI / 2;
  const a = executeFsmMovement(lowThenSine.rt.movement, lowThenSine.ent, { dt: 0, playerPos: null, logicW: 320, logicH: 180 })!;
  const b = executeFsmMovement(sineThenLow.rt.movement, sineThenLow.ent, { dt: 0, playerPos: null, logicW: 320, logicH: 180 })!;
  assert.notEqual(a.y, b.y, "modifier order is authoritative and user-visible");
}

{
  const tooMany = preset([state("a", { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [
    { type: "clampY", params: { paddingPx: 1 } }, { type: "clampY", params: { paddingPx: 2 } }, { type: "clampY", params: { paddingPx: 3 } }, { type: "clampY", params: { paddingPx: 4 } },
  ] })]);
  const result = validateFsmPreset(tooMany, { knownMovementPresetIds, knownAttackProfileIds });
  assert(result.issues.some((i) => i.code === "E_TOO_MANY_MODIFIERS"), "maximum modifier count remains enforced");
}

{
  const ent = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 } };
  const { rt } = runtime({ base: { type: "movementPreset", params: { presetId: "straight.basic" } } }, ent);
  executeFsmMovement(rt.movement, ent, { dt: 1, playerPos: null, logicW: 320, logicH: 180 });
  assert.deepEqual(ent.pos, { x: 100, y: 50 }, "movement code does not directly integrate position");
  assert.deepEqual(ent.vel, { x: 0, y: 0 }, "movement code does not directly write velocity");
}

{
  const migrated = migrateLegacyBehaviorGraph("legacy", { initial: "a", states: { a: { movementPresetId: "straight.basic" } } }, { knownMovementPresetIds });
  assert.equal(migrated.issues.filter((i) => i.severity === "error").length, 0);
  const resolved = resolveFsmPreset(migrated.preset!);
  const ent = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, bState: { t: 0 } };
  const rt = createFsmRuntimeSnapshot(resolved, {}, ent);
  const fsmTarget = executeFsmMovement(rt.movement, ent, { dt: 1, playerPos: null, logicW: 320, logicH: 180 });
  const nonFsm = { pos: { x: 100, y: 50 }, vel: { x: 0, y: 0 }, behavior: EnemyBehaviorPresets["straight.basic"].params, bState: { t: 0 } } as any;
  const behavior = EnemyBehaviorDB.straight;
  behavior.init?.(nonFsm); behavior.update?.(nonFsm, { dt: 1 } as any);
  assert.equal(fsmTarget?.x, behavior.getTarget?.(nonFsm, { dt: 1 } as any)?.x, "existing movement preset behavior without modifiers remains compatible");
}

console.log("FsmMovementComposition smoke passed");
