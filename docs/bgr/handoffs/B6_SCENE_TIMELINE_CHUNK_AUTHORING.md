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

## Cursor/play behavior

The preview cursor is rendered on the same X axis as chunks and markers. Clicking the ruler/timeline places the cursor by writing `BackgroundPreviewState.scrollX`, enabling preview mode, and pausing it for deterministic authoring. The preview controls include current preview X, play from cursor, pause, and reset; play resumes the existing preview scroll mechanism from the cursor position.

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

A Scene toolbar opacity slider adjusts only the Lab overlay background opacity via a CSS custom property. It does not mutate scene content, background layer opacity, marker actions, renderer state, or gameplay state.

## Files changed

- `src/ui/PixelBgrLabUI.ts` — scene-first toolbar, single-line chunk timeline, marker row, preview cursor, selected chunk inspector, opacity slider.
- `src/ui/PixelBgrTimeline.ts` — pure timeline coordinate, block, and overlap helpers.
- `src/ui/PixelBgrTimeline.smoke.ts` — focused smoke coverage for timeline math and overlap rules.
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
10. Place the preview cursor by clicking the ruler/timeline.
11. Press play from cursor, pause, and reset; confirm preview scroll behavior remains presentation-only.
12. Confirm marker row dots align to the same ruler scale for global and selected chunk markers.
13. Confirm the opacity slider changes Lab overlay transparency without changing scene layer opacity.
14. Check the browser console for errors.

## Known limitations

- Direct pointer move/resize is now supported on the single-line timeline; more advanced touch affordances and keyboard-only direct timeline editing remain future polish.
- Marker row is intentionally simple and only visualizes global plus selected-chunk markers.
- Hosted PR was not created and branch was not pushed per session constraints.
- No new rendering features, marker action kinds, EventBus integration, or gameplay event integration were added.

## Recommended next session

Recommended next work: marker placement directly on the single-line timeline, followed by chunk/layer transition authoring or scene-structure polish. Do not combine those with a renderer rewrite or gameplay integration.
