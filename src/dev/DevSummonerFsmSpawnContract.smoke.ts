import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../game/content/CONTENT";
import { createDevSummonerGroupSpawnPayload, createDevSummonerSpawnPayload } from "./DevSummoner";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

const builtin = CONTENT.builtinFsmPresets.list()[0].id;
const payload = createDevSummonerSpawnPayload({ typeId: "red", spawnX: 1, spawnY: 2, behaviorPresetId: "straight.basic", fsmPresetId: builtin, devManualSpawnId: 1 });
assert.equal(payload.typeId, "red", "selected type/appearance is preserved");
assert.equal(payload.behaviorPresetId, "straight.basic", "movement behaviorPresetId is preserved");
assert.equal((payload as any).fsmPresetId, builtin, "FSM selector emits fsmPresetId");
assert.notEqual(payload.behaviorPresetId, builtin, "FSM id is not written to behaviorPresetId");
assert.equal((payload as any).resolvedFsmPresetOverride, undefined, "normal spawn never emits preview override");

const simple = createDevSummonerSpawnPayload({ typeId: "red", spawnX: 1, spawnY: 2, behaviorPresetId: "sine.soft", devManualSpawnId: 2 });
assert.equal(simple.behaviorPresetId, "sine.soft", "Simple/Smart movement selector still emits movement behaviorPresetId");
assert.equal((simple as any).fsmPresetId, undefined, "movement-only spawn has no explicit FSM");

const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
model.create();
const userId = model.selectedId;
const userPayload = createDevSummonerSpawnPayload({ typeId: "blue", spawnX: 3, spawnY: 4, behaviorPresetId: "straight.basic", fsmPresetId: userId, devManualSpawnId: 3 });
assert.equal((userPayload as any).fsmPresetId, userId, "user FSM selection emits fsmPresetId");
assert.equal(CONTENT.fsmPresets.sourceOf(userId), "user", "user FSM exists in combined registry");
const groupPayload = createDevSummonerGroupSpawnPayload({ enemyTypeId: "red", count: 3, anchorX: 10, anchorY: 20, formationId: "column.vertical", movementPresetId: "none.hold", cohesionId: "rigid", fsmPresetId: builtin });
assert.equal(groupPayload?.fsmPresetId, builtin, "group payload carries selected FSM preset");
assert.equal(groupPayload?.movementPresetId, "none.hold", "group movement payload remains distinct");
const src = readFileSync("src/dev/DevSummoner.ts", "utf8");
assert(src.includes("type EnemyLabMode = \"simple\" | \"smart\" | \"fsm\""), "U1 mode split model exists");
assert(src.includes("SIMPLE") && src.includes("SMART") && src.includes("FSM"), "U1 mode buttons exist");
assert(src.includes("fsmPresetId: enemyLabMode === \"fsm\" ? fsmSpawnSelect.value || undefined : undefined"), "UI wires FSM selector to fsmPresetId only in FSM mode");
CONTENT.userFsmPresets.delete(userId);
console.log("DevSummonerFsmSpawnContract smoke passed");
