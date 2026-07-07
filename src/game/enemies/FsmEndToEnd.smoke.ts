import assert from "node:assert/strict";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { CONTENT } from "../content/CONTENT";
import { WEAPONS_MVP } from "../defs/Weapons";
import { SpawnSystem } from "../systems/SpawnSystem";
import { asFsmStateId, getFsmDebugSnapshot, updateResolvedFsm, type FsmPresetSchemaV1 } from "./fsm";
import { FsmPreviewSession } from "../../dev/FsmPreviewSession";
const clone = <T>(v:T):T => structuredClone(v);
const builtin = CONTENT.builtinFsmPresets.list()[0];
assert.equal(builtin.schemaVersion, 1);
const draft = clone(builtin.definition) as FsmPresetSchemaV1;
draft.metadata = { ...draft.metadata, id: "s11-e2e-user", name: "S11 E2E", source: "user" } as any;
draft.graph.states = [
  { id: asFsmStateId("start"), label: "Start", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "inherit" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: asFsmStateId("move") }] },
  { id: asFsmStateId("move"), label: "Move", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "profile", profileId: "single_basic" }, lifecycle: { enterActions: [] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0.02 } }, targetStateId: asFsmStateId("end") }] },
  { id: asFsmStateId("end"), label: "End", movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: { enterActions: [{ type: "despawn" }] }, transitions: [] },
];
draft.graph.initialStateId = asFsmStateId("missing");
const store = new EntityStore<any>(32); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, { scrollX: 0, scrollY: 0 } as any);
const beforeStorage = CONTENT.userFsmPresets.inspectRawStorage().raw;
const beforeIds = CONTENT.fsmPresets.list().map((p) => p.id).join(",");
const preview = new FsmPreviewSession({ store, spawnPreviewEnemy: (p) => spawn.spawnPreviewEnemy(p as any), getTick: () => 0 });
assert.equal(preview.startDraftPreview(draft, true).status, "invalid", "invalid intermediate draft is caught");
draft.graph.initialStateId = asFsmStateId("start");
let snap = preview.startDraftPreview(draft, true);
assert.equal(snap.status, "running", JSON.stringify(snap.diagnostics));
assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, beforeStorage, "draft preview does not persist");
assert.equal(CONTENT.fsmPresets.list().map((p) => p.id).join(","), beforeIds, "draft preview does not enter combined registry");
let ent = store.get(snap.entityRef!) as any;
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic", lifecycle: { markKill: () => store.markKill(snap.entityRef!), isKilled: () => store.get(snap.entityRef!)?.pendingKill === true } }); snap = preview.refresh();
assert.equal(snap.runtime?.stateId, "move");
assert.equal(snap.runtime?.movementPresetId, "straight.basic");
assert.equal(snap.runtime?.combatMode, "profile");
assert.equal(snap.runtime?.activeAttackProfileId, "single_basic");
CONTENT.userFsmPresets.upsert(draft);
assert(CONTENT.fsmPresets.get("s11-e2e-user"), "combined registry resolves saved preset");
const saved = CONTENT.fsmPresets.get("s11-e2e-user")!;
const ref = spawn.spawnPreviewEnemy({ typeId: "red", spawn: { x: 10, y: 20 }, behaviorPresetId: saved.id, resolvedFsmPresetOverride: saved, devManualSpawnId: 1 } as any);
ent = store.get(ref) as any;
assert.equal(getFsmDebugSnapshot(ent)?.presetId, "s11-e2e-user", "normal runtime uses saved resolved snapshot");
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic", lifecycle: { markKill: () => store.markKill(ref), isKilled: () => store.get(ref)?.pendingKill === true } });
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic", lifecycle: { markKill: () => store.markKill(ref), isKilled: () => store.get(ref)?.pendingKill === true } });
updateResolvedFsm(ent, ent.fsm, { scrollX: 0, logicW: 896, dt: 1 / 60, inheritedAttackProfileId: "single_basic", lifecycle: { markKill: () => store.markKill(ref), isKilled: () => store.get(ref)?.pendingKill === true } });
assert.equal(store.get(ref)?.pendingKill, true, "lifecycle despawn uses markKill");
const finalSnap = getFsmDebugSnapshot(ent); store.cleanup(); assert.equal(store.get(ref), null); assert(finalSnap?.stateId, "debug snapshot reports state before cleanup");
const exported = CONTENT.userFsmPresets.exportJson(["s11-e2e-user"]).text!; assert(JSON.parse(exported).metadata.id === "s11-e2e-user", "export round trip source exists");
assert.equal(CONTENT.builtinFsmPresets.get(builtin.id)?.definition.metadata.source, "builtin", "built-in remains immutable");
const rerun = preview.restart(); assert.equal(rerun.position?.x, snap.position?.x, "deterministic rerun matches placement");
console.log("FsmEndToEnd smoke passed");
