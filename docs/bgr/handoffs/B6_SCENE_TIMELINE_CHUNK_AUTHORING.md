# B6 — Scene Timeline and Chunk Authoring

## Repository

- Repository: `/workspace/MGoD`
- Target integration branch X: `pixel_bgr`
- Local session branch Y: `codex/b6-scene-timeline-chunk-authoring`
- Starting HEAD: `2bfc3a4aeb756ee29682f3f785b757de9c69f282` (`Merge pull request #117 from catsystemexe/codex/add-environment-markers-and-triggers`)
- Final commit: local commit on `codex/b6-scene-timeline-chunk-authoring`
- Remote/push status: not pushed; hosted PR intentionally not created per session constraints

## B1–B5 presence verification

- B1 typed sprite/parallax remains present through `BackgroundLayerTypes`, layer resolve helpers, and existing B1 smokes.
- B2 scene/chunk composition remains present through `BackgroundScene`, `BackgroundChunk`, active chunk resolution, and chunk-local runtime ids.
- B3 Pixel BGR Lab foundations remain present through the typed background state API, import/export envelope, preview state, and draft persistence.
- B4 visual placement remains present through canvas overlay placement, asset catalog, numeric controls, and placement smokes.
- B5 markers and presentation-only triggers remain present through scene/chunk marker data, marker resolution, marker runtime reset/manual fire controls, and marker smokes.

## Architecture summary

B6 keeps the existing runtime model intact. The new timeline is an authoring surface over the existing `BackgroundScene` and `BackgroundChunk` data rather than a new scene model. It does not add render passes, EventBus integration, gameplay events, or marker action kinds.

The Lab visible heading now reads **Scene Lab**, while internal `PixelBgrLab*` module names remain stable for compatibility with existing access/toggle code and smokes.

## Timeline model summary

- Scene remains the level-level container with global layers, chunks, and global markers.
- Chunk remains the X-axis level segment with chunk-local layers and markers.
- Chunk interval interpretation is unchanged: `[startX, startX + length)`.
- The timeline uses one primary horizontal chunk line. Chunks are shown as horizontal blocks positioned from `startX` and sized from `length`.
- Timeline math lives in `src/ui/PixelBgrTimeline.ts` as pure helpers for scale, world/pixel conversion, chunk block rects, and overlap ranges.

## Overlap behavior

Overlaps are intentionally visual warnings, not blocking errors. Any interval where more than one chunk is active is rendered as a red hatched overlay on the same single-line timeline. The selected chunk inspector lists overlap ranges for the active chunk.

## Unified Current X and transport behavior

The timeline now exposes one user-facing position: **Current X**. In PREVIEW mode, Current X is backed by `BackgroundPreviewState.scrollX` and drives the preview world position, chunk evaluation, marker evaluation, and the single visible cursor. In GAMEPLAY mode, Current X follows the existing gameplay/world scroll authority. The UI shows only a small `PREVIEW`/`GAMEPLAY` mode indicator plus the Current X label; it does not present competing preview/gameplay scroll values in the main timeline controls.

Clicking or dragging the timeline/cursor automatically enables Preview mode, pauses preview playback, and updates Current X without copying the preview position back into gameplay state. Returning Preview mode Off restores the existing gameplay scroll authority.

The transport controls are icon buttons with tooltips/ARIA labels in this order: Previous chunk, Play/Pause, Stop and return to start, Next chunk. Play starts or continues from Current X; Pause freezes at Current X; Stop pauses and returns Current X to the scene start (currently `0` unless a future scene model defines another minimum). Previous/next chunk use chunks sorted by `startX`: previous is the greatest `chunk.startX < Current X`, next is the smallest `chunk.startX > Current X`; edge buttons are disabled and jumps update the cursor/preview immediately without starting playback.

Realtime cursor drag stores the drag-start pointer X and drag-start Current X. Each pointermove computes `nextX = dragStartCurrentX + screenDeltaPx / timelineScalePxPerWorldUnit`, clamps to timeline bounds, updates Current X continuously, and redraws the cursor/preview from the same value. Pointerup commits the current value without adding another delta; pointercancel clears drag state; unrelated pointer ids are ignored.

## Selected chunk inspector behavior

The selected chunk inspector appears below the timeline and shows:

- chunk id,
- `startX`,
- `length`,
- computed `endX`,
- overlap ranges,
- layer count,
- marker count,
- quick access to chunk-local layers,
- add marker action using the existing B5 marker model.

Chunk movement/resizing is provided through both reliable numeric `startX`/`length` controls in the inspector and direct pointer editing on the single-line timeline. Dragging a chunk body moves `startX`; dragging the left or right handle resizes the interval. Direct edits snap to the timeline grid, clamp `startX >= 0`, and clamp length to the minimum timeline chunk length. The timeline and inspector update immediately from the edited scene draft.

## UI opacity behavior

A Scene toolbar opacity slider adjusts only the Lab overlay background opacity via the Scene Lab-owned `--cm-scene-lab-opacity` CSS custom property and a Scene Lab instance field. It does not reuse the Enemy Lab opacity selector, id, CSS variable, state, or storage key, and it does not mutate scene content, background layer opacity, marker actions, renderer state, gameplay state, or Enemy Lab UI state. The value is preserved while the Scene Lab instance remains alive, so closing and reopening the Lab during the same session keeps its own opacity.

## Files changed

- `src/ui/PixelBgrLabUI.ts` — scene-first toolbar, single-line chunk timeline, marker row, preview cursor, selected chunk inspector, opacity slider.
- `src/ui/PixelBgrTimeline.ts` — pure timeline coordinate, cursor drag math, chunk jump, block, bounds, and overlap helpers.
- `src/ui/PixelBgrTimeline.smoke.ts` — focused smoke coverage for timeline math, opacity namespace separation, cursor drag contracts, chunk navigation, transport contracts, and unified Current X UI strings.
- `src/smoke/runSmokes.ts` — includes the B6 timeline smoke in the broader smoke runner.
- `docs/bgr/README.md` — adds this B6 handoff to the BGR document index.
- `docs/bgr/handoffs/B6_SCENE_TIMELINE_CHUNK_AUTHORING.md` — this handoff.

## Tests run

- `npm ci` — passed; npm reported existing audit vulnerabilities.
- `npm run typecheck` — passed after replacing an `Array.prototype.at` use that is not available under the current TypeScript lib target.
- `npm run test` — passed.
- `npm run build` — passed.
- `npx tsx src/ui/PixelBgrLab.smoke.ts` — passed.
- `npx tsx src/ui/PixelBgrTimeline.smoke.ts` — passed.
- `git diff --check` — passed.

Full `npm run smoke` was not required for this UI-focused session and was not used as the final validation gate; the repository playbook still documents the known unrelated BombExplosionChain failure if the full suite is run.

## Manual visual verification checklist

Use Replit/iPad/external-monitor runtime verification:

1. Open the game preview.
2. Open the Lab / Scene Lab with the existing Pixel BGR Lab launch path or F8.
3. Verify the top Scene toolbar contains scene id, load current, export, import, duplicate, delete/reset, close, and UI opacity.
4. Verify the primary center area is a single-line chunk timeline, not a multi-track layout.
5. Verify chunk blocks align with the ruler and show `startX..endX` labels.
6. Create or edit chunks so intervals overlap and confirm the red hatched overlap highlight appears on the same line.
7. Add a chunk with `+ chunk after last`.
8. Select a chunk block and confirm the selected chunk inspector updates below the timeline.
9. Adjust `startX` and `length`; confirm `endX`, overlap info, and timeline block position/size update.
10. Confirm the timeline shows a single **Current X** value and only one vertical cursor line.
11. Confirm the mode pill switches between `GAMEPLAY` and `PREVIEW`; turning Preview mode Off returns the cursor to gameplay/world scroll authority.
12. Click the ruler/timeline and verify Preview mode turns On, Current X changes to the clicked X, and the preview world/player position updates immediately without changing gameplay scroll.
13. Drag the cursor left and right, including outside the timeline bounds, and verify the cursor and preview move continuously with no mouseup jump.
14. Use Previous chunk and Next chunk; verify they jump to the greatest previous/smallest next chunk `startX`, disable at edges, update preview immediately, and do not start playback.
15. Press Play, Pause, and Stop; verify Play starts from Current X, Pause freezes there, and Stop returns Current X to scene start.
16. Confirm marker row dots align to the same effective X/ruler scale for global and selected chunk markers.
17. Confirm the opacity slider changes only the Scene Lab overlay transparency, does not change Enemy Lab opacity, and persists across closing/reopening Scene Lab in the same session.
18. Check the browser console for errors.

## Known limitations

- Direct pointer move/resize is now supported on the single-line timeline; more advanced touch affordances and keyboard-only direct timeline editing remain future polish.
- Marker row is intentionally simple and only visualizes global plus selected-chunk markers.
- Hosted PR was not created and branch was not pushed per session constraints.
- No new rendering features, marker action kinds, EventBus integration, or gameplay event integration were added.

## Recommended next session

Recommended next work: marker placement directly on the single-line timeline, followed by chunk/layer transition authoring or scene-structure polish. Do not combine those with a renderer rewrite or gameplay integration.

## Preview player synchronization follow-up

### Preview player synchronization

The Scene Lab preview now treats the timeline position as the player/level coordinate rather than as an independent camera-only value. In Preview mode, every timeline click, cursor drag, transport command, and playback tick updates the canonical preview `playerLevelX`; the preview background scroll is derived from that value, and the renderer applies a presentation-only player X override so the visible player matches the same logical level position.

### Canonical Player/Level X model

The user-facing model is `Player X = player position in the level`. Gameplay mode reads that value from the live gameplay player entity world X. Preview mode reads it from `BackgroundPreviewState.playerLevelX`. The UI label is intentionally shown as `Player X: <value> px` to avoid presenting the value as an unexplained camera scroll.

### Gameplay vs Preview ownership

Gameplay mode remains owned by the live gameplay systems, including `WorldScrollSystem`, `PlayerSystem`, and the real player entity. Preview mode is owned by Scene Lab presentation state only. Enabling preview does not copy coordinates back into ECS state, does not rewind simulation, and does not affect physics, collisions, damage, weapons, FSM, input, or save-state authority.

### Coordinate conversion

The preview conversion is:

```text
previewScrollX = playerLevelX - playerScreenAnchorX
playerLevelX = previewScrollX + playerScreenAnchorX
```

The conversion helpers live with background preview state so UI and renderer share the same deterministic formula and finite-value handling.

### Player screen anchor

The player screen anchor is resolved from the current live render relationship: `playerScreenAnchorX = livePlayer.pos.x - gameplayWorld.scrollX`. If either input is not finite, Scene Lab falls back to the established startup/player anchor of `100 px` rather than mutating gameplay state or hard-failing preview.

### Live-state immutability

Preview player synchronization is render-only. The renderer replaces the presentation X used for player drawing while `BackgroundPreviewState.enabled` is true, then continues through the existing world-to-screen camera subtraction. The live player entity `pos`, `posPrev`, velocity, weapons, collision radii, damage state, and gameplay world scroll are not mutated by Scene Lab preview positioning.

### Transport synchronization

Play advances `playerLevelX` and derived `scrollX` together. Pause freezes both values. Stop returns both the preview player X and derived scroll to scene start. Previous/Next chunk jumps call the same canonical position setter as click and drag, so the cursor, preview background, active chunk/marker position, and visible player cannot intentionally diverge through transport controls.

### Marker/chunk position semantics

Markers and preview chunk activation are evaluated against the same canonical player/level X while Preview mode is enabled. In Gameplay mode, the renderer keeps the existing gameplay camera-visible chunk behavior and gameplay scroll-based marker behavior. In Preview mode, marker crossing and active chunk selection use the Scene Lab player-level position so authoring feedback follows the timeline/player contract.

### Tests

Focused smoke coverage was extended for player-level/scroll conversion, finite fallback behavior, playback stepping of `playerLevelX` and `scrollX`, click/drag/transport integration contracts, renderer preview-only player transform usage, and preview marker/chunk evaluation against canonical player level X.

### Visual verification

Manual visual verification checklist for this follow-up:

1. Open Scene Lab during gameplay.
2. Confirm GAMEPLAY mode cursor follows the real player’s level progress.
3. Enable Preview mode.
4. Click a new timeline position.
5. Confirm cursor, background, chunks, markers, and visible player all jump to the same logical level position.
6. Drag the cursor slowly left and right.
7. Confirm the player preview and background move continuously with no lag or release-time jump.
8. Press Play and confirm player preview advances from the current cursor position.
9. Press Pause and confirm everything freezes at the same X.
10. Press Stop and confirm cursor/player preview return to scene start.
11. Use Previous/Next chunk and confirm synchronized jumps.
12. Return to GAMEPLAY mode.
13. Confirm the real player resumes unchanged at the real gameplay position.
14. Confirm no collision, damage, weapon, FSM, or save-state side effects.
15. Confirm no console errors or duplicate listeners.

### Known limitations

This follow-up does not implement gameplay rewind, enemy preview synchronization, weapon simulation, collision replay, marker action changes, or a camera-system rewrite. Preview mode uses a render-only player X presentation override; it does not simulate a full preview ECS world.

## Scene timeline cursor drag isolation follow-up

### Root cause

The yellow cursor drag path still used drag-start screen deltas (`dragStartCurrentX + screenDelta / scale`) from the previous timeline implementation. That was sufficient for a pure camera scroll cursor, but after the preview-player synchronization follow-up the user-facing cursor represents canonical `Player X`. While dragging, pointer movement could also continue to be observed by the game/canvas input path because the timeline drag did not publish an explicit active editor-drag guard. The result was two competing pointer interpretations: Scene Lab updated preview `Player X`, while the lower game/canvas input path could still consume the same active pointer stream and make the world appear to slide behind the UI.

### Timeline coordinate conversion

Cursor drag and click placement now use absolute timeline-local X as the source of truth:

```text
localX = clamp(pointerClientX - timelineRect.left, 0, timelineRect.width)
playerLevelX = visibleTimelineStart + localX / timelinePixelsPerWorldUnit
```

The implementation lives in the `PixelBgrTimeline` pure helpers. `cursorDragCurrentX` now maps the current pointer client X through the active timeline rectangle instead of accumulating raw screen deltas from already-mutated preview state. Repeated move events and pointerup therefore resolve the same canonical `Player X` for the same pointer location.

### Pointer capture and propagation isolation

Cursor pointerdown prevents default behavior, stops propagation, captures the active pointer when supported, stores the pointer id, and registers capture-phase window move/up/cancel listeners for the active drag only. Move, up, and cancel ignore unrelated pointer ids and isolate propagation before applying updates. Cleanup releases pointer capture safely and removes the temporary listeners.

### Game-input guard behavior

Scene Lab sets `globalThis.__CM_SCENE_TIMELINE_DRAG_ACTIVE__` while the yellow cursor drag is active. `InputManager` checks that guard at its canvas pointerdown, pointermove, and pointerup entry points and returns without mutating game input state while Scene Lab owns the active cursor pointer. The guard is cleared on pointerup, pointercancel, close, and dispose through the same cursor-drag cleanup path.

### Immediate cursor rendering

Every valid pointermove updates the canonical preview state with `playerLevelX` plus derived `scrollX`, then updates the cursor DOM `left` style and the visible `Player X` label immediately. The background, player preview, chunks, and markers continue to read the same canonical preview `Player X`; no delayed `change`, `blur`, or pointerup commit is required.

### Click behavior

Empty timeline/ruler pointerdown uses the same absolute local-X mapping as drag to place the cursor and enable preview positioning immediately. Chunk blocks, resize handles, marker dots, and other child controls are excluded by target checks so they do not accidentally reposition the cursor or start a canvas/world drag.

### Cleanup behavior

Pointerup and pointercancel both end the active cursor drag without recomputing an extra final delta. Closing or disposing Scene Lab also releases pointer capture, removes window listeners, and clears the game-input guard.

### Tests and manual verification

Focused timeline smoke coverage now checks left/right/midpoint absolute mapping, positive and negative absolute pointer movement, drift-free repeated moves, no pointerup jump, wrong-pointer-id filtering, propagation isolation, the active input guard source contract, immediate cursor/label update source contract, click target isolation, and existing preview-player synchronization contracts.

Manual browser verification was not performed in this non-interactive terminal session. The required manual checklist remains: drag the cursor slowly in both directions, confirm it stays under the pointer, confirm the world/player preview only follows derived `Player X`, release without a jump, cancel/release outside safely, click empty timeline space, drag chunk bodies/handles without cursor movement, exercise transport controls, exit preview, and check the console for pointer-capture/listener errors.

## Single Gameplay Authoring Mode follow-up

### Unified authoring model

Scene Lab now uses a single Gameplay Authoring Mode. The timeline cursor represents the live gameplay `Player X`; the visible Preview toggle and `PREVIEW`/`GAMEPLAY` mode labels were removed. There is no second user-facing preview position and no yellow render-only preview cursor.

### Canonical Player X authority and seek API

The canonical position is the actual gameplay player entity `pos.x`. Scene Lab timeline clicks, cursor drags, Previous chunk, Next chunk, and Stop route through the gameplay seek API exposed on the game runtime as `seekGameplayToPlayerX(targetX, options)`. The API clamps to supplied scene bounds, pauses during the transaction, writes the real player position, synchronizes world scroll, clears transient runtime state, resets authoring input state, and restores the requested paused/running state.

### Player/world scroll synchronization

Seek keeps the existing player screen anchor stable by deriving `world.scrollX = playerX - playerScreenAnchorX`. The renderer now evaluates authored scene chunks and markers from the gameplay player level X and reads normal gameplay entity state for the player; the previous render-only preview player X override is no longer authoritative.

### Transient cleanup policy

Gameplay seek clears short-lived old-location state: projectile, enemyProjectile, bomb, particle, fx, laser, enemy, and pickup entities are marked and cleaned up while preserving the player slot. `ParticleStore.clear()`, `VFXSystem.clear()`, and enemy group runtime reset are also called when available. This prevents obvious stale shots, VFX, explosions, and encounter remnants from persisting after a large authoring seek.

### Persistent player-state policy

Seek preserves persistent player state by default, including health/energy, bombs, weapons/upgrades, score/session state, lives, and progression. It resets only positional/transient player fields needed for a safe seek: X, `posPrev`, horizontal velocity, pending kill, and stale input/button state.

### Marker seek/reset policy

Seek requests a background marker runtime reset and establishes the target Player X as the new baseline. Seeking does not traverse intermediate markers, so markers between the old and new X do not retro-fire. Future forward movement fires markers normally from the new baseline, with repeatable/once behavior governed by the existing marker runtime contract.

### Enemy/spawn limitations

This follow-up does not add a deterministic encounter reconstruction, save-state rewind, replay system, or new spawn timeline. The minimal safe behavior is to clear stale enemy/group runtime state at seek time and resume existing director/spawn/gameplay systems from the target Player X. Already-passed authored encounters are not reconstructed by this implementation.

### Input restoration

During cursor drag, Scene Lab owns the pointer stream and the existing `__CM_SCENE_TIMELINE_DRAG_ACTIVE__` guard keeps canvas pointer input from consuming the drag. Pointerup and pointercancel clear the guard. The seek API clears stale pointer/button state so keyboard/gamepad/player controls can be sampled normally after the drag ends.

### Transport semantics

- Previous chunk: seek the live player to the previous chunk start and preserve the current paused/running state.
- Play/Pause: toggle the real fixed-step loop pause state.
- Stop: seek to the scene start and pause.
- Next chunk: seek the live player to the next chunk start and preserve the current paused/running state.

### Tests and validation

Added `src/game/authoring/GameplaySeek.smoke.ts` for clamp behavior, Player X to scroll synchronization, transient cleanup, persistent player-state preservation, input reset, and marker baseline semantics. Updated `src/ui/PixelBgrTimeline.smoke.ts` for the single-mode UI and renderer contract. The broad smoke runner still reaches the known pre-existing `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion` failure after the new focused smokes pass.

### Manual verification

Browser-level visual/runtime verification was not performed in this non-interactive terminal session. The manual checklist remains required in a browser/Replit runtime: confirm the Preview toggle and mode labels are gone, the blue cursor seeks the real player, Previous/Next/Stop move the actual player, Play/Pause controls the loop, input resumes after drag, markers do not retro-fire on seek, and stale projectiles/VFX are cleared.
