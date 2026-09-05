import type { BackgroundSceneV2 } from "./BackgroundV2Types";
import { validateStarfieldConfig } from "./BackgroundV2Starfield";

export interface BackgroundV2ValidationIssue { path: string; message: string }
export interface BackgroundV2ValidationResult { valid: boolean; errors: BackgroundV2ValidationIssue[] }
const roles = new Set(["far", "mid", "near", "foreground", "custom"]);
const modes = new Set(["sequence", "repeat"]);
const blends = new Set(["normal", "additive"]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const rejectUnknown = (value: Record<string, unknown>, allowed: readonly string[], path: string, issue: (path: string, message: string) => void) => {
  const known = new Set(allowed); for (const key of Object.keys(value)) if (!known.has(key)) issue(`${path}${path ? "." : ""}${key}`, "unknown field");
};

export function validateBackgroundSceneV2(value: unknown): BackgroundV2ValidationResult {
  const errors: BackgroundV2ValidationIssue[] = [];
  const issue = (path: string, message: string) => errors.push({ path, message });
  if (!object(value)) return { valid: false, errors: [{ path: "scene", message: "must be an object" }] };
  rejectUnknown(value, ["version", "id", "environment", "tracks"], "", issue);
  if (value.version !== 2) issue("version", "must equal 2 (V1 is not imported automatically)");
  if (!nonEmpty(value.id)) issue("id", "must be a non-empty string");
  if (!object(value.environment)) issue("environment", "must be an object");
  else {
    rejectUnknown(value.environment, ["starfield"], "environment", issue);
    if (value.environment.starfield !== undefined) {
    const sf = value.environment.starfield;
    if (!object(sf)) issue("environment.starfield", "must be an object");
    else {
      const result = validateStarfieldConfig({ seed: sf.seed as number, density: sf.density as number });
      if (!result.ok) issue("environment.starfield", result.error);
      rejectUnknown(sf, ["seed", "density"], "environment.starfield", issue);
    }
    }
  }
  if (!Array.isArray(value.tracks)) issue("tracks", "must be an array");
  else {
    const trackIds = new Set<string>();
    value.tracks.forEach((raw, ti) => {
      const path = `tracks[${ti}]`;
      if (!object(raw)) { issue(path, "must be an object"); return; }
      rejectUnknown(raw, ["id", "name", "role", "mode", "enabled", "parallax", "zBase", "segments", "objects"], path, issue);
      if (!nonEmpty(raw.id)) issue(`${path}.id`, "must be a non-empty string"); else if (trackIds.has(raw.id)) issue(`${path}.id`, "must be unique"); else trackIds.add(raw.id);
      if (!nonEmpty(raw.name)) issue(`${path}.name`, "must be a non-empty string");
      if (!roles.has(String(raw.role))) issue(`${path}.role`, "is invalid");
      if (!modes.has(String(raw.mode))) issue(`${path}.mode`, "is invalid");
      if (typeof raw.enabled !== "boolean") issue(`${path}.enabled`, "must be boolean");
      if (!object(raw.parallax) || !finite(raw.parallax.x) || !finite(raw.parallax.y)) issue(`${path}.parallax`, "x and y must be finite numbers");
      else rejectUnknown(raw.parallax, ["x", "y"], `${path}.parallax`, issue);
      if (!finite(raw.zBase)) issue(`${path}.zBase`, "must be finite");
      const validateItems = (kind: "segments" | "objects") => {
        const items = raw[kind]; if (!Array.isArray(items)) { issue(`${path}.${kind}`, "must be an array"); return; }
        const ids = new Set<string>();
        items.forEach((item, ii) => {
          const ip = `${path}.${kind}[${ii}]`; if (!object(item)) { issue(ip, "must be an object"); return; }
          rejectUnknown(item, kind === "segments" ? ["id", "startTrackX", "widthPx", "asset", "offsetY", "opacity", "blend", "localZ", "fadeInPx", "fadeOutPx", "enabled"] : ["id", "asset", "startTrackX", "y", "width", "height", "localZ", "opacity", "blend", "enabled"], ip, issue);
          if (!nonEmpty(item.id)) issue(`${ip}.id`, "must be a non-empty string"); else if (ids.has(item.id)) issue(`${ip}.id`, `must be unique within ${kind}`); else ids.add(item.id);
          if (!object(item.asset) || !nonEmpty(item.asset.id) || !nonEmpty(item.asset.url)) issue(`${ip}.asset`, "id and url must be non-empty strings");
          else rejectUnknown(item.asset, ["id", "url"], `${ip}.asset`, issue);
          const required = kind === "segments" ? ["startTrackX", "widthPx", "offsetY", "opacity", "localZ"] : ["startTrackX", "y", "opacity", "localZ"];
          for (const key of required) if (!finite(item[key])) issue(`${ip}.${key}`, "must be finite");
          if (kind === "segments" && finite(item.widthPx) && item.widthPx <= 0) issue(`${ip}.widthPx`, "must be greater than 0");
          for (const key of kind === "segments" ? ["fadeInPx", "fadeOutPx"] : ["width", "height"]) if (item[key] !== undefined && (!finite(item[key]) || (item[key] as number) < 0)) issue(`${ip}.${key}`, "must be a finite non-negative number when present");
          if (finite(item.opacity) && (item.opacity < 0 || item.opacity > 1)) issue(`${ip}.opacity`, "must be between 0 and 1");
          if (!blends.has(String(item.blend))) issue(`${ip}.blend`, "is invalid");
          if (typeof item.enabled !== "boolean") issue(`${ip}.enabled`, "must be boolean");
        });
      };
      validateItems("segments"); validateItems("objects");
    });
  }
  return { valid: errors.length === 0, errors };
}
