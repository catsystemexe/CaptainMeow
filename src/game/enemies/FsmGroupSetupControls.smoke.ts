import assert from "node:assert/strict";
import { EventType } from "../../engine/core/events";
import { createWorldState } from "../data/WorldState";
import { SpawnSystem } from "../systems/SpawnSystem";
import { WEAPON_DB } from "../defs/WeaponDB";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createDevSummonerGroupSpawnPayload, createDevSummonerSpawnPayload, mapElasticityToGroupSettings, mapFsmSpacingToFormationParams, mapUiSpawnYToRuntimeY } from "../../dev/DevSummoner";
import { EnemyGroupRegistry, formationOffset } from "./EnemyGroups";

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function groupPayload(formationId: "line.horizontal" | "ring", spacing: number) {
  return createDevSummonerGroupSpawnPayload({
    enemyTypeId: "red",
    count: 4,
    anchorX: 700,
    anchorY: 120,
    formationId,
    movementPresetId: "none.hold",
    cohesionId: "rigid",
    params: { formation: mapFsmSpacingToFormationParams(formationId, spacing) },
  })!;
}

{
  const low = groupPayload("line.horizontal", 20);
  const high = groupPayload("line.horizontal", 80);
  assert.equal(low.params.formation.spacing, 20, "line runtime params retain low spacing");
  assert.equal(high.params.formation.spacing, 80, "line runtime params retain high spacing");
  const lowOffsets = [0, 1].map((i) => formationOffset("line.horizontal", i, 4, low.params));
  const highOffsets = [0, 1].map((i) => formationOffset("line.horizontal", i, 4, high.params));
  assert(distance(highOffsets[0], highOffsets[1]) > distance(lowOffsets[0], lowOffsets[1]), "higher line spacing increases member distance");
}

{
  const low = groupPayload("ring", 20);
  const high = groupPayload("ring", 80);
  assert.equal(low.params.formation.spacing, 20, "ring runtime params retain selected low spacing");
  assert.equal(low.params.formation.radius, 20, "FSM spacing drives ring radius because radius is hidden in Basic Setup");
  assert.equal(high.params.formation.radius, 80, "FSM spacing drives high ring radius without default overwrite");
  const lowOffsets = [0, 1].map((i) => formationOffset("ring", i, 4, low.params));
  const highOffsets = [0, 1].map((i) => formationOffset("ring", i, 4, high.params));
  assert(distance(highOffsets[0], highOffsets[1]) > distance(lowOffsets[0], lowOffsets[1]), "higher ring spacing increases member distance through radius");
}

{
  assert.deepEqual(mapElasticityToGroupSettings(0), { cohesionId: "rigid", response: 7, maxCatchupSpeed: 480 }, "Elasticity 0 maps to rigid runtime settings");
  const e2 = mapElasticityToGroupSettings(2);
  const e8 = mapElasticityToGroupSettings(8);
  assert.equal(e2.cohesionId, "elastic", "Elasticity > 0 selects elastic group runtime");
  assert.equal(e8.cohesionId, "elastic", "higher Elasticity remains elastic");
  assert(e8.response < e2.response, "higher Elasticity lowers response for softer correction");
  assert(e8.maxCatchupSpeed < e2.maxCatchupSpeed, "higher Elasticity lowers catch-up speed monotonically");

  const groups = new EnemyGroupRegistry();
  const rigidId = groups.create({ enemyTypeId: "red", count: 1, anchor: { x: 100, y: 50 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", params: { cohesion: { response: 7, maxCatchupSpeed: 480 } } });
  const elasticId = groups.create({ enemyTypeId: "red", count: 1, anchor: { x: 100, y: 50 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "elastic", params: { cohesion: { response: e8.response, maxCatchupSpeed: e8.maxCatchupSpeed } } });
  const rigid: any = { pos: { x: 40, y: 50 }, vel: { x: 0, y: 0 } };
  const elastic: any = { pos: { x: 40, y: 50 }, vel: { x: 0, y: 0 } };
  groups.applyMemberCohesion(rigid, { groupId: rigidId, slotIndex: 0 }, 0.25);
  groups.applyMemberCohesion(elastic, { groupId: elasticId, slotIndex: 0 }, 0.25);
  assert.notEqual(rigid.vel.x, elastic.vel.x, "rigid and elastic runtime corrections differ after perturbation");
  assert(Math.abs(rigid.vel.x) > Math.abs(elastic.vel.x), "Elasticity > 0 is less rigid than the rigid correction");
}

{
  const logicH = 504;
  const bottomUi = 40;
  const topUi = 460;
  const bottomRuntime = mapUiSpawnYToRuntimeY(bottomUi, logicH);
  const topRuntime = mapUiSpawnYToRuntimeY(topUi, logicH);
  assert(bottomRuntime > topRuntime, "low/UI-bottom value maps lower on screen than high/UI-top value");
  const single = createDevSummonerSpawnPayload({ typeId: "red", spawnX: 700, spawnY: topRuntime, fsmPresetId: "fsm.turret", devManualSpawnId: 1 });
  const group = createDevSummonerGroupSpawnPayload({ enemyTypeId: "red", count: 2, anchorX: 700, anchorY: topRuntime, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid" })!;
  assert.equal(single.spawn.y, 44, "single spawn uses inverted UI-to-runtime top coordinate");
  assert.equal(group.anchor.y, 44, "group anchor uses inverted UI-to-runtime top coordinate");
}

{
  const store = new EntityStore(16);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  const spawn = new SpawnSystem(store, { logicSize: { w: 896, h: 504 }, rng01: () => 0.5, weaponDb: WEAPON_DB } as any, world, groups);
  const payload = groupPayload("line.horizontal", 64);
  spawn.update({ dt: 1 / 60, tick: 1, time: 1 / 60 } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload }] as any);
  const xs: number[] = [];
  store.debugForEachAlive((_ref: any, ent: any) => { if (ent.kind === "enemy") xs.push(ent.pos.x); });
  xs.sort((a, b) => a - b);
  assert(xs.length === 4, "runtime SpawnSystem creates all group members");
  assert(Math.abs((xs[1] - xs[0]) - 64) < 0.0001, "SpawnSystem initial member geometry consumes selected spacing");
}

console.log("FsmGroupSetupControls smoke passed");
