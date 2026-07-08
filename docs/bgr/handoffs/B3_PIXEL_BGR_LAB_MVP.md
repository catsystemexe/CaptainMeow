# B3 — Pixel BGR Lab MVP

## Repository/session baseline
- repository: `/workspace/MGoD`
- local session branch: `work` (treated as the supplied `pixel_bgr` snapshot; local name may be synthetic)
- starting HEAD: `38bf3ad Merge pull request #111 from catsystemexe/codex/verify-b2-background-scene-implementation`
- B1/B2 verification: B1 typed layer descriptors and smokes existed under `src/render/webgl/bg/layers`; B2 `BackgroundScene`, `BackgroundChunk`, scene resolver, B2 demo state, and `KeyV` activation existed.
- starting working tree: clean (`git status --short --branch` showed `## work`).

## Source documents used
- `AGENTS.md`
- `docs/bgr/fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`
- `docs/bgr/fable-audit/FABLE_BRG_B1_CONTRACT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ROADMAP.md`
- `docs/bgr/fable-audit/PIXEL_BGR_LAB_DESIGN_PROPOSAL.md`
- `docs/bgr/handoffs/B1_TYPED_SPRITE_PARALLAX.md`
- `docs/bgr/handoffs/B2_BACKGROUND_SCENE_CHUNKS.md`

## Baseline validation
- `npm ci`: PASS; npm reported existing audit advisories and no audit fix was run.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Implemented scope
- Pixel BGR Lab panel shell with scene toolbar, chunk panel, layer panel, property panel, preview controls, validation status, import, export, draft persistence, and close behavior.
- Lab edits the existing `BackgroundScene`, `BackgroundChunk`, and `BackgroundLayer` runtime model.
- Valid drafts apply immediately to the existing runtime background state used by B2 scene resolution and B1 layer rendering.
- Preview scroll is presentation-only background input and is reversible.

## Files changed
- `src/render/BackgroundState.ts`: typed background state store, listeners, scene setter, preview state helpers, and B1/B2 demo compatibility.
- `src/render/webgl/WebGLSceneRenderer.ts`: background scroll selector uses preview scroll only when enabled; gameplay world scroll remains unchanged.
- `src/main.ts`: Pixel BGR Lab initialization and F8 hotkey; B2 demo toggle now uses the typed state API.
- `src/ui/PixelBgrLabUI.ts`: DOM UI and idempotent open/close controller for the Lab.
- `src/ui/PixelBgrLabState.ts`: pure scene/chunk/layer editing helpers.
- `src/ui/PixelBgrLabValidation.ts`: pure validation helpers with errors and warnings.
- `src/ui/PixelBgrLabSerialization.ts`: import/export envelope and draft payload helpers.
- `src/ui/PixelBgrLab.smoke.ts`: targeted B3 smoke tests, including shared toggle-label helper coverage.
- `src/ui/PixelBgrLabAccess.ts`: touch-accessible launch button and shared toggle helper.
- `src/smoke/runSmokes.ts`: registers the B3 smoke before the known BombExplosionChain failure.
- `docs/bgr/README.md`: B3 handoff link.
- `docs/bgr/handoffs/B3_PIXEL_BGR_LAB_MVP.md`: this handoff.

## Lab architecture
- UI modules: `PixelBgrLabUI.ts` owns the Lab DOM and `PixelBgrLabAccess.ts` owns the visible touch/mouse launch button.
- state ownership: `BackgroundState.ts` owns the typed background state and preview state.
- runtime state API: `getBackgroundState`, `setBackgroundState`, `setBackgroundScene`, `clearBackgroundState`, `subscribeBackgroundState`, and preview helpers.
- draft state: the Lab clones the current runtime scene or B2 demo scene into a local draft and applies valid drafts immediately.
- validation: `PixelBgrLabValidation.ts` validates the typed runtime scene without coupling to renderer warnings.
- serialization: `PixelBgrLabSerialization.ts` exports/imports a small JSON envelope containing the typed scene.
- preview: `BackgroundPreviewState` is explicit and only affects background render scroll selection.

## Runtime integration
- The Lab updates `BackgroundScene` via `setBackgroundScene` after validation passes.
- The renderer reads `getBackgroundState` and then B2 resolves chunks and B1 draws the composed layers.
- The global `__CM_BACKGROUND_STATE__` remains a compatibility/debug bridge, but it is no longer the only API contract.
- Existing render pass order is unchanged.

## Scene and chunk editing
- supported operations: load current, reset demo, edit scene id, add/duplicate/delete/reorder chunks, edit chunk `id`, `startX`, and `length`.
- id handling: new and duplicated ids are generated owner-locally; validation blocks duplicate chunk ids.
- interval handling: numeric editing preserves authored array order and does not auto-pack chunks.
- overlap behavior: overlaps are warnings, not errors, matching B2 resolver compatibility.

## Layer editing
- supported layer types: all existing typed kinds are displayed and preserved; sprite layers are editable; shader/flow layers are displayed with common fields.
- supported sprite properties: texture URL, opacity, blend, parallax X/Y, offset X/Y, repeat X/Y, enabled, id, and filtering display.
- unsupported fields: no scale, rotation, tint, anchor, crop, animation, placement handles, shader parameter editor, or flow parameter editor.
- ordering behavior: layer move up/down preserves owner-local array order.

## Preview contract
- gameplay scroll: `WorldScrollSystem` remains authoritative and `world.scrollX` is not mutated.
- preview scroll: explicit `BackgroundPreviewState.enabled` selects preview scroll for background rendering only.
- play/pause/scrub: play advances by `speed * renderDt`, pause freezes, numeric scroll edits scrub immediately.
- restoration behavior: switching to gameplay scroll or closing the Lab clears/disables preview state.

## Import/export
- payload format: pretty JSON envelope `{ format: "captain-meow-background-scene", version: 1, scene }`.
- versioning: version `1` only.
- validation: imports validate before replacing the active draft/runtime scene.
- failure behavior: invalid JSON/envelope/scene leaves the previous valid draft and runtime scene intact and shows inline error text.
- localStorage draft behavior: key `CM_PIXEL_BGR_LAB_DRAFT_v1`; parsing is guarded; invalid stored drafts are ignored; reset clears the draft.

## Tests added
- `src/ui/PixelBgrLab.smoke.ts` covers state store get/set/listeners/clear/B2 compatibility, validation cases, import/export/draft parse guards, editing helper operations and immutability, and pure preview math.

## Visual verification procedure
1. Run `npm run dev`.
2. Tap the visible `Pixel BGR Lab` button, or press `F8` on desktop, to open Pixel BGR Lab.
3. Click `reset B2 demo` and confirm global layers plus `chunk-a` and `chunk-b` are listed.
4. Select `chunk-a`, edit `startX` or `length`, and confirm the real background boundary changes.
5. Select a sprite layer and edit parallax, opacity, repeat, or texture URL; confirm the renderer updates.
6. Enable preview scroll, press play, then pause and scrub across the A/B boundary.
7. Confirm overlapping/intersecting chunks are represented by the B2 resolver.
8. Export JSON, modify the scene, import the exported JSON, and confirm restoration.
9. Reload and confirm guarded draft restore.
10. Switch back to gameplay scroll, close the Lab, and confirm gameplay/background continue.
11. Check console for WebGL, validation, listener, or texture errors.

## Acceptance criteria
1. PASS — Lab opens/closes with the visible `Pixel BGR Lab` button and the retained F8 shortcut.
2. PASS — reads current typed `BackgroundScene`.
3. PASS — resets to B2 technical scene.
4. PASS — global layers can be inspected and common fields edited.
5. PASS — chunks can be selected, added, duplicated, deleted, and reordered.
6. PASS — chunk id, startX, and length can be edited.
7. PASS — chunk overlaps warn and are not blocked.
8. PASS — layers can be selected, added, duplicated, deleted, enabled, and reordered.
9. PASS — B1 sprite fields listed above can be edited.
10. PASS — shader/flow layers are displayed and preserved during clone/export/import.
11. PASS — valid edits apply to the runtime state consumed by the existing renderer path.
12. PASS — preview scroll does not mutate gameplay world scroll.
13. PASS — preview supports play, pause, scrub, speed, reset, and gameplay-scroll restore.
14. PASS — export emits typed scene data in a versioned envelope.
15. PASS — import validates before replacing active scene.
16. PASS — invalid import preserves previous valid scene.
17. PASS — draft persistence is guarded and development-only.
18. PASS — browser global is not the only background state API.
19. PASS — B1/B2 targeted smokes remain compatible.
20. PASS — renderer pass order unchanged.
21. PASS — no visual canvas editor, triggers, post-FX editor, or deferred scope added.
22. PASS — new pure helpers have targeted smoke coverage.
23. PASS — final typecheck, test, build, targeted smokes passed; full smoke status recorded separately.
24. PASS — one focused local implementation commit created.
25. PASS — final working tree clean after commit.
26. PASS — B3 handoff complete.

## B3 touch-access fix

### Universal activation
- visible button location: fixed bottom-right development button above the game canvas.
- label: `Pixel BGR Lab` while closed and `Close Pixel BGR Lab` while open.
- touch/mouse behavior: standard `<button type="button">` with click/touch-compatible activation toggles the Lab open or closed.
- retained F8 shortcut: desktop F8 remains available as a secondary activation path.

### Shared toggle path
- controller/function used by button and keyboard: both the launch button and F8 call `togglePixelBgrLab()` against the single `PixelBgrLabUI` instance.
- duplicate-instance prevention: startup disposes any previous Lab instance and removes any previous launch button before creating the current pair.
- listener/subscription lifecycle: `PixelBgrLabUI.dispose()` unsubscribes from background state and clears open-state listeners; the launch button unsubscribes from open-state updates when removed.

### iPad/Replit verification
1. Run `npm run dev`.
2. Open the Replit preview on iPad.
3. Do not use F8.
4. Tap the visible `Pixel BGR Lab` button in the bottom-right corner.
5. Confirm the Lab opens and the button changes to `Close Pixel BGR Lab`.
6. Tap the button again or use the Lab `close` control.
7. Confirm the Lab closes and the button returns to `Pixel BGR Lab`.
8. Repeat open/close at least 10 times and confirm only one Lab panel exists.
9. Confirm edits still affect the real runtime scene.
10. Enable preview play, close the Lab, and confirm gameplay scroll is restored.
11. Reopen the Lab and confirm the current scene is preserved.
12. On desktop, confirm F8 toggles the same Lab and keeps the button state synchronized.
13. Confirm no duplicate listeners, console errors, or repeated runtime updates.
14. Confirm the button remains tappable at the normal iPad/Replit viewport size.

## Known limitations
- Browser-level visual verification was documented but not executed in this non-interactive terminal session.
- Shader and flow layer parameter editing is intentionally limited to common layer fields for MVP safety.
- The UI is a compact engineering panel, not a visual canvas editor.

## Deferred scope
- visual placement
- asset browser
- triggers
- reactions
- pixel post-FX
- drag-and-drop canvas editing
- thumbnail generation
- production content pipeline
- undo/redo
- shader/flow parameter editors

## Audit discrepancies
- None found between the B1/B2 handoffs and the inspected implementation that affected B3.

## Recommended next session
- B4 visual placement and asset workflow, after browser/Replit visual verification of B3.

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
- `npm run smoke`

## Final verification
- typecheck: PASS.
- test: PASS.
- build: PASS.
- smokes: new B3 and B1/B2 targeted smokes PASS; full smoke command retained the documented BombExplosionChain failure.
- diff check: PASS.
- git status: clean after commit.

## Commit
- subject: `feat(bgr): add Pixel BGR Lab MVP`
- hash: recorded in final response.

## Explicitly unchanged
- gameplay
- WorldScrollSystem authority
- FSM
- enemies
- weapons
- VFX
- particles
- atmosphere
- post-FX order
