export type PixelBgrDisplayMode = "game" | "dev";

export interface PixelBgrDevWorkspaceRegions {
  root: HTMLDivElement;
  topBar: HTMLElement;
  main: HTMLElement;
  left: HTMLElement;
  viewport: HTMLElement;
  right: HTMLElement;
  timeline: HTMLElement;
}

export const PIXEL_BGR_WORKSPACE_REGION_CLASSES = {
  root: "cm-bgr-workspace-shell",
  topBar: "cm-bgr-workspace-topbar",
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
 * P1.1 structural shell only.
 *
 * This helper deliberately owns no BGR scene/runtime/editing state. Existing
 * PixelBgrLabUI contracts are migrated into these regions incrementally.
 */
export function createPixelBgrDevWorkspaceShell(documentRef: Document = document): PixelBgrDevWorkspaceRegions {
  const root = region(documentRef, "div", PIXEL_BGR_WORKSPACE_REGION_CLASSES.root, "root");
  root.dataset.displayMode = "dev";

  const topBar = region(documentRef, "header", PIXEL_BGR_WORKSPACE_REGION_CLASSES.topBar, "topbar");
  const main = region(documentRef, "main", PIXEL_BGR_WORKSPACE_REGION_CLASSES.main, "main");
  const left = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.left, "left");
  const viewport = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.viewport, "viewport");
  const right = region(documentRef, "aside", PIXEL_BGR_WORKSPACE_REGION_CLASSES.right, "right");
  const timeline = region(documentRef, "section", PIXEL_BGR_WORKSPACE_REGION_CLASSES.timeline, "timeline");

  main.append(left, viewport, right);
  root.append(topBar, main, timeline);

  return { root, topBar, main, left, viewport, right, timeline };
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
  grid-template-rows: 40px minmax(0, 1fr) minmax(220px, 30vh);
  min-width: 0;
  min-height: 0;
  background: transparent;
  color: #eaf6ff;
}

.cm-bgr-workspace-main {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(260px, 320px);
  min-width: 0;
  min-height: 0;
}

.cm-bgr-workspace-topbar,
.cm-bgr-workspace-left,
.cm-bgr-workspace-right,
.cm-bgr-workspace-timeline {
  min-width: 0;
  min-height: 0;
  background: #040810;
}

.cm-bgr-workspace-topbar {
  border-bottom: 1px solid rgba(120, 220, 255, .16);
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
  background: #000;
}

.cm-bgr-workspace-right {
  border-left: 1px solid rgba(120, 220, 255, .14);
  overflow: auto;
}

.cm-bgr-workspace-timeline {
  border-top: 1px solid rgba(120, 220, 255, .16);
  overflow: hidden;
}

.cm-bgr-workspace-shell.is-game {
  grid-template-rows: 1fr;
  background: transparent;
  pointer-events: none;
}

.cm-bgr-workspace-dev-launcher {
  display: none;
}

.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-dev-launcher {
  position: fixed;
  left: 12px;
  top: 50%;
  display: block;
  min-width: 48px;
  min-height: 36px;
  transform: translateY(-50%);
  pointer-events: auto;
  color: #eaf6ff;
  border: 1px solid rgba(120, 220, 255, .45);
  border-radius: 6px;
  background: rgba(6, 26, 42, .92);
  font: 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
}

.cm-bgr-workspace-shell.is-game > .cm-bgr-workspace-topbar,
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
    grid-template-columns: minmax(0, 1fr);
  }

  .cm-bgr-workspace-left,
  .cm-bgr-workspace-right {
    display: none;
  }
}
`;
