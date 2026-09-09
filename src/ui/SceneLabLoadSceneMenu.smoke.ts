import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { SCENE_LAB_SCENE_CATALOG } from "./SceneLabSceneCatalog";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

assert.equal(source.match(/this\.iconButton\("Open scene"/g)?.length, 1, "the V2 path exposes one Open scene icon");
assert.equal(source.match(/renderSceneMenu\(\)/g)?.length, 3, "both render paths share one menu renderer rather than creating duplicate menu implementations");
assert.match(source, /if\(this\.sceneMenuOpen\)return/, "opening an already-open menu is a no-op");
assert.match(source, /document\.addEventListener\("pointerdown",this\.onSceneMenuOutside\)/, "outside pointer dismissal is installed");
assert.match(source, /event\.key==="Escape"/, "Escape dismisses the menu");
assert.match(source, /private selectScene[\s\S]*?this\.closeSceneMenu\(false\)[\s\S]*?setBackgroundSceneV2/, "selection closes before loading through background state");
assert.match(source, /dataset\.timelineMode = v2Scene \? "v2" : "disabled"/, "V2 expands and non-V2 collapses the center timeline");
assert.match(source, /if \(shouldApplyPixelBgrV1Draft\(activeState\)\) this\.applyIfValid\(\)/, "constructor only applies an already-active V1 scene");
assert.match(main, /desert: \(\) => enableBackgroundV2DesertTest\(globalThis\)/, "the bgrVerify Desert hook is preserved");

const desert = SCENE_LAB_SCENE_CATALOG.find(entry => entry.label === "Desert V2");
assert(desert && desert.version === 2, "Desert V2 is available");
assert.deepEqual(desert.create(), createBackgroundV2DesertTestScene(), "Desert catalog entry delegates to the deterministic fixture");
assert(SCENE_LAB_SCENE_CATALOG.some(entry => entry.label === "Visual Verification V2"), "the existing V2 verification scene is available");
assert(SCENE_LAB_SCENE_CATALOG.some(entry => entry.label === "B2 Demo"), "the existing V1 demo scene is available");

for (const unchangedHandler of [
  'this.iconButton("Open scene",FolderOpen,"FolderOpen",()=>this.toggleSceneMenu())',
  'this.iconButton("Save scene",Save,"Save",()=>this.saveV2())',
  'this.iconButton("Duplicate scene",Copy,"Copy",()=>this.duplicateV2())',
  'this.iconButton("Close Scene Lab",X,"X",()=>this.close())',
  'this.iconButton("Delete scene",Trash2,"Trash2"',
  '"Import JSON..."',
  '"Export JSON..."',
]) assert(source.includes(unchangedHandler), `${unchangedHandler} remains unchanged`);

console.log("SceneLabLoadSceneMenu.smoke: PASS");
