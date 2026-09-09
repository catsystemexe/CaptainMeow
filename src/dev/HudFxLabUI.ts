import { createDefaultHudFxLabState, HUD_FX_EFFECTS, HUD_FX_EVENTS, loadHudFxLabState, saveHudFxLabState, selectHudFxEvent, toggleHudFx, updateHudFxIntensity, type HudFxLabState } from "./HudFxLabState";
import { requestHudFxPreview, type HudFxPreviewRequest } from "./HudFxPreviewBridge";

const labelForEvent = (id: string) => id === "weapon" ? "WPN" : id.toUpperCase();

export function getHudFxTestRequests(state: HudFxLabState): HudFxPreviewRequest[] {
  if (state.selectedEvent === "score" && state.events.score.pop.enabled) {
    return [{ eventId: "score", effectId: "pop", intensity: state.events.score.pop.intensity }];
  }
  if (state.selectedEvent === "hit") {
    const requests: HudFxPreviewRequest[] = [];
    if (state.events.hit.shake.enabled) requests.push({ eventId: "hit", effectId: "shake", intensity: state.events.hit.shake.intensity });
    if (state.events.hit.flash.enabled) requests.push({ eventId: "hit", effectId: "flash", intensity: state.events.hit.flash.intensity });
    return requests;
  }
  if (state.selectedEvent === "heal" && state.events.heal.flash.enabled) {
    return [{ eventId: "heal", effectId: "flash", intensity: state.events.heal.flash.intensity }];
  }
  if (state.selectedEvent === "wave") {
    const requests: HudFxPreviewRequest[] = [];
    if (state.events.wave.pop.enabled) requests.push({ eventId: "wave", effectId: "pop", intensity: state.events.wave.pop.intensity });
    if (state.events.wave.flash.enabled) requests.push({ eventId: "wave", effectId: "flash", intensity: state.events.wave.flash.intensity });
    return requests;
  }
  if (state.selectedEvent === "weapon" && state.events.weapon.snap.enabled) {
    return [{ eventId: "weapon", effectId: "snap", intensity: state.events.weapon.snap.intensity }];
  }
  if (state.selectedEvent === "bomb") {
    const requests: HudFxPreviewRequest[] = [];
    if (state.events.bomb.snap.enabled) requests.push({ eventId: "bomb", effectId: "snap", intensity: state.events.bomb.snap.intensity });
    if (state.events.bomb.flash.enabled) requests.push({ eventId: "bomb", effectId: "flash", intensity: state.events.bomb.flash.intensity });
    return requests;
  }
  return [];
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
    const eventLabel = documentRef.createElement("div"); eventLabel.className = "cm-dev-label"; eventLabel.textContent = "event:";
    const events = documentRef.createElement("div"); events.className = "cm-hud-fx-events";
    for (const id of HUD_FX_EVENTS) events.appendChild(choice(labelForEvent(id), state.selectedEvent === id, () => commitAndRender(selectHudFxEvent(state, id))));
    const testRequests = getHudFxTestRequests(state);
    const test = documentRef.createElement("button"); test.type = "button"; test.textContent = "TEST"; test.disabled = testRequests.length === 0;
    const testDescription = testRequests.length > 0
      ? `Preview ${labelForEvent(state.selectedEvent)} ${testRequests.map((request) => request.effectId.toUpperCase()).join(" + ")}`
      : state.selectedEvent === "score"
        ? "Enable SCORE POP to preview it"
        : state.selectedEvent === "hit"
          ? "Enable HIT SHAKE or FLASH to preview it"
          : state.selectedEvent === "heal"
            ? "Enable HEAL FLASH to preview it"
          : state.selectedEvent === "weapon"
            ? "Enable WPN SNAP to preview it"
          : state.selectedEvent === "bomb"
            ? "Enable BOMB SNAP or FLASH to preview it"
          : state.selectedEvent === "wave"
            ? "Enable WAVE POP or FLASH to preview it"
          : `${labelForEvent(state.selectedEvent)} runtime preview is not supported`;
    test.title = testDescription; test.setAttribute("aria-label", testDescription);
    if (testRequests.length > 0) test.addEventListener("click", () => {
      for (const request of getHudFxTestRequests(state)) requestHudFxPreview(request);
    });
    const fxLabel = documentRef.createElement("div"); fxLabel.className = "cm-dev-label"; fxLabel.textContent = "fx:";
    root.append(title, eventLabel, events, test, fxLabel);
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
