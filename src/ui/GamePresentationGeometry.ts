import type { PixelBgrDisplayMode } from "./PixelBgrDevWorkspaceLayout";

export type GamePresentationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ViewportSize = { width: number; height: number };

export function gamePresentationRect(
  mode: PixelBgrDisplayMode,
  viewport: ViewportSize,
  devViewportRect?: Pick<DOMRect, "left" | "top" | "width" | "height"> | null,
): GamePresentationRect {
  if (mode === "dev" && devViewportRect) {
    return {
      x: devViewportRect.left,
      y: devViewportRect.top,
      width: devViewportRect.width,
      height: devViewportRect.height,
    };
  }
  return { x: 0, y: 0, width: viewport.width, height: viewport.height };
}
