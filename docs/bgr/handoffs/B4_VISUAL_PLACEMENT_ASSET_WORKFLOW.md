# B4 — Visual Placement and Asset Workflow

## Repository/session baseline
- Repository: `/workspace/MGoD`.
- Local branch: `work`, treated as the supplied `pixel_bgr` snapshot because the local branch name is not authoritative in this isolated session.
- Starting HEAD: `2780fea Merge pull request #112 from catsystemexe/codex/add-pixel-bgr-lab-mvp`.
- Working tree was clean before implementation.
- B1 was present via typed sprite/parallax layer types, sprite renderer, parallax math, and B1 handoff.
- B2 was present via `BackgroundScene`, chunks, scene resolver, active chunk composition, B2 demo, and B2 handoff.
- B3 was present via Pixel BGR Lab UI/state/validation/serialization/smoke and B3 handoff.
- B3 touch-access fix was present at `6ae4242 fix(bgr): add touch access to Pixel BGR Lab`.

## Source documents used
- `AGENTS.md`.
- `docs/bgr/fable-audit/PIXEL_BGR_LAB_DESIGN_PROPOSAL.md`.
- `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`.
- `docs/bgr/handoffs/B1_TYPED_SPRITE_PARALLAX.md`.
- `docs/bgr/handoffs/B2_BACKGROUND_SCENE_CHUNKS.md`.
- `docs/bgr/handoffs/B3_PIXEL_BGR_LAB_MVP.md`.
- Current implementation files under `src/render`, `src/ui`, `src/smoke`, and `src/main.ts` were treated as authoritative where implementation details were more specific than documentation.

## Baseline validation
- `npm ci`: PASS; npm reported 4 audit advisories and no audit fix was run.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Existing targeted B1-B3 smokes passed: PixelBgrLab, BackgroundLayerResolve, ParallaxOffset, WrappedTileOrigins, BackgroundSceneResolve.

## Implemented scope
- Added visual placement mode to the existing Pixel BGR Lab.
- Added actual game-canvas pointer placement for selected sprite background layers.
- Added DOM overlay synchronized to the canvas viewport.
- Added pixel-safe placement and visible nudge buttons.
- Added typed static background asset catalog using existing repository assets only; B4 now references user-added raster demo PNGs already present on the authoritative `pixel_bgr` branch.
- Added renderer-owned sprite texture metadata exposure.
- Added pure B4 coordinate/editing/catalog smoke coverage.

## Files changed
- `src/ui/PixelBgrLabUI.ts`: visual placement controls, asset selector, pointer drag controller, overlay lifecycle, nudge controls, texture metadata display.
- `src/ui/PixelBgrLabState.ts`: immutable sprite placement, nudge, round, and asset assignment helpers.
- `src/ui/PixelBgrLabCoordinates.ts`: pure canvas viewport, client/internal/world, and parallax inverse helpers.
- `src/ui/PixelBgrLabAssets.ts`: typed static asset catalog.
- `src/ui/PixelBgrLabValidation.ts`: fractional sprite-offset warning.
- `src/ui/PixelBgrLabB4.smoke.ts`: B4 pure smoke tests.
- `src/render/webgl/bg/layers/SpriteBackgroundLayerRenderer.ts`: read-only sprite texture metadata snapshot API.
- `src/render/webgl/WebGLSceneRenderer.ts`: exposes renderer-owned sprite texture metadata to the Lab without Lab image loading.
- `src/smoke/runSmokes.ts`: registers the B4 smoke near the existing Lab smoke.
- `docs/bgr/README.md`: B4 handoff link.
- `docs/bgr/handoffs/B4_VISUAL_PLACEMENT_ASSET_WORKFLOW.md`: this handoff.

## Visual placement architecture
- actual canvas: placement uses `canvas#game`; no second background renderer or canvas clone was added.
- overlay: a fixed DOM overlay is positioned to the resolved game viewport inside the displayed canvas rectangle.
- pointer controller: Pointer Events are installed only on the overlay while visual placement is active; pointer capture is used where available.
- selection ownership: the Lab layer list remains authoritative; only selected sprite layers are editable by placement.

## Coordinate contract
- client coordinates: pointer `clientX/clientY` are mapped through the displayed canvas rect.
- canvas viewport: `resolveCanvasViewportRect` preserves the internal aspect ratio and ignores letterbox bars.
- internal resolution: B4 uses the current game logical resolution, 896×504.
- world coordinates: internal point plus selected preview/gameplay scroll gives world-space authoring intent.
- parallax inverse: B1 render formula is `rendered = authoredWorldOffset - scroll * parallax`; B4 inversion is `authoredWorldOffset = rendered + scroll * parallax`.
- global offsets: global sprite `layer.offset` stores the resulting authored world offset directly.
- chunk-local offsets: chunk sprite `layer.offset.x` stores `authoredWorldX - chunk.startX`; absolute world X is not written into chunk-local content.

## Drag behavior
- pointer lifecycle: pointerdown starts drag, pointermove updates draft/runtime preview, pointerup ends drag and persists draft, pointercancel safely ends drag.
- anchor preservation: drag stores pointer-to-rendered-origin anchor so the sprite does not jump at pointerdown.
- touch/mouse: Pointer Events cover touch, mouse, and pen.
- preview pause behavior: starting drag enables preview state and pauses it for predictable authoring; gameplay scroll authority is not mutated.
- cancellation: pointercancel clears drag state without changing scroll authority.

## Overlay behavior
- selected bounds: selected sprite base tile/origin bounds are shown using renderer texture metadata when ready.
- chunk boundaries: selected chunk start/end lines are shown relative to current scroll; global selection shows viewport-width global context.
- repeated layers: B4 shows base authored tile/origin bounds only and does not create repeated overlay elements.
- visibility lifecycle: overlay is removed when the Lab closes, placement is disabled, or the selection is not an editable sprite.

## Pixel-safe workflow
- integer mode: default on; drag/nudge/round operations write integer internal pixel offsets.
- fractional mode: possible by disabling pixel-safe placement.
- warnings: validation warns on fractional sprite offsets and SVG technical assets.
- nudge steps: selectable 1, 2, 4, and 8 px, with visible arrow buttons for touch/mouse and optional arrow-key nudge while the Lab owns focus.

## Asset workflow
- catalog model: `BackgroundAssetEntry` is static, typed, project-local, and separate from scene content.
- included assets: B1 technical SVG plus the user-added raster PNG demo assets already present on the authoritative `pixel_bgr` branch.
- raster demo asset paths:
  - `public/assets/bg/demo/bgr_demo_stars_tile.png`
  - `public/assets/bg/demo/bgr_demo_orientation.png`
  - `public/assets/bg/demo/bgr_demo_chunk_band.png`
- B4 references those PNG assets through `/assets/bg/demo/...` URLs but does not transport binary PNG files in the Codex session diff.
- the rejected obsolete B4-owned checker PNG asset was removed from the workflow; no source or documentation should reference it.
- binary-file transport is not supported by this PR/session workflow, so future binary assets should be added directly to the integration branch or through another supported asset workflow.
- assignment: selecting a catalog entry assigns its URL to the selected sprite layer through immutable scene helpers.
- manual URL fallback: the existing texture URL text field remains available.
- texture metadata: dimensions/loading/error state come from `SpriteBackgroundLayerRenderer` cache snapshots; the Lab does not load images independently to discover dimensions.

## Runtime compatibility
- state API: the Lab continues to write `BackgroundScene` via existing background state APIs.
- renderer path: B2 resolver and B1 sprite renderer remain the render path.
- texture ownership: texture allocation/disposal remains renderer-owned.
- scroll authority: world/gameplay scroll is not mutated by placement; preview scroll remains presentation-only.
- unchanged pass order: no gameplay phase or render pass order change was made.

## Tests added
- `src/ui/PixelBgrLabB4.smoke.ts` covers coordinate mapping, letterbox rejection, iPad-like aspect ratio, parallax inverse math, global/chunk-local edits, integer/fractional placement, nudge steps, invalid/shader no-op behavior, immutability, asset assignment, and asset catalog integrity.

## Visual Replit/iPad verification
1. Run `npm run dev`.
2. Open Pixel BGR Lab using the visible button.
3. Reset/load the B2 demo scene.
4. Enable Visual placement.
5. Select chunk A and one sprite layer.
6. Confirm selected bounds and chunk boundaries appear.
7. Drag the sprite using touch.
8. Confirm it follows without jumping.
9. Confirm authored offset values update.
10. Enable pixel-safe mode and confirm integer values.
11. Use visible arrow buttons to nudge by 1 px.
12. Change nudge step and confirm exact movement.
13. Select an asset from the asset catalog.
14. Confirm the real renderer changes texture.
15. Scrub to the A/B boundary.
16. Place a chunk-local layer near the boundary.
17. Confirm chunk-local coordinates remain correct.
18. Switch to global layer and confirm global placement semantics.
19. Disable Visual placement and confirm gameplay pointer behavior returns.
20. Close the Lab and confirm overlay disappears.
21. Reopen and confirm scene and selection state behave as documented.
22. Test portrait and landscape iPad/Replit sizes.
23. Check for seams, blur, texture reload loops, console errors, and listener duplication.

## Acceptance criteria
- Implemented: visual placement mode, actual canvas/renderer use, selected bounds, chunk boundaries, coordinate mapping, letterbox rejection, global and chunk-local placement, parallax inverse, anchor-preserving touch/mouse drag, visible nudge controls, pixel-safe integer mode, fractional mode, typed asset catalog using existing assets, renderer metadata, close cleanup, scroll compatibility, B4 tests, local commit.
- Not added: canvas clone renderer, resize/rotation/crop/multi-select/undo/tilemap/triggers/transitions/post-FX/reaction/palette/video/ASCII/mesh editor scope.

## Known limitations
- Overlay bounds use base tile dimensions only for repeated layers.
- Overlay is DOM-based and should be visually verified on target iPad/Replit sizes.
- Texture metadata appears after the renderer has attempted to draw/load the selected sprite.
- Binary asset transport is unsupported in this workflow; raster demo PNGs are expected to be added directly to the authoritative integration branch or through another supported asset workflow.
- No complex canvas hit-testing among repeated tiles was implemented.

## Deferred scope
- Resize handles, snapping guides beyond pixel rounding, crop/scale/rotation, multi-select, undo/redo, thumbnails, drag-and-drop uploads, and production asset management remain deferred.

## Audit discrepancies
- Documentation proposed a broader Lab roadmap; current implementation is intentionally narrower and uses the existing runtime scene model only.
- B4 keeps the existing hard-coded 896×504 logical size used by `main.ts`; a future generalized resolution API may reduce duplication.

## Recommended next session
- Recommend `B4-fix` only if visual iPad/Replit verification finds overlay alignment, touch capture, or listener issues.
- Otherwise recommend `B5 — Environment Markers + Presentation Triggers` after reviewing actual visual authoring workflow findings.

## Commands executed
- `git status --short --branch`
- `git log -5 --oneline --decorate`
- `git branch -vv`
- `git remote -v`
- `git log -12 --oneline --decorate`
- `npm ci`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npx tsx src/ui/PixelBgrLab.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/ParallaxOffset.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/BackgroundSceneResolve.smoke.ts`
- `npx tsx src/ui/PixelBgrLabB4.smoke.ts`
- `npm run smoke`

## Final verification
- Final verification is recorded in the session final response; full smoke retains any repository-known unrelated failure if still present.

## Commit
- `feat(bgr): add visual placement and asset workflow`.

## Explicitly unchanged
- No push.
- No merge.
- No hosted PR creation/update.
- No editor-only scene schema.
- No gameplay phase order changes.
- No duplicated Lab-owned image loading for texture dimensions.

## B4 asset transport fix

### Problem
- PR/session transport rejected a binary PNG.

### Resolution
- Removed the obsolete B4-owned PNG reference.
- Switched the catalog to user-added repository demo PNGs.
- No binary file is added by this fix commit.

### Assets
- `public/assets/bg/demo/bgr_demo_stars_tile.png`
- `public/assets/bg/demo/bgr_demo_orientation.png`
- `public/assets/bg/demo/bgr_demo_chunk_band.png`

### Validation
- Catalog smoke.
- Typecheck.
- Tests.
- Build.
- Binary-free diff confirmation.

## B4 UI polish

### Compact layout
- The Pixel BGR Lab retains the existing three-column `Chunks | Layers | Properties` structure.
- The Lab chrome, row gaps, toolbar gaps, list rows, and button/input heights were tightened for the iPad + external-monitor + mouse/keyboard workflow without converting the Lab to a mobile tab layout.
- The properties column is independently scrollable so visual-placement controls, asset selection, and renderer texture metadata remain reachable at smaller preview heights.
- The top toolbar and compact validation summary remain above the scrollable three-column grid where practical.

### Validation summary
- Validation now renders through one shared summary control.
- A valid scene shows `PASS`; warning-only scenes show a collapsed summary such as `PASS — 3 warnings ▸` by default.
- Error scenes default to expanded detail with an `ERROR — ... ▾` summary while preserving all existing validation errors and warnings.
- Clicking the summary toggles the scrollable detail area; warning/error counts are derived from the existing validation result and no validation behavior is suppressed.

### Numeric steppers
- Supported fields: chunk `startX`, chunk `length`, sprite `opacity`, sprite `parallax.x`, sprite `parallax.y`, sprite `offset.x`, sprite `offset.y`, visual-placement nudge step, preview `scrollX`, and preview `speed`.
- Field-specific steps: chunk start/length `16 px`, opacity `0.05`, parallax `0.05`, offsets use the current nudge step, nudge step `1`, preview scroll `16 px`, and preview speed `10`.
- Clamp behavior: opacity is clamped to `0..1`; chunk length is clamped to a minimum of `1`; parallax, offsets, scroll, and speed preserve their existing allowed numeric ranges.
- Manual input compatibility: stepper text fields remain editable number inputs; temporary text entry is local until commit, and invalid/non-finite committed values fall back through the numeric normalizer without applying invalid runtime state.
- Keyboard behavior: focused numeric fields handle ArrowUp/ArrowDown with the configured step, support Shift for 10× step, commit on Enter through the same input path, and restore the displayed last valid value on Escape. Arrow handling is scoped to focused numeric inputs and does not replace visual-placement keyboard nudging outside numeric fields.

### Verification
- Added `src/ui/PixelBgrLabB4UiPolish.smoke.ts` for pure numeric stepping, clamping, floating-point normalization, non-finite handling, validation summary state, and immutable scene-update coverage.
- Existing Pixel BGR Lab, B4 visual-placement, and B1/B2 background layer smokes remain targeted verification for the runtime model and visual-placement contract.
- External-monitor workflow should be visually verified by opening Pixel BGR Lab, confirming the compact three-column layout leaves more canvas visible, toggling validation details, using steppers/manual keyboard input, verifying visual-placement arrow nudging outside numeric focus, and scrolling the properties panel to reach asset metadata.

## B4 docked layout fix

### Problem
- The full-screen three-column Pixel BGR Lab obscured the real game preview.

### Resolution
- Pixel BGR Lab is now a right-docked panel.
- The information architecture is tabbed.
- Visible canvas space is preserved to the left of the panel.
- The toolbar is compact.
- Panel content scrolls internally.

### Tabs
- Scene
- Chunks
- Layers
- Properties
- Placement

### Preserved behavior
- Runtime state.
- Visual placement.
- Asset workflow.
- Numeric steppers.
- Preview scroll.
- Validation.
- Touch launcher/F8.

### Visual verification
Use the external-monitor workflow below:
1. Open Pixel BGR Lab.
2. Confirm it docks to the right instead of covering most of the screen.
3. Confirm substantial game canvas remains visible on the left.
4. Confirm no page-level horizontal scrollbar appears.
5. Switch through Scene, Chunks, Layers, Properties, and Placement.
6. Confirm only one tab body is visible.
7. Load/reset the B2 demo.
8. Select global layers, chunk A, and chunk B.
9. Select a sprite layer and confirm Properties opens or is reachable.
10. Use numeric −/+ controls.
11. Open Placement.
12. Enable Visual placement.
13. Drag a sprite in the visible canvas area.
14. Confirm overlay alignment remains correct.
15. Confirm asset selector and metadata remain reachable.
16. Use preview play/pause/scrub.
17. Expand/collapse warnings.
18. Resize the external-monitor browser window.
19. Confirm the panel remains docked and scrollable.
20. Close and reopen Lab.
21. Confirm scene state remains preserved.
22. Confirm no duplicate panel, overlay, or listeners appear.
23. Confirm no console errors.
