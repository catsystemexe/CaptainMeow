export type PixelBgrDisplayMode = "game" | "dev";

export interface PixelBgrDevWorkspaceRegions {
  root: HTMLDivElement;
  modeToggle: HTMLElement;
  main: HTMLElement;
  left: HTMLElement;
  viewport: HTMLElement;
  right: HTMLElement;
  timeline: HTMLElement;
}

export const PIXEL_BGR_WORKSPACE_REGION_CLASSES = {
  root: "cm-bgr-workspace-shell",
  modeToggle: "cm-bgr-workspace-mode-toggle",
  main: "cm-bgr-workspace-main",
  left: "cm-bgr-workspace-left",
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

  const modeToggle = region(documentRef, "nav", PIXEL_BGR_WORKSPACE_REGION_CLASSES.modeToggle, "mode-toggle");
  const main = region(documentRef, "main", PIXEL_BGR_WORKSPACE_REGION_CLASSES.main, "main");
  const left = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.left, "left");
  const viewport = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.viewport, "viewport");
  const right = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.right, "right");
  const timeline = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.timeline, "timeline");

  main.append(left, viewport, right);
  root.append(modeToggle, main, timeline);

  return { root, modeToggle, main, left, viewport, right, timeline };
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
  grid-template-rows: minmax(0, 1fr) 149px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  color: #eaf6ff;
}

.cm-bgr-workspace-main {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(260px, 320px);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.cm-bgr-workspace-left,
.cm-bgr-workspace-right,
.cm-bgr-workspace-timeline {
  min-width: 0;
  min-height: 0;
  background: #040810;
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
  padding: 2px;
  border: 1px solid rgba(120, 220, 255, .38);
  border-radius: 5px;
  background: rgba(4, 8, 16, .88);
  font: 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
  pointer-events: auto;
}

.cm-bgr-workspace-mode-toggle button {
  min-height: 24px;
  padding: 2px 7px;
  color: #9ab4c0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  font: inherit;
}

.cm-bgr-workspace-mode-toggle button[aria-pressed="true"] {
  color: #fff;
  background: #235b80;
}

.cm-bgr-workspace-left {
  border-right: 1px solid rgba(120, 220, 255, .14);
  overflow: auto;
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
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(120, 220, 255, .16);
  overflow-x: hidden;
  overflow-y: hidden;
  pointer-events: auto;
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
.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-timeline {
  display: none;
}

.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-main {
  display: block;
}

@media (max-width: 1499px) {
  .cm-bgr-workspace-main {
    grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) minmax(220px, 280px);
  }
}

@media (max-width: 1099px) {
  .cm-bgr-workspace-main {
    grid-template-columns: minmax(180px, 22vw) minmax(360px, 1fr) minmax(220px, 26vw);
    overflow-x: auto;
  }
}
`;
