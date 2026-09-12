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
  lifecycle: definition.lifecycle,
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
assert.match(contextSource, /lifecycle: definition\.lifecycle/, "lifecycle is projected from the canonical definition");
assert.match(contextSource, /item\.lifecycle\.state\.toUpperCase\(\)/, "ACTIVE and DEPRECATED lifecycle labels are supported");
assert.match(contextSource, /item\.lifecycle\.state === "deprecated" && item\.lifecycle\.replacementId/, "deprecated replacements are displayed when declared");
assert.match(contextSource, /assessAssetRemoval\(selected\.id\)/, "selected asset safety uses the H1 removal assessment API");
assert.match(contextSource, /assessment\.blockingReferences\.length} blocking/, "blocking references retain a distinct count");
assert.match(contextSource, /assessment\.informationalReferences\.length} informational/, "informational references retain a distinct count");
assert.match(contextSource, /assessment\.blockingReferences\.length > 0 \? "BLOCKED" : "SAFE AGAINST KNOWN REPO REFERENCES\\nUNUSED_CANDIDATE"/, "removal wording follows H1 blocking and unused-candidate semantics");
assert.match(contextSource, /toggle\.textContent = "Find References"/);
assert.match(contextSource, /list\.hidden = !list\.hidden/, "Find References expands and collapses inline");
for (const provenance of ["reference.sourceId", "reference.sourceKind", "reference.sourcePath", "reference.confidence", "reference.detail"]) assert(contextSource.includes(provenance), `${provenance} is rendered`);
assert.match(contextSource, /reference\.impact === "blocking" \? "BLOCKING" : "INFO"/);
assert.match(contextSource, /limitation\.textContent = UNUSED_CANDIDATE_LIMITATION/, "the canonical limitation remains discoverable");
for (const destructive of ["Delete Asset", "Apply Replacement", "Rewrite References", "Fix References"]) assert(!contextSource.includes(destructive), `${destructive} is absent`);

const layoutSource = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
const rightRule = layoutSource.match(/\.cm-bgr-workspace-right \{([^}]*)\}/)?.[1] ?? "";
assert.match(rightRule, /overflow:\s*auto/, "the right context remains an independent scroll owner");
assert.doesNotMatch(rightRule, /overflow:\s*hidden/, "the right scroll owner does not suppress scrolling");
assert.match(rightRule, /scrollbar-width:\s*none/, "the Firefox scrollbar is visually hidden");
assert.match(layoutSource, /\.cm-bgr-workspace-right::\-webkit-scrollbar \{ display: none; \}/, "the WebKit scrollbar is visually hidden");

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
