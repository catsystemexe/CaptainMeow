import type { BackgroundLayer, SpriteBackgroundLayer } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundChunk, BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";

export type PixelBgrIssueLevel = "error" | "warning";
export interface PixelBgrIssue { level: PixelBgrIssueLevel; path: string; message: string }
export interface PixelBgrValidationResult { errors: PixelBgrIssue[]; warnings: PixelBgrIssue[]; valid: boolean }
const KINDS = new Set(["shader", "flow-ribbon", "flow-segments", "sprite"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
function issue(level: PixelBgrIssueLevel, path: string, message: string): PixelBgrIssue { return { level, path, message }; }
function validateId(id: unknown, path: string, out: PixelBgrIssue[]): void { if (typeof id !== "string" || id.trim() === "") out.push(issue("error", path, "id is required")); }
function validateLayers(layers: unknown, path: string, errors: PixelBgrIssue[], warnings: PixelBgrIssue[]): void {
  if (!Array.isArray(layers)) { errors.push(issue("error", path, "layers must be an array")); return; }
  const ids = new Set<string>();
  if (layers.length === 0) warnings.push(issue("warning", path, "layer owner is empty"));
  layers.forEach((raw, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(raw)) { errors.push(issue("error", p, "layer must be an object")); return; }
    validateId(raw.id, `${p}.id`, errors);
    if (typeof raw.id === "string") { if (ids.has(raw.id)) errors.push(issue("error", `${p}.id`, `duplicate layer id '${raw.id}' in owner`)); ids.add(raw.id); }
    if (!KINDS.has(String(raw.kind))) errors.push(issue("error", `${p}.kind`, `unknown layer kind '${String(raw.kind)}'`));
    if (typeof raw.enabled !== "boolean") errors.push(issue("error", `${p}.enabled`, "enabled must be boolean"));
    if (raw.kind === "sprite") validateSpriteLayer(raw as unknown as SpriteBackgroundLayer, p, errors, warnings);
  });
}
function checkFinite(v: unknown, path: string, errors: PixelBgrIssue[]): void { if (!finite(v)) errors.push(issue("error", path, "must be finite")); }
function validateSpriteLayer(layer: SpriteBackgroundLayer, path: string, errors: PixelBgrIssue[], warnings: PixelBgrIssue[]): void {
  if (!isObj(layer.texture) || typeof layer.texture.url !== "string" || layer.texture.url.trim() === "") errors.push(issue("error", `${path}.texture.url`, "sprite texture URL is required"));
  else if (layer.texture.url.endsWith(".svg")) warnings.push(issue("warning", `${path}.texture.url`, "SVG technical asset; replace with pixel art before production"));
  if (!finite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) errors.push(issue("error", `${path}.opacity`, "opacity must be in range 0..1"));
  for (const key of ["x", "y"] as const) { checkFinite(layer.parallax?.[key], `${path}.parallax.${key}`, errors); checkFinite(layer.offset?.[key], `${path}.offset.${key}`, errors); }
  if (Math.abs(Number(layer.parallax?.x)) > 4 || Math.abs(Number(layer.parallax?.y)) > 4) warnings.push(issue("warning", `${path}.parallax`, "very high parallax"));
  if (!layer.repeat?.x && !layer.repeat?.y) warnings.push(issue("warning", `${path}.repeat`, "repeat disabled; small textures may expose empty background"));
}
export function validateBackgroundScene(scene: unknown): PixelBgrValidationResult {
  const errors: PixelBgrIssue[] = [], warnings: PixelBgrIssue[] = [];
  if (!isObj(scene)) return { errors: [issue("error", "scene", "scene must be an object")], warnings, valid: false };
  validateId(scene.id, "scene.id", errors);
  validateLayers(scene.globalLayers, "scene.globalLayers", errors, warnings);
  if (!Array.isArray(scene.chunks)) errors.push(issue("error", "scene.chunks", "chunks must be an array"));
  else {
    const ids = new Set<string>();
    const chunks = scene.chunks as BackgroundChunk[];
    chunks.forEach((chunk, i) => {
      const p = `scene.chunks[${i}]`;
      if (!isObj(chunk)) { errors.push(issue("error", p, "chunk must be an object")); return; }
      validateId(chunk.id, `${p}.id`, errors);
      if (typeof chunk.id === "string") { if (ids.has(chunk.id)) errors.push(issue("error", `${p}.id`, `duplicate chunk id '${chunk.id}'`)); ids.add(chunk.id); }
      if (!finite(chunk.startX)) errors.push(issue("error", `${p}.startX`, "startX must be finite"));
      if (!finite(chunk.length) || chunk.length <= 0) errors.push(issue("error", `${p}.length`, "length must be greater than zero"));
      validateLayers(chunk.layers, `${p}.layers`, errors, warnings);
    });
    const validIntervals = chunks.filter(c => finite(c.startX) && finite(c.length) && c.length > 0).map(c => ({ id: c.id, start: c.startX, end: c.startX + c.length })).sort((a,b)=>a.start-b.start || a.end-b.end);
    for (let i=1;i<validIntervals.length;i++) {
      const prev = validIntervals[i-1], cur = validIntervals[i];
      if (cur.start < prev.end) warnings.push(issue("warning", "scene.chunks", `chunks '${prev.id}' and '${cur.id}' overlap`));
      if (cur.start - prev.end > 512) warnings.push(issue("warning", "scene.chunks", `large gap before chunk '${cur.id}'`));
    }
  }
  return { errors, warnings, valid: errors.length === 0 };
}
export function hasValidationErrors(scene: unknown): boolean { return validateBackgroundScene(scene).errors.length > 0; }
