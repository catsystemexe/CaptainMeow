import assert from "node:assert/strict";
import { createAssetCatalog } from "./AssetCatalog";
import { ASSET_CATALOG, BACKGROUND_ASSET_DECLARATIONS, resolveAsset } from "./BackgroundAssets";
import { assetId, type AssetDefinition } from "./AssetTypes";
import { BACKGROUND_ASSET_CATALOG } from "../ui/PixelBgrLabAssets";

const definition: AssetDefinition = {
  id: assetId("test.image"),
  displayName: "Test image",
  type: "image",
  runtime: { kind: "url", url: "/test.png" },
};
const catalog = createAssetCatalog([definition]);
assert.equal(catalog.get(definition.id), definition, "lookup returns the original stable definition");
assert.equal(catalog.resolve(definition.id), definition);
assert.deepEqual(catalog.list(), [definition]);
assert.equal(catalog.get(assetId("unknown")), null, "unknown IDs resolve explicitly to null");
assert.throws(
  () => createAssetCatalog([definition, { ...definition, displayName: "Duplicate" }]),
  /Duplicate Asset ID: test\.image/,
);

const segment = resolveAsset(assetId("desert-test-mid-mesas-a"));
assert.equal(segment?.runtime.url, "/assets/bg/test/desert/desert_mid_mesas_a.png");
const object = resolveAsset(assetId("desert-test-clouds"));
assert.equal(object?.runtime.url, "/assets/bg/test/desert/desert_clouds.png");
assert.equal(resolveAsset(assetId("missing")), null);

assert.equal(ASSET_CATALOG.list().length, BACKGROUND_ASSET_DECLARATIONS.length);
assert.equal(BACKGROUND_ASSET_CATALOG.length, BACKGROUND_ASSET_DECLARATIONS.length);
for (const { definition, background } of BACKGROUND_ASSET_DECLARATIONS) {
  const compatible = BACKGROUND_ASSET_CATALOG.find((entry) => entry.id === definition.id);
  assert.deepEqual(compatible, {
    id: definition.id,
    label: definition.displayName,
    url: definition.runtime.url,
    kind: "sprite",
    pixelArt: background.pixelArt,
    technical: background.technical,
  });
}

console.log("AssetCatalog.smoke: PASS");
