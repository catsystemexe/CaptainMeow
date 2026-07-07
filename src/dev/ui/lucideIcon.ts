import type { IconNode } from "lucide";

export type DevLucideIconName = "Plus" | "Pencil" | "Copy" | "RotateCcw" | "Save" | "Trash2" | "X" | "Check" | "TriangleAlert";

export interface CreateLucideIconOptions {
  readonly icon: IconNode;
  readonly name: DevLucideIconName;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly className?: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function createLucideIcon({ icon, name, size = 18, strokeWidth = 2, className = "preset-toolbar-icon" }: CreateLucideIconOptions): SVGSVGElement {
  const createSvgElement = typeof document.createElementNS === "function"
    ? <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(SVG_NS, tag)
    : (tag: string) => document.createElement(tag) as unknown as SVGElement;
  const svg = createSvgElement("svg") as SVGSVGElement;
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(strokeWidth));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("data-icon-name", name);
  svg.setAttribute("class", className);
  svg.style.pointerEvents = "none";
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;
  svg.style.display = "block";

  for (const [tag, attrs] of icon) {
    const node = createSvgElement(tag as keyof SVGElementTagNameMap);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    svg.appendChild(node);
  }

  return svg;
}
