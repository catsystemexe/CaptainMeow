import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

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
  listeners = new Map<string, Array<(ev?: any) => void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(child: T): T {
    if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((existing) => existing !== child);
    child.parentNode = this;
    this.children.push(child);
    if (this.tagName === "SELECT" && !this.value && child.tagName === "OPTION") this.value = child.value;
    return child;
  }
  replaceChildren(...children: FakeElement[]) { for (const child of this.children) child.parentNode = null; this.children = []; for (const child of children) this.appendChild(child); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener(name: string, fn: (ev?: any) => void) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.get("click") ?? []) fn({ target: this, preventDefault: () => {}, key: "" }); }
  dispatchEvent(ev: { type: string }) { for (const fn of this.listeners.get(ev.type) ?? []) fn(ev); return true; }
  contains(node: FakeElement | null): boolean { for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true; return false; }
  querySelector(selector: string): FakeElement | null { if (selector.startsWith("#")) return this.findById(selector.slice(1)); return null; }
  querySelectorAll(selector: string): FakeElement[] {
    if (selector === "button,input,select,textarea") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
    if (selector === "button,input,select") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT"].includes(el.tagName));
    return [];
  }
  findById(id: string): FakeElement | null { if (this.id === id) return this; for (const child of this.children) { const found = child.findById(id); if (found) return found; } return null; }
  findAll(predicate: (el: FakeElement) => boolean): FakeElement[] { return [...(predicate(this) ? [this] : []), ...this.children.flatMap((child) => child.findAll(predicate))]; }
}

type Emitted = { type: keyof CMEventMap; payload: any };

function installDom() {
  const body = new FakeElement("BODY");
  const documentStub = {
    body,
    createElement: (tag: string) => new FakeElement(tag.toUpperCase()),
    getElementById: (id: string) => body.findById(id),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).document = documentStub;
  (globalThis as any).window = { setInterval: () => 1, clearInterval: () => {}, confirm: () => true, __CM: { store: { debugForEachAlive: () => {} }, game: { loop: { tick: 0 }, spawn: { spawnPreviewEnemy: () => null } } } };
  return { documentStub };
}

function clickButtonByText(root: FakeElement, text: string) {
  const button = root.findAll((el) => el.tagName === "BUTTON" && el.textContent === text)[0];
  assert(button, `button ${text} exists`);
  button.click();
  return button;
}

function chooseCompact(root: FakeElement, id: string, valueText: string) {
  const selectRoot = root.findById(id);
  assert(selectRoot, `${id} compact select exists`);
  const button = selectRoot.findAll((el) => el.tagName === "BUTTON")[0];
  assert(button, `${id} button exists`);
  button.click();
  const option = selectRoot.findAll((el) => el.tagName === "BUTTON" && el.textContent.includes(valueText))[0];
  assert(option, `${id} option ${valueText} exists`);
  option.click();
}

function visibleLabIds(panel: FakeElement) {
  return ["ds-simple-lab-section", "ds-smart-lab-section", "ds-fsm-lab-section"].filter((id) => panel.findById(id)?.style.display !== "none");
}

function assertOnlyVisible(panel: FakeElement, id: string) {
  assert.deepEqual(visibleLabIds(panel), [id], `only ${id} is visible`);
  for (const hiddenId of ["ds-simple-lab-section", "ds-smart-lab-section", "ds-fsm-lab-section"].filter((x) => x !== id)) {
    const hidden = panel.findById(hiddenId)!;
    assert.equal(hidden.style.display, "none", `${hiddenId} uses display:none`);
  }
}

function mount() {
  const { documentStub } = installDom();
  const emitted: Emitted[] = [];
  const summoner = new DevSummoner({ emitNext: (type: keyof CMEventMap, payload: any) => emitted.push({ type, payload }) } as any, createWorldState(), 896, 504);
  summoner.init();
  const panel = documentStub.getElementById(DEV_SUMMONER_PANEL_ID)! as FakeElement;
  assert(panel, "DevSummoner panel mounted");
  return { panel, emitted };
}

const { panel, emitted } = mount();
assert(clickButtonByText(panel, "SIMPLE"), "SIMPLE button exists");
assert(clickButtonByText(panel, "SMART"), "SMART button exists");
assert(clickButtonByText(panel, "FSM"), "FSM button exists");
clickButtonByText(panel, "SIMPLE");
assert.equal(panel.findAll((el) => el.tagName === "BUTTON" && el.textContent === "SIMPLE")[0].getAttribute("aria-pressed"), "true", "Simple is default/active after selecting it");
assertOnlyVisible(panel, "ds-simple-lab-section");
assert(panel.findById("ds-simple-lab-section")!.children.includes(panel.findById("ds-shared-spawn-section")!), "shared spawn block is owned by Simple Lab");
chooseCompact(panel, "ds-movement-primitive", "sine");
chooseCompact(panel, "ds-movement-preset", "sine.soft");
clickButtonByText(panel, "SMART");
assertOnlyVisible(panel, "ds-smart-lab-section");
assert(panel.findById("ds-smart-lab-section")!.children.includes(panel.findById("ds-shared-spawn-section")!), "shared spawn block is owned by Smart Lab");
chooseCompact(panel, "ds-movement-primitive", "Track");
chooseCompact(panel, "ds-movement-preset", "smart.track.soft");
clickButtonByText(panel, "FSM");
assertOnlyVisible(panel, "ds-fsm-lab-section");
assert.equal(panel.findById("ds-fsm-lab-section")!.findAll((el) => el.textContent === "FSM LAB").length, 0, "FSM mode has no redundant FSM LAB heading");
assert.equal(panel.findById("ds-fsm-lab-section")!.children[0].id, "ds-fsm-preset-section", "PRESETS is the first FSM section");
assert.equal(panel.findById("ds-fsm-lab-section")!.children[1].id, "ds-fsm-basic-setup", "BASIC SETUP is the second FSM section");
assert.equal(panel.findById("ds-fsm-lab-section")!.children[2].id, "ds-fsm-preset-editor", "FSM LAB follows Basic Setup in FSM mode");
assert(panel.findById("ds-fsm-preset-section"), "PRESETS section remains present in FSM mode");
assert(panel.findById("ds-fsm-basic-setup"), "FSM Basic Setup section is present in FSM mode");
assert.equal(panel.findById("ds-fsm-runtime-diagnostics"), null, "Runtime Diagnostics panel is hidden from normal FSM mode");
assert.equal(panel.findAll((el) => el.textContent === "FSM Presets").length, 0, "legacy FSM Presets panel is hidden from normal FSM mode");
assert(panel.findById("ds-fsm-preset"), "FSM selector is present in FSM mode");
assert.equal(panel.findById("ds-fsm-preview-section"), null, "legacy Preview controls are not mounted in FSM mode");
assert.equal(panel.findById("ds-fsm-basic-setup")!.findAll((el) => el.textContent === "Count").length, 1, "FSM mode derives Single/Group from Count");
chooseCompact(panel, "ds-fsm-preset", "fsm.hover");
clickButtonByText(panel, "SMART");
assertOnlyVisible(panel, "ds-smart-lab-section");
assert.equal(panel.findById("ds-movement-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent, "smart.track.soft", "Smart movement value is preserved after returning");
clickButtonByText(panel, "SIMPLE");
assert.equal(panel.findById("ds-movement-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent, "sine.soft", "Simple movement value is preserved after returning");
clickButtonByText(panel, "RELEASE");
assert.equal(emitted.at(-1)?.type, EventType.SPAWN_ENEMY, "Simple spawn emits an enemy spawn");
assert.equal(emitted.at(-1)?.payload.behaviorPresetId, "sine.soft", "Simple spawn emits behaviorPresetId");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, undefined, "Simple spawn does not emit fsmPresetId");
clickButtonByText(panel, "SMART");
clickButtonByText(panel, "RELEASE");
assert.equal(emitted.at(-1)?.payload.behaviorPresetId, "smart.track.soft", "Smart spawn emits behaviorPresetId");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, undefined, "Smart spawn does not emit fsmPresetId");
clickButtonByText(panel, "FSM");
const fsmCountButtons = panel.findById("ds-group-count")!.findAll((el) => el.tagName === "BUTTON");
while (panel.findById("ds-group-count")!.getAttribute("aria-valuenow") !== "1") fsmCountButtons[0].click();
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, "fsm.hover", "FSM Single spawn emits fsmPresetId");
assert.equal(emitted.at(-1)?.payload.behaviorPresetId, undefined, "FSM ID does not leak into behaviorPresetId");
const countButtons = panel.findById("ds-group-count")!.findAll((el) => el.tagName === "BUTTON");
while (panel.findById("ds-group-count")!.getAttribute("aria-valuenow") !== "2") countButtons[1].click();
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.at(-1)?.type, EventType.SPAWN_ENEMY_GROUP, "FSM Count > 1 emits group event");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, "fsm.hover", "FSM Group spawn emits fsmPresetId");
assert.equal(emitted.at(-1)?.payload.behaviorPresetId, undefined, "FSM Group does not leak FSM ID into behaviorPresetId");
const beforeRepeatedSwitches = emitted.length;
for (let i = 0; i < 5; i += 1) { clickButtonByText(panel, "SIMPLE"); clickButtonByText(panel, "SMART"); clickButtonByText(panel, "FSM"); }
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.length, beforeRepeatedSwitches + 1, "Repeated mode switches do not add duplicate spawn listeners");
const userModel = new FsmPresetEditorModel(CONTENT.userFsmPresets);
userModel.create();
const userId = userModel.selectedId;
clickButtonByText(panel, "FSM");
chooseCompact(panel, "ds-fsm-preset", userId);
assert.equal(panel.findById("ds-fsm-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent.includes(userId), true, "User FSM selector options remain live");
CONTENT.userFsmPresets.delete(userId);
assert.equal(panel.findAll((el) => el.textContent === "Count").length, 1, "FSM Basic Setup exposes Count-based conversion");
assert.equal(panel.findById("ds-simple-lab-section")!.style.cssText.includes("grid-template-columns"), false, "Simple Lab is not a horizontal grid layout");
assert.equal(panel.findById("ds-smart-lab-section")!.style.cssText.includes("grid-template-columns"), false, "Smart Lab is not a horizontal grid layout");
assert.equal(panel.findById("ds-fsm-lab-section")!.style.cssText.includes("grid-template-columns"), false, "FSM Lab is not a horizontal grid layout");
console.log("DevSummonerModeSplit smoke passed");
