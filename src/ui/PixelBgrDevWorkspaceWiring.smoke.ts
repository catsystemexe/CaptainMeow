import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");

assert(source.includes("createPixelBgrDevWorkspaceShell()"), "Lab creates the workspace shell once during construction");
assert(source.includes("this.workspace.right.appendChild(this.root)"), "existing Lab UI remains the transitional authoring owner");
assert(source.includes('this.setDisplayMode("dev")'), "opening the Lab activates DEV presentation");
assert(source.includes('mode === "dev" ? "" : "none"'), "GAME presentation hides the existing authoring UI");
assert(source.includes("this.workspace.root.remove()"), "dispose removes the owned workspace DOM");

console.log("Pixel BGR dev workspace P1.1 wiring smoke passed");
