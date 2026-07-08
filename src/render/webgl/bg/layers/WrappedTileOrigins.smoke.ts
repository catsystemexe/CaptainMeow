import { strict as assert } from "node:assert";
import { wrappedTileOrigins } from "./backgroundLayerMath";

function assertCoverage(offset: number, tileW: number, viewW: number, overscan = 0) {
  const xs = wrappedTileOrigins(offset, tileW, viewW, overscan);
  assert(xs.length > 0, "origins should not be empty");
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i] - xs[i - 1], tileW);
  assert(xs[0] <= 0, "first origin covers left edge");
  assert(xs[0] + tileW >= -overscan, "first origin honors overscan");
  assert(xs[xs.length - 1] + tileW >= viewW, "last tile covers viewport right edge");
}
assertCoverage(0, 128, 896, 1);
assertCoverage(-17, 128, 896, 1);
assertCoverage(99999, 128, 896, 1);
assertCoverage(-99999, 128, 896, 1);
assert.deepEqual(wrappedTileOrigins(0, 128, 256, 0), [-128, 0, 128]);
console.log("[SMOKE] WrappedTileOrigins OK ✅");
