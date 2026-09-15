// src/game/data/SessionState.ts
export type SessionState = {
  tick: number;
  timeSec: number;
  score: number;
  lives: number;
  wave: number;
  gameOver: boolean;
  levelState: "active" | "completed";

  // ✅ where the player died last (for respawn)
  lastDeathPos?: { x: number; y: number };
};

export function makeSessionState(): SessionState {
  return {
    tick: 0,
    timeSec: 0,
    score: 0,
    lives: 3,
    wave: 1,
    gameOver: false,
    levelState: "active",
    lastDeathPos: undefined,
  };
}

/** Completes the current MVP Level exactly once. Returns true only on transition. */
export function completeLevel(session: SessionState): boolean {
  if (session.levelState === "completed") return false;
  session.levelState = "completed";
  return true;
}

export function resetLevel(session: SessionState): void {
  session.levelState = "active";
}

export function isLevelActive(session: SessionState): boolean {
  return session.levelState === "active";
}
