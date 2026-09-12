import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectAssetFileIntrinsicSize, inspectPngIntrinsicSize, inspectSvgIntrinsicSize } from "./AssetPreparationInspection";
import { BACKGROUND_ASSET_DECLARATIONS } from "./BackgroundAssets";
import { validateBackgroundAssetPreparations } from "./AssetValidation";

const png = new Uint8Array(24);
png.set([137, 80, 78, 71, 13, 10, 26, 10]);
png.set([73, 72, 68, 82], 12);
new DataView(png.buffer).setUint32(16, 320);
new DataView(png.buffer).setUint32(20, 180);
assert.deepEqual(inspectPngIntrinsicSize(png), { width: 320, height: 180 });
assert.equal(inspectPngIntrinsicSize(new Uint8Array(24)), null);
assert.deepEqual(inspectSvgIntrinsicSize('<svg width="64px" height="32" viewBox="0 0 8 4"/>'), { width: 64, height: 32 });
assert.deepEqual(inspectSvgIntrinsicSize('<svg viewBox="10 20 128 96"/>'), { width: 128, height: 96 });
assert.equal(inspectSvgIntrinsicSize("not svg"), null);

const base = BACKGROUND_ASSET_DECLARATIONS[0];
const measure = { runtimeUrlToPath: () => "asset.png", inspectFile: () => ({ ...base.background.preparation.nativeSize }) };
assert.equal(validateBackgroundAssetPreparations([base], measure).valid, true);
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, nativeSize: { width: 0, height: -1 } } } }], measure).diagnostics.some(({ code }) => code === "ASSET_NATIVE_SIZE_INVALID"), true);
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, usage: [] } } }], measure).diagnostics.some(({ code }) => code === "ASSET_USAGE_EMPTY"), true);
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, usage: ["sound"] } } }], measure).diagnostics.some(({ code }) => code === "ASSET_USAGE_INVALID"), true);
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, usage: ["segment", "object"] } } }], measure).valid, true, "multi-role preparation is valid");
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, repeat: { x: true, seam: "seamless" } } } }], measure).valid, true);
assert.equal(validateBackgroundAssetPreparations([{ ...base, background: { ...base.background, preparation: { ...base.background.preparation, repeat: { x: false, seam: "seamless" } } } }], measure).diagnostics.some(({ code }) => code === "ASSET_PREPARATION_INVALID"), true);
assert.equal(validateBackgroundAssetPreparations([base], { ...measure, inspectFile: () => ({ width: 1, height: 2 }) }).diagnostics.some(({ code }) => code === "ASSET_NATIVE_SIZE_MISMATCH"), true);

const root = fileURLToPath(new URL("../../", import.meta.url));
const repository = validateBackgroundAssetPreparations(BACKGROUND_ASSET_DECLARATIONS, {
  runtimeUrlToPath: (url) => resolve(root, "public", url.slice(1)),
  inspectFile: inspectAssetFileIntrinsicSize,
});
assert.equal(repository.valid, true, JSON.stringify(repository.diagnostics));
console.log("AssetPreparationInspection.smoke: PASS");
