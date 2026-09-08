export type ActiveRightLab = "enemy" | "hud";

export interface RightLabHost {
  readonly root: HTMLElement;
  setActive(active: ActiveRightLab): void;
  getActive(): ActiveRightLab;
}

export function createRightLabHost(enemyLab: HTMLElement, hudLab: HTMLElement, documentRef: Document = document): RightLabHost {
  const root = documentRef.createElement("div");
  root.className = "cm-right-lab-host";
  const selector = documentRef.createElement("nav");
  selector.className = "cm-right-lab-selector";
  selector.setAttribute("aria-label", "Developer lab");
  const enemyButton = documentRef.createElement("button");
  const hudButton = documentRef.createElement("button");
  enemyButton.type = hudButton.type = "button";
  enemyButton.textContent = "ENEMY";
  hudButton.textContent = "HUD";
  const enemyBody = documentRef.createElement("div");
  const hudBody = documentRef.createElement("div");
  enemyBody.className = hudBody.className = "cm-right-lab-body";
  enemyBody.appendChild(enemyLab);
  hudBody.appendChild(hudLab);
  selector.append(enemyButton, hudButton);
  root.append(selector, enemyBody, hudBody);
  let active: ActiveRightLab = "enemy";
  const setActive = (next: ActiveRightLab) => {
    active = next;
    enemyBody.hidden = next !== "enemy";
    hudBody.hidden = next !== "hud";
    enemyButton.setAttribute("aria-selected", String(next === "enemy"));
    hudButton.setAttribute("aria-selected", String(next === "hud"));
  };
  enemyButton.addEventListener("click", () => setActive("enemy"));
  hudButton.addEventListener("click", () => setActive("hud"));
  setActive(active);
  return { root, setActive, getActive: () => active };
}
