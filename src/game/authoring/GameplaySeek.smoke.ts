import assert from "node:assert/strict";
import { EntityStore } from "../../engine/ecs/EntityStore";
import { createBackgroundMarkerRuntime, evaluateBackgroundMarkerCrossings, resetBackgroundMarkerRuntime } from "../../render/webgl/bg/layers/BackgroundMarkerRuntime";
import { clampGameplaySeekX, deriveGameplayScrollX, seekGameplayToPlayerX } from "./GameplaySeek";

assert.equal(clampGameplaySeekX(-50, { startX: 0, endX: 400 }), 0, "seek clamps to scene start");
assert.equal(clampGameplaySeekX(500, { startX: 0, endX: 400 }), 400, "seek clamps to scene end");
assert.equal(deriveGameplayScrollX(640, 120), 520, "world scroll derives from player screen anchor");

const store = new EntityStore<any>(16);
let player: any;
const playerRef = store.spawn((e: any) => { player = e; e.kind = "player"; e.pos = { x: 100, y: 222 }; e.vel = { x: 4, y: 5 }; e.energy = 3; e.bombs = 2; e.pendingKill = false; });
store.spawn((e: any) => { e.kind = "projectile"; e.pos = { x: 120, y: 20 }; e.vel = { x: 1, y: 0 }; e.ttl = 1; e.pendingKill = false; });
store.spawn((e: any) => { e.kind = "enemy"; e.pos = { x: 180, y: 20 }; e.vel = { x: 0, y: 0 }; e.pendingKill = false; });
let paused = false;
let particlesCleared = 0;
let vfxCleared = 0;
let inputCleared = 0;
let groupsReset = 0;
const actions: any = { move: { x: 1, y: -1 }, aimTarget: { x: 0, y: 0 }, firePrimary: true, fireSecondary: true, bombPressed: true, bombTarget: { x: 0, y: 0 }, toggleW1WeaponPressed: true, cycleW1LevelPressed: true, cycleW2LevelPressed: true };
const result = seekGameplayToPlayerX(640, { bounds: { startX: 0, endX: 1000 }, pauseAfterSeek: true }, {
  playerEnt: player,
  playerRef,
  store,
  world: { scrollX: 0, scrollY: 0, speedX: 60, worldW: 9999, worldH: 900, cameraPadTop: 140, cameraPadBottom: 140, camEaseSec: 0.12 },
  loop: { isPaused: () => paused, setPaused: (on) => { paused = on; } },
  inputRt: { actions },
  inputMgr: { clearTransientPointerState: () => { inputCleared++; } } as any,
  enemyGroups: { reset: () => { groupsReset++; } },
  particleStore: { clear: () => { particlesCleared++; } },
  vfx: { clear: () => { vfxCleared++; } },
  playerScreenAnchorX: 120,
});
assert.equal(result.playerX, 640, "cursor target maps to gameplay Player X");
assert.equal(result.scrollX, 520, "seek synchronizes world scroll from player anchor");
assert.equal(player.pos.y, 222, "seek preserves player vertical position");
assert.equal(player.energy, 3, "persistent player health is preserved by contract");
assert.equal(player.bombs, 2, "persistent bomb count is preserved by contract");
assert.equal(paused, true, "stop/paused seek leaves gameplay paused when requested");
assert.equal(result.clearedEntities, 2, "transient cleanup path is called for old-location runtime entities");
assert.equal(particlesCleared, 1);
assert.equal(vfxCleared, 1);
assert.equal(inputCleared, 1, "input guard state is cleared after seek");
assert.equal(groupsReset, 1, "enemy group runtime is reset as minimal enemy/spawn cleanup");
assert.equal(actions.firePrimary, false, "normal fire input is not left stuck after seek");
assert.equal(actions.move.y, 0, "normal movement input resumes from a neutral sampled state after seek");

const markerRuntime = createBackgroundMarkerRuntime();
const markers: any[] = [
  { runtimeId: "a", worldX: 100, marker: { once: true } },
  { runtimeId: "b", worldX: 200, marker: { once: false } },
  { runtimeId: "c", worldX: 300, marker: { once: true } },
];
resetBackgroundMarkerRuntime(markerRuntime, null, 250);
assert.deepEqual(evaluateBackgroundMarkerCrossings(markerRuntime, "scene", 250, markers), [], "seek reset establishes marker baseline without retro-firing");
assert.deepEqual(evaluateBackgroundMarkerCrossings(markerRuntime, "scene", 350, markers).map((m) => m.runtimeId), ["c"], "future marker crossings fire from the new baseline only");

console.log("[SMOKE] GameplaySeek OK ✅");
