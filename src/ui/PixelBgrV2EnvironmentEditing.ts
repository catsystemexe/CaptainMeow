import type { BackgroundSceneV2, StarfieldConfig } from "../render/bg/v2/BackgroundV2Types";
import { normalizeStarfieldSeed, validateStarfieldConfig } from "../render/bg/v2/BackgroundV2Starfield";

export const DEFAULT_V2_STARFIELD: Readonly<StarfieldConfig> = { seed: 1, density: 0.35 };
export type V2EnvironmentEditResult = { ok: true; scene: BackgroundSceneV2 } | { ok: false; error: string };

export { validateStarfieldConfig as validateV2StarfieldConfig };

export function enableV2Starfield(scene: BackgroundSceneV2, config: StarfieldConfig = DEFAULT_V2_STARFIELD): V2EnvironmentEditResult {
  return updateV2Starfield(scene, config);
}

export function disableV2Starfield(scene: BackgroundSceneV2): V2EnvironmentEditResult {
  if (!scene.environment.starfield) return { ok: true, scene };
  const { starfield: _removed, ...environment } = scene.environment;
  return { ok: true, scene: { ...scene, environment } };
}

export function updateV2Starfield(scene: BackgroundSceneV2, patch: Partial<StarfieldConfig>): V2EnvironmentEditResult {
  const current = scene.environment.starfield ?? DEFAULT_V2_STARFIELD;
  const config = { ...current, ...patch };
  const validation = validateStarfieldConfig(config);
  if (!validation.ok) return validation;
  return { ok: true, scene: { ...scene, environment: { ...scene.environment, starfield: config } } };
}

export function randomizeV2StarfieldSeed(scene: BackgroundSceneV2, seed: number): V2EnvironmentEditResult {
  return updateV2Starfield(scene, { seed: normalizeStarfieldSeed(seed) });
}
