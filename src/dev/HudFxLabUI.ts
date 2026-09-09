import { createDefaultHudFxLabState, HUD_FX_EFFECTS, HUD_FX_EVENTS, HUD_FX_SLOT_IDS, loadHudFxLabState, loadHudFxSlot, loadHudFxSlots, saveHudFxLabState, saveHudFxSlot, selectHudFxEvent, toggleHudFx, updateHudFxIntensity, type HudFxLabState } from "./HudFxLabState";
import { requestHudFxPreview, type HudFxPreviewRequest } from "./HudFxPreviewBridge";

const labelForEvent = (id: string) => id === "weapon" ? "WPN" : id.toUpperCase();

export function getHudFxTestRequests(state: HudFxLabState): HudFxPreviewRequest[] {
  const eventId = state.selectedEvent;
  return HUD_FX_EFFECTS.flatMap((effectId) => {
    const setting = state.events[eventId][effectId];
    return setting.enabled ? [{ eventId, effectId, intensity: setting.intensity }] : [];
  });
}

export function getHudFxTestRequest(state: HudFxLabState): HudFxPreviewRequest | undefined {
  return getHudFxTestRequests(state)[0];
}

export function createHudFxLabUI(storage: Storage = localStorage, documentRef: Document = document): HTMLElement {
  const root = documentRef.createElement("section");
  root.className = "cm-hud-fx-lab";
  root.setAttribute("aria-label", "HUD FX Lab");
  let state = loadHudFxLabState(storage);
  const commitWithoutRender = (next: HudFxLabState) => { state = next; saveHudFxLabState(storage, state); };
  const commitAndRender = (next: HudFxLabState) => { commitWithoutRender(next); render(); };
  const choice = (text: string, active: boolean, onClick: () => void) => {
    const button = documentRef.createElement("button");
    button.type = "button"; button.textContent = text; button.className = "cm-dev-text-choice";
    button.setAttribute("aria-pressed", String(active)); button.addEventListener("click", onClick);
    return button;
  };
  const render = () => {
    root.replaceChildren();
    const title = documentRef.createElement("h3"); title.textContent = "HUD Lab";
    const active = documentRef.createElement("div"); active.className = "cm-dev-label"; active.textContent = "ACTIVE: LAST";
    const slots = loadHudFxSlots(storage);
    const slotRows = documentRef.createElement("div"); slotRows.className = "cm-hud-fx-slots";
    for (const id of HUD_FX_SLOT_IDS) {
      const row = documentRef.createElement("div"); row.className = "cm-hud-fx-slot";
      const label = documentRef.createElement("span"); label.textContent = id;
      const load = choice("LOAD", false, () => commitAndRender(loadHudFxSlot(state, loadHudFxSlots(storage), id)));
      load.disabled = slots[id] === null;
      const save = choice("SAVE", false, () => { saveHudFxSlot(storage, id, state); render(); });
      row.append(label, load, save); slotRows.appendChild(row);
    }
    const eventLabel = documentRef.createElement("div"); eventLabel.className = "cm-dev-label"; eventLabel.textContent = "event:";
    const events = documentRef.createElement("div"); events.className = "cm-hud-fx-events";
    for (const id of HUD_FX_EVENTS) events.appendChild(choice(labelForEvent(id), state.selectedEvent === id, () => commitAndRender(selectHudFxEvent(state, id))));
    const testRequests = getHudFxTestRequests(state);
    const test = documentRef.createElement("button"); test.type = "button"; test.textContent = "TEST"; test.disabled = testRequests.length === 0;
    const testDescription = testRequests.length > 0
      ? `Preview ${labelForEvent(state.selectedEvent)} ${testRequests.map((request) => request.effectId.toUpperCase()).join(" + ")}`
      : `Enable an FX to preview ${labelForEvent(state.selectedEvent)}`;
    test.title = testDescription; test.setAttribute("aria-label", testDescription);
    if (testRequests.length > 0) test.addEventListener("click", () => {
      for (const request of getHudFxTestRequests(state)) requestHudFxPreview(request);
    });
    const fxLabel = documentRef.createElement("div"); fxLabel.className = "cm-dev-label"; fxLabel.textContent = "fx:";
    root.append(title, active, slotRows, eventLabel, events, test, fxLabel);
    for (const id of HUD_FX_EFFECTS) {
      const setting = state.events[state.selectedEvent][id];
      const row = documentRef.createElement("div"); row.className = "cm-hud-fx-row";
      const toggle = choice(id.toUpperCase(), setting.enabled, () => commitAndRender(toggleHudFx(state, id)));
      const slider = documentRef.createElement("input"); slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = "0.01";
      slider.value = String(setting.intensity); slider.disabled = !setting.enabled; slider.setAttribute("aria-label", `${id} intensity`);
      const value = documentRef.createElement("output"); value.className = "cm-hud-fx-value";
      value.textContent = setting.intensity.toFixed(2); value.setAttribute("aria-label", `${id} intensity value`);
      slider.addEventListener("input", () => {
        commitWithoutRender(updateHudFxIntensity(state, id, Number(slider.value)));
        value.textContent = state.events[state.selectedEvent][id].intensity.toFixed(2);
      });
      row.append(toggle, slider, value); root.appendChild(row);
    }
    root.appendChild(choice("RESET", false, () => commitAndRender(createDefaultHudFxLabState())));
  };
  render();
  return root;
}
