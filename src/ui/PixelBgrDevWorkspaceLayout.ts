export type PixelBgrDisplayMode = "game" | "dev";

export interface PixelBgrDevWorkspaceRegions {
  root: HTMLDivElement;
  modeToggle: HTMLElement;
  main: HTMLElement;
  left: HTMLElement;
  center: HTMLElement;
  viewport: HTMLElement;
  right: HTMLElement;
  timeline: HTMLElement;
}

export const PIXEL_BGR_WORKSPACE_REGION_CLASSES = {
  root: "cm-bgr-workspace-shell",
  modeToggle: "cm-bgr-workspace-mode-toggle",
  main: "cm-bgr-workspace-main",
  left: "cm-bgr-workspace-left",
  center: "cm-bgr-workspace-center",
  viewport: "cm-bgr-workspace-viewport",
  right: "cm-bgr-workspace-right",
  timeline: "cm-bgr-workspace-timeline",
} as const;

function region<K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className: string,
  regionName: string,
): HTMLElementTagNameMap[K] {
  const element = documentRef.createElement(tag);
  element.className = className;
  element.dataset.workspaceRegion = regionName;
  return element;
}

/**
 * Stable DEV workspace shell.
 *
 * This helper deliberately owns no BGR scene/runtime/editing state. Existing
 * PixelBgrLabUI contracts are migrated into these regions incrementally.
 */
export function createPixelBgrDevWorkspaceShell(documentRef: Document = document): PixelBgrDevWorkspaceRegions {
  const root = region(documentRef, "div", PIXEL_BGR_WORKSPACE_REGION_CLASSES.root, "root");
  root.dataset.displayMode = "dev";
  root.dataset.timelineMode = "disabled";

  const modeToggle = region(documentRef, "nav", PIXEL_BGR_WORKSPACE_REGION_CLASSES.modeToggle, "mode-toggle");
  const main = region(documentRef, "main", PIXEL_BGR_WORKSPACE_REGION_CLASSES.main, "main");
  const left = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.left, "left");
  const center = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.center, "center");
  const viewport = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.viewport, "viewport");
  const right = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.right, "right");
  const timeline = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.timeline, "timeline");

  center.append(viewport, timeline);
  main.append(left, center, right);
  root.append(modeToggle, main);

  return { root, modeToggle, main, left, center, viewport, right, timeline };
}

export function setPixelBgrWorkspaceDisplayMode(root: HTMLElement, mode: PixelBgrDisplayMode): void {
  root.dataset.displayMode = mode;
  root.classList.toggle("is-dev", mode === "dev");
  root.classList.toggle("is-game", mode === "game");
}

export const PIXEL_BGR_DEV_WORKSPACE_CSS = `
.cm-bgr-workspace-shell {
  position: fixed;
  inset: 0;
  z-index: 100001;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  color: #eaf6ff;
  pointer-events: none;
}

.cm-bgr-workspace-main {
  display: grid;
  grid-template-columns: clamp(150px, 15vw, 170px) minmax(0, 1fr) clamp(170px, 18vw, 190px);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.cm-bgr-workspace-left,
.cm-bgr-workspace-right,
.cm-bgr-workspace-center,
.cm-bgr-workspace-timeline {
  min-width: 0;
  min-height: 0;
  background: #040810;
}

.cm-bgr-workspace-center {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 0;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  background: transparent;
}

.cm-v2-timeline-disabled {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  color: #6f8792;
  font: 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
}

.cm-bgr-workspace-mode-toggle {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 3px;
  border: 0;
  background: transparent;
  font: 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
  pointer-events: auto;
}

.cm-bgr-workspace-mode-toggle button {
  position: relative;
  width: 26px;
  min-height: 14px;
  padding: 0;
  border: 1px solid #527080;
  border-radius: 8px;
  background: #071521;
}

.cm-bgr-workspace-mode-toggle button::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8ee8ff;
  transition: transform 80ms linear;
}

.cm-bgr-workspace-mode-toggle button[aria-checked="true"]::after {
  transform: translateX(12px);
}

.cm-bgr-workspace-mode-toggle button:focus-visible {
  outline: 1px solid #ffe66d;
  outline-offset: 2px;
}

.cm-bgr-workspace-left {
  box-sizing: border-box;
  padding-top: 36px;
  overflow-x: hidden;
  overflow-y: auto;
}

.cm-bgr-workspace-viewport {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}

.cm-bgr-workspace-right {
  border-left: 1px solid rgba(120, 220, 255, .14);
  overflow: auto;
}

.cm-bgr-workspace-timeline {
  /* Paint the negative-offset gutter above the positioned Scene Lab sibling. */
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, .16);
  overflow-x: visible;
  overflow-y: hidden;
  pointer-events: auto;
}

.cm-bgr-workspace-shell[data-timeline-mode="v2"] .cm-bgr-workspace-center {
  grid-template-rows: minmax(0, 1fr) 149px;
}

.cm-bgr-workspace-shell[data-timeline-mode="disabled"] .cm-bgr-workspace-center {
  grid-template-rows: minmax(0, 1fr) 0;
}

.cm-bgr-workspace-left,
.cm-bgr-workspace-right {
  pointer-events: auto;
}

.cm-bgr-workspace-region-heading {
  margin: 0;
  padding: 10px 12px;
  color: #8ee8ff;
  font: 600 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
  letter-spacing: .04em;
}

.cm-bgr-workspace-shell.is-game {
  grid-template-rows: 1fr;
  background: transparent;
  pointer-events: none;
}

.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-main > .cm-bgr-workspace-left,
.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-main > .cm-bgr-workspace-right,
.cm-bgr-workspace-shell.is-game .cm-bgr-workspace-timeline {
  display: none;
}

.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-main {
  display: block;
}

.cm-bgr-workspace-shell.is-game .cm-bgr-workspace-center {
  display: block;
  width: 100%;
  height: 100%;
}

`;
