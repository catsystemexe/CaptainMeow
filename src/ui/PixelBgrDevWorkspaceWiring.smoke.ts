import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");

assert.equal(source.match(/createPixelBgrDevWorkspaceShell\(\)/g)?.length, 1, "Lab creates one stable workspace shell during construction");
assert(source.includes("this.workspace.right.appendChild(this.root)"), "existing Lab UI remains the transitional authoring owner");
assert(source.includes("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))"), "V2 timeline is mounted in the full-width workspace timeline region");
assert(source.includes("this.workspace.left.append(leftHeading,this.renderV2Environment(v2Scene))"), "the environment surface makes the left region structurally useful");
assert(source.includes("this.workspace.left.replaceChildren()") && source.includes("this.workspace.timeline.replaceChildren()"), "rerenders replace region contents without duplicating timeline nodes or the shell");
assert(!source.includes(".cm-pixel-bgr-lab{position:fixed"), "DEV Lab no longer uses root-level floating-window geometry");
assert(source.includes('this.setDisplayMode("dev")'), "opening the Lab activates DEV presentation");
assert(source.includes('mode === "dev" ? "" : "none"'), "GAME presentation hides the existing authoring UI");
assert(source.includes("this.workspace.root.remove()"), "dispose removes the owned workspace DOM");

const layoutSource = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");
assert(layoutSource.includes("main.append(left, viewport, right)"), "center viewport remains a distinct region between the sidebars");
assert(layoutSource.includes("pointer-events: none"), "transparent authoring viewport preserves interaction with the existing game canvas");
assert(layoutSource.includes('.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-timeline'), "GAME mode hides the authoring timeline with the side regions");

console.log("Pixel BGR dev workspace P1.2 composition wiring smoke passed");
