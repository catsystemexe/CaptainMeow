import assert from "node:assert/strict";
import { mountEnemyLabRuntime } from "./EnemyLabBootstrap";
import { DEV_SUMMONER_PANEL_ID, FSM_PRESET_EDITOR_ID } from "./DevSummoner";

class FakeStyle {
  cssText = "";
  [key: string]: unknown;
  setProperty(key: string, value: string) { this[key] = value; this.cssText += `${key}:${value};`; }
}

class FakeElement {
  id = "";
  textContent = "";
  value = "";
  type = "";
  min = "";
  max = "";
  step = "";
  rows = 0;
  readOnly = false;
  disabled = false;
  tabIndex = 0;
  style = new FakeStyle();
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<() => void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(child: T): T { child.parentNode = this; this.children.push(child); return child; }
  replaceChildren(...children: FakeElement[]) { for (const child of this.children) child.parentNode = null; this.children = []; for (const child of children) this.appendChild(child); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(name: string, fn: () => void) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]); }
  removeEventListener() {}
  get isConnected(): boolean { let node: FakeElement | null = this; while (node) { if (node.tagName === "BODY") return true; node = node.parentNode; } return false; }
  getBoundingClientRect() { return { left: 580, top: 8, right: 800, bottom: 592, width: 220, height: 584, x: 580, y: 8, toJSON: () => ({}) }; }
  querySelector(selector: string): FakeElement | null { if (selector.startsWith("#")) return this.findById(selector.slice(1)); return null; }
  querySelectorAll(selector: string): FakeElement[] { if (selector === "button,input,select") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT"].includes(el.tagName)); return []; }
  findById(id: string): FakeElement | null { if (this.id === id) return this; for (const child of this.children) { const found = child.findById(id); if (found) return found; } return null; }
  findAll(predicate: (el: FakeElement) => boolean): FakeElement[] { return [...(predicate(this) ? [this] : []), ...this.children.flatMap((child) => child.findAll(predicate))]; }
}

const body = new FakeElement("BODY");
const documentStub = {
  body,
  createElement: (tag: string) => new FakeElement(tag.toUpperCase()),
  getElementById: (id: string) => body.findById(id),
  addEventListener: () => {},
  removeEventListener: () => {},
};
const intervals: Array<() => void> = [];
(globalThis as any).document = documentStub;
(globalThis as any).window = { setInterval: (fn: () => void) => { intervals.push(fn); return intervals.length; }, clearInterval: () => {}, confirm: () => true, __CM: { store: { debugForEachAlive: () => {} } } };

const game = { bus: { emitNext: () => {} }, world: { scrollX: 0, scrollY: 0 } } as any;
const result = mountEnemyLabRuntime(game, 896, 504);
assert.equal(result.error, null, "Enemy Lab runtime bootstrap must not throw");
assert.equal(result.constructed, true, "runtime bootstrap constructs DevSummoner");
assert.equal(result.mounted, true, "runtime bootstrap invokes mount/init and observes connected panels");
assert.equal(body.findAll((el) => el.id === DEV_SUMMONER_PANEL_ID).length, 1, "Enemy Lab mounts once");

const panel = documentStub.getElementById(DEV_SUMMONER_PANEL_ID)!;
const presetPanel = documentStub.getElementById(FSM_PRESET_EDITOR_ID)!;
assert(panel.isConnected, "root Enemy Lab panel is connected to document.body");
assert(presetPanel.isConnected, "preset-management container is connected to the mounted root");
assert(panel.style.cssText.includes("display:flex"), "root is not display:none");
assert(!panel.style.cssText.includes("display:none"), "root display contract remains visible");
assert(!panel.style.cssText.includes("visibility:hidden"), "root visibility contract remains visible");
assert(panel.style.cssText.includes("width:220px"), "root has explicit non-zero width");
assert(panel.style.cssText.includes("max-height:calc(100vh - 16px)"), "root has viewport-bounded height contract");
const rect = panel.getBoundingClientRect();
assert(rect.width > 0 && rect.height > 0, "root geometry is non-zero");
assert(rect.right > 0 && rect.bottom > 0 && rect.left < 800 && rect.top < 600, "root geometry intersects viewport");
assert(panel.textContent.includes("Enemy Lab") || panel.findAll((el) => el.textContent.includes("Enemy Lab")).length > 0, "visible Enemy Lab entry/title exists");
assert(presetPanel.findAll((el) => el.textContent.includes("FSM Presets")).length > 0, "FSM Presets section exists");
assert.equal(intervals.length, 1, "refresh timer is installed once");

const reused = mountEnemyLabRuntime(game, 896, 504);
assert.equal(reused.reused, true, "second runtime bootstrap reuses the existing panel instead of duplicating it");
assert.equal(body.findAll((el) => el.id === DEV_SUMMONER_PANEL_ID).length, 1, "runtime bootstrap remains single-mount after repeated calls");
assert.equal(body.findAll((el) => /draggable|transition-line|state author/i.test(el.textContent)).length, 0, "S10 authoring controls are absent");

console.log("EnemyLabRuntimeMount smoke passed");
