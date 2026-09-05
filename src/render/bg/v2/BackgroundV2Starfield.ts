import type { StarfieldConfig } from "./BackgroundV2Types";

export interface BackgroundV2Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

export type StarfieldValidationResult = { ok: true } | { ok: false; error: string };

/** Density is a normalized proportion of one candidate per 2048 logical pixels. */
export const STARFIELD_LOGICAL_PIXELS_PER_CANDIDATE = 2048;

export function validateStarfieldConfig(config: StarfieldConfig): StarfieldValidationResult {
  if (!Number.isFinite(config.seed) || !Number.isInteger(config.seed)) return { ok: false, error: "starfield.seed must be a finite integer" };
  if (!Number.isFinite(config.density) || config.density < 0 || config.density > 1) return { ok: false, error: "starfield.density must be between 0 and 1" };
  return { ok: true };
}

export function normalizeStarfieldSeed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value) | 0;
}

function nextRandom(state: { value: number }): number {
  let x = state.value | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.value = x | 0;
  return (x >>> 0) / 0x1_0000_0000;
}

/**
 * Generates a fixed screen/environment-space distribution. Camera and track parallax
 * are deliberately not inputs: stars remain fixed to the logical viewport.
 */
export function generateBackgroundV2Stars(config: StarfieldConfig, viewportWidth: number, viewportHeight: number): BackgroundV2Star[] {
  const validation = validateStarfieldConfig(config);
  if (!validation.ok) throw new Error(validation.error);
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0 || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return [];
  const candidateCount = Math.ceil((viewportWidth * viewportHeight) / STARFIELD_LOGICAL_PIXELS_PER_CANDIDATE);
  const count = Math.floor(candidateCount * config.density);
  const state = { value: normalizeStarfieldSeed(config.seed) || 0x6d2b79f5 };
  const stars: BackgroundV2Star[] = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: nextRandom(state) * viewportWidth,
      y: nextRandom(state) * viewportHeight,
      size: nextRandom(state) < 0.82 ? 1 : 2,
      brightness: 0.45 + nextRandom(state) * 0.55,
    });
  }
  return stars;
}
