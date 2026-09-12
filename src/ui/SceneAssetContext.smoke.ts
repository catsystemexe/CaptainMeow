import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BACKGROUND_ASSET_DECLARATIONS } from "../assets/BackgroundAssets";
import { SCENE_ASSET_CONTEXT_ITEMS, sceneAssetUsageLabel } from "./SceneAssetContext";

assert.equal(SCENE_ASSET_CONTEXT_ITEMS.length, BACKGROUND_ASSET_DECLARATIONS.length, "right catalogue represents every canonical declaration");
assert.deepEqual(SCENE_ASSET_CONTEXT_ITEMS, BACKGROUND_ASSET_DECLARATIONS.map(({ definition, background }) => ({
  id: definition.id,
  displayName: definition.displayName,
  runtimeUrl: definition.runtime.url,
  nativeSize: background.preparation.nativeSize,
  usage: background.preparation.usage,
  pixelArt: background.pixelArt,
})), "context metadata is projected entirely from canonical declarations");
assert.deepEqual([sceneAssetUsageLabel("segment"), sceneAssetUsageLabel("object"), sceneAssetUsageLabel("static-backdrop")], ["SEG", "OBJ", "BGR"]);
const multiRole = SCENE_ASSET_CONTEXT_ITEMS.find(item => item.usage.length > 1);
assert(multiRole, "canonical catalogue contains a multi-role asset");
assert.equal(multiRole.usage.map(sceneAssetUsageLabel).length, multiRole.usage.length, "all usage roles are retained");

const contextSource = readFileSync(new URL("./SceneAssetContext.ts", import.meta.url), "utf8");
assert.match(contextSource, /className = "cm-scene-context"/);
assert.match(contextSource, /dataset\.sceneContext = "assets"/);
assert.match(contextSource, /card\.setAttribute\("aria-pressed", String\(item\.id === selectedAssetId\)\)/);
assert.match(contextSource, /card\.onclick = \(\) => onSelect\(item\.id\)/);
assert.match(contextSource, /image\.src = item\.runtimeUrl/);
assert.match(contextSource, /image\.onerror = \(\) =>/);
assert.match(contextSource, /field\("ID", selected\.id\)/);
assert.match(contextSource, /field\("SIZE", `\$\{selected\.nativeSize\.width\} × \$\{selected\.nativeSize\.height\}`\)/);
assert.match(contextSource, /field\("USAGE", selected\.usage\.map\(sceneAssetUsageLabel\)\.join\("  "\)\)/);
assert.match(contextSource, /field\("PATH", selected\.runtimeUrl\)/);

const uiSource = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
assert.match(uiSource, /workspace\.right\.replaceChildren\(\)/, "right context is cleared on every render");
assert.match(uiSource, /if \(this\.getActiveDevLab\(\) === "scene"\) this\.workspace\.right\.appendChild\(this\.renderSceneAssetContext\(\)\)/, "context renders only in Scene mode");
assert.match(uiSource, /createSceneAssetContext\(this\.v2SelectedAssetId,assetId=>\{this\.v2SelectedAssetId=assetId;this\.render\(\);\}\)/, "catalogue selection updates the sole existing authority without editing scene data");
assert.doesNotMatch(uiSource, /tree\.append\(this\.renderV2AssetPicker\(\)\)/, "old left picker is absent");
assert.match(uiSource, /this\.v2SelectedAssetId=syncV2PickerAssetId\(segment\.asset\.id\)/, "SEG selection still synchronizes asset context");
assert.match(uiSource, /this\.v2SelectedAssetId=syncV2PickerAssetId\(object\.asset\.id\)/, "OBJ selection still synchronizes asset context");
assert.match(uiSource, /resolveV2PickerAsset\(BACKGROUND_ASSET_CATALOG,this\.v2SelectedAssetId\)/, "lane insertion still resolves the selected asset");
assert.match(uiSource, /this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/, "existing timeline remains mounted");

console.log("SceneAssetContext.smoke: PASS");
