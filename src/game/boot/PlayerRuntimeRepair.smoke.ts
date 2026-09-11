import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createGameSource = readFileSync(new URL("./createGame.ts", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../../main.ts", import.meta.url), "utf8");
const rendererSource = readFileSync(new URL("../../render/webgl/WebGLSceneRenderer.ts", import.meta.url), "utf8");

assert.match(createGameSource, /reset:\s*resetGame/, "createGame exposes its canonical reset authority");
for (const resetStatement of [
  "session.score = 0", "session.lives = RESET_CFG.startLives", "session.wave = 1",
  "session.gameOver = false", "playerEnt.shield = playerEnt.shieldMax",
  "playerEnt.pendingKill = false", "playerEnt.deadT = 0", "playerEnt.respawnIntroT = 0",
  "respawn.reset()",
  "particleStore.clear()", "vfx.clear()",
]) {
  assert(createGameSource.includes(resetStatement), `reset includes ${resetStatement}`);
}
assert(mainSource.includes("game.reset();"), "Play Again invokes the canonical game reset");
assert(createGameSource.includes("LOGIC_W * 0.30"), "game reset restores the player at 30% of viewport width");
assert(!mainSource.includes('e.code === "KeyY"'), "game over no longer installs a Y restart key");
assert(!mainSource.includes('e.code === "KeyN"'), "game over no longer installs an N decision key");

const meshDraw = rendererSource.indexOf("this.meshPass.draw({");
const shieldDraw = rendererSource.indexOf('shape: "energyField"');
const meshReturn = rendererSource.indexOf("return;", shieldDraw);
assert(meshDraw >= 0 && shieldDraw > meshDraw && meshReturn > shieldDraw,
  "the active mesh player path composites the Shield field after the ship and before returning");
assert(rendererSource.includes("sizeX: bodyRadius * 8.0, sizeY: bodyRadius * 6.25"),
  "the Shield presentation uses the enlarged elliptical field footprint");

console.log("PlayerRuntimeRepair.smoke passed");
