export type DisplayInfo = {
  cssW: number;
  cssH: number;
  dpr: number;

  scale: number;          // integer
  viewportX: number;      // in physical px
  viewportY: number;
  viewportW: number;
  viewportH: number;

  presentW: number;       // logicW*scale
  presentH: number;       // logicH*scale
};

export type DisplayVerticalAlign = "top" | "center";

export function computeDisplay(
  logicW: number,
  logicH: number,
  cssW: number,
  cssH: number,
  dpr: number,
  verticalAlign: DisplayVerticalAlign = "center",
): DisplayInfo {
  const physW = Math.max(1, Math.floor(cssW * dpr));
  const physH = Math.max(1, Math.floor(cssH * dpr));

  const sx = Math.floor(physW / logicW);
  const sy = Math.floor(physH / logicH);
  const scale = Math.max(1, Math.min(sx, sy));

  const presentW = logicW * scale;
  const presentH = logicH * scale;

  const viewportX = Math.floor((physW - presentW) / 2);
  // WebGL viewports use a bottom-left origin, so top alignment places all
  // unused vertical letterbox space below the game image.
  const viewportY = verticalAlign === "top" ? physH - presentH : Math.floor((physH - presentH) / 2);

  return { cssW, cssH, dpr, scale, viewportX, viewportY, viewportW: presentW, viewportH: presentH, presentW, presentH };
}
