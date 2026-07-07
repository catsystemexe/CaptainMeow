// src/engine/core/events.ts
import type { EntityRef } from "../ecs/EntityRef";
import type { Vec2 } from "../math/Vec2";

export const EventType = {
  SPAWN_ENEMY: "SPAWN_ENEMY",
  SPAWN_PROJECTILE: "SPAWN_PROJECTILE",
  SPAWN_BOMB: "SPAWN_BOMB",
  SPAWN_PICKUP: "SPAWN_PICKUP",
  SPAWN_ENEMY_GROUP: "SPAWN_ENEMY_GROUP",

  PLAYER_FIRE_PRIMARY: "PLAYER_FIRE_PRIMARY",
  PLAYER_FIRE_BOMB: "PLAYER_FIRE_BOMB",

  PROJECTILE_HIT_ENEMY: "PROJECTILE_HIT_ENEMY",
  PROJECTILE_HIT_CA: "PROJECTILE_HIT_CA",

  // ✅ missing -> freeze culprit
  PLAYER_HIT_ENEMY: "PLAYER_HIT_ENEMY",

  ENEMY_PROJECTILE_HIT_PLAYER: "ENEMY_PROJECTILE_HIT_PLAYER",

  PLAYER_PICKUP: "PLAYER_PICKUP",
  
  CA_CELLS_KILLED: "CA_CELLS_KILLED",
  ENTITY_DAMAGED: "ENTITY_DAMAGED",
  ENTITY_KILLED: "ENTITY_KILLED",

  // General area-of-effect detonation (bomb today; CA terrain / enemy death later)
  EXPLOSION: "EXPLOSION",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export const SPAWN_EVENT_TYPES = [
  "SPAWN_ENEMY",
  "SPAWN_PROJECTILE",
  "SPAWN_BOMB",
  "SPAWN_PICKUP",
  "SPAWN_ENEMY_GROUP",
] as const;

export type SpawnEventType = typeof SPAWN_EVENT_TYPES[number];


export type CMEventMap = {
  [EventType.SPAWN_PROJECTILE]: {
    owner: EntityRef;
    origin: Vec2;
    dir: Vec2;
    weaponTypeId: string; // concrete weapon id (e.g. "w1.basic")
    weaponLevel?: number;
  };

  [EventType.SPAWN_BOMB]: {
    owner: EntityRef;
    origin: Vec2;
    target: Vec2;
  };

  [EventType.SPAWN_ENEMY]: {
    typeId: string;
    waveId?: string;
    spawn?: { x: number; y: number };
    /** Movement behavior preset id for Simple/Smart movement. Not an FSM controller id. */
    behaviorPresetId?: string;
    /** Explicit FSM controller preset id for normal persisted Enemy Lab spawns. */
    fsmPresetId?: string;
    /** Dev-only FSM preview override. Normal gameplay resolves fsmPresetId/default graph ids from persisted registries. */
    resolvedFsmPresetOverride?: unknown;
    devManualSpawnId?: number;
    spawnOrdinal?: number; // ✅ BE V1: deterministic index within wave
    spawnAgeSec?: number;  // ✅ director backlog catch-up (seconds since scheduled spawn)
  };

  [EventType.SPAWN_PICKUP]: { defId: string; pos: Vec2 };

  [EventType.SPAWN_ENEMY_GROUP]: {
    enemyTypeId: string;
    count: number;
    anchor: Vec2;
    formationId: string;
    movementPresetId: string;
    cohesionId: string;
    /** Explicit FSM controller preset id for the group anchor and members. */
    fsmPresetId?: string;
    /** Dev-only FSM draft override for Enemy Lab manual group spawns. */
    resolvedFsmPresetOverride?: unknown;
    /** Dev-only correlation id for Enemy Lab runtime diagnostics. */
    devManualSpawnId?: number;
    spacing?: number;
    params?: {
      formation?: { spacing?: number; depth?: number; radius?: number; angle?: number; facing?: string; startAngle?: number };
      cohesion?: { response?: number; maxCatchupSpeed?: number };
    };
  };

  [EventType.PLAYER_FIRE_PRIMARY]: { owner: EntityRef };
  [EventType.PLAYER_FIRE_BOMB]: { owner: EntityRef; target: Vec2 };

  [EventType.PROJECTILE_HIT_ENEMY]: { projectile: EntityRef; enemy: EntityRef };
  [EventType.PROJECTILE_HIT_CA]: { projectile: EntityRef; x: number; y: number };

  [EventType.PLAYER_PICKUP]: { player: EntityRef; pickup: EntityRef; defId: string };
  
  // ✅ contact event
  [EventType.PLAYER_HIT_ENEMY]: { player: EntityRef; enemy: EntityRef };

  [EventType.ENEMY_PROJECTILE_HIT_PLAYER]: {
    projectile: EntityRef;
    player: EntityRef;
    damage: number;
  };

  [EventType.CA_CELLS_KILLED]: { count: number; source: string };

  // ✅ keep schema strict + useful
  [EventType.ENTITY_DAMAGED]: {
    target: EntityRef;
    amount: number;
    hpAfter: number;
    source: string;
  };

  [EventType.ENTITY_KILLED]: {
    target: EntityRef;
    source: string;
    isPlayer: boolean;
  };

  [EventType.EXPLOSION]: {
    x: number;
    y: number;
    radius: number;
    damage: number;
    source: string;
  };
};
