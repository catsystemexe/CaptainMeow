import assert from "node:assert/strict";
import { EntityStore } from "../engine/ecs/EntityStore";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { asFsmStateId, updateResolvedFsm, type FsmPresetSchemaV1 } from "../game/enemies/fsm";
import { FsmPreviewSession } from "./FsmPreviewSession";
const preset: FsmPresetSchemaV1 = { schemaVersion: 1, metadata: { id: "diag-preview", name: "Diag", source: "user", schemaVersion: 1 }, graph: { initialStateId: asFsmStateId("a"), states: [
  { id: asFsmStateId("a"), label: "A", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "inherit" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("b") }] },
  { id: asFsmStateId("b"), label: "B", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [{ type: "sineOffset", params: { ampX: 1, ampY: 2, freqHz: 1 } }] }, targeting: { type: "forward" }, combat: { mode: "profile", profileId: "single_basic" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0.01 } }, targetStateId: asFsmStateId("b") }] },
] } };
const store = new EntityStore<any>(16); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, { scrollX: 0, scrollY: 0 } as any);
let tick = 0; const session = new FsmPreviewSession({ store, spawnPreviewEnemy: (p) => spawn.spawnPreviewEnemy(p as any), getTick: () => tick, traceLimit: 2 });
let s = session.startDraftPreview(preset, true);
assert.equal(s.status, "running", JSON.stringify(s.diagnostics));
assert.equal(s.runtime?.stateId, "a");
assert.equal(s.trace.length, 1);
const ent = store.get(s.entityRef!) as any;
tick = 1; updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic" }); s = session.refresh();
assert.equal(s.runtime?.stateId, "b");
assert.equal(s.runtime?.entryCount, 2);
assert.equal(s.runtime?.movementPresetId, "straight.basic");
assert.deepEqual(s.runtime?.modifierTypes, ["sineOffset"]);
assert.equal(s.runtime?.combatMode, "profile");
assert.equal(s.runtime?.activeAttackProfileId, "single_basic");
tick = 2; updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic" }); s = session.refresh();
assert.equal(s.trace.at(-1)?.fromStateId, "b", "self-transition recorded");
assert(s.trace.length <= 2, "trace is bounded");
store.markKill(s.entityRef!); s = session.refresh();
assert.equal(s.status, "ended");
assert(s.runtime, "final snapshot retained after despawn");
store.cleanup(); s = session.refresh();
assert.equal(s.status, "ended", "stale ref not treated as live");
console.log("FsmPreviewDiagnostics smoke passed");
