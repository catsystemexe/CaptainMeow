import assert from "node:assert/strict";
import { assetId, type AssetDefinition } from "./AssetTypes";
import {
  collectBackgroundV2AssetReferences,
  validateAssetDefinitions,
  validateAssetReferences,
} from "./AssetValidation";
import { BACKGROUND_ASSET_DECLARATIONS } from "./BackgroundAssets";
import { validateRepositoryAssets } from "./AssetValidationRunner";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";

const validDefinition: AssetDefinition = {
  id: assetId("test.image"),
  displayName: "Test image",
  type: "image",
  lifecycle: { state: "active" },
  runtime: { kind: "url", url: "/assets/test.png" },
};
const fakeFiles = {
  runtimeUrlToPath: (url: string) => url.startsWith("/assets/") ? `public${url}` : null,
  fileExists: (path: string) => path === "public/assets/test.png",
};

assert.equal(validateAssetDefinitions([validDefinition], fakeFiles).valid, true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, id: "" }], fakeFiles).diagnostics[0]?.code, "ASSET_ID_EMPTY");
assert.equal(validateAssetDefinitions([validDefinition, validDefinition], fakeFiles).diagnostics.some(({ code }) => code === "ASSET_DUPLICATE_ID"), true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, type: "audio" }], fakeFiles).diagnostics.some(({ code }) => code === "ASSET_TYPE_UNSUPPORTED"), true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, runtime: { kind: "inline", url: "/assets/test.png" } }], fakeFiles).diagnostics.some(({ code }) => code === "ASSET_RUNTIME_INVALID"), true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, runtime: { kind: "url", url: "" } }], fakeFiles).diagnostics.some(({ code }) => code === "ASSET_RUNTIME_INVALID"), true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, runtime: { kind: "url", url: "/assets/missing.png" } }], fakeFiles).diagnostics.some(({ code }) => code === "ASSET_FILE_MISSING"), true);
assert.equal(validateAssetDefinitions([{ ...validDefinition, displayName: "  " }], fakeFiles).diagnostics.some(({ severity, code }) => severity === "WARNING" && code === "ASSET_DISPLAY_NAME_EMPTY"), true);

const knownReference = validateAssetReferences([{ assetId: "test.image", source: "scene.tracks[0].segments[0].asset.id" }], new Set(["test.image"]));
assert.equal(knownReference.valid, true);
const unknownReference = validateAssetReferences([{ assetId: "missing", source: "scene.tracks[1].objects[2].asset.id" }], new Set(["test.image"]));
assert.equal(unknownReference.valid, false);
assert.deepEqual(unknownReference.diagnostics[0], {
  severity: "ERROR",
  code: "ASSET_REFERENCE_UNRESOLVED",
  message: "Unresolved Asset ID: missing",
  assetId: "missing",
  source: "scene.tracks[1].objects[2].asset.id",
});

const desertReferences = collectBackgroundV2AssetReferences(createBackgroundV2DesertTestScene(), "desert");
assert(desertReferences.some(({ source }) => source.includes("segments[0].asset.id")));
assert(desertReferences.some(({ source }) => source.includes("objects[0].asset.id")));
assert.equal(BACKGROUND_ASSET_DECLARATIONS.length > 0, true);
assert.equal(validateRepositoryAssets().valid, true, JSON.stringify(validateRepositoryAssets().diagnostics));

console.log("AssetValidation.smoke: PASS");
