import type { BackgroundLayer, SpriteBackgroundLayer } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundChunk, BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import type { BackgroundMarker } from "../render/webgl/bg/layers/BackgroundMarkerTypes";
import { chunkRuntimeLayerId, globalRuntimeLayerId } from "../render/webgl/bg/layers/BackgroundSceneResolve";

export type PixelBgrIssueLevel = "error" | "warning";
export interface PixelBgrIssue { level: PixelBgrIssueLevel; path: string; message: string }
export interface PixelBgrValidationResult { errors: PixelBgrIssue[]; warnings: PixelBgrIssue[]; valid: boolean }
const KINDS = new Set(["shader", "flow-ribbon", "flow-segments", "sprite"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
function issue(level: PixelBgrIssueLevel, path: string, message: string): PixelBgrIssue { return { level, path, message }; }
function validateId(id: unknown, path: string, out: PixelBgrIssue[]): void { if (typeof id !== "string" || id.trim() === "") out.push(issue("error", path, "id is required")); }

function targetIds(scene: any): Set<string> { const ids = new Set<string>(); if (Array.isArray(scene.globalLayers)) for (const l of scene.globalLayers) if (isObj(l) && typeof l.id === "string") ids.add(globalRuntimeLayerId(l.id)); if (Array.isArray(scene.chunks)) for (const c of scene.chunks) if (isObj(c) && typeof c.id === "string" && Array.isArray(c.layers)) for (const l of c.layers) if (isObj(l) && typeof l.id === "string") ids.add(chunkRuntimeLayerId(c.id, l.id)); return ids; }
function validateMarkers(markers: unknown, path: string, ownerLength: number | null, targets: Set<string>, errors: PixelBgrIssue[], warnings: PixelBgrIssue[]): void {
  if (markers === undefined) return;
  if (!Array.isArray(markers)) { errors.push(issue("error", path, "markers must be an array")); return; }
  const ids = new Set<string>();
  markers.forEach((raw, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(raw)) { errors.push(issue("error", p, "marker must be an object")); return; }
    validateId(raw.id, `${p}.id`, errors);
    if (typeof raw.id === "string") { if (ids.has(raw.id)) errors.push(issue("error", `${p}.id`, `duplicate marker id '${raw.id}' in owner`)); ids.add(raw.id); }
    if (!finite(raw.x)) errors.push(issue("error", `${p}.x`, "marker x must be finite"));
    else if (ownerLength !== null && (raw.x < 0 || raw.x > ownerLength)) warnings.push(issue("warning", `${p}.x`, "marker outside selected chunk range"));
    if (typeof raw.enabled !== "boolean") errors.push(issue("error", `${p}.enabled`, "enabled must be boolean"));
    if (typeof raw.once !== "boolean") errors.push(issue("error", `${p}.once`, "once must be boolean"));
    if (!Array.isArray(raw.actions)) { errors.push(issue("error", `${p}.actions`, "actions must be an array")); return; }
    if (raw.actions.length === 0) warnings.push(issue("warning", `${p}.actions`, "marker has no actions"));
    raw.actions.forEach((a, ai) => {
      const ap = `${p}.actions[${ai}]`;
      if (!isObj(a)) { errors.push(issue("error", ap, "action must be an object")); return; }
      const kind = String(a.kind);
      if (!["set-layer-enabled","set-layer-opacity","pulse-layer-opacity","emit-environment-event"].includes(kind)) { errors.push(issue("error", `${ap}.kind`, `unknown action kind '${kind}'`)); return; }
      if (kind === "emit-environment-event") { if (typeof a.event !== "string" || a.event.trim() === "") errors.push(issue("error", `${ap}.event`, "environment event name is required")); return; }
      if (typeof a.layerId !== "string" || a.layerId.trim() === "") errors.push(issue("error", `${ap}.layerId`, "target layer id is required"));
      else if (!targets.has(a.layerId)) warnings.push(issue("warning", `${ap}.layerId`, "target layer currently unavailable"));
      if (kind === "set-layer-enabled" && typeof a.enabled !== "boolean") errors.push(issue("error", `${ap}.enabled`, "enabled must be boolean"));
      if (kind === "set-layer-opacity" && !finite(a.opacity)) errors.push(issue("error", `${ap}.opacity`, "opacity must be finite"));
      if (kind === "pulse-layer-opacity") { for (const key of ["from","to","durationMs"] as const) if (!finite(a[key])) errors.push(issue("error", `${ap}.${key}`, `${key} must be finite`)); if (finite(a.durationMs) && a.durationMs <= 0) errors.push(issue("error", `${ap}.durationMs`, "durationMs must be greater than zero")); }
    });
  });
}

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
  if (!Number.isInteger(Number(layer.offset?.x)) || !Number.isInteger(Number(layer.offset?.y))) warnings.push(issue("warning", `${path}.offset`, "fractional sprite offset; pixel-safe placement will round on movement"));
  if (Math.abs(Number(layer.parallax?.x)) > 4 || Math.abs(Number(layer.parallax?.y)) > 4) warnings.push(issue("warning", `${path}.parallax`, "very high parallax"));
  if (!layer.repeat?.x && !layer.repeat?.y) warnings.push(issue("warning", `${path}.repeat`, "repeat disabled; small textures may expose empty background"));
}
export function validateBackgroundScene(scene: unknown): PixelBgrValidationResult {
  const errors: PixelBgrIssue[] = [], warnings: PixelBgrIssue[] = [];
  if (!isObj(scene)) return { errors: [issue("error", "scene", "scene must be an object")], warnings, valid: false };
  validateId(scene.id, "scene.id", errors);
  const targets = targetIds(scene);
  validateLayers(scene.globalLayers, "scene.globalLayers", errors, warnings);
  validateMarkers((scene as any).markers, "scene.markers", null, targets, errors, warnings);
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
      validateMarkers((chunk as any).markers, `${p}.markers`, finite(chunk.length) ? chunk.length : null, targets, errors, warnings);
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
