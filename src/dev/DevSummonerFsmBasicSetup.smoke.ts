import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { DevSummoner, DEV_SUMMONER_PANEL_ID, mapElasticityToGroupSettings, mapUiSpawnYToRuntimeY } from "./DevSummoner";
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
  click() { for (const fn of this.listeners.get("click") ?? []) fn({ target: this, preventDefault: () => {}, stopPropagation: () => {}, key: "" }); }
  dispatchEvent(ev: { type: string }) { for (const fn of this.listeners.get(ev.type) ?? []) fn(ev); return true; }
  contains(node: FakeElement | null): boolean { for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true; return false; }
  getBoundingClientRect() { return { left: 100, right: 300, top: 40, width: 200, height: 26 }; }
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
  const option = ((globalThis as any).document.body as FakeElement).findAll((el) => el.tagName === "BUTTON" && el.textContent.includes(valueText))[0];
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
clickButtonByText(panel, "FSM");
const fsm = panel.findById("ds-fsm-lab-section")!;
const presets = panel.findById("ds-fsm-preset-section")!;
const basic = panel.findById("ds-fsm-basic-setup")!;
assert.equal(fsm.findAll((el) => el.textContent === "FSM LAB").length, 0, "FSM LAB heading is not visible in FSM mode");
assert(panel.findById("ds-fsm-lab-section"), "FSM wrapper remains present");
assert(fsm.children.indexOf(presets) < fsm.children.indexOf(basic), "PRESETS appears before BASIC SETUP");
assert(fsm.children.indexOf(basic) < fsm.children.indexOf(panel.findById("ds-fsm-preset-editor")!), "existing FSM editor remains below BASIC SETUP");
assert.equal(presets.findAll((el) => el.textContent === "Preset").length, 0, "PRESETS has no visible redundant Preset row label");
assert(panel.findById("ds-fsm-preset"), "preset dropdown remains present");
const toolbar = panel.findById("ds-fsm-preset-toolbar")!;
const iconButtons = toolbar.children.filter((el) => el.tagName === "BUTTON");
assert.equal(iconButtons.length, 7, "top preset toolbar has seven icon actions including user rename/delete");
for (const icon of ["+", "✎", "⧉", "⇧", "↻", "✓", "🗑"]) assert(iconButtons.some((button) => button.textContent === icon), `toolbar contains ${icon} icon action`);
for (const button of iconButtons) {
  assert(["+", "✎", "⧉", "⇧", "↻", "✓", "🗑"].includes(button.textContent), "icon action is icon-only");
  assert(button.getAttribute("aria-label") || button.getAttribute("title"), "icon action has accessible label");
}
assert.equal(panel.findById("ds-fsm-preview-section"), null, "legacy Preview controls are not mounted in FSM mode");
const count = panel.findById("ds-group-count")!;
const countButtons = count.findAll((el) => el.tagName === "BUTTON");
while (count.getAttribute("aria-valuenow") !== "1") countButtons[0].click();
assert.equal(count.getAttribute("aria-valuemin"), "1", "Count minimum is 1 in FSM mode");
assert.equal(panel.findById("ds-fsm-formation-row")!.style.display, "none", "group-only formation is hidden at Count = 1");
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.at(-1)?.type, EventType.SPAWN_ENEMY, "Count = 1 emits single spawn");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, "fsm.turret", "built-in FSM emits fsmPresetId");
assert.equal(emitted.at(-1)?.payload.behaviorPresetId, undefined, "FSM ID does not appear in behaviorPresetId");
const typeBefore = (panel.findById("ds-enemy") as any).value;
const presetBefore = panel.findById("ds-fsm-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent;
countButtons[1].click();
assert.equal(count.getAttribute("aria-valuenow"), "2", "Count increments to group mode");
assert.notEqual(panel.findById("ds-fsm-formation-row")!.style.display, "none", "group-only controls show at Count > 1");
assert.equal((panel.findById("ds-enemy") as any).value, typeBefore, "Count changes preserve Type");
assert.equal(panel.findById("ds-fsm-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent, presetBefore, "Count changes preserve selected preset");
const formationButtons = panel.findById("ds-fsm-formation-icons")!.findAll((el) => el.tagName === "BUTTON");
assert.equal(formationButtons.length, 5, "formation controls match runtime formation IDs");
assert.equal(formationButtons.some((b) => ["LINE", "ARC", "CIRCLE"].includes(b.textContent)), false, "formation controls have no visible text captions");
formationButtons[3].click();
assert.equal(formationButtons[3].getAttribute("aria-pressed"), "true", "formation icon active state updates");
const spacing = panel.findById("ds-fsm-spacing")!;
assert.equal(spacing.type, "range", "Spacing is a range input");
assert.equal(spacing.min, "16", "Spacing min preserved");
assert.equal(spacing.max, "96", "Spacing max preserved");
assert.equal(spacing.step, "2", "Spacing step aligns with default");
assert.equal(spacing.value, "18", "Spacing default preserved without browser sanitization");
clickButtonByText(panel, "SPAWN");
const defaultGroup = emitted.at(-1)!;
assert.equal(defaultGroup.type, EventType.SPAWN_ENEMY_GROUP, "default Count > 1 check emits group spawn");
assert.equal(defaultGroup.payload.params.formation.spacing, 18, "default group payload emits spacing 18");
spacing.value = "20"; spacing.dispatchEvent({ type: "input" });
assert.equal(spacing.value, "20", "Spacing slider accepts aligned value 20");
const elasticity = panel.findById("ds-fsm-elasticity")!;
assert.equal(elasticity.type, "range", "Elasticity is a range input");
assert.deepEqual(mapElasticityToGroupSettings(0), { cohesionId: "rigid", response: 7, maxCatchupSpeed: 480 }, "Elasticity 0 maps to rigid defaults");
const e1 = mapElasticityToGroupSettings(1); const e9 = mapElasticityToGroupSettings(9);
assert.equal(e1.cohesionId, "elastic", "Elasticity > 0 maps to elastic");
assert(e1.response >= e9.response && e1.maxCatchupSpeed >= e9.maxCatchupSpeed, "Elasticity mapping is monotonic and deterministic");
elasticity.value = "5"; elasticity.dispatchEvent({ type: "input" });
const y = panel.findById("ds-screen-y")!;
assert.equal(y.type, "range", "Y remains a range input");
y.value = "123"; y.dispatchEvent({ type: "input" });
clickButtonByText(panel, "SPAWN");
const group = emitted.at(-1)!;
assert.equal(group.type, EventType.SPAWN_ENEMY_GROUP, "Count > 1 emits group spawn only");
assert.equal(group.payload.fsmPresetId, "fsm.turret", "group spawn emits fsmPresetId");
assert.equal(group.payload.behaviorPresetId, undefined, "group spawn has no behaviorPresetId FSM leak");
assert.equal(group.payload.formationId, "arc.forward", "group payload contains selected formation");
assert.equal(group.payload.params.formation.spacing, 20, "group payload contains changed spacing 20");
spacing.value = "18"; spacing.dispatchEvent({ type: "input" });
clickButtonByText(panel, "SPAWN");
const resetGroup = emitted.at(-1)!;
assert.equal(spacing.value, "18", "Spacing slider returns to default without sanitization");
assert.equal(resetGroup.payload.params.formation.spacing, 18, "group payload contains restored spacing 18");
assert.equal(group.payload.cohesionId, "elastic", "group payload contains mapped cohesion mode");
assert.equal(group.payload.params.cohesion.response, mapElasticityToGroupSettings(5).response, "group payload contains mapped response");
assert.equal(group.payload.anchor.y, mapUiSpawnYToRuntimeY(123, 504), "Y UI value is inverted before reaching group runtime payload");
while (count.getAttribute("aria-valuenow") !== "1") countButtons[0].click();
y.value = "404"; y.dispatchEvent({ type: "input" });
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.at(-1)?.type, EventType.SPAWN_ENEMY, "Count = 1 still emits single spawn after Y changes");
assert.equal(emitted.at(-1)?.payload.spawn.y, mapUiSpawnYToRuntimeY(404, 504), "Y UI value is inverted before reaching single runtime payload");
countButtons[1].click();
const beforeSwitches = emitted.length;
for (let i = 0; i < 4; i++) { clickButtonByText(panel, "SIMPLE"); clickButtonByText(panel, "SMART"); clickButtonByText(panel, "FSM"); }
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.length, beforeSwitches + 1, "No duplicate listeners after mode switches");
const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
model.create();
const userId = model.selectedId;
clickButtonByText(panel, "FSM");
chooseCompact(panel, "ds-fsm-preset", userId);
clickButtonByText(panel, "SPAWN");
assert.equal(emitted.at(-1)?.payload.fsmPresetId, userId, "user FSM works through Basic Setup spawn");
CONTENT.userFsmPresets.delete(userId);
assert.equal(panel.findById("ds-simple-lab-section")!.style.display, "none", "Simple is unchanged/hidden while FSM active");
console.log("DevSummonerFsmBasicSetup smoke passed");
