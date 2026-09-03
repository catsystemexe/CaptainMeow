import assert from "node:assert/strict";
import type { BackgroundLayer } from "../../webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "../../webgl/bg/layers/BackgroundSceneTypes";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import { adaptBackgroundSceneV1ToV2 } from "./BackgroundV1Adapter";

const sprite = (id: string, overrides: Partial<Extract<BackgroundLayer, { kind: "sprite" }>> = {}): Extract<BackgroundLayer, { kind: "sprite" }> => ({
  id,
  kind: "sprite",
  enabled: true,
  texture: { url: `/assets/${id}.png`, filtering: "nearest" },
  opacity: 0.75,
  blend: "normal",
  parallax: { x: 0.25, y: 0.5 },
  offset: { x: 12, y: 18 },
  repeat: { x: false, y: false },
  ...overrides,
});

const scene: BackgroundScene = {
  id: "b2-shaped-fixture",
  globalLayers: [
    { id: "shader", kind: "shader", enabled: true, presetIndex: 0 },
    sprite("stars"),
    { id: "ribbon", kind: "flow-ribbon", enabled: true, presetIndex: 1 },
  ],
  markers: [{
    id: "pulse",
    x: 180,
    enabled: false,
    once: true,
    actions: [{ kind: "pulse-layer-opacity", layerId: "global:stars", from: 0.2, to: 1, durationMs: 500 }],
  }],
  chunks: [{
    id: "chunk-a",
    startX: 700,
    length: 320,
    layers: [
      sprite("rocks", { offset: { x: 24, y: 72 }, parallax: { x: 0.7, y: 0.1 }, opacity: 0.9, blend: "additive", enabled: false, repeat: { x: true, y: false } }),
      { id: "segments", kind: "flow-segments", enabled: true, presetIndex: 2 },
    ],
    markers: [{
      id: "enter",
      x: 80,
      enabled: true,
      once: false,
      actions: [
        { kind: "set-layer-enabled", layerId: "chunk:chunk-a:rocks", enabled: true },
        { kind: "emit-environment-event", event: "chunk-a-enter" },
        { kind: "set-layer-opacity", layerId: "global:missing", opacity: 0.5 },
      ],
    }],
  }],
};

const before = structuredClone(scene);
const result = adaptBackgroundSceneV1ToV2(scene);
assert.deepEqual(scene, before, "adapter must not mutate V1 input");
assert.deepEqual(result, adaptBackgroundSceneV1ToV2(scene), "adapter output must be deterministic");

assert.equal(result.scene.version, 2);
assert.equal(result.scene.tracks.length, 2, "unsupported layers must not become fabricated tracks");
const globalTrack = result.scene.tracks[0];
assert.equal(globalTrack.id, "v1-global:stars");
assert.equal(globalTrack.role, "custom");
assert.equal(globalTrack.mode, "sequence");
assert.deepEqual(globalTrack.parallax, { x: 0.25, y: 0.5 });
assert.equal(globalTrack.zBase, 1);
assert.deepEqual(globalTrack.objects[0], {
  id: "sprite",
  asset: { id: "v1-global:stars:asset", url: "/assets/stars.png" },
  startTrackX: 12,
  y: 18,
  localZ: 0,
  opacity: 0.75,
  blend: "normal",
  enabled: true,
});

const chunkTrack = result.scene.tracks[1];
assert.equal(chunkTrack.id, "v1-chunk:chunk-a:rocks");
assert.equal(chunkTrack.mode, "repeat");
assert.deepEqual(chunkTrack.parallax, { x: 0.7, y: 0.1 });
assert.equal(chunkTrack.objects.length, 1, "repeat intent must not materialize extra instances");
assert.equal(chunkTrack.objects[0].startTrackX, 724);
assert.equal(chunkTrack.objects[0].y, 72);
assert.equal(chunkTrack.objects[0].opacity, 0.9);
assert.equal(chunkTrack.objects[0].blend, "additive");
assert.equal(chunkTrack.objects[0].enabled, false);

assert.deepEqual(result.compatibility.sourceMap.map(({ sourceRuntimeLayerId, sourceOrder }) => ({ sourceRuntimeLayerId, sourceOrder })), [
  { sourceRuntimeLayerId: "global:shader", sourceOrder: 0 },
  { sourceRuntimeLayerId: "global:stars", sourceOrder: 1 },
  { sourceRuntimeLayerId: "global:ribbon", sourceOrder: 2 },
  { sourceRuntimeLayerId: "chunk:chunk-a:rocks", sourceOrder: 3 },
  { sourceRuntimeLayerId: "chunk:chunk-a:segments", sourceOrder: 4 },
]);
assert.deepEqual(result.compatibility.sourceMap[1].activation, { kind: "global" });
assert.deepEqual(result.compatibility.sourceMap[3].activation, { kind: "chunk", chunkId: "chunk-a", startWorldX: 700, length: 320, interval: "half-open" });
assert.deepEqual(result.compatibility.sourceMap[3].repeat, { repeatX: true, repeatY: false, materialization: "deferred" });
assert.equal(result.compatibility.sourceMap[3].filtering, "nearest");
assert.deepEqual(result.compatibility.passthroughLayers.map(({ sourceLayer }) => sourceLayer.kind), ["shader", "flow-ribbon", "flow-segments"]);
assert.deepEqual(result.diagnostics.filter(({ code }) => code === "unsupported-layer-kind").map(({ layerId }) => layerId), ["shader", "ribbon", "segments"]);
assert.equal(result.diagnostics.filter(({ code }) => code === "unsupported-repeat-axis-semantics").length, 1);

assert.equal(result.compatibility.markers[0].runtimeId, "global-marker:pulse");
assert.equal(result.compatibility.markers[0].worldX, 180);
assert.equal(result.compatibility.markers[0].marker.enabled, false);
assert.equal(result.compatibility.markers[0].marker.once, true);
assert.deepEqual(result.compatibility.markers[0].marker.actions, scene.markers?.[0].actions);
assert.equal(result.compatibility.markers[1].runtimeId, "chunk-marker:chunk-a:enter");
assert.equal(result.compatibility.markers[1].worldX, 780);
assert.equal(result.compatibility.markers[1].marker.once, false);
assert.deepEqual(result.compatibility.markers[1].marker.actions, scene.chunks[0].markers?.[0].actions);
assert.ok(result.compatibility.sourceMap.some(({ sourceRuntimeLayerId, adaptedTrackId }) => sourceRuntimeLayerId === "chunk:chunk-a:rocks" && adaptedTrackId === "v1-chunk:chunk-a:rocks"));
assert.deepEqual(result.diagnostics.filter(({ code }) => code === "unsupported-marker-action-target").map(({ markerId, actionIndex }) => ({ markerId, actionIndex })), [{ markerId: "enter", actionIndex: 2 }]);

const context = { playerWorldX: 999, cameraScrollX: 40, cameraScrollY: 10, viewportWidth: 320, viewportHeight: 180 };
const frame = evaluateBackgroundScene(result.scene, context);
const globalInstance = frame.behindGameplay.find(({ sourceTrackId }) => sourceTrackId === globalTrack.id);
assert.equal(globalInstance?.screenX, 12 - 40 * 0.25);
assert.equal(globalInstance?.screenY, 18 - 10 * 0.5);
// Enable only the adapted copy to prove chunk-local origin equivalence without mutating V1.
chunkTrack.objects[0].enabled = true;
const chunkInstance = evaluateBackgroundScene(result.scene, context).behindGameplay.find(({ sourceTrackId }) => sourceTrackId === chunkTrack.id);
assert.equal(chunkInstance?.screenX, 700 + 24 - 40 * 0.7);
assert.equal(chunkInstance?.screenY, 72 - 10 * 0.1);

const invalid = structuredClone(scene) as BackgroundScene;
invalid.globalLayers.push(sprite("stars"));
invalid.chunks.push(structuredClone(invalid.chunks[0]));
invalid.chunks[0].layers.push(sprite("rocks"));
invalid.chunks.push({ id: "bad", startX: Number.NaN, length: 0, layers: [] });
invalid.globalLayers.push(sprite("bad-sprite", { texture: { url: "", filtering: "nearest" }, offset: { x: Number.POSITIVE_INFINITY, y: 0 } }));
const invalidResult = adaptBackgroundSceneV1ToV2(invalid);
assert.deepEqual(invalidResult, adaptBackgroundSceneV1ToV2(invalid));
assert.ok(invalidResult.diagnostics.some(({ code, message }) => code === "ambiguous-legacy-state" && message.includes("Duplicate global layer")));
assert.ok(invalidResult.diagnostics.some(({ code, message }) => code === "ambiguous-legacy-state" && message.includes("Duplicate chunk")));
assert.ok(invalidResult.diagnostics.some(({ code, message }) => code === "ambiguous-legacy-state" && message.includes("Duplicate layer id")));
assert.ok(invalidResult.diagnostics.some(({ code }) => code === "invalid-source-data"));

console.log("BackgroundV1Adapter.smoke: PASS");
