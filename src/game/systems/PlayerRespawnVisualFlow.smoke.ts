import assert from "node:assert/strict";
import { EventBus, Phase } from "../../engine/core/EventBus";
import { CM_EVENT_OWNERSHIP } from "../../engine/core/EventOwnershipMap";
import { EventType, type CMEventMap } from "../../engine/core/events";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { ParticleStore } from "../../engine/fx/ParticleStore";
import { getPlayerShieldFieldPresentation, isPlayerRenderVisible } from "../../render/webgl/WebGLSceneRenderer";
import { DamageSystem } from "./DamageSystem";
import { PlayerSystem } from "./PlayerSystem";
import { RespawnSystem } from "./RespawnSystem";

function makeBus(): EventBus<CMEventMap> {
  return new EventBus(CM_EVENT_OWNERSHIP, { maxEventsPerTick: 256, failFast: true, dropLeftoversInProd: true });
}

function actions() {
  return { move: { x: -1, y: 1 }, aimTarget: { x: 100, y: 50 }, firePrimary: true, fireSecondary: false, bombPressed: false, bombTarget: { x: 0, y: 0 }, toggleW1WeaponPressed: false, cycleW1LevelPressed: false, cycleW2LevelPressed: false };
}

function main(): void {
  const visiblePlayer: any = { kind: "player", deadT: 0, invulnT: 0 };
  assert.equal(isPlayerRenderVisible(visiblePlayer, 0.15), true);
  visiblePlayer.invulnT = 0.75;
  visiblePlayer.invulnerabilityReason = "hit";
  assert.equal(isPlayerRenderVisible(visiblePlayer, 0.05), true);
  assert.equal(isPlayerRenderVisible(visiblePlayer, 0.15), true, "live player remains visible during immunity");
  const beforeField = { ...visiblePlayer };
  assert.deepEqual(getPlayerShieldFieldPresentation(visiblePlayer), { visible: true, strength: 1, reason: "hit" });
  assert.deepEqual(visiblePlayer, beforeField, "field projection must not mutate gameplay state");
  assert.equal(visiblePlayer.invulnT, 0.75, "render derivation must not mutate immunity");
  visiblePlayer.deadT = 1;
  assert.equal(isPlayerRenderVisible(visiblePlayer, 0), false, "dead player must be hidden");

  const store = new EntityStore<any>(16);
  const playerRef = store.spawn((p: any) => Object.assign(p, {
    kind: "player", pos: { x: 120, y: 80 }, vel: { x: 0, y: 0 }, speed: 100,
    radius: 3, bodyRadius: 20, shield: 0, shieldMax: 5, invulnT: 0, deadT: 0, pendingKill: false,
  }));
  const bus = makeBus();
  const damage = new DamageSystem(bus, store, new ParticleStore(), { projectileHitEnemyDamage: 1, playerHitEnemyDamage: 1 });
  bus.beginTick(0);
  bus.enterPhase(Phase.Impact);
  const hit = { type: EventType.ENEMY_PROJECTILE_HIT_PLAYER, payload: { projectile: { slot: 15, gen: 1 }, player: playerRef, damage: 1 } } as any;
  damage.update([hit, hit]);
  const player = store.get(playerRef) as any;
  assert(player.deadT > 0);
  let explosions = 0;
  store.debugForEachAlive((_ref, e: any) => { if (e.kind === "fx") explosions += 1; });
  assert.equal(explosions, 1, "lethal damage must spawn exactly one explosion");
  bus.enterPhase(Phase.Flow);
  const kills = (bus.drainPhase(Phase.Flow) as any[]).filter((e) => e.type === EventType.ENTITY_KILLED && e.payload.isPlayer);
  assert.equal(kills.length, 1, "player kill event semantics must remain idempotent");

  const session = { lives: 2, gameOver: false };
  const respawn = new RespawnSystem(session, store, () => playerRef, 896, 504);
  respawn.onFlowEvents(kills);
  for (let i = 0; i < 60; i += 1) respawn.tick();
  assert.equal(player.invulnT, 2.5);
  assert.equal(player.invulnerabilityReason, "respawn");
  assert.equal(getPlayerShieldFieldPresentation(player).visible, true);
  assert.equal(player.respawnIntroT, 0.8);
  assert(player.pos.x < player.respawnIntroTarget.x, "entrance must start left of its target");

  const playerSystem = new PlayerSystem(bus, player, { bounds: { minX: 0, minY: 0, maxX: 896, maxY: 504 } });
  playerSystem.update(0.4, actions());
  assert(player.respawnIntroT > 0 && player.pos.x < player.respawnIntroTarget.x, "scripted movement must progress without accepting steering");
  assert(player.invulnT < 2.5 && player.invulnT > 0, "immunity must continue through fly-in");
  playerSystem.update(0.4, actions());
  assert.equal(player.respawnIntroT, 0);
  assert.equal(player.pos.x, player.respawnIntroTarget.x);
  assert.equal(player.pos.y, player.respawnIntroTarget.y);
  const arrivalX = player.pos.x;
  playerSystem.update(0.1, actions());
  assert(player.pos.x < arrivalX, "normal movement authority must resume after arrival");
  assert(player.invulnT > 0, "respawn immunity must remain after arrival");
  playerSystem.update(player.invulnT, actions());
  assert.equal(player.invulnerabilityReason, null, "immunity reason clears when its authoritative timer expires");

  const finalSession = { lives: 1, gameOver: false };
  const finalRespawn = new RespawnSystem(finalSession, store, () => playerRef, 896, 504);
  finalRespawn.onFlowEvents(kills);
  assert.equal(finalSession.gameOver, true);
  assert.equal(player.deadT, Number.POSITIVE_INFINITY);
  for (let i = 0; i < 60; i += 1) finalRespawn.tick();
  assert.equal(player.respawnIntroT, 0, "final life must not begin another fly-in");

  console.log("[SMOKE] PlayerRespawnVisualFlow OK ✅");
}

main();
