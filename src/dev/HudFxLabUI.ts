import { createDefaultHudFxLabState, HUD_FX_EFFECTS, HUD_FX_EVENTS, loadHudFxLabState, saveHudFxLabState, selectHudFxEvent, toggleHudFx, updateHudFxIntensity, type HudFxLabState } from "./HudFxLabState";
import { requestHudFxPreview, type HudFxPreviewRequest } from "./HudFxPreviewBridge";

const labelForEvent = (id: string) => id === "weapon" ? "WPN" : id.toUpperCase();

export function getHudFxTestRequest(state: HudFxLabState): HudFxPreviewRequest | undefined {
  const pop = state.events.score.pop;
  if (state.selectedEvent !== "score" || !pop.enabled) return undefined;
  return { eventId: "score", effectId: "pop", intensity: pop.intensity };
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
    const testRequest = getHudFxTestRequest(state);
    const test = documentRef.createElement("button"); test.type = "button"; test.textContent = "TEST"; test.disabled = !testRequest;
    const testDescription = testRequest
      ? "Preview SCORE POP"
      : state.selectedEvent === "score"
        ? "Enable SCORE POP to preview it"
        : `${labelForEvent(state.selectedEvent)} runtime preview is not supported`;
    test.title = testDescription; test.setAttribute("aria-label", testDescription);
    if (testRequest) test.addEventListener("click", () => requestHudFxPreview(getHudFxTestRequest(state) ?? testRequest));
    const fxLabel = documentRef.createElement("div"); fxLabel.className = "cm-dev-label"; fxLabel.textContent = "fx:";
    root.append(title, eventLabel, events, test, fxLabel);
    for (const id of HUD_FX_EFFECTS) {
      const setting = state.events[state.selectedEvent][id];
      const row = documentRef.createElement("div"); row.className = "cm-hud-fx-row";
      const toggle = choice(id.toUpperCase(), setting.enabled, () => commitAndRender(toggleHudFx(state, id)));
      const slider = documentRef.createElement("input"); slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = "0.01";
      slider.value = String(setting.intensity); slider.disabled = !setting.enabled; slider.setAttribute("aria-label", `${id} intensity`);
      slider.addEventListener("input", () => commitWithoutRender(updateHudFxIntensity(state, id, Number(slider.value))));
      row.append(toggle, slider); root.appendChild(row);
    }
    root.appendChild(choice("RESET", false, () => commitAndRender(createDefaultHudFxLabState())));
  };
  render();
  return root;
}
