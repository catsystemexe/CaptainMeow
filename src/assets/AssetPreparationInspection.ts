import { readFileSync } from "node:fs";

export interface IntrinsicAssetSize {
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

/** Reads PNG IHDR dimensions without decoding image pixels. */
export function inspectPngIntrinsicSize(bytes: Uint8Array): IntrinsicAssetSize | null {
  if (bytes.length < 24 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function svgLength(source: string, name: "width" | "height"): number | null {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*["']([0-9]+(?:\\.[0-9]+)?)(?:px)?["']`, "i"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Uses explicit unitless/px width and height first, then the SVG viewBox extent. */
export function inspectSvgIntrinsicSize(source: string): IntrinsicAssetSize | null {
  const root = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return null;
  const width = svgLength(root, "width");
  const height = svgLength(root, "height");
  if (width !== null && height !== null) return { width, height };
  const viewBox = root.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]
    ?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4) return null;
  const [, , viewWidth, viewHeight] = viewBox;
  return Number.isFinite(viewWidth) && viewWidth > 0 && Number.isFinite(viewHeight) && viewHeight > 0
    ? { width: viewWidth, height: viewHeight }
    : null;
}

/** Node wrapper for the BGR catalogue's currently supported PNG and SVG files. */
export function inspectAssetFileIntrinsicSize(path: string): IntrinsicAssetSize | null {
  if (/\.png$/i.test(path)) return inspectPngIntrinsicSize(readFileSync(path));
  if (/\.svg$/i.test(path)) return inspectSvgIntrinsicSize(readFileSync(path, "utf8"));
  return null;
}
