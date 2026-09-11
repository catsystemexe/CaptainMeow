import assert from "node:assert/strict";
import { EventBus, Phase } from "../../engine/core/EventBus";
import { CM_EVENT_OWNERSHIP } from "../../engine/core/EventOwnershipMap";
import { EventType, type CMEventMap } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import type { EntityRef } from "../../engine/ecs/EntityRef";
import { ParticleStore } from "../../engine/fx/ParticleStore";
import { CollisionSystem, type WorldEntity } from "./CollisionSystem";
import { DamageSystem } from "./DamageSystem";
import { RespawnSystem } from "./RespawnSystem";

function makeBus(): EventBus<CMEventMap> {
  return new EventBus(CM_EVENT_OWNERSHIP, {
    maxEventsPerTick: 256,
    failFast: true,
    dropLeftoversInProd: true,
  });
}

function spawnPlayer(store: EntityStore<WorldEntity>, invulnT = 0): EntityRef {
  return store.spawn((e: any) => {
    e.kind = "player";
    e.pos = { x: 0, y: 0 };
    e.radius = 3;
    e.bodyRadius = 20;
    e.energy = 5;
    e.energyMax = 5;
    e.invulnT = invulnT;
    e.pendingKill = false;
  });
}

function runImpact(bus: EventBus<CMEventMap>, store: EntityStore<WorldEntity>, tick: number): any[] {
  bus.beginTick(tick);
  bus.enterPhase(Phase.Collision);
  new CollisionSystem(bus, store).update(1 / 60);
  bus.enterPhase(Phase.Impact);
  new DamageSystem(bus, store, new ParticleStore(), {
    projectileHitEnemyDamage: 1,
    playerHitEnemyDamage: 2,
  }).update();
  bus.enterPhase(Phase.Flow);
  return bus.drainPhase(Phase.Flow) as any[];
}

function finishTick(bus: EventBus<CMEventMap>): void {
  bus.enterPhase(Phase.Cleanup);
  bus.endTickAndSwap();
}

function testProjectileHitAndIFrames(): void {
  const store = new EntityStore<WorldEntity>(16);
  const bus = makeBus();
  const playerRef = spawnPlayer(store);
  const projectileRef = store.spawn((e: any) => {
    e.kind = "enemyProjectile";
    e.pos = { x: 0, y: 0 };
    e.radius = 2;
    e.damage = 1;
    e.consumed = false;
    e.pendingKill = false;
  });

  runImpact(bus, store, 0);
  const player = store.get(playerRef) as any;
  assert.equal(player.energy, 4);
  assert.equal(player.invulnT, 0.75);
  assert.equal((store.get(projectileRef) as any).consumed, true);
  finishTick(bus);

  bus.beginTick(1);
  bus.enterPhase(Phase.Impact);
  bus.emit(EventType.ENEMY_PROJECTILE_HIT_PLAYER, { projectile: projectileRef, player: playerRef, damage: 1 });
  new DamageSystem(bus, store, new ParticleStore(), { projectileHitEnemyDamage: 1, playerHitEnemyDamage: 2 }).update();
  assert.equal(player.energy, 4, "damage during hit i-frames must be rejected");
  bus.enterPhase(Phase.Flow);
  bus.drainPhase(Phase.Flow);
  finishTick(bus);
}

function testContactDeathAndPersistentOverlap(): void {
  const store = new EntityStore<WorldEntity>(16);
  const bus = makeBus();
  const playerRef = spawnPlayer(store);
  const enemyRef = store.spawn((e: any) => {
    e.kind = "enemy";
    e.typeId = "basic_1";
    e.pos = { x: 0, y: 0 };
    e.vel = { x: 0, y: 0 };
    e.radius = 5;
    e.hp = 3;
    e.destroyOnPlayerContact = true;
    e.pendingKill = false;
  });

  const flow = runImpact(bus, store, 0);
  const player = store.get(playerRef) as any;
  const enemy = store.get(enemyRef) as any;
  assert.equal(player.energy, 3);
  assert.equal(player.invulnT, 0.75);
  assert.equal(enemy.pendingKill, true, "contact must enter canonical enemy kill path");
  assert.equal(enemy.__deathFxDone, true, "canonical death FX guard must be set");
  assert(flow.some((e) => e.type === EventType.ENTITY_KILLED && e.payload.target.slot === enemyRef.slot && e.payload.isPlayer === false));
  let fxCount = 0;
  store.debugForEachAlive((_ref, e: any) => { if (e.kind === "fx") fxCount += 1; });
  assert(fxCount > 0, "canonical enemy death FX must be spawned");
  finishTick(bus);

  runImpact(bus, store, 1);
  assert.equal(player.energy, 3, "persistent overlap must not drain energy on later ticks");
  finishTick(bus);
}

function testInvulnerablePlayerDoesNotRamEnemy(): void {
  const store = new EntityStore<WorldEntity>(8);
  const bus = makeBus();
  const playerRef = spawnPlayer(store, 0.5);
  const enemyRef = store.spawn((e: any) => {
    e.kind = "enemy";
    e.pos = { x: 0, y: 0 };
    e.radius = 5;
    e.hp = 3;
    e.destroyOnPlayerContact = true;
    e.pendingKill = false;
  });
  runImpact(bus, store, 0);
  assert.equal((store.get(playerRef) as any).energy, 5);
  assert.equal((store.get(enemyRef) as any).pendingKill, false);
  finishTick(bus);
}

function testDurableEnemyOptOut(): void {
  const store = new EntityStore<WorldEntity>(8);
  const bus = makeBus();
  const playerRef = spawnPlayer(store);
  const enemyRef = store.spawn((e: any) => {
    e.kind = "enemy";
    e.pos = { x: 0, y: 0 };
    e.radius = 5;
    e.hp = 10;
    e.destroyOnPlayerContact = false;
    e.pendingKill = false;
  });
  runImpact(bus, store, 0);
  assert.equal((store.get(playerRef) as any).energy, 3, "durable contact must still damage the player");
  assert.equal((store.get(enemyRef) as any).hp, 10, "explicit durable enemies must survive accepted contact");
  assert.equal((store.get(enemyRef) as any).pendingKill, false);
  finishTick(bus);
}

function testRespawnDefaults(): void {
  const store = new EntityStore<any>(4);
  const playerRef = spawnPlayer(store as EntityStore<WorldEntity>);
  const player = store.get(playerRef) as any;
  player.energy = 0;
  const session = { lives: 2, gameOver: false };
  const respawn = new RespawnSystem(session, store, () => playerRef, 896, 504);
  respawn.onFlowEvents([{ type: EventType.ENTITY_KILLED, payload: { target: playerRef, source: "contact", isPlayer: true } } as any]);
  for (let tick = 0; tick < 60; tick += 1) respawn.tick();
  assert.equal(session.lives, 1);
  assert.equal(player.energy, 5);
  assert.equal(player.invulnT, 2.25);
}

testProjectileHitAndIFrames();
testContactDeathAndPersistentOverlap();
testInvulnerablePlayerDoesNotRamEnemy();
testDurableEnemyOptOut();
testRespawnDefaults();
console.log("[SMOKE] PlayerContactDamage OK ✅");
