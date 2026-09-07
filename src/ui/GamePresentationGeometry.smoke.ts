import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gamePresentationRect } from "./GamePresentationGeometry";

const browserViewport = { width: 1280, height: 700 };
assert.deepEqual(gamePresentationRect("game", browserViewport), { x: 0, y: 0, width: 1280, height: 700 });
assert.deepEqual(
  gamePresentationRect("dev", browserViewport, { left: 220, top: 0, width: 780, height: 551 }),
  { x: 220, y: 0, width: 780, height: 551 },
);

const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
assert.equal(main.match(/document\.createElement\("canvas"\)/g)?.length, 1, "startup creates at most one game canvas");
assert.equal(main.match(/new WebGLSceneRenderer\(/g)?.length, 1, "startup keeps exactly one renderer");
assert.match(main, /presentationGeometrySource\?\.getGamePresentationRect\(\)/, "resize can use DEV workspace geometry instead of always using window dimensions");
assert.match(main, /canvasRect\.left \+ pr\.x \/ dpr/, "input and HUD presentation X includes the canvas screen-space offset");
assert.match(main, /canvasRect\.top \+ pr\.y \/ dpr/, "input and HUD presentation Y includes the canvas screen-space offset");

const ui = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
assert.match(ui, /this\.workspace\.viewport\.getBoundingClientRect\(\)/, "DEV geometry is read from the center workspace region");
assert.match(ui, /new ResizeObserver\(\(\) => this\.notifyPresentationChange\(\)\)/, "workspace geometry changes request presentation synchronization without polling");
assert.match(ui, /if \(changed\) this\.notifyPresentationChange\(\)/, "GAME/DEV changes request presentation synchronization");
assert.doesNotMatch(ui, /Timeline unavailable for this scene format/, "non-V2 scenes do not reserve or render a disabled timeline band");
assert.equal(ui.match(/this\.workspace\.timeline\.appendChild\(this\.renderV2Timeline\(projection\)\)/g)?.length, 1, "V2 scenes keep exactly one timeline renderer");

console.log("Game presentation geometry smoke passed");
