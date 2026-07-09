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
