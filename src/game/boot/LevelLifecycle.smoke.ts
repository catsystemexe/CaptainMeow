import assert from "node:assert/strict";
import { makeStubCanvas, ensureWindowStub } from "../../smoke/nodeStub";
import { completeLevel, makeSessionState, resetLevel } from "../data/SessionState";
import { createGame } from "./createGame";
import { setBackgroundSceneV2 } from "../../render/BackgroundState";
import { createBackgroundV2SequenceVerificationScene } from "../../render/bg/v2/BackgroundV2SequenceVerificationScene";
import { readFileSync } from "node:fs";

const session = makeSessionState();
assert.equal(session.levelState, "active", "a new session starts with an ACTIVE level");
assert.equal(completeLevel(session), true, "the first completion performs the transition");
assert.equal(session.levelState, "completed");
assert.equal(completeLevel(session), false, "duplicate completion is idempotent");
assert.equal(session.levelState, "completed");
resetLevel(session);
assert.equal(session.levelState, "active", "restart returns the level to ACTIVE");

ensureWindowStub();
const game = await createGame(() => makeStubCanvas(), 896, 504);
game.loop.stepOneTick();
const activeTime = game.session.timeSec;
const activeScroll = game.world.scrollX;
assert(activeTime > 0, "ACTIVE gameplay progresses");

assert.equal(game.completeLevel(), true);
assert.equal(game.completeLevel(), false, "the composed completion owner remains idempotent");
const completedLoopTick = game.loop.getTick();
for (let index = 0; index < 3; index += 1) game.loop.stepOneTick();
assert.equal(game.session.timeSec, activeTime, "completed levels freeze Director progression");
assert.equal(game.world.scrollX, activeScroll, "completed levels freeze world simulation");
assert.equal(game.loop.isPaused(), false, "level completion remains distinct from DEV/user pause");
assert.equal(game.loop.getTick(), completedLoopTick + 3, "the outer loop remains live for rendering/UI while gameplay callbacks are frozen");

setBackgroundSceneV2(createBackgroundV2SequenceVerificationScene(), globalThis);
game.loop.stepOneTick();
assert.equal(game.session.levelState, "completed", "Scene replacement does not restart a completed Level");
const createGameSource = readFileSync(new URL("./createGame.ts", import.meta.url), "utf8");
assert.match(createGameSource, /if \(scene !== activeScene\) \{[\s\S]*?sceneLogicRuntime\.activate\(scene\?\.sceneLogic\);[\s\S]*?\}[\s\S]*?if \(session\.gameOver \|\| !isLevelActive\(session\)\) return;/, "Scene replacement activation precedes the ACTIVE-level gate");
assert.doesNotMatch(createGameSource, /return \{[\s\S]*?sceneLogicRuntime[,\s]*[\s\S]*?\};/, "private Scene Logic runtime is not exposed through the production game API");

game.reset();
assert.equal(game.session.levelState, "active", "canonical PLAY AGAIN reset resumes the level");
assert.equal(game.session.gameOver, false, "existing GAME OVER reset behavior remains unchanged");
game.loop.stepOneTick();
assert(game.session.timeSec > 0, "gameplay resumes after PLAY AGAIN");

console.log("LevelLifecycle.smoke: PASS");
