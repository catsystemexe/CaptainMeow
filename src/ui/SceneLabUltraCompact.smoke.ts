import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PIXEL_BGR_LEFT_TOOLS } from "./PixelBgrLabUI";

const lab = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("./PixelBgrDevWorkspaceLayout.ts", import.meta.url), "utf8");

assert.deepEqual([...PIXEL_BGR_LEFT_TOOLS], ["scene", "placement", "markers"], "only the requested tools remain in the left navigation");
for (const action of ["Load current scene", "Export scene", "Import scene", "Duplicate scene", "Reset or delete scene", "Close Scene Lab"])
  assert(lab.includes(`this.iconButton("${action}"`), `${action} retains a handler-backed icon`);
for (const removed of ["SCENE / ASSETS / ENVIRONMENT", "Player X:", "UI opacity", "V2 ·", "PASS —"])
  assert(!lab.includes(removed), `${removed} is absent from permanent Scene Lab UI`);
assert(!lab.includes("cm-scene-opacity-row") && !lab.includes("--cm-scene-lab-opacity"), "the opacity row and its state hook are absent");
assert(!lab.includes('this.row("segments",document.createTextNode(String(track.segments.length)))'), "track segment counts are not rendered");
assert(!lab.includes('this.row("objects",document.createTextNode(String(track.objects.length)))'), "track object counts are not rendered");
assert.match(layout, /grid-template-columns: clamp\(150px, 15vw, 170px\)/, "left dock supports the 150–170px target");
assert.match(layout, /\.cm-bgr-workspace-left \{[\s\S]*?overflow-y: auto;/, "only the outer left dock owns vertical scrolling");
assert.match(lab, /\.cm-pixel-bgr-lab\{[^}]*overflow:visible/, "Scene Lab does not own an inner scrollbar");
assert(lab.includes('this.setDisplayMode(this.displayMode === "dev" ? "game" : "dev")') && lab.includes("setPixelBgrWorkspaceDisplayMode(this.workspace.root, mode)"), "GAME/DEV keeps the existing display-mode owner");

console.log("SceneLabUltraCompact.smoke: PASS");
