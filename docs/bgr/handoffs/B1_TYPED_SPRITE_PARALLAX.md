# B1 — Typed Sprite/Parallax Background

## Repository/session baseline
- repository: `/workspace/MGoD`
- session branch: local `work` checkout supplied to the session
- starting HEAD: `09111b4 Create Pixel BGR Lab design proposal document`
- relationship to pixel_bgr snapshot: task identified `pixel_bgr` as the authoritative integration branch; the isolated checkout exposed the supplied snapshot as local `work`; recent commits include the Fable audit (`ef84d03`) and Pixel BGR Lab proposal (`09111b4`), matching the required BGR prerequisite documents.
- working-tree start state: clean (`git status --short --branch` showed `## work` with no file changes).

## Source documents used
- `AGENTS.md`
- `docs/bgr/fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md`
- `docs/bgr/fable-audit/FABLE_BRG_RENDER_PIPELINE.md`
- `docs/bgr/fable-audit/FABLE_BRG_BRG_BRANCH_DEEP_DIVE.md`
- `docs/bgr/fable-audit/FABLE_BRG_REUSE_RISK_MATRIX.md`
- `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`
- `docs/bgr/fable-audit/FABLE_BRG_B1_CONTRACT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ROADMAP.md`
- `docs/bgr/fable-audit/PIXEL_BGR_LAB_DESIGN_PROPOSAL.md`

## Baseline checks
- `npm ci`: PASS; npm reported 4 audit vulnerabilities and did not run `npm audit fix`.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Implemented scope
- Added a minimal typed `BackgroundState` and discriminated `BackgroundLayer` union for `shader`, `flow-ribbon`, `flow-segments`, and `sprite`.
- Added pure helpers for fallback selection, enabled-layer filtering/order preservation, parallax offset math, numeric clamping, and wrapped tile origins.
- Added renderer-owned dispatch in `WebGLSceneRenderer` that adapts existing shader/flow passes and draws sprite layers without a new compositor or render target.
- Added a small sprite background layer renderer with lazy texture loading, nearest filtering, normal/additive blending, X/Y repeat coverage, URL replacement handling, removal cleanup, and load-error skip behavior.
- Added a minimal technical pixel-star SVG asset and a `V` hotkey to enable/disable the B1 typed sprite/parallax demo state.
- Added targeted Node smoke tests for layer resolution/fallback, parallax math, negative/large scroll, repeat coverage, disabled layers, missing texture filtering, and legacy fallback.

## Files changed
- `src/render/webgl/bg/layers/BackgroundLayerTypes.ts`: typed B1 background state/layer descriptors and demo-state factory.
- `src/render/webgl/bg/layers/backgroundLayerMath.ts`: pure resolution, fallback, clamping, parallax, and repeat-origin helpers.
- `src/render/webgl/bg/layers/SpriteBackgroundLayerRenderer.ts`: WebGL sprite background pass and texture lifecycle cache.
- `src/render/BackgroundState.ts`: small typed state shim and demo enable/disable helpers.
- `src/render/webgl/WebGLSceneRenderer.ts`: renderer-owned background layer dispatch with legacy fallback.
- `src/main.ts`: B1 demo hotkey (`V`) for typed sprite/parallax state.
- `src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts`: layer resolution/fallback smoke tests.
- `src/render/webgl/bg/layers/ParallaxOffset.smoke.ts`: parallax offset smoke tests.
- `src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts`: wrap/repeat coverage smoke tests.
- `src/smoke/runSmokes.ts`: registers the new BGR smoke tests before the known pre-existing smoke failure.
- `public/assets/bg/b1_pixel_stars.svg`: small technical test/demo sprite background asset.
- `docs/bgr/README.md`: links this B1 handoff.
- `docs/bgr/handoffs/B1_TYPED_SPRITE_PARALLAX.md`: this handoff.

## Final data model
- `BackgroundState` is `{ enabled: boolean; layers: BackgroundLayer[] }`.
- `BackgroundLayer` is a discriminated union of `ShaderBackgroundLayer`, `FlowRibbonBackgroundLayer`, `FlowSegmentsBackgroundLayer`, and `SpriteBackgroundLayer`.
- Every layer has `id`, `kind`, and `enabled`.
- Shader/flow layers carry only `presetIndex`; their existing internal preset/global behavior remains inside the existing passes.
- Sprite layers carry `texture.url`, `texture.filtering: "nearest"`, `opacity`, `blend`, `parallax`, `offset`, and `repeat`.
- The normal new sprite path reads typed `globalThis.__CM_BACKGROUND_STATE__` via `src/render/BackgroundState.ts`; legacy globals remain a compatibility fallback rather than the sprite layer source of truth.

## Render integration
- `WebGLSceneRenderer` remains owner of the background draw phase.
- Pass order remains background first, then entities/VFX/particles/atmosphere/post-FX as before.
- If typed state is absent, disabled, empty, or has no known layers, the renderer executes the existing legacy shader/flow branch.
- If typed state is active, `resolveBackgroundLayers()` preserves array order and the renderer dispatches each enabled layer by `kind`.
- Existing `DemosceneBg`, `FlowRibbonBg`, and `FlowSegmentsBg` instances are reused; no shader/flow rewrite was performed.

## Coordinate contract
- World scroll remains owned by `WorldScrollSystem` and is read-only input to rendering.
- Sprite parallax offset is resolved as `offset.x - world.scrollX * parallax.x` and `offset.y - world.scrollY * parallax.y`.
- Offsets are layer-local screen/viewport offsets in logical pixels.
- Repeat math uses wrapped tile origins that cover the viewport plus overscan and remains stable for negative and large positive scroll.

## Texture lifecycle
- `SpriteBackgroundLayerRenderer` starts image load lazily on first draw for a sprite layer.
- It owns one `WebGLTexture` per layer id and URL.
- URL changes delete the old texture and create/load a replacement.
- Removed sprite layer ids are disposed through `retainLayerIds()` after dispatch.
- Load errors mark the cache entry as `error`, warn once, and skip that layer; other layers and the frame continue.
- `dispose()` deletes all owned GL resources, though current renderer lifetime does not yet call a global renderer disposal hook.

## Tests added
- `npx tsx src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts`: order, enabled filtering, disabled layer, opacity-zero sprite filtering, invalid layer skip, empty/missing/disabled legacy fallback.
- `npx tsx src/render/webgl/bg/layers/ParallaxOffset.smoke.ts`: parallax 0/1/fractional, offsets, negative scroll, non-finite normalization.
- `npx tsx src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts`: negative scroll, large positive/negative offset, seam spacing, viewport coverage, overscan.
- New smokes are registered in `npm run smoke`; that broader runner still reaches the known pre-existing `BombExplosionChain.smoke.ts` failure after earlier smokes pass.

## Visual verification procedure
- In Replit, run `npm run dev`.
- Open the game preview.
- Press `V` to enable the typed B1 sprite/parallax demo.
- Expected result: the existing shader background remains visible and a pixel-star sprite layer appears over it; as gameplay scroll advances, the sprite layer moves at reduced parallax speed and repeats across the viewport without horizontal seams.
- Press `V` again to disable typed state and return to the legacy shader/flow path.
- Press `B` to toggle legacy shader/flow after disabling typed state; press `F7`/existing BgLab controls to compare current flow behavior.

## Acceptance criteria result
1. Typed `BackgroundState`: PASS.
2. Discriminated union for current background types and sprite: PASS.
3. Existing shader/flow backgrounds still work: PASS by legacy fallback and reused adapters; browser visual verification remains manual.
4. Functional sprite draw path: PASS.
5. Sprite layer uses world scroll read-only: PASS.
6. Parallax X/Y explicit and tested: PASS.
7. Horizontal repeat covers viewport: PASS.
8. Nearest filtering explicit: PASS.
9. Texture loading error/lifecycle handling: PASS.
10. New sprite path not owned only by browser globals: PASS; typed shim is the source for the demo path.
11. No chunk/timeline/editor system: PASS.
12. Typecheck/test/build: PASS; full smoke has the documented pre-existing BombExplosionChain failure.
13. Commit contains B1 scope and handoff only: PASS.
14. Working tree after commit: PASS, verified in final response.

## Known limitations
- No hosted/browser screenshot was captured in this non-interactive terminal session.
- Procedural shader/flow layer opacity is not implemented in B1; those adapters preserve existing pass behavior.
- The demo asset is a technical SVG star tile, not production artwork.
- Renderer disposal is not wired into a broader app shutdown lifecycle; the sprite renderer exposes disposal for future lifecycle work.

## Deferred scope
- chunks
- Pixel BGR Lab
- reactions
- pixel post-FX
- palette/dither/pixelation
- JSON scene format/schema versioning
- level composition/director/timeline
- tilemaps/placed decorations/environment markers
- video/ASCII/mesh terrain layer kinds

## Pre-merge clarification

### Typed state ownership
- The B1 typed sprite path is sourced from `BackgroundState` stored at `globalThis.__CM_BACKGROUND_STATE__` through `src/render/BackgroundState.ts`. The `V` demo hotkey writes that typed state and the renderer resolves it before drawing layers.
- Existing `__CM_BG_KIND__`, `__CM_BG_PRESET__`, and `__CM_BG_LAB__` globals remain only as the legacy shader/flow compatibility and debug boundary when typed state is absent, disabled, empty, or has no known layers.

### Blend-state safety
- `SpriteBackgroundLayerRenderer` enables blending per sprite layer draw and explicitly chooses `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` for `normal` or `SRC_ALPHA, ONE` for `additive`.
- The sprite renderer disables `BLEND` before returning. Later entity, VFX, particle, and atmospheric paths either draw with blending disabled or explicitly set their own blend function before blended draws, so the sprite layer does not leave `BLEND` enabled for later passes.

### Demo asset status
- `public/assets/bg/b1_pixel_stars.svg` is a technical renderer/repeat validation asset only, not production pixel art.
- Production pixel-art background validation should use raster pixel assets such as PNG files with confirmed nearest-filter sampling and seam behavior.

### PR workflow note
- The earlier `make_pr` invocation only recorded PR metadata in the Codex/tool environment. It did not push a branch, merge code, or create a hosted repository PR from this checkout.
- The user still creates the real PR and performs merge manually.

### Next session correction
- The next planned implementation session is **B2 — Background Scene and Chunk Composition**.
- Pixel BGR Lab follows after the runtime chunk model is stable; BgLab/GridLab integration is not the next B2 implementation target.

## Recommended next session
- B2 — Background Scene and Chunk Composition. Establish the runtime scene/chunk composition model first; Pixel BGR Lab should follow only after that runtime chunk model is stable.

## Commands executed
- `pwd`
- `find .. -name AGENTS.md -print`
- `git status --short --branch`
- `git log -5 --oneline --decorate`
- `git branch -vv`
- `git remote -v`
- `git log -12 --oneline --decorate`
- `node -v`
- `npm -v`
- `cat AGENTS.md`
- `find docs doc -path '*/bgr/fable-audit/*' -type f 2>/dev/null | sort`
- `sed -n '1,220p' docs/bgr/README.md`
- `sed -n '1,220p'` for each required Fable/Pixel BGR document listed above
- `npm ci`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npx tsx src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/ParallaxOffset.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts`
- `npm run smoke`
- final verification commands listed below

## Final verification
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `npm run smoke`: FAIL only at the documented pre-existing `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion` failure after earlier smokes passed.
- final `git status --short --branch`: clean after commit, verified in final response.

## Commit
- subject: `feat(bgr): add typed sprite parallax background`
- hash: recorded in the final Codex response after commit creation.

## Explicitly unchanged
- gameplay authority and `WorldScrollSystem`
- FSM/enemy systems
- weapons/projectiles gameplay
- EventBus phase ownership
- current FX, atmospheric, particle, and post-FX pipeline
- existing BgLab/GridLab implementation internals
- existing shader/flow shader source and preset definitions
