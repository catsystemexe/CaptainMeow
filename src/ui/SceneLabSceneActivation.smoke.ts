import assert from "node:assert/strict";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { activateV2SceneForAuthoring } from "./SceneLabSceneActivation";

const calls: string[] = [];
const root = {
  __CM: {
    game: {
      reset: () => calls.push("reset"),
      seekGameplayToPlayerX: (targetX: number, options: { bounds: { startX: number; endX: number }; pauseAfterSeek: boolean }) => {
        calls.push(`seek:${targetX}:${options.bounds.endX}:${options.pauseAfterSeek}`);
      },
    },
  },
};
const scene = createBackgroundV2DesertTestScene();
activateV2SceneForAuthoring(scene, { startX: 0, endX: 4000 }, root, {
  setScene: (value) => { assert.equal(value, scene); calls.push("scene"); },
});
assert.deepEqual(calls, ["scene", "reset", "seek:0:4000:true"], "authoring activation replaces, resets, seeks, and pauses in order");

console.log("SceneLabSceneActivation.smoke: PASS");
