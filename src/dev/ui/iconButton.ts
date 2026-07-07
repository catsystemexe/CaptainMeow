import type { IconNode } from "lucide";
import { createLucideIcon, type DevLucideIconName } from "./lucideIcon";

export interface CreateDevIconButtonOptions {
  readonly action: string;
  readonly label: string;
  readonly icon: IconNode;
  readonly iconName: DevLucideIconName;
  readonly onClick?: (event: MouseEvent) => void;
  readonly disabled?: boolean;
}

export function styleDevIconButton(button: HTMLButtonElement, disabled = button.disabled): void {
  button.className = Array.from(new Set(`${button.className} preset-toolbar-button`.trim().split(/\s+/))).join(" ");
  button.style.cssText = `display:inline-grid;place-items:center;width:30px;height:30px;min-width:30px;min-height:30px;padding:0;font:14px/1 monospace;background:${disabled ? "#1a1a1a" : "transparent"};color:${disabled ? "#666" : "#eee"};border:1px solid transparent;border-radius:2px;cursor:${disabled ? "not-allowed" : "pointer"};box-sizing:border-box;vertical-align:middle;`;
}

export function setDevIconButtonDisabled(button: HTMLButtonElement, disabled: boolean): void {
  button.disabled = disabled;
  styleDevIconButton(button, disabled);
}

export function createDevIconButton({ action, label, icon, iconName, onClick, disabled = false }: CreateDevIconButtonOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("data-preset-toolbar-action", action);
  button.className = "preset-toolbar-button";
  const iconWrap = document.createElement("span");
  iconWrap.className = "preset-toolbar-icon-wrap";
  iconWrap.setAttribute("aria-hidden", "true");
  iconWrap.style.cssText = "display:inline-grid;place-items:center;width:18px;height:18px;pointer-events:none;";
  iconWrap.appendChild(createLucideIcon({ icon, name: iconName }));
  button.appendChild(iconWrap);
  styleDevIconButton(button, disabled);
  button.disabled = disabled;
  if (onClick) button.addEventListener("click", onClick);
  return button;
}
