import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
const position = (fragment: string): number => {
  const index = source.indexOf(fragment);
  assert.notEqual(index, -1, `main.ts contains ${fragment}`);
  return index;
};

const renderer = position("renderer = new WebGLSceneRenderer(");
const initialResize = position("requestResize();");
const devTools = position("async function mountDevTools()");
const devToolsSchedule = position("if ((window as any).__BOOT_N__ === bootN) void mountDevTools();");
const pixelBgr = position("const pixelBgrLabUi = new mod.PixelBgrLabUI();");

assert(renderer < initialResize, "renderer is created before initial resize scheduling");
assert(initialResize < devTools, "initial resize is scheduled before nonessential DEV tool initialization");
assert(renderer < pixelBgr, "renderer is created before Pixel BGR Lab");
assert(devTools < devToolsSchedule, "DEV tools are mounted by the post-render scheduler");
assert.equal(source.match(/new WebGLSceneRenderer\(/g)?.length, 1, "one renderer is created");
assert.equal(source.match(/new mod\.PixelBgrLabUI\(\)/g)?.length, 1, "one Pixel BGR Lab is created");
assert(source.includes("pixelBgrLabUi.mountEnemyLab(enemyLabPanel)"), "Pixel BGR receives the existing Enemy Lab panel");
assert(source.includes('await import("./ui/BgLabUI")'), "BG Lab remains initialized");
assert(source.includes('await import("./ui/GridLabUI")'), "Grid Lab remains initialized");
assert(source.includes('this.setDisplayMode("dev")') === false, "main does not introduce a second GAME/DEV state owner");

console.log("Main startup order smoke passed");
