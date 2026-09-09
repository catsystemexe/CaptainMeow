import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDefaultHudFxLabState, HUD_FX_LAB_STORAGE_KEY, loadHudFxLabState, normalizeHudFxLabState, saveHudFxLabState, selectHudFxEvent, toggleHudFx, updateHudFxIntensity } from "./HudFxLabState";
import { createHudFxLabUI, getHudFxTestRequest, getHudFxTestRequests } from "./HudFxLabUI";
import { requestHudFxPreview, setHudFxPreviewHandler } from "./HudFxPreviewBridge";

const defaults = createDefaultHudFxLabState();
assert.equal(defaults.selectedEvent, "score");
assert.equal(defaults.events.score.pop.enabled, false);
assert.equal(defaults.events.bomb.snap.intensity, 0.5);
assert.equal(selectHudFxEvent(defaults, "stale").selectedEvent, "score");
const toggled = toggleHudFx(selectHudFxEvent(defaults, "hit"), "shake");
assert.equal(toggled.events.hit.shake.enabled, true);
assert.equal(toggled.events.score.shake.enabled, false);
assert.equal(updateHudFxIntensity(toggled, "shake", 4).events.hit.shake.intensity, 1);
assert.equal(updateHudFxIntensity(toggled, "shake", -2).events.hit.shake.intensity, 0);
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
saveHudFxLabState(storage, toggled);
assert.deepEqual(loadHudFxLabState(storage), toggled);
values.set(HUD_FX_LAB_STORAGE_KEY, "{bad json");
assert.deepEqual(loadHudFxLabState(storage), defaults);
assert.deepEqual(normalizeHudFxLabState({ selectedEvent: "wave", events: { wave: { pop: { enabled: true, intensity: 9 }, future: {} }, future: {} } }).events.wave.pop, { enabled: true, intensity: 1 });
assert.deepEqual(createDefaultHudFxLabState(), defaults, "reset produces complete defaults");
const scorePopEnabled = toggleHudFx(defaults, "pop");
assert.deepEqual(getHudFxTestRequest(scorePopEnabled), { eventId: "score", effectId: "pop", intensity: 0.5 });
const hitSelected = selectHudFxEvent(defaults, "hit");
const hitShakeEnabled = updateHudFxIntensity(toggleHudFx(hitSelected, "shake"), "shake", 0.73);
assert.deepEqual(getHudFxTestRequest(hitShakeEnabled), { eventId: "hit", effectId: "shake", intensity: 0.73 });
assert.equal(getHudFxTestRequest(hitSelected), undefined, "disabled HIT SHAKE keeps TEST disabled");
const hitFlashEnabled = updateHudFxIntensity(toggleHudFx(hitSelected, "flash"), "flash", 0.26);
assert.deepEqual(getHudFxTestRequests(hitShakeEnabled), [{ eventId: "hit", effectId: "shake", intensity: 0.73 }]);
assert.deepEqual(getHudFxTestRequests(hitFlashEnabled), [{ eventId: "hit", effectId: "flash", intensity: 0.26 }]);
const hitBothEnabled = toggleHudFx(hitShakeEnabled, "flash");
assert.deepEqual(getHudFxTestRequests(hitBothEnabled), [
  { eventId: "hit", effectId: "shake", intensity: 0.73 },
  { eventId: "hit", effectId: "flash", intensity: 0.5 },
], "implemented HIT requests preserve independent intensities");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(hitSelected, "ghost")), [], "an unimplemented HIT effect does not enable TEST");
const healSelected = selectHudFxEvent(defaults, "heal");
const healFlashEnabled = updateHudFxIntensity(toggleHudFx(healSelected, "flash"), "flash", 0.64);
assert.deepEqual(getHudFxTestRequests(healFlashEnabled), [
  { eventId: "heal", effectId: "flash", intensity: 0.64 },
], "enabled HEAL FLASH produces one preview at its current intensity");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(healSelected, "pop")), [], "an unimplemented HEAL effect does not enable TEST");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(healFlashEnabled, "ghost")), [
  { eventId: "heal", effectId: "flash", intensity: 0.64 },
], "unimplemented HEAL effects do not add preview requests");
const waveSelected = selectHudFxEvent(defaults, "wave");
const wavePopEnabled = updateHudFxIntensity(toggleHudFx(waveSelected, "pop"), "pop", 0.42);
const waveFlashEnabled = updateHudFxIntensity(toggleHudFx(waveSelected, "flash"), "flash", 0.87);
const waveBothEnabled = updateHudFxIntensity(toggleHudFx(wavePopEnabled, "flash"), "flash", 0.87);
assert.deepEqual(getHudFxTestRequests(wavePopEnabled), [{ eventId: "wave", effectId: "pop", intensity: 0.42 }]);
assert.deepEqual(getHudFxTestRequests(waveFlashEnabled), [{ eventId: "wave", effectId: "flash", intensity: 0.87 }]);
assert.deepEqual(getHudFxTestRequests(waveBothEnabled), [
  { eventId: "wave", effectId: "pop", intensity: 0.42 },
  { eventId: "wave", effectId: "flash", intensity: 0.87 },
], "WAVE previews use POP, FLASH order and preserve independent intensities");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(waveSelected, "ghost")), [], "an unimplemented WAVE effect does not enable TEST");
const weaponSelected = selectHudFxEvent(defaults, "weapon");
const weaponSnapEnabled = updateHudFxIntensity(toggleHudFx(weaponSelected, "snap"), "snap", 0.82);
assert.deepEqual(getHudFxTestRequests(weaponSnapEnabled), [
  { eventId: "weapon", effectId: "snap", intensity: 0.82 },
], "enabled WPN SNAP produces one preview at its current intensity");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(weaponSelected, "ghost")), [], "an unimplemented WPN effect does not enable TEST");
const bombSelected = selectHudFxEvent(defaults, "bomb");
const bombSnapEnabled = updateHudFxIntensity(toggleHudFx(bombSelected, "snap"), "snap", 0.35);
const bombFlashEnabled = updateHudFxIntensity(toggleHudFx(bombSelected, "flash"), "flash", 0.81);
assert.deepEqual(getHudFxTestRequests(bombSnapEnabled), [{ eventId: "bomb", effectId: "snap", intensity: 0.35 }], "BOMB SNAP produces one preview");
assert.deepEqual(getHudFxTestRequests(bombFlashEnabled), [{ eventId: "bomb", effectId: "flash", intensity: 0.81 }], "BOMB FLASH produces one preview");
const bombBothEnabled = updateHudFxIntensity(toggleHudFx(bombSnapEnabled, "flash"), "flash", 0.81);
assert.deepEqual(getHudFxTestRequests(bombBothEnabled), [
  { eventId: "bomb", effectId: "snap", intensity: 0.35 },
  { eventId: "bomb", effectId: "flash", intensity: 0.81 },
], "BOMB previews use SNAP, FLASH order and preserve independent intensities");
assert.deepEqual(getHudFxTestRequests(toggleHudFx(bombSelected, "ghost")), [], "an unimplemented BOMB effect does not enable TEST");
assert.equal(getHudFxTestRequest(defaults), undefined, "disabled SCORE POP keeps TEST disabled");
const previewRequests: unknown[] = [];
setHudFxPreviewHandler((request) => previewRequests.push(request));
const preview = getHudFxTestRequest(updateHudFxIntensity(scorePopEnabled, "pop", 0.73));
assert(preview);
requestHudFxPreview(preview);
assert.deepEqual(previewRequests, [{ eventId: "score", effectId: "pop", intensity: 0.73 }]);
assert.deepEqual(scorePopEnabled.events.score.pop, { enabled: true, intensity: 0.5 }, "preview does not mutate configuration or gameplay state");
const hitSnapshot = JSON.stringify(hitShakeEnabled);
const hitPreview = getHudFxTestRequest(hitShakeEnabled);
assert(hitPreview);
requestHudFxPreview(hitPreview);
assert.equal(JSON.stringify(hitShakeEnabled), hitSnapshot, "HIT preview does not mutate configuration or gameplay state");
assert.deepEqual(previewRequests.at(-1), { eventId: "hit", effectId: "shake", intensity: 0.73 });
const healSnapshot = JSON.stringify(healFlashEnabled);
const healPreview = getHudFxTestRequest(healFlashEnabled);
assert(healPreview);
requestHudFxPreview(healPreview);
assert.equal(JSON.stringify(healFlashEnabled), healSnapshot, "HEAL preview does not mutate configuration or gameplay state");
assert.deepEqual(previewRequests.at(-1), { eventId: "heal", effectId: "flash", intensity: 0.64 });
const weaponSnapshot = JSON.stringify(weaponSnapEnabled);
const weaponPreview = getHudFxTestRequest(weaponSnapEnabled);
assert(weaponPreview);
requestHudFxPreview(weaponPreview);
assert.equal(JSON.stringify(weaponSnapEnabled), weaponSnapshot, "WPN preview does not mutate configuration or gameplay state");
assert.deepEqual(previewRequests.at(-1), { eventId: "weapon", effectId: "snap", intensity: 0.82 });
const bombSnapshot = JSON.stringify(bombBothEnabled);
for (const bombPreview of getHudFxTestRequests(bombBothEnabled)) requestHudFxPreview(bombPreview);
assert.equal(JSON.stringify(bombBothEnabled), bombSnapshot, "BOMB preview does not mutate configuration or gameplay state");
assert.deepEqual(previewRequests.slice(-2), getHudFxTestRequests(bombBothEnabled));
const waveSnapshot = JSON.stringify(waveBothEnabled);
for (const wavePreview of getHudFxTestRequests(waveBothEnabled)) requestHudFxPreview(wavePreview);
assert.equal(JSON.stringify(waveBothEnabled), waveSnapshot, "WAVE preview does not mutate configuration or gameplay state");
assert.deepEqual(previewRequests.slice(-2), getHudFxTestRequests(waveBothEnabled));
setHudFxPreviewHandler(undefined);

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
const uiValues = new Map<string, string>();
const uiStorage = { getItem: (key: string) => uiValues.get(key) ?? null, setItem: (key: string, value: string) => { uiValues.set(key, value); } };
saveHudFxLabState(uiStorage, scorePopEnabled);
const ui = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const rows = ui.children.filter((child) => child.className === "cm-hud-fx-row");
const popSlider = rows[0].children[1];
const popValue = rows[0].children[2];
assert.equal(popValue.tagName, "output", "numeric readout uses a semantic output element");
assert.equal(popValue.textContent, "0.50", "initial persisted intensity uses two decimal places");
assert.equal(popValue.attributes.get("aria-label"), "pop intensity value");
popSlider.value = "0.73";
popSlider.dispatch("input");
assert.equal(loadHudFxLabState(uiStorage).events.score.pop.intensity, 0.73, "slider input updates persistence");
assert.equal(popValue.textContent, "0.73", "slider input updates its readout immediately");
assert.equal(rows[0].children[1], popSlider, "slider input does not rerender or replace the active control");
const disabledSnapSlider = rows[1].children[1];
const disabledSnapValue = rows[1].children[2];
assert.equal(disabledSnapSlider.disabled, true);
assert.equal(disabledSnapValue.textContent, "0.50", "disabled effects still present their current value");

saveHudFxLabState(uiStorage, hitShakeEnabled);
const hitUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const hitTest = hitUi.children[3];
assert.equal(hitTest.disabled, false, "enabled HIT SHAKE enables TEST");
assert.equal(hitTest.title, "Preview HIT SHAKE");
assert.equal(hitTest.attributes.get("aria-label"), "Preview HIT SHAKE");

saveHudFxLabState(uiStorage, hitBothEnabled);
const hitBothUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const hitBothTest = hitBothUi.children[3];
const multiPreviewRequests: unknown[] = [];
setHudFxPreviewHandler((request) => multiPreviewRequests.push(request));
hitBothTest.dispatch("click");
assert.deepEqual(multiPreviewRequests, getHudFxTestRequests(hitBothEnabled), "one TEST click previews every enabled implemented HIT effect");
assert.equal(hitBothTest.title, "Preview HIT SHAKE + FLASH");
setHudFxPreviewHandler(undefined);

saveHudFxLabState(uiStorage, hitSelected);
const disabledHitUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const disabledHitTest = disabledHitUi.children[3];
assert.equal(disabledHitTest.disabled, true, "disabled HIT SHAKE disables TEST");
assert.equal(disabledHitTest.title, "Enable HIT SHAKE or FLASH to preview it");

saveHudFxLabState(uiStorage, healFlashEnabled);
const healUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const healTest = healUi.children[3];
assert.equal(healTest.disabled, false, "enabled HEAL FLASH enables TEST");
assert.equal(healTest.title, "Preview HEAL FLASH");
assert.equal(healTest.attributes.get("aria-label"), "Preview HEAL FLASH");

saveHudFxLabState(uiStorage, healSelected);
const disabledHealUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const disabledHealTest = disabledHealUi.children[3];
assert.equal(disabledHealTest.disabled, true, "disabled HEAL FLASH keeps TEST disabled");
assert.equal(disabledHealTest.title, "Enable HEAL FLASH to preview it");

for (const [state, title] of [
  [wavePopEnabled, "Preview WAVE POP"],
  [waveFlashEnabled, "Preview WAVE FLASH"],
  [waveBothEnabled, "Preview WAVE POP + FLASH"],
] as const) {
  saveHudFxLabState(uiStorage, state);
  const waveUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
  const waveTest = waveUi.children[3];
  assert.equal(waveTest.disabled, false, `${title} is enabled`);
  assert.equal(waveTest.title, title);
}
saveHudFxLabState(uiStorage, waveSelected);
const disabledWaveUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const disabledWaveTest = disabledWaveUi.children[3];
assert.equal(disabledWaveTest.disabled, true, "disabled WAVE effects keep TEST disabled");
assert.equal(disabledWaveTest.title, "Enable WAVE POP or FLASH to preview it");

saveHudFxLabState(uiStorage, weaponSnapEnabled);
const weaponUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const weaponTest = weaponUi.children[3];
assert.equal(weaponTest.disabled, false, "enabled WPN SNAP enables TEST");
assert.equal(weaponTest.title, "Preview WPN SNAP");
assert.equal(weaponTest.attributes.get("aria-label"), "Preview WPN SNAP");

saveHudFxLabState(uiStorage, weaponSelected);
const disabledWeaponUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const disabledWeaponTest = disabledWeaponUi.children[3];
assert.equal(disabledWeaponTest.disabled, true, "disabled WPN SNAP keeps TEST disabled");
assert.equal(disabledWeaponTest.title, "Enable WPN SNAP to preview it");

for (const [state, title] of [
  [bombSnapEnabled, "Preview BOMB SNAP"],
  [bombFlashEnabled, "Preview BOMB FLASH"],
  [bombBothEnabled, "Preview BOMB SNAP + FLASH"],
] as const) {
  saveHudFxLabState(uiStorage, state);
  const bombUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
  const bombTest = bombUi.children[3];
  assert.equal(bombTest.disabled, false, `${title} is enabled`);
  assert.equal(bombTest.title, title);
  assert.equal(bombTest.attributes.get("aria-label"), title);
}
saveHudFxLabState(uiStorage, bombSelected);
const disabledBombUi = createHudFxLabUI(uiStorage, documentStub) as unknown as FakeElement;
const disabledBombTest = disabledBombUi.children[3];
assert.equal(disabledBombTest.disabled, true, "disabled BOMB effects keep TEST disabled");
assert.equal(disabledBombTest.title, "Enable BOMB SNAP or FLASH to preview it");

const uiSource = readFileSync(new URL("./HudFxLabUI.ts", import.meta.url), "utf8");
assert.match(uiSource, /const commitAndRender = .*commitWithoutRender\(next\); render\(\);/, "structural controls still persist and rerender");
assert.match(uiSource, /requestHudFxPreview\(/, "TEST requests the narrow runtime preview");
console.log("HudFxLab state smoke passed");
