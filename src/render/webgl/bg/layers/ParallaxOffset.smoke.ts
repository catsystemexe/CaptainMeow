import { strict as assert } from "node:assert";
import { resolveParallaxOffset } from "./backgroundLayerMath";

const layer = (x: number, y: number, ox = 0, oy = 0) => ({ parallax: { x, y }, offset: { x: ox, y: oy } });
assert.deepEqual(resolveParallaxOffset(layer(0, 0), { x: 100, y: 50 }), { x: 0, y: 0 });
assert.deepEqual(resolveParallaxOffset(layer(1, 1), { x: 100, y: 50 }), { x: -100, y: -50 });
assert.deepEqual(resolveParallaxOffset(layer(0.5, 0.25, 10, -5), { x: 80, y: -40 }), { x: -30, y: 5 });
assert.deepEqual(resolveParallaxOffset(layer(1, 1), { x: -32, y: -12 }), { x: 32, y: 12 });
assert.deepEqual(resolveParallaxOffset({ parallax: { x: Number.NaN, y: Infinity }, offset: { x: Number.NaN, y: 7 } }, { x: 5, y: 9 }), { x: 0, y: 7 });
console.log("[SMOKE] ParallaxOffset OK ✅");
