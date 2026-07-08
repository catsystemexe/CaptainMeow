import assert from "node:assert/strict";
import type { BackgroundLayer } from "./BackgroundLayerTypes";
import type { BackgroundScene } from "./BackgroundSceneTypes";
import {
  chunkIntersectsVisibleRange,
  composeBackgroundLayers,
  resolveActiveBackgroundChunks,
  resolveActiveBackgroundLayerIds,
  resolveVisibleWorldRange,
} from "./BackgroundSceneResolve";
import { resolveBackgroundLayers, selectBackgroundFallback } from "./backgroundLayerMath";

const sprite = (id: string, x = 0): BackgroundLayer => ({
  id,
  kind: "sprite",
  enabled: true,
  texture: { url: "/assets/bg/b1_pixel_stars.svg", filtering: "nearest" },
  opacity: 1,
  blend: "normal",
  parallax: { x: 1, y: 0 },
  offset: { x, y: 0 },
  repeat: { x: true, y: false },
});
const shader = (id: string): BackgroundLayer => ({ id, kind: "shader", enabled: true, presetIndex: 0 });

const scene: BackgroundScene = {
  id: "test-scene",
  globalLayers: [shader("sky"), sprite("fog")],
  chunks: [
    { id: "b", startX: 100, length: 100, layers: [sprite("rocks", 5), sprite("wall", 7)] },
    { id: "a", startX: 0, length: 100, layers: [sprite("rocks", 3)] },
    { id: "overlap", startX: 50, length: 75, layers: [sprite("fog", 2)] },
  ],
};

assert.equal(chunkIntersectsVisibleRange({ startX: 0, length: 100 }, { startX: 0, endX: 1 }), true);
assert.equal(chunkIntersectsVisibleRange({ startX: 0, length: 100 }, { startX: 100, endX: 100 }), false);
assert.equal(chunkIntersectsVisibleRange({ startX: 100, length: 100 }, { startX: 100, endX: 100 }), true);
assert.equal(resolveVisibleWorldRange(-10, 20, 5).startX, -15);
assert.deepEqual(resolveActiveBackgroundChunks(scene, 10, 20).map((c) => c.id), ["a"]);
assert.deepEqual(resolveActiveBackgroundChunks(scene, 90, 20).map((c) => c.id), ["a", "overlap", "b"]);
assert.deepEqual(resolveActiveBackgroundChunks(scene, 100, 0).map((c) => c.id), ["overlap", "b"]);
assert.deepEqual(resolveActiveBackgroundChunks(scene, -50, 40).map((c) => c.id), []);
assert.deepEqual(resolveActiveBackgroundChunks(scene, 10_000, 40).map((c) => c.id), []);
assert.deepEqual(resolveActiveBackgroundChunks(scene, 0, 240).map((c) => c.id), ["a", "overlap", "b"]);
assert.deepEqual(resolveActiveBackgroundChunks({ ...scene, chunks: [scene.chunks[2], scene.chunks[0], scene.chunks[1]] }, 90, 20).map((c) => c.id), ["a", "overlap", "b"]);
assert.deepEqual(resolveActiveBackgroundChunks({ ...scene, chunks: [{ id: "bad", startX: 0, length: 0, layers: [] }, { id: "neg", startX: 0, length: -1, layers: [] }, { id: "nan", startX: Number.NaN, length: 1, layers: [] }] }, 0, 10), []);
const before = JSON.stringify(scene);
const active = resolveActiveBackgroundChunks(scene, 90, 20);
assert.equal(JSON.stringify(scene), before);
const composed = composeBackgroundLayers(scene, active);
assert.deepEqual(composed.map((l) => l.id), ["global:sky", "global:fog", "chunk:a:rocks", "chunk:overlap:fog", "chunk:b:rocks", "chunk:b:wall"]);
assert.deepEqual(resolveActiveBackgroundLayerIds(composed), ["global:fog", "chunk:a:rocks", "chunk:overlap:fog", "chunk:b:rocks", "chunk:b:wall"]);
assert.equal((composed[2] as any).offset.x, 3);
assert.equal((composed[4] as any).offset.x, 105);
assert.equal(resolveBackgroundLayers({ enabled: true, source: { kind: "layers", layers: composed } }).length, composed.length);
assert.equal(resolveBackgroundLayers({ enabled: true, source: { kind: "layers", layers: [{ ...sprite("off"), enabled: false }, { id: "bad", kind: "unknown", enabled: true } as any] } }).length, 0);
assert.equal(selectBackgroundFallback({ enabled: true, source: { kind: "scene", scene } }), "layers");
assert.equal(selectBackgroundFallback({ enabled: false, source: { kind: "scene", scene } }), "legacy");
assert.equal(selectBackgroundFallback({ enabled: true, layers: [] }), "legacy");
assert.deepEqual(resolveActiveBackgroundLayerIds(composeBackgroundLayers(scene, resolveActiveBackgroundChunks(scene, 10, 20))), ["global:fog", "chunk:a:rocks"]);
assert.deepEqual(resolveActiveBackgroundLayerIds(composeBackgroundLayers(scene, resolveActiveBackgroundChunks(scene, 90, 20))), ["global:fog", "chunk:a:rocks", "chunk:overlap:fog", "chunk:b:rocks", "chunk:b:wall"]);
assert.deepEqual(composeBackgroundLayers(scene, active).map((l) => l.id), composed.map((l) => l.id));
console.log("[SMOKE] BackgroundSceneResolve OK ✅");
