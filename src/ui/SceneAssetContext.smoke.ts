import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BACKGROUND_ASSET_DECLARATIONS } from "../assets/BackgroundAssets";
import {
  DEFAULT_SCENE_ASSET_FILTER,
  filterSceneAssetContextItems,
  SCENE_ASSET_CONTEXT_ITEMS,
  SCENE_ASSET_FILTERS,
  sceneAssetUsageLabel,
  type SceneAssetContextItem,
} from "./SceneAssetContext";

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
assert.deepEqual(SCENE_ASSET_FILTERS, ["all", "segment", "object", "static-backdrop"], "filter model contains exactly the four presentation filters");
assert.equal(DEFAULT_SCENE_ASSET_FILTER, "all", "catalogue defaults to ALL");
assert.strictEqual(filterSceneAssetContextItems(SCENE_ASSET_CONTEXT_ITEMS, "all"), SCENE_ASSET_CONTEXT_ITEMS, "ALL returns the complete canonical projection");
for (const usage of ["segment", "object", "static-backdrop"] as const) {
  const filtered = filterSceneAssetContextItems(SCENE_ASSET_CONTEXT_ITEMS, usage);
  assert(filtered.every((item) => item.usage.includes(usage)), `${sceneAssetUsageLabel(usage)} contains only matching canonical usage`);
  assert.deepEqual(filtered, SCENE_ASSET_CONTEXT_ITEMS.filter((item) => item.usage.includes(usage)), `${sceneAssetUsageLabel(usage)} preserves canonical order`);
}
for (const usage of multiRole.usage) assert(filterSceneAssetContextItems(SCENE_ASSET_CONTEXT_ITEMS, usage).includes(multiRole), "multi-role asset appears in every applicable filter");
const noMatches = filterSceneAssetContextItems([
  { ...multiRole, usage: ["segment"] },
] satisfies readonly SceneAssetContextItem[], "static-backdrop");
assert.equal(noMatches.length, 0, "filter helper supports an empty category without fallback");

const contextSource = readFileSync(new URL("./SceneAssetContext.ts", import.meta.url), "utf8");
assert.match(contextSource, /className = "cm-scene-context"/);
assert.match(contextSource, /dataset\.sceneContext = "assets"/);
assert.match(contextSource, /card\.setAttribute\("aria-pressed", String\(item\.id === selectedAssetId\)\)/);
assert.match(contextSource, /card\.onclick = \(\) => onSelect\(item\.id\)/);
assert.match(contextSource, /filterBar\.setAttribute\("role", "group"\)/);
assert.match(contextSource, /filterBar\.setAttribute\("aria-label", "Asset usage filter"\)/);
assert.match(contextSource, /button\.type = "button"/);
assert.match(contextSource, /button\.setAttribute\("aria-pressed", String\(filter === activeSceneAssetFilter\)\)/, "active filter is exposed accessibly");
assert.match(contextSource, /activeSceneAssetFilter = filter;[\s\S]*renderCatalog\(\)/, "filter changes only presentation state before rerendering cards");
assert.match(contextSource, /empty\.textContent = "No assets in this category"/, "empty filter result is diagnosed");
assert.match(contextSource, /const selected = SCENE_ASSET_CONTEXT_ITEMS\.find\(\(item\) => item\.id === selectedAssetId\)/, "selected detail remains sourced independently of filtered cards");
const filterClickHandler = contextSource.match(/button\.onclick = \(\) => \{([\s\S]*?)\n    \};/)?.[1] ?? "";
assert.doesNotMatch(filterClickHandler, /onSelect|selectedAssetId/, "filter changes do not invoke or replace selection authority");
assert.match(contextSource, /card\.title = item\.displayName/, "card title preserves the full canonical display name");
assert.match(contextSource, /name\.textContent = item\.displayName/, "card caption uses the canonical display name");
assert.match(contextSource, /image\.src = item\.runtimeUrl/);
assert.match(contextSource, /image\.onerror = \(\) =>/);
assert.match(contextSource, /nativeSize\.textContent = `\$\{item\.nativeSize\.width\}×\$\{item\.nativeSize\.height\}`/, "thumbnail size overlay uses canonical native dimensions");
assert.match(contextSource, /nativeSize\.setAttribute\("aria-hidden", "true"\)/);
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
assert.doesNotMatch(contextSource, /contextmenu/, "no context-menu UI is introduced");

const cardRule = contextSource.match(/\.cm-scene-asset-card\{([^}]*)\}/)?.[1] ?? "";
assert.match(cardRule, /padding:0 0 3px/, "thumbnail frame has no horizontal card inset");
const thumbRule = contextSource.match(/\.cm-scene-asset-thumb\{([^}]*)\}/)?.[1] ?? "";
assert.match(thumbRule, /position:relative/, "thumbnail positions its native-size overlay");
const imageRule = contextSource.match(/\.cm-scene-asset-thumb img,\.cm-scene-asset-preview img\{([^}]*)\}/)?.[1] ?? "";
assert.match(imageRule, /object-fit:contain/, "thumbnail preserves aspect ratio without cropping");
const pixelatedRule = contextSource.match(/\.cm-scene-asset-thumb img\.pixelated,\.cm-scene-asset-preview img\.pixelated\{([^}]*)\}/)?.[1] ?? "";
assert.match(pixelatedRule, /image-rendering:pixelated/, "pixel-art rendering is preserved");
const captionRule = contextSource.match(/\.cm-scene-asset-name\{([^}]*)\}/)?.[1] ?? "";
assert.match(captionRule, /font-size:9px/, "caption font is reduced from 11px to 9px");
assert.match(captionRule, /white-space:nowrap/, "caption remains on exactly one line");
assert.match(captionRule, /overflow:hidden/, "long captions are clipped");
assert.match(captionRule, /text-overflow:ellipsis/, "long captions use an ellipsis");

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
