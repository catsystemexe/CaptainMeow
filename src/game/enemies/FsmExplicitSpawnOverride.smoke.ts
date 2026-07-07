import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { CONTENT } from "../content/CONTENT";
import { createWorldState } from "../data/WorldState";
import { WEAPONS_MVP } from "../defs/Weapons";
import { SpawnSystem } from "../systems/SpawnSystem";
import { asFsmStateId, getFsmDebugSnapshot, type FsmPresetSchemaV1 } from "./fsm";

const clone = <T>(v: T): T => structuredClone(v);
const makeSpawn = () => {
  const store = new EntityStore<any>(64);
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState());
  return { store, spawn };
};
const spawnEnemy = (payload: any) => {
  const s = makeSpawn();
  s.spawn.update({ tick: 1, dt: 1 / 60 }, [{ type: EventType.SPAWN_ENEMY, payload }] as any);
  const ent = Array.from((s.store as any).entities ?? []).find((e: any) => e?.kind === "enemy" && e?.alive);
  assert(ent, "enemy spawned");
  return { ...s, ent };
};

const builtinX = "fsm.turret";
const builtinY = "fsm.hover";
const userDef = clone(CONTENT.builtinFsmPresets.get(builtinY)!.definition) as FsmPresetSchemaV1;
userDef.metadata = { ...userDef.metadata, id: "u0.user.hover", name: "U0 User Hover", source: "user" } as any;
CONTENT.userFsmPresets.upsert(userDef);
const beforeStorage = CONTENT.userFsmPresets.inspectRawStorage().raw;

let r = spawnEnemy({ typeId: "red", spawn: { x: 10, y: 20 }, behaviorPresetId: "straight.basic", fsmPresetId: builtinX });
assert.equal(r.ent.typeId, "red", "appearance/type remains selected non-FSM type");
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, builtinX, "non-FSM appearance uses explicit built-in FSM");
assert.equal(r.ent.behaviorId, "straight", "movement preset remains materialized for compatibility");

r = spawnEnemy({ typeId: "blue", spawn: { x: 10, y: 20 }, behaviorPresetId: "sine.soft", fsmPresetId: builtinX });
assert.equal(r.ent.typeId, "blue", "second appearance remains selected type");
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, builtinX, "appearance B uses explicit FSM X");

r = spawnEnemy({ typeId: "red", spawn: { x: 10, y: 20 }, behaviorPresetId: "straight.basic", fsmPresetId: builtinY });
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, builtinY, "appearance A can use FSM Y");

r = spawnEnemy({ typeId: "red", spawn: { x: 10, y: 20 }, behaviorPresetId: "straight.basic", fsmPresetId: "u0.user.hover" });
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, "u0.user.hover", "combined registry resolves explicit user FSM");
assert.equal(r.ent.fsm?.preset?.source, "user", "runtime snapshot source matches user preset");
assert.equal(CONTENT.userFsmPresets.inspectRawStorage().raw, beforeStorage, "spawn does not read/write storage");

r = spawnEnemy({ typeId: "fsm_turret", spawn: { x: 10, y: 20 }, behaviorPresetId: "straight.basic", fsmPresetId: builtinY });
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, builtinY, "explicit FSM overrides default behaviorGraphId");

r = spawnEnemy({ typeId: "fsm_turret", spawn: { x: 10, y: 20 }, behaviorPresetId: "straight.basic" });
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, builtinX, "missing explicit FSM preserves default behaviorGraphId");

r = spawnEnemy({ typeId: "red", spawn: { x: 10, y: 20 }, behaviorPresetId: "sine.soft" });
assert.equal(getFsmDebugSnapshot(r.ent), null, "no explicit/default FSM preserves Simple/Smart movement path");
assert.equal(r.ent.behaviorId, "sine", "Simple/Smart behaviorPresetId still drives movement");

assert.throws(() => spawnEnemy({ typeId: "fsm_turret", spawn: { x: 10, y: 20 }, fsmPresetId: "fsm.missing.u0" }), /Unknown explicit fsmPresetId/, "invalid explicit FSM id fails clearly instead of falling back");

const preview = CONTENT.builtinFsmPresets.get(builtinX)!;
const override = { ...preview, id: "u0.preview.override", states: preview.states.map((s) => ({ ...s })) } as any;
r = spawnEnemy({ typeId: "fsm_turret", spawn: { x: 10, y: 20 }, fsmPresetId: builtinY, resolvedFsmPresetOverride: override });
assert.equal(getFsmDebugSnapshot(r.ent)?.presetId, "u0.preview.override", "preview override has highest priority");

CONTENT.userFsmPresets.delete("u0.user.hover");
console.log("FsmExplicitSpawnOverride smoke passed");
