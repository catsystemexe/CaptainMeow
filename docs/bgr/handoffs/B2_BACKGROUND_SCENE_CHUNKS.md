# B2 — Background Scene and Chunk Composition

## Repository/session baseline
- repository: `/workspace/MGoD`
- local session branch: `work` (task identifies this as the supplied `pixel_bgr` snapshot; no checkout was performed)
- starting HEAD: `922bfebf6488633d25530be3ad414a50e61a5ee7`
- confirmation that B1 exists: `src/render/BackgroundState.ts`, `BackgroundLayerTypes.ts`, `SpriteBackgroundLayerRenderer.ts`, and `backgroundLayerMath.ts` were present and B1 symbols resolved.
- working-tree start state: clean (`git status --short --branch` showed `## work`).

## Source documents used
- `AGENTS.md`
- `docs/bgr/README.md`
- `docs/bgr/fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`
- `docs/bgr/fable-audit/FABLE_BRG_B1_CONTRACT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ROADMAP.md`
- `docs/bgr/fable-audit/PIXEL_BGR_LAB_DESIGN_PROPOSAL.md`
- `docs/bgr/handoffs/B1_TYPED_SPRITE_PARALLAX.md`

## Baseline validation
- `npm ci`: PASS; npm reported 4 audit vulnerabilities.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Implemented scope
- Added typed `BackgroundScene` and `BackgroundChunk` runtime descriptors.
- Added pure active chunk resolution from `world.scrollX`, viewport width, and overscan.
- Added deterministic global + chunk layer composition into existing B1 `BackgroundLayer[]` descriptors.
- Added runtime id namespacing for global and chunk-local layers.
- Added chunk-local sprite X offset transformation.
- Extended typed background state with direct-layer and scene runtime sources while preserving B1 direct-layer compatibility.
- Integrated scene resolution into `WebGLSceneRenderer` without adding a gameplay system or moving scroll authority.
- Extended the `V` demo toggle to enable a B2 technical scene.
- Added targeted smoke coverage and registered it before the known full-smoke failure.

## Files changed
- `src/render/webgl/bg/layers/BackgroundSceneTypes.ts`: scene, chunk, and resolved chunk types.
- `src/render/webgl/bg/layers/BackgroundSceneResolve.ts`: pure visible range, chunk validation, active chunk resolution, layer composition, runtime id, and active sprite id helpers.
- `src/render/webgl/bg/layers/BackgroundSceneResolve.smoke.ts`: B2 smoke coverage.
- `src/render/webgl/bg/layers/BackgroundLayerTypes.ts`: runtime source union and B2 demo scene factory.
- `src/render/webgl/bg/layers/backgroundLayerMath.ts`: B1-compatible direct-layer state handling with scene fallback selection.
- `src/render/BackgroundState.ts`: B2 demo activation helper.
- `src/render/webgl/WebGLSceneRenderer.ts`: scene-to-layer resolution before existing B1 dispatch and sprite cache release on legacy fallback.
- `src/main.ts`: `V` toggles the B2 scene demo.
- `src/smoke/runSmokes.ts`: B2 smoke registered before `BombExplosionChain.smoke`.
- `docs/bgr/README.md`: handoff index updated.
- `docs/bgr/handoffs/B2_BACKGROUND_SCENE_CHUNKS.md`: this handoff.

## Final scene model
- `BackgroundScene`: `{ id: string; globalLayers: BackgroundLayer[]; chunks: BackgroundChunk[] }`.
- `BackgroundChunk`: `{ id: string; startX: number; length: number; layers: BackgroundLayer[] }`.
- Runtime source integration: `BackgroundState.source` is either `{ kind: "layers"; layers }` or `{ kind: "scene"; scene }`; the legacy optional `layers` field remains supported for B1 compatibility.

## Chunk interval contract
- Each chunk covers the half-open interval `[startX, startX + length)`.
- Visible range is `[worldScrollX - overscan, worldScrollX + viewportWidth + overscan)`.
- At an exact boundary with zero viewport width, the chunk starting at the boundary is active and the previous chunk is inactive.
- With a non-zero viewport, every chunk intersecting the visible range is active, so neighboring chunks coexist while the viewport spans their boundary.
- Invalid chunk ids, non-finite starts, zero/negative lengths, and non-array layer lists are skipped with bounded development warnings.

## Layer composition
- Global layers render first.
- Active chunk layers render after globals in stable spatial order.
- Layer order inside each source array is preserved.
- Global runtime ids use `global:<layerId>`.
- Chunk runtime ids use `chunk:<chunkId>:<layerId>`.
- Chunk-local sprite `offset.x` resolves to `chunk.startX + layer.offset.x`; global offsets retain B1 semantics.
- Composed descriptors are cloned shallowly only where ids or chunk-local offsets must differ; source scene data is not mutated.
- Disabled and invalid layer filtering remains delegated to the B1 resolver.

## Runtime and renderer integration
- `WebGLSceneRenderer` reads typed background state, resolves scene chunks using current `world.scrollX` and internal viewport width, composes `BackgroundLayer[]`, then reuses B1 layer filtering and dispatch.
- Direct B1 layer state still goes through `resolveBackgroundLayers()`.
- Legacy shader/flow fallback remains selected when typed state is absent, disabled, empty, or invalid.
- Entity, VFX, particle, atmospheric, and post-FX order were not changed.

## Texture/resource lifecycle
- Sprite texture retention remains owned by `SpriteBackgroundLayerRenderer` and keyed by resolved layer id.
- Global sprite ids remain present while the scene is active.
- Active chunk sprite ids enter the retain set only while their chunk intersects the visible range.
- Inactive chunk ids disappear from the retain set and B1 `retainLayerIds()` releases them.
- Boundary coexistence keeps both neighboring chunk ids retained while both intersect the viewport.
- Disabling typed scene calls `retainLayerIds(new Set())` before legacy background drawing so typed sprite resources are released.
- The current loader remains lazy-on-draw; no prefetch queue or future chunk preload was added.

## Demo scene
- Activation: press `V` to toggle typed B2 scene on/off.
- Technical asset: existing `/assets/bg/b1_pixel_stars.svg` is reused for global and chunk sprite layers.
- Expected visible chunks: chunk A at `[0, 720)`, chunk B at `[720, 1440)`; with the 896px viewport both can coexist near and across the boundary.
- Expected boundary behavior: chunk A is inactive at the exact origin boundary for chunk B only when the visible range no longer intersects A; while the viewport overlaps both intervals, both chunk layer ids are retained.

## Tests added
- `src/render/webgl/bg/layers/BackgroundSceneResolve.smoke.ts`
  - start boundary included and end boundary excluded.
  - zero, negative, and non-finite chunk intervals skipped.
  - viewport inside one chunk, crossing chunks, exact boundary, negative scroll, large positive scroll, viewport wider than one chunk, unsorted input, overlapping chunks, no match.
  - source scene remains unmodified.
  - global-before-chunk order, spatial chunk order, internal layer order, namespaced ids, duplicate author ids without collision, B1 filtering compatibility, chunk-local X offset.
  - active sprite ids for globals/current chunks, inactive ids disappearing, boundary coexistence, deterministic repeated resolution.
  - B1 direct-layer and fallback compatibility.

## Visual verification procedure
- In Replit, run `npm run dev`.
- Open the game preview.
- Press `V` to enable the B2 typed scene demo.
- Watch global stars and chunk-local star bands while gameplay scroll advances.
- Around scroll positions spanning `720`, confirm both chunk A and chunk B local layers can coexist because the viewport intersects both intervals.
- Open the console and inspect `globalThis.__CM_BACKGROUND_STATE__.source.scene` for the scene id, chunks, and layer ids.
- Press `V` again and confirm the legacy shader/flow path returns; use `B` for legacy shader/flow comparison after disabling typed state.

## Acceptance criteria
1. typed `BackgroundScene` exists: PASS.
2. typed `BackgroundChunk` descriptors exist: PASS.
3. scenes support global and chunk-local layers: PASS.
4. active chunks resolved from visible world range: PASS.
5. exact interval and boundary semantics documented and tested: PASS.
6. neighboring chunks coexist while viewport intersects both: PASS.
7. global layers render before chunk layers: PASS.
8. chunk-local offsets transformed deterministically: PASS.
9. runtime layer ids cannot collide across chunks: PASS.
10. existing B1 layer dispatch reused: PASS.
11. B1 direct-layer demo/path compatible: PASS by resolver support; `V` now selects B2 demo by task request.
12. legacy shader/flow fallback functional: PASS.
13. inactive chunk textures released through B1 lifecycle: PASS.
14. no chunk editor/timeline/trigger scope expansion: PASS.
15. typecheck, tests, build, targeted B2 smokes pass apart from known full-smoke failure: PASS.
16. one focused implementation commit created: PASS after final commit.
17. working tree clean after commit: PASS after final verification.
18. complete B2 handoff created: PASS.

## Known limitations
- Browser visual verification was not performed in this terminal-only session.
- The demo reuses the B1 SVG technical asset rather than adding production artwork.
- No prefetch scheduler exists; textures load lazily when active layers draw.
- Scene warnings are development console warnings and are intentionally bounded to invalid resolver inputs encountered.

## Deferred scope
- Pixel BGR Lab.
- BgLab/GridLab integration.
- markers/triggers/gameplay events.
- transition/crossfade/timeline systems.
- prefetch and streaming.
- tilemaps, placed decoration object models, video, ASCII, reactions, audio cues, weather, schema migration.

## Recommended next session
- B3 Pixel BGR Lab MVP, because the runtime content contract is now stable enough for a minimal editor to target the typed state/scene model.

## Commands executed
- `pwd`
- `find .. -name AGENTS.md -print`
- `cat AGENTS.md`
- `git status --short --branch`
- `git branch --show-current`
- `git branch -vv`
- `git log -12 --oneline --decorate`
- `git rev-parse HEAD`
- `node --version`
- `npm --version`
- `find docs doc -maxdepth 5 -type f 2>/dev/null | sort | rg "bgr|BGR|FABLE|PIXEL|B1|proposal|handoff"`
- required `cat`/inspection commands for BGR docs and B1 files.
- `npm ci`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`
- `npx tsx src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/ParallaxOffset.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts`
- `npx tsx src/render/webgl/bg/layers/BackgroundSceneResolve.smoke.ts`
- final verification commands from the task.

## Final verification
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS.
- B1 targeted smokes: PASS.
- `npx tsx src/render/webgl/bg/layers/BackgroundSceneResolve.smoke.ts`: PASS.
- `npm run smoke`: FAIL only at the documented pre-existing `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion` failure after the new B2 smoke passed.
- `git diff --check`: PASS.
- final `git status --short --branch`: clean after commit.

## Commit
- subject: `feat(bgr): add background scene chunk composition`
- hash: recorded in the final response after commit creation.

## Explicitly unchanged
- gameplay.
- world scroll authority.
- FSM.
- enemies.
- weapons.
- VFX/particles/atmosphere/post-FX order.
