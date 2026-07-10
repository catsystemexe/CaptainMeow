import type { EntityStore } from "../../engine/ecs/EntityStore";
import type { InputManager } from "../../engine/input/InputManager";
import type { InputRuntime } from "../data/InputRuntime";
import type { WorldState } from "../data/WorldState";

export interface GameplaySeekBounds { startX: number; endX: number }
export interface GameplaySeekOptions { bounds?: Partial<GameplaySeekBounds>; pauseAfterSeek?: boolean }
export interface GameplaySeekResult { requestedX: number; playerX: number; scrollX: number; wasPaused: boolean; paused: boolean; clearedEntities: number }
export interface GameplaySeekDeps {
  playerEnt: any;
  playerRef: { slot: number };
  store: EntityStore<any>;
  world: WorldState;
  loop: { isPaused?: () => boolean; setPaused?: (on: boolean) => void };
  inputRt: InputRuntime;
  inputMgr?: InputManager;
  enemyGroups?: { reset?: () => void };
  particleStore?: { clear?: () => void };
  vfx?: { clear?: () => void };
  playerScreenAnchorX?: number;
}

const TRANSIENT_KINDS = new Set(["projectile", "enemyProjectile", "bomb", "particle", "fx", "laser", "enemy", "pickup"]);

function finite(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampGameplaySeekX(targetX: number, bounds: Partial<GameplaySeekBounds> = {}): number {
  const startX = finite(bounds.startX, 0);
  const rawEndX = finite(bounds.endX, startX);
  const endX = Math.max(startX, rawEndX);
  return Math.max(startX, Math.min(endX, finite(targetX, startX)));
}

export function deriveGameplayScrollX(playerX: number, playerScreenAnchorX = 100): number {
  return finite(playerX, 0) - finite(playerScreenAnchorX, 100);
}

export function clearAuthoringTransientEntities(store: EntityStore<any>, playerSlot: number): number {
  let cleared = 0;
  store.debugForEachAlive((ref, entity: any) => {
    if (ref.slot === playerSlot || !entity || entity.pendingKill) return;
    if (!TRANSIENT_KINDS.has(String(entity.kind ?? ""))) return;
    entity.pendingKill = true;
    cleared++;
  });
  store.cleanup();
  return cleared;
}

export function resetSeekInputState(inputRt: InputRuntime, inputMgr?: InputManager): void {
  inputRt.actions.move.x = 0;
  inputRt.actions.move.y = 0;
  inputRt.actions.firePrimary = false;
  inputRt.actions.fireSecondary = false;
  inputRt.actions.bombPressed = false;
  inputRt.actions.toggleW1WeaponPressed = false;
  inputRt.actions.cycleW1LevelPressed = false;
  inputRt.actions.cycleW2LevelPressed = false;
  inputMgr?.clearTransientPointerState?.();
}

export function seekGameplayToPlayerX(targetX: number, options: GameplaySeekOptions, deps: GameplaySeekDeps): GameplaySeekResult {
  const wasPaused = deps.loop.isPaused?.() ?? false;
  deps.loop.setPaused?.(true);

  const playerX = clampGameplaySeekX(targetX, options.bounds);
  const scrollX = deriveGameplayScrollX(playerX, deps.playerScreenAnchorX ?? 100);
  const player = deps.playerEnt;
  const currentY = finite(player?.pos?.y, 0);

  player.pos = { ...(player.pos ?? {}), x: playerX, y: currentY };
  player.posPrev = { x: playerX, y: currentY };
  player.vel = { ...(player.vel ?? {}), x: 0, y: 0 };
  player.pendingKill = false;
  deps.world.scrollX = scrollX;

  const clearedEntities = clearAuthoringTransientEntities(deps.store, deps.playerRef.slot);
  deps.enemyGroups?.reset?.();
  deps.particleStore?.clear?.();
  deps.vfx?.clear?.();
  resetSeekInputState(deps.inputRt, deps.inputMgr);

  const paused = options.pauseAfterSeek ?? wasPaused;
  deps.loop.setPaused?.(paused);
  return { requestedX: targetX, playerX, scrollX, wasPaused, paused, clearedEntities };
}
