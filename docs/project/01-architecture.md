# Captain Meow — Architecture

Status: CANONICAL HIGH-LEVEL ARCHITECTURE SUMMARY
Last audited: 2026-08-26

This document describes the verified current architecture at a high level. Actual code remains authoritative for implemented behavior. Historical architecture documents may contain useful context but do not override current code.

## Runtime and stack

- TypeScript ESM
- Vite browser application
- strict TypeScript configuration
- fixed-step gameplay simulation at 60 Hz
- browser rendering/audio
- Node-compatible smoke checks for selected subsystems

## Engine layer — `src/engine`

The engine owns low-level reusable infrastructure, including:
- fixed-step loop;
- EventBus / phase ownership;
- entity/ECS storage and stable references;
- input primitives;
- low-level math/helpers;
- low-level FX storage where applicable.

Game-specific content and balance should not be moved into the engine layer without an explicit architecture decision.

## Gameplay layer — `src/game`

The game layer owns domain/runtime composition, including:
- game bootstrapping;
- world/session state;
- gameplay systems;
- player and enemy behavior;
- FSM / behavior contracts and runtime;
- spawning/director/group behavior;
- weapons/projectiles/collisions/damage;
- scoring/respawn/pickups;
- gameplay VFX triggers;
- content loading and normalization.

## Content model

Gameplay IDs and definitions are primarily data-driven.

Known content sources include JSON/definition families for:
- enemy types;
- behavior presets / graphs;
- attack profiles;
- director waves;
- related authoring/runtime contracts.

Derived runtime maps are APIs derived from canonical content and should not become parallel competing registries.

## Rendering and presentation

Rendering is a presentation authority, not gameplay authority.

Current rendering families include:
- WebGL scene rendering;
- sprite/glyph/procedural rendering;
- frame/animation presentation;
- background/BGR layer rendering;
- framebuffer/display/post-processing infrastructure where applicable.

Presentation state may maintain render/GPU timing and visual interpolation, but must not silently become the source of gameplay simulation truth.

## BGR / scene architecture

The saved `pixel_bgr` baseline contains the BGR B1–B6 implementation line, including:
- typed background/parallax layers;
- background scene chunks;
- Pixel BGR Lab authoring;
- visual placement / asset workflow;
- environment markers / presentation triggers;
- timeline/chunk authoring;
- gameplay seek support for authoring workflows.

A later unfinished `createGame.ts` follow-up is preserved separately on `backup/replit-bgr-lab-preaudit-20260825` and is not part of this canonical implemented baseline.

## Developer UI / labs

Captain Meow includes development and authoring UI integrated with the runtime. These tools may expose editable authoring state, diagnostics and preview behavior.

Passing static checks is insufficient to prove authoring UI/UX correctness; runtime/visual verification is required for visible interaction claims.

## Architecture invariants retained from repository-local guidance

Subject to current-code verification, the following remain important engineering invariants:
- fixed-step simulation ownership;
- explicit phase/event ownership;
- stable/generational entity-reference discipline;
- separation of gameplay authority from rendering/presentation;
- content-source ownership instead of duplicate registries;
- browser/Node separation where smoke tests require it;
- preservation of deterministic behavior where the system relies on it.

Detailed executor-facing invariants belong in `AGENTS.md`. This document should stay architectural rather than becoming an implementation playbook.

## Known architecture documentation debt

The previous `docs/architecture/CM_Architecture_v3.1.md` describes a useful earlier architecture slice but its global “single source of truth” claim is obsolete.

Root FSM architecture documents contain valuable design lineage but must be treated as historical/design evidence unless their claims are confirmed against current implementation or promoted through an active decision.

## Change rule

When implementation changes an architectural contract:
1. change code through the approved workflow;
2. verify the implemented behavior;
3. update this document or a more specific canonical decision/architecture document in the same workstream unless explicitly deferred.