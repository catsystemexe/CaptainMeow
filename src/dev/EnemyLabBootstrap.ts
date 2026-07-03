import type { EventBus } from "../engine/core/EventBus";
import type { CMEventMap } from "../engine/core/events";
import type { WorldState } from "../game/data/WorldState";
import { DevSummoner, DEV_SUMMONER_PANEL_ID, FSM_PRESET_EDITOR_ID } from "./DevSummoner";

export interface EnemyLabBootstrapGame {
  bus: EventBus<CMEventMap>;
  world: WorldState;
}

export interface EnemyLabBootstrapResult {
  readonly summoner: DevSummoner | null;
  readonly panel: HTMLElement | null;
  readonly presetPanel: HTMLElement | null;
  readonly constructed: boolean;
  readonly mounted: boolean;
  readonly reused: boolean;
  readonly error: unknown | null;
}

export function mountEnemyLabRuntime(game: EnemyLabBootstrapGame, logicW: number, logicH: number): EnemyLabBootstrapResult {
  const existing = document.getElementById(DEV_SUMMONER_PANEL_ID) as HTMLElement | null;
  if (existing) {
    const presetPanel = document.getElementById(FSM_PRESET_EDITOR_ID) as HTMLElement | null;
    return { summoner: null, panel: existing, presetPanel, constructed: false, mounted: true, reused: true, error: null };
  }

  if (!document.body) {
    const error = new Error("Enemy Lab cannot mount before document.body exists");
    return { summoner: null, panel: null, presetPanel: null, constructed: false, mounted: false, reused: false, error };
  }

  try {
    const summoner = new DevSummoner(game.bus, game.world, logicW, logicH);
    summoner.init();
    const panel = document.getElementById(DEV_SUMMONER_PANEL_ID) as HTMLElement | null;
    const presetPanel = document.getElementById(FSM_PRESET_EDITOR_ID) as HTMLElement | null;
    const mounted = !!panel?.isConnected && !!presetPanel?.isConnected;
    return { summoner, panel, presetPanel, constructed: true, mounted, reused: false, error: null };
  } catch (error) {
    return { summoner: null, panel: null, presetPanel: null, constructed: false, mounted: false, reused: false, error };
  }
}
