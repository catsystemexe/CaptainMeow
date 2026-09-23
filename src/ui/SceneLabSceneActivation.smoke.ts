import assert from "node:assert/strict";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { activateV2SceneForAuthoring } from "./SceneLabSceneActivation";
import { projectBackgroundV2Timeline } from "./PixelBgrV2TimelineProjection";
import { createBackgroundV2SequenceVerificationScene } from "../render/bg/v2/BackgroundV2SequenceVerificationScene";

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
const sceneBounds = projectBackgroundV2Timeline(scene).bounds;
activateV2SceneForAuthoring(scene, root, {
  setScene: (value) => { assert.equal(value, scene); calls.push("scene"); },
});
assert.deepEqual(calls, ["scene", "reset", `seek:${sceneBounds.startX}:${sceneBounds.endX}:true`], "authoring activation replaces, resets, seeks, and pauses in order");

calls.length = 0;
const sequence = createBackgroundV2SequenceVerificationScene();
const sequenceBounds = projectBackgroundV2Timeline(sequence).bounds;
activateV2SceneForAuthoring(sequence, root, { setScene: () => calls.push("scene") });
assert.deepEqual(calls, ["scene", "reset", `seek:0:${sequenceBounds.endX}:true`], "activation receives the same canonical bounds used by timeline projection and seek");

console.log("SceneLabSceneActivation.smoke: PASS");
