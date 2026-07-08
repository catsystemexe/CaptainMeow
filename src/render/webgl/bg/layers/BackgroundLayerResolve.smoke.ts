import { strict as assert } from "node:assert";
import { createB1SpriteParallaxDemoState } from "./BackgroundLayerTypes";
import { resolveBackgroundLayers, selectBackgroundFallback } from "./backgroundLayerMath";

const demo = createB1SpriteParallaxDemoState();
assert.equal(selectBackgroundFallback(demo), "layers");
assert.deepEqual(resolveBackgroundLayers(demo).map((l) => l.id), ["legacy-shader", "b1-pixel-stars"]);
assert.equal(selectBackgroundFallback(null), "legacy");
assert.equal(selectBackgroundFallback({ enabled: true, layers: [] }), "legacy");
assert.equal(selectBackgroundFallback({ enabled: false, layers: demo.layers }), "legacy");
assert.equal(resolveBackgroundLayers({ enabled: true, layers: [{ ...demo.layers[1], enabled: false }] }).length, 0);
assert.equal(resolveBackgroundLayers({ enabled: true, layers: [{ ...demo.layers[1], opacity: 0 }] }).length, 0);
assert.equal(resolveBackgroundLayers({ enabled: true, layers: [{ id: "bad", kind: "unknown", enabled: true } as any, demo.layers[0]] }).length, 1);
console.log("[SMOKE] BackgroundLayerResolve OK ✅");
