export const DEV_LAB_MODES = ["scene", "enemy", "hud"] as const;
export type DevLabMode = typeof DEV_LAB_MODES[number];

export interface UnifiedDevLabHost {
  readonly root: HTMLElement;
  readonly bodies: Readonly<Record<DevLabMode, HTMLElement>>;
  setActive(mode: DevLabMode): void;
  getActive(): DevLabMode;
  mount(mode: DevLabMode, panel: HTMLElement): void;
}

export function createUnifiedDevLabHost(
  sceneLab: HTMLElement,
  hudLab: HTMLElement,
  documentRef: Document = document,
  onSelect?: (mode: DevLabMode) => void,
): UnifiedDevLabHost {
  const root = documentRef.createElement("div");
  root.className = "cm-dev-lab-host";
  const selector = documentRef.createElement("nav");
  selector.className = "cm-dev-lab-selector";
  selector.setAttribute("aria-label", "Developer lab");
  const bodyHost = documentRef.createElement("div");
  bodyHost.className = "cm-dev-lab-body";
  const bodies = Object.fromEntries(DEV_LAB_MODES.map(mode => {
    const body = documentRef.createElement("div");
    body.className = "cm-dev-lab-panel";
    body.dataset.devLab = mode;
    bodyHost.appendChild(body);
    return [mode, body];
  })) as unknown as Record<DevLabMode, HTMLElement>;
  bodies.scene.appendChild(sceneLab);
  bodies.hud.appendChild(hudLab);

  const buttons = Object.fromEntries(DEV_LAB_MODES.map(mode => {
    const choice = documentRef.createElement("button");
    choice.type = "button";
    choice.textContent = mode.toUpperCase();
    choice.dataset.devLabChoice = mode;
    selector.appendChild(choice);
    return [mode, choice];
  })) as unknown as Record<DevLabMode, HTMLButtonElement>;
  root.append(selector, bodyHost);

  let active: DevLabMode = "scene";
  const setActive = (mode: DevLabMode) => {
    active = mode;
    root.dataset.activeLab = mode;
    for (const candidate of DEV_LAB_MODES) {
      bodies[candidate].hidden = candidate !== mode;
      buttons[candidate].setAttribute("aria-selected", String(candidate === mode));
    }
  };
  for (const mode of DEV_LAB_MODES) buttons[mode].addEventListener("click", () => onSelect ? onSelect(mode) : setActive(mode));
  setActive(active);
  return {
    root,
    bodies,
    setActive,
    getActive: () => active,
    mount: (mode, panel) => bodies[mode].appendChild(panel),
  };
}
