import assert from "node:assert/strict";
import { asFsmStateId, buildBuiltinFsmPresetRegistry, createFsmRuntimeSnapshot, resetAttackRuntime, resolveCombatSelection, resolveFsmPreset, updateResolvedFsm, type BehaviorGraph, type CombatConfig } from "./fsm";
import { EnemyBehaviorPresets } from "./EnemyBehaviorPresets";

const dt = 0.25;
const knownMovementPresetIds = new Set(Object.keys(EnemyBehaviorPresets));
const knownAttackProfileIds = new Set(["single_basic", "spread_test_slow", "spread_test_fast"]);

function preset(id: string, graph: BehaviorGraph) {
  return buildBuiltinFsmPresetRegistry({ [id]: graph }, { knownMovementPresetIds, knownAttackProfileIds }, { errorPolicy: "throw" }).get(id)!;
}
let graphCounter = 0;
function entFor(graph: BehaviorGraph, inherited: string | null = "single_basic") {
  const ent: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: { t: 0, attack: { cooldownMs: 50, windupMs: 10, firing: true } } };
  ent.fsm = createFsmRuntimeSnapshot(preset(`g-${++graphCounter}`, graph), {}, ent, { inheritedAttackProfileId: inherited });
  return ent;
}
function entForCombats(combats: CombatConfig[], inherited: string | null = "single_basic", firstTransitionSeconds = 0, firstTarget = "b") {
  const states = combats.map((combat, i) => ({
    id: asFsmStateId(String.fromCharCode(97 + i)),
    label: String.fromCharCode(97 + i),
    movement: { base: { type: "movementPreset" as const, params: { presetId: "none.hold" } } },
    targeting: { type: "forward" as const },
    combat,
    transitions: i === 0 && (combats.length > 1 || firstTarget === "a") ? [{ condition: { type: "timeInState" as const, params: { seconds: firstTransitionSeconds } }, targetStateId: asFsmStateId(firstTarget) }] : [],
  }));
  const fsmPreset = resolveFsmPreset({ schemaVersion: 1, metadata: { id: `target-${++graphCounter}`, name: "target", source: "builtin", schemaVersion: 1 }, graph: { initialStateId: asFsmStateId("a"), states } }, { knownMovementPresetIds, knownAttackProfileIds });
  const ent: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 10, maxHp: 10, bState: { t: 0, attack: { cooldownMs: 50, windupMs: 10, firing: true } } };
  ent.fsm = createFsmRuntimeSnapshot(fsmPreset, {}, ent, { inheritedAttackProfileId: inherited });
  return ent;
}
function step(ent: any, inherited: string | null = "single_basic") {
  return updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 800, dt, inheritedAttackProfileId: inherited });
}
function attackSeed(ent: any): void {
  ent.bState.attack = { cooldownMs: 50, windupMs: 10, firing: true };
}

assert.deepEqual(resolveCombatSelection({ mode: "disabled" }, "single_basic"), { mode: "disabled", profileId: null, runtimePolicy: "reset" }, "disabled prevents active attack selection");
assert.deepEqual(resolveCombatSelection({ mode: "inherit" }, "single_basic"), { mode: "inherit", profileId: "single_basic", runtimePolicy: "reset" }, "inherit uses enemy-definition profile id");
assert.deepEqual(resolveCombatSelection({ mode: "profile", profileId: "spread_test_slow" }, "single_basic"), { mode: "profile", profileId: "spread_test_slow", runtimePolicy: "reset" }, "profile uses state profile id");
assert.deepEqual(resolveCombatSelection({ mode: "inherit" }, null), { mode: "inherit", profileId: null, runtimePolicy: "reset" }, "missing inherited profile produces no active attack");

const profileGraph: BehaviorGraph = { initial: "a", states: { a: { movementPresetId: "none.hold", attackProfileId: "single_basic" } } };
const spawn = entFor(profileGraph);
assert.equal(spawn.fsm.activeCombat.profileId, "single_basic", "spawn profile entry activates profile");
assert.equal(spawn.bState.attack, undefined, "spawn profile entry resets combat runtime");

let ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", attackProfileId: "single_basic", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold", attackProfileId: "spread_test_slow" } } });
attackSeed(ent);
let r = step(ent);
assert.equal(r.entry?.combatRuntimeReset, true, "profile A to profile B resets");
assert.equal(ent.fsm.activeCombat.profileId, "spread_test_slow");
assert.equal(ent.bState.attack, undefined);

ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", attackProfileId: "single_basic", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold", attackProfileId: "single_basic" } } });
attackSeed(ent);
r = step(ent);
assert.equal(r.entry?.combatRuntimeReset, true, "same profile default policy resets");
assert.equal(ent.bState.attack, undefined);

ent = entForCombats([{ mode: "profile", profileId: "single_basic" }, { mode: "profile", profileId: "single_basic", runtimePolicy: "preserveIfSameProfile" }]);
attackSeed(ent);
const preserved = ent.bState.attack;
r = step(ent);
assert.equal(r.entry?.combatRuntimeReset, false, "same profile preserveIfSameProfile preserves");
assert.equal(ent.bState.attack, preserved);

ent = entForCombats([{ mode: "profile", profileId: "single_basic", runtimePolicy: "preserveIfSameProfile" }], "single_basic", dt, "a");
attackSeed(ent);
step(ent);
r = step(ent);
assert.equal(r.entry?.selfTransition, true);
assert.equal(r.entry?.combatRuntimeReset, true, "self-transition resets despite preserve policy");
assert.equal(ent.bState.attack, undefined);

ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold", attackProfileId: "single_basic" } } });
attackSeed(ent);
r = step(ent);
assert.equal(r.entry?.combatRuntimeReset, true, "disabled/inheritless to profile resets");
assert.equal(ent.bState.attack, undefined);

ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold", attackProfileId: "spread_test_fast" } } }, "single_basic");
attackSeed(ent);
r = step(ent, "single_basic");
assert.equal(r.entry?.combatRuntimeReset, true, "inherit to profile resets");
assert.equal(ent.fsm.activeCombat.profileId, "spread_test_fast");

ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", attackProfileId: "spread_test_fast", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold" } } }, "single_basic");
attackSeed(ent);
r = step(ent, "single_basic");
assert.equal(ent.fsm.activeCombat.mode, "inherit", "profile to inherit selects inherit mode");
assert.equal(ent.fsm.activeCombat.profileId, "single_basic", "profile to inherit resets to inherited profile runtime");
assert.equal(ent.bState.attack, undefined);

ent = entFor({ initial: "a", states: { a: { movementPresetId: "none.hold", attackProfileId: "single_basic", transitions: [{ when: { kind: "timeInState", seconds: 0 }, goto: "b" }] }, b: { movementPresetId: "none.hold" } } }, null);
attackSeed(ent);
r = step(ent, null);
assert.equal(r.entry?.combatRuntimeCleared, true, "profile to disabled/inheritless clears runtime");
assert.equal(ent.fsm.activeCombat.profileId, null);
assert.equal(ent.bState.attack, undefined);

ent = entForCombats([{ mode: "profile", profileId: "single_basic" }, { mode: "profile", profileId: "spread_test_slow", runtimePolicy: "preserveIfSameProfile" }]);
attackSeed(ent);
r = step(ent);
assert.equal(r.entry?.combatRuntimeReset, true, "preserve is forbidden across different concrete profile IDs");
assert.equal(ent.bState.attack, undefined);
assert.equal(ent.fsm.activeCombat.profileId, "spread_test_slow", "target state profile is active in transition tick");

resetAttackRuntime({ bState: { attack: { cooldownMs: 1, windupMs: 2, firing: true } } });
assert(!("fireOnEnter" in spawn), "no fireOnEnter behavior is introduced");
console.log("FsmCombatModes smoke passed");
