import assert from "node:assert/strict";
import { HUD_FX_EFFECTS, HUD_FX_EVENTS, HUD_FX_LAB_STORAGE_KEY, HUD_FX_SLOT_IDS, HUD_FX_SLOTS_STORAGE_KEY, createDefaultHudFxLabState, loadHudFxLabState, loadHudFxSlot, loadHudFxSlots, normalizeHudFxLabState, saveHudFxLabState, saveHudFxSlot, selectHudFxEvent, toggleHudFx, updateHudFxIntensity } from "./HudFxLabState";
import { createHudFxLabUI, getHudFxTestRequest, getHudFxTestRequests } from "./HudFxLabUI";
import { setHudFxPreviewHandler } from "./HudFxPreviewBridge";

const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
const defaults = createDefaultHudFxLabState();
assert.equal(HUD_FX_LAB_STORAGE_KEY, "captainMeow.dev.hudFxLab.v1");
assert.deepEqual(HUD_FX_SLOT_IDS, ["HUD1", "HUD2", "HUD3", "HUD4", "HUD5"]);
assert(HUD_FX_EVENTS.every((event) => HUD_FX_EFFECTS.every((fx) => defaults.events[event][fx].enabled === false && defaults.events[event][fx].intensity === 0.5)));
assert.deepEqual(loadHudFxSlots(storage), { HUD1: null, HUD2: null, HUD3: null, HUD4: null, HUD5: null });
values.set(HUD_FX_SLOTS_STORAGE_KEY, "{bad");
assert(HUD_FX_SLOT_IDS.every((id) => loadHudFxSlots(storage)[id] === null));

let active = updateHudFxIntensity(toggleHudFx(selectHudFxEvent(defaults, "hit"), "ghost"), "ghost", 0.73);
saveHudFxLabState(storage, active);
saveHudFxSlot(storage, "HUD1", active);
active = updateHudFxIntensity(active, "ghost", 0.1);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.intensity, 0.73, "slot snapshot is deep-isolated");
saveHudFxSlot(storage, "HUD1", active);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.intensity, 0.1, "save overwrites a fixed slot");
const hud2 = toggleHudFx(selectHudFxEvent(defaults, "wave"), "glitch");
saveHudFxSlot(storage, "HUD2", hud2);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.enabled, true);
assert.equal(loadHudFxSlots(storage).HUD2?.events.wave.glitch.enabled, true, "slots are independent");
const loaded = loadHudFxSlot(selectHudFxEvent(defaults, "bomb"), loadHudFxSlots(storage), "HUD1");
assert.equal(loaded.selectedEvent, "bomb");
assert.equal(loaded.events.hit.ghost.intensity, 0.1);
assert.deepEqual(loadHudFxSlot(active, { ...loadHudFxSlots(storage), HUD3: null }, "HUD3"), normalizeHudFxLabState(active), "empty load is a no-op");
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.enabled, true, "resetting active does not erase slots");

values.set(HUD_FX_SLOTS_STORAGE_KEY, JSON.stringify({ HUD1: { events: { score: { pop: { enabled: "yes", intensity: 9 }, ghost: { enabled: true, intensity: -2 } } } }, HUD2: { broken: true } }));
const normalizedSlots = loadHudFxSlots(storage);
assert.deepEqual(normalizedSlots.HUD1?.events.score.pop, { enabled: false, intensity: 1 });
assert.deepEqual(normalizedSlots.HUD1?.events.score.ghost, { enabled: true, intensity: 0 });
assert.equal(normalizedSlots.HUD2, null, "one malformed slot does not invalidate siblings");

for (const eventId of HUD_FX_EVENTS) {
  let all = selectHudFxEvent(defaults, eventId);
  HUD_FX_EFFECTS.forEach((effectId, index) => {
    let single = selectHudFxEvent(defaults, eventId);
    single = updateHudFxIntensity(toggleHudFx(single, effectId), effectId, index / 5);
    assert.deepEqual(getHudFxTestRequests(single), [{ eventId, effectId, intensity: index / 5 }]);
    all = updateHudFxIntensity(toggleHudFx(all, effectId), effectId, index / 5);
  });
  assert.deepEqual(getHudFxTestRequests(all).map(({ effectId }) => effectId), [...HUD_FX_EFFECTS]);
  assert.deepEqual(getHudFxTestRequests(all).map(({ intensity }) => intensity), [0, 0.2, 0.4, 0.6, 0.8, 1]);
}
values.set(HUD_FX_LAB_STORAGE_KEY, "{bad");
assert.deepEqual(loadHudFxLabState(storage), defaults);

class FakeElement {
  className = "";
  textContent: string | null = null;
  type = "";
  value = "";
  min = "";
  max = "";
  step = "";
  disabled = false;
  title = "";
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<() => void>>();

  constructor(readonly tagName: string) {}
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  append(...children: FakeElement[]) { this.children.push(...children); }
  appendChild(child: FakeElement) { this.children.push(child); return child; }
  replaceChildren(...children: FakeElement[]) { this.children = children; }
  dispatch(type: string) { for (const listener of this.listeners.get(type) ?? []) listener(); }
}

const documentStub = { createElement: (tagName: string) => new FakeElement(tagName) } as unknown as Document;
const descendants = (root: FakeElement): FakeElement[] => [root, ...root.children.flatMap(descendants)];
const buttons = (root: FakeElement, text: string) => descendants(root).filter((node) => node.tagName === "button" && node.textContent === text);
const slotRows = (root: FakeElement) => descendants(root).filter((node) => node.className === "cm-hud-fx-slot");
const fxRows = (root: FakeElement) => descendants(root).filter((node) => node.className === "cm-hud-fx-row");
const testButton = (root: FakeElement) => buttons(root, "TEST")[0];

const uiValues = new Map<string, string>();
const uiStorage = { getItem: (key: string) => uiValues.get(key) ?? null, setItem: (key: string, value: string) => { uiValues.set(key, value); } };
let uiActive = updateHudFxIntensity(toggleHudFx(selectHudFxEvent(defaults, "bomb"), "ghost"), "ghost", 0.73);
saveHudFxLabState(uiStorage, uiActive);
const ui = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
assert(descendants(ui).some((node) => node.textContent === "ACTIVE: LAST"), "ACTIVE/LAST label renders");
assert.deepEqual(slotRows(ui).map((row) => row.children[0].textContent), [...HUD_FX_SLOT_IDS], "exactly HUD1-HUD5 render");
for (const row of slotRows(ui)) {
  assert.deepEqual(row.children.slice(1).map((node) => node.textContent), ["LOAD", "SAVE"]);
  assert.equal(row.children[1].disabled, true, "empty slot LOAD is disabled");
}

slotRows(ui)[0].children[2].dispatch("click");
assert.equal(loadHudFxSlots(uiStorage).HUD1?.events.bomb.ghost.intensity, 0.73, "SAVE HUD1 stores ACTIVE");
assert.equal(slotRows(ui)[0].children[1].disabled, false, "SAVE rerenders with HUD1 LOAD enabled");
buttons(ui, "GHOST")[0].dispatch("click");
slotRows(ui)[0].children[2].dispatch("click");
assert.equal(loadHudFxSlots(uiStorage).HUD1?.events.bomb.ghost.enabled, false, "second SAVE overwrites HUD1");
buttons(ui, "GHOST")[0].dispatch("click");
slotRows(ui)[1].children[2].dispatch("click");
assert.equal(loadHudFxSlots(uiStorage).HUD1?.events.bomb.ghost.enabled, false);
assert.equal(loadHudFxSlots(uiStorage).HUD2?.events.bomb.ghost.enabled, true, "HUD1 and HUD2 remain independent");

let slotState = updateHudFxIntensity(toggleHudFx(selectHudFxEvent(defaults, "score"), "pop"), "pop", 0.21);
saveHudFxSlot(uiStorage, "HUD1", slotState);
uiActive = selectHudFxEvent(defaults, "bomb");
saveHudFxLabState(uiStorage, uiActive);
const loadUi = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
const hud1BeforeLoad = JSON.stringify(loadHudFxSlots(uiStorage).HUD1);
slotRows(loadUi)[0].children[1].dispatch("click");
const loadedActive = loadHudFxLabState(uiStorage);
assert.equal(loadedActive.selectedEvent, "bomb", "LOAD preserves selected event");
assert.deepEqual(loadedActive.events, slotState.events, "LOAD replaces and persists ACTIVE events");
assert.equal(fxRows(loadUi)[0].children[0].attributes.get("aria-pressed"), "false", "UI rerenders the selected BOMB row from loaded ACTIVE");
assert.equal(JSON.stringify(loadHudFxSlots(uiStorage).HUD1), hud1BeforeLoad, "LOAD does not mutate its slot");

slotRows(loadUi)[1].children[2].dispatch("click");
buttons(loadUi, "RESET")[0].dispatch("click");
assert.deepEqual(loadHudFxLabState(uiStorage), defaults, "RESET restores default ACTIVE including selected event");
assert.notEqual(loadHudFxSlots(uiStorage).HUD1, null, "RESET preserves HUD1");
assert.notEqual(loadHudFxSlots(uiStorage).HUD2, null, "RESET preserves HUD2");

const sliderState = updateHudFxIntensity(toggleHudFx(defaults, "pop"), "pop", 0.4);
saveHudFxLabState(uiStorage, sliderState);
const sliderUi = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
const popSlider = fxRows(sliderUi)[0].children[1];
const popOutput = fxRows(sliderUi)[0].children[2];
assert.equal(popOutput.tagName, "output");
assert.equal(popOutput.textContent, "0.40", "output renders two decimal places");
popSlider.value = "0.67";
popSlider.dispatch("input");
assert.equal(popOutput.textContent, "0.67", "slider immediately updates output");
assert.equal(loadHudFxLabState(uiStorage).events.score.pop.intensity, 0.67, "slider persists ACTIVE");
assert.equal(fxRows(sliderUi)[0].children[1], popSlider, "slider input does not rerender its control");
assert.equal(fxRows(sliderUi)[1].children[1].disabled, true, "disabled effect slider remains disabled");
assert.equal(fxRows(sliderUi)[1].children[2].textContent, "0.50", "disabled effect intensity remains visible");

saveHudFxLabState(uiStorage, selectHudFxEvent(defaults, "wave"));
const disabledTestUi = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
assert.equal(testButton(disabledTestUi).disabled, true);
assert.equal(testButton(disabledTestUi).title, "Enable an FX to preview WAVE");
assert.equal(testButton(disabledTestUi).attributes.get("aria-label"), "Enable an FX to preview WAVE");

let hitState = selectHudFxEvent(defaults, "hit");
for (const effect of ["pop", "flash", "ghost", "snap"] as const) hitState = toggleHudFx(hitState, effect);
saveHudFxLabState(uiStorage, hitState);
const enabledTestUi = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
assert.equal(testButton(enabledTestUi).disabled, false);
assert.equal(testButton(enabledTestUi).title, "Preview HIT POP + FLASH + GHOST + SNAP");
assert.equal(testButton(enabledTestUi).attributes.get("aria-label"), "Preview HIT POP + FLASH + GHOST + SNAP");

let previewState = selectHudFxEvent(defaults, "weapon");
HUD_FX_EFFECTS.forEach((effect, index) => {
  previewState = updateHudFxIntensity(toggleHudFx(previewState, effect), effect, (index + 1) / 10);
});
saveHudFxLabState(uiStorage, previewState);
saveHudFxSlot(uiStorage, "HUD1", previewState);
const previewUi = createHudFxLabUI(uiStorage as Storage, documentStub) as unknown as FakeElement;
const activeBeforePreview = JSON.stringify(loadHudFxLabState(uiStorage));
const slotBeforePreview = JSON.stringify(loadHudFxSlots(uiStorage).HUD1);
const gameplayState = { score: 123, energy: 4 };
const gameplayBeforePreview = JSON.stringify(gameplayState);
const previews: unknown[] = [];
setHudFxPreviewHandler((request) => previews.push(request));
testButton(previewUi).dispatch("click");
setHudFxPreviewHandler(undefined);
assert.deepEqual(previews, HUD_FX_EFFECTS.map((effectId, index) => ({ eventId: "weapon", effectId, intensity: (index + 1) / 10 })));
assert.equal(JSON.stringify(loadHudFxLabState(uiStorage)), activeBeforePreview, "TEST does not mutate ACTIVE");
assert.equal(JSON.stringify(loadHudFxSlots(uiStorage).HUD1), slotBeforePreview, "TEST does not mutate slots");
assert.equal(JSON.stringify(gameplayState), gameplayBeforePreview, "TEST does not mutate unrelated gameplay/session state");
assert.deepEqual(getHudFxTestRequest(previewState), { eventId: "weapon", effectId: "pop", intensity: 0.1 });
assert.equal(getHudFxTestRequest(defaults), undefined);
console.log("HudFxLab state smoke passed");
