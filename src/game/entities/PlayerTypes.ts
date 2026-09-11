import type { Vec2 } from "../../engine/math/Vec2";

export type PlayerData = {
  kind: "player";
  pos: Vec2;
  vel: Vec2;
 
  speed: number;    // WU/sec
  radius: number;
  bodyRadius?: number;
  alive: boolean;
  pendingKill: boolean;
  gen: number;
  id: number;
  flags: number;
  invulnT?: number;
  invulnerabilityReason?: "hit" | "respawn" | null;
  shield: number;
  shieldMax: number;
  /** Public/debug compatibility projection. Authoritative state is shield. */
  energy?: number;
  /** Public/debug compatibility projection. Authoritative state is shieldMax. */
  energyMax?: number;
  deadT?: number;
  respawnIntroT?: number;
  respawnIntroDuration?: number;
  respawnIntroStart?: Vec2;
  respawnIntroTarget?: Vec2;
  hitFlashT?: number;
};

/** Keep the legacy public/debug energy names as live projections, never duplicate state. */
export function installPlayerEnergyCompatibility(player: PlayerData): void {
  Object.defineProperties(player, {
    energy: {
      configurable: true,
      enumerable: true,
      get: () => player.shield,
      set: (value: unknown) => { player.shield = Number(value); },
    },
    energyMax: {
      configurable: true,
      enumerable: true,
      get: () => player.shieldMax,
      set: (value: unknown) => { player.shieldMax = Number(value); },
    },
  });
}
