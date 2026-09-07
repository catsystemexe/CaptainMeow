import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");

assert.equal(source.match(/createPixelBgrDevWorkspaceShell\(\)/g)?.length, 1, "Lab creates one stable workspace shell during construction");
assert(source.includes("this.workspace.left.appendChild(this.root)"), "existing Lab UI remains the transitional authoring owner in the left dock");
assert(source.includes("this.workspace.timeline.appendChild(this.renderV2Timeline(projection))"), "V2 timeline is mounted in the center-owned timeline region");
assert.match(source, /this\.root\.append\([^;]*this\.renderV2Environment\(v2Scene\)/, "the environment surface remains within the BGR Lab composition");
assert(source.includes("while (this.root.childNodes.length > 1)") && source.includes("this.workspace.timeline.replaceChildren()"), "rerenders replace owned BGR and timeline contents without duplicating nodes or the shell");
assert(!source.includes(".cm-pixel-bgr-lab{position:fixed"), "DEV Lab no longer uses root-level floating-window geometry");
assert(source.includes('this.setDisplayMode("dev")'), "opening the Lab activates DEV presentation");
assert(source.includes('this.visible = mode === "dev"'), "one display mode owns GAME/DEV presentation visibility");
assert(source.includes("this.workspace.right.appendChild(panel)"), "the existing Enemy Lab panel is reparented into the right dock");
assert(source.includes("this.enemyLabOriginalStyle") && source.includes("document.body.appendChild(this.enemyLabPanel)"), "workspace disposal restores the existing Enemy Lab lifecycle owner");
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
assert.match(shellRule, /grid-template-rows:\s*minmax\(0,\s*1fr\)/, "the shell gives the three-column workspace the full height");
assert.match(shellRule, /min-height:\s*0/);
assert.match(shellRule, /overflow:\s*hidden/, "the fixed shell contains its grid tracks within the viewport");

const mainRule = cssRule(".cm-bgr-workspace-main");
assert.match(mainRule, /min-height:\s*0/);
assert.match(mainRule, /overflow:\s*hidden/, "main-region children cannot enlarge the assigned row");
assert.match(mainRule, /grid-template-columns:\s*clamp\(150px,\s*15vw,\s*170px\)\s*minmax\(0,\s*1fr\)\s*clamp\(170px,\s*18vw,\s*190px\)/, "the root workspace retains its compact three-column contract");

const centerRule = cssRule(".cm-bgr-workspace-center");
assert.match(centerRule, /display:\s*grid/);
assert.match(centerRule, /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*0/, "the center owns the game and a collapsed non-V2 timeline row");

const rightRule = cssRule(".cm-bgr-workspace-right");
assert.match(rightRule, /min-height:\s*0/);
assert.match(rightRule, /overflow:\s*auto/, "the right inspector owns its overflow");
const timelineRule = cssRule(".cm-bgr-workspace-timeline");
assert.match(timelineRule, /min-height:\s*0/);
assert.match(timelineRule, /display:\s*flex/);
assert.match(timelineRule, /flex-direction:\s*column/, "the timeline region gives its panel a persistent assigned surface");
assert.match(timelineRule, /overflow-x:\s*hidden/);
assert.match(timelineRule, /overflow-y:\s*hidden/, "the compact timeline region never introduces vertical scrolling");

assert(layoutSource.includes('viewport: "cm-bgr-workspace-viewport"'), "the transparent center keeps its stable viewport class");
assert(layoutSource.includes('timeline: "cm-bgr-workspace-timeline"'), "the bottom region keeps its stable timeline class");
assert(!source.includes("Timeline unavailable for this scene format"), "non-V2 scenes do not render a disabled workspace band");
assert(source.includes('this.workspace.root.dataset.timelineMode = v2Scene ? "v2" : "disabled"'), "scene format explicitly owns timeline occupancy");
assert(layoutSource.includes("center.append(viewport, timeline)") && layoutSource.includes("main.append(left, center, right)"), "center owns the game viewport and timeline between full-height sidebars");
assert(layoutSource.includes("pointer-events: none"), "transparent authoring viewport preserves interaction with the existing game canvas");
assert(layoutSource.includes('.cm-bgr-workspace-shell.is-game .cm-bgr-workspace-timeline'), "GAME mode hides the center-owned authoring timeline with the side regions");
assert(layoutSource.includes('modeToggle: "cm-bgr-workspace-mode-toggle"'), "the shell exposes one compact mode control region");
assert(!layoutSource.includes("cm-bgr-workspace-topbar"), "the legacy full-workspace top bar is absent");
assert(!layoutSource.includes(".cm-bgr-workspace-left,\n  .cm-bgr-workspace-right {\n    display: none"), "responsive layout does not silently hide both labs around 1000px");

console.log("Pixel BGR dev workspace P1.2 composition wiring smoke passed");
