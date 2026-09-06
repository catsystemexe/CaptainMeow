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
const cssRule = (selector: string): string => {
  const declarations: string[] = [];
  for (const match of layoutSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const candidates = match[1].split(",").map(candidate => candidate.trim());
    if (candidates.some(candidate => candidate === selector || candidate.endsWith(selector))) declarations.push(match[2]);
  }
  return declarations.join("\n");
};

const shellRule = cssRule(".cm-bgr-workspace-shell");
assert.doesNotMatch(shellRule, /minmax\(220px,\s*30vh\)/, "the shell does not reserve the rigid timeline minimum");
assert.match(shellRule, /grid-template-rows:[^;]*minmax\(0,\s*min\([^;]*vh[^;]*px\)\)/, "the timeline row is viewport-responsive, capped, and allowed to shrink");
assert.match(shellRule, /min-height:\s*0/);
assert.match(shellRule, /overflow:\s*hidden/, "the fixed shell contains its grid tracks within the viewport");

const mainRule = cssRule(".cm-bgr-workspace-main");
assert.match(mainRule, /min-height:\s*0/);
assert.match(mainRule, /overflow:\s*hidden/, "main-region children cannot enlarge the assigned row");

const rightRule = cssRule(".cm-bgr-workspace-right");
assert.match(rightRule, /min-height:\s*0/);
assert.match(rightRule, /overflow:\s*auto/, "the right inspector owns its overflow");
const timelineRule = cssRule(".cm-bgr-workspace-timeline");
assert.match(timelineRule, /min-height:\s*0/);
assert.match(timelineRule, /overflow:\s*auto/, "the timeline owns overflow within its assigned row");

assert(layoutSource.includes('viewport: "cm-bgr-workspace-viewport"'), "the transparent center keeps its stable viewport class");
assert(layoutSource.includes('timeline: "cm-bgr-workspace-timeline"'), "the bottom region keeps its stable timeline class");
assert(layoutSource.includes("main.append(left, viewport, right)"), "center viewport remains a distinct region between the sidebars");
assert(layoutSource.includes("pointer-events: none"), "transparent authoring viewport preserves interaction with the existing game canvas");
assert(layoutSource.includes('.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-timeline'), "GAME mode hides the authoring timeline with the side regions");

console.log("Pixel BGR dev workspace P1.2 composition wiring smoke passed");
