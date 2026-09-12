import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEV_LAB_MODES, createUnifiedDevLabHost, type DevLabMode } from "./UnifiedDevLabHost";

class FakeElement {
  className = ""; textContent = ""; type = ""; hidden = false; dataset: Record<string,string> = {};
  children: FakeElement[] = []; attributes = new Map<string,string>(); listeners = new Map<string,()=>void>();
  append(...children: FakeElement[]) { this.children.push(...children); }
  appendChild(child: FakeElement) { this.children.push(child); return child; }
  setAttribute(key:string,value:string) { this.attributes.set(key,value); }
  addEventListener(key:string,fn:()=>void) { this.listeners.set(key,fn); }
}
const documentStub = { createElement: () => new FakeElement() } as unknown as Document;
const scene = new FakeElement(); const hud = new FakeElement(); const enemy = new FakeElement();
let selected: DevLabMode | null = null;
let host: ReturnType<typeof createUnifiedDevLabHost>;
host = createUnifiedDevLabHost(scene as unknown as HTMLElement, hud as unknown as HTMLElement, documentStub, mode => { selected = mode; host.setActive(mode); });
assert.deepEqual(DEV_LAB_MODES, ["scene", "enemy", "hud"], "the canonical mode set is exact");
assert.equal(host.getActive(), "scene", "Scene is the default Lab");
assert.deepEqual(DEV_LAB_MODES.map(mode => host.bodies[mode].hidden), [false, true, true]);
host.mount("enemy", enemy as unknown as HTMLElement);
assert.equal((host.bodies.enemy as unknown as FakeElement).children[0], enemy, "the lifecycle-owned Enemy panel mounts once in the left host");
host.setActive("enemy");
assert.deepEqual(DEV_LAB_MODES.map(mode => host.bodies[mode].hidden), [true, false, true]);
host.setActive("hud");
assert.deepEqual(DEV_LAB_MODES.map(mode => host.bodies[mode].hidden), [true, true, false]);
host.setActive("scene");
assert.equal((host.bodies.scene as unknown as FakeElement).children[0], scene, "Scene body identity survives a round trip");
const selector = (host.root as unknown as FakeElement).children[0];
selector.children[1].listeners.get("click")?.();
assert.equal(selected, "enemy", "the selector delegates mode ownership to the workspace controller");
const workspaceSource = readFileSync(new URL("../ui/PixelBgrLabUI.ts", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
assert(workspaceSource.includes('this.workspace.root.dataset.timelineMode = sceneActive && getBackgroundSceneV2(globalThis) ? "v2" : "disabled"'), "timeline visibility is Scene-only");
assert(workspaceSource.includes("toggle(): void { this.visible ? this.close() : this.open(); }") && !workspaceSource.includes('setActiveDevLab("scene")'), "workspace visibility toggles without resetting the active Lab");
assert(workspaceSource.includes("private displayMode: PixelBgrDisplayMode") && workspaceSource.includes("getActiveDevLab(): DevLabMode"), "GAME/DEV presentation and active Lab are independent state axes");
assert(mainSource.includes('e.code === "F8"') && mainSource.includes("togglePixelBgrLab(ui)"), "F8 continues to toggle workspace visibility");
assert(mainSource.includes('e.target.closest(".cm-dev-lab-host")'), "the shared Lab boundary guards game pointer input");
console.log("Unified DEV Lab host smoke passed");
