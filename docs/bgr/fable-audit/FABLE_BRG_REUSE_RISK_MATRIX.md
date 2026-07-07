# FABLE BRG — Reuse & Risk Matrix

Status legend: CONFIRMED (verified in code at base `7d1e485`), BRANCH-ONLY (branch + path given),
INFERRED (reasoning stated), MISSING (confirmed absent).
Decision legend: **reuse as-is** / **adapt** / **reject** / **missing (build new)**.

## Runtime (loop, world, ownership)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| Fixed-step 60 Hz loop + render alpha | `src/engine/core/Loop.ts` (`dt = 1/60`, `getAlpha()`) | CONFIRMED | solid | reuse as-is | low | correct interpolation source for any new layer; do not add a second clock |
| World autoscroll + dead-band camera | `src/game/systems/WorldScrollSystem.ts`, `src/game/data/WorldState.ts` | CONFIRMED | solid | reuse as-is | low | scroll authority stays here; layers only *read* scroll |
| Renderer scroll access | `WebGLSceneRenderer.ts:1036` via `window.__CM.game.world` | CONFIRMED | fragile | adapt | medium | replace with injected/explicit scroll args in B1 render entry (pass `{scrollX, scrollY}` down; keep global read as fallback during migration) |
| BG runtime state (kind/preset) | globals `__CM_BG_KIND__`, `__CM_BG_PRESET__`, `__CM_BG_LAB__` (main.ts hotkeys, BgLabUI) | CONFIRMED | untyped, 4 writers | adapt | medium | B1 introduces one typed state object (pattern: `FxToggleState`); globals become a thin compat shim |
| Scroll authority in BG content | `bgr:src/game/bg/schema/BgBase.ts` `common.scrollSpeedX` + `BgPipeline.autoX` | BRANCH-ONLY | — | reject | high | authority inversion; base gameplay already owns autoscroll |

## Renderer (passes)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| Shader BG (7 modes, presets) | `src/render/webgl/bg/DemosceneBg.ts` + `bgPresets.ts` | CONFIRMED | good; mode 7 reads `__CM_GRID__` inside pass | adapt | low | becomes `shader` layer kind behind a thin adapter; move `__CM_GRID__` read to param resolution |
| Flow segments (CPU particles → per-segment draws) | `FlowSegmentsBg.ts` + `flowStep.ts` | CONFIRMED | logic good; **1 draw call per segment**, preset countBase 1400×3 layers | adapt | medium (perf INFERRED, unbenchmarked) | becomes `flowSegments` layer kind; instancing is a later optimization, not B1 |
| Flow ribbon | `FlowRibbonBg.ts` | CONFIRMED | good | adapt | low | becomes `flowRibbon` layer kind |
| Atmospheric overlay (audio-reactive) | `src/render/webgl/AtmosphericFXPass.ts` | CONFIRMED | good; double-gated toggle | adapt (later) | low | candidate `atmosphere` layer kind; fix double gate when adapted |
| Present-time CRT post | `src/graphics/PostProcessPass.ts` + `Graphics.present()` | CONFIRMED | good | reuse as-is | low | untouched by B1; future palette/dither extends this seam |
| Scene RT + integer-scale present | `src/graphics/Graphics.ts`, `DisplayRenderer.ts` | CONFIRMED | good | reuse as-is | low | the pixel-art foundation |
| EnemyRT + `renderEnemies()` | `Graphics.ts:118` | CONFIRMED dead code | — | reject (leave untouched in B1) | low | zero callers; flag for later cleanup task |
| Entity passes (sprite/SDF/glyph/proc/mesh) | `WebGLSceneRenderer.ts` | CONFIRMED | working, manual GL state restore after each sprite draw | reuse as-is (out of BGR scope) | — | B1 must not touch the entity loop |
| Layer compositor w/ per-layer opacity+blend | `bgr:src/game/bg/runtime/BgPipeline.ts` | BRANCH-ONLY | over-built | reject code / adapt 3 techniques | high if cherry-picked | per-frame mergeDeep, GL state getParameter storm, postFx input via `common.__bgInputTex` mutation; the blendColor CONSTANT_ALPHA opacity + layerId-keyed cache + overscan ideas are worth re-deriving |
| Mesh terrain renderer | `bgr:src/game/bg/runtime/base/MeshTerrainRenderer.ts` (781) + `docs/bg/mesh_terrain.md` | BRANCH-ONLY | best code on the branch | adapt (dedicated later session) | medium | self-contained GL; needs B1 layer interface + iPad perf measurement |
| BG-layer post-FX (posterize/fog/neon/glitch/barrel) | `bgr:src/game/bg/runtime/base/PostFxRenderer.ts` | BRANCH-ONLY | hacky input contract | concept only | medium | only palette-ish shader code in the repo; mine snippets for future PixelPostFx, never port the renderer |

## Content (presets, schema, data)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| Typed shader presets (TS) | `bgPresets.ts` (`BgPreset` type: mode + p1/p2/cA/cB, `hidden`) | CONFIRMED | typed but opaque (`p1[0]` semantics per-mode) | adapt | low | fold into B1 `shader` layer params; keep as-is initially |
| Typed flow presets (TS) | `flowPresets.ts` (`FlowPreset`, 2 presets, parallax factors, disturbance kickScale) | CONFIRMED | well-structured | adapt | low | already nearly a layer descriptor for its kind |
| Layer/preset schema V2 | `bgr:src/game/bg/schema/BgPreset.ts` | BRANCH-ONLY | good shape, weak typing (`params: Record<string,any>`, `kind: string`) | adapt (hand-port as discriminated union) | low | the B1 type model seed |
| Level→preset binding + transition | `bgr:src/game/bg/schema/BgBinding.ts` | BRANCH-ONLY | sketch | concept only | — | nothing to bind to yet (no levelId in base session) |
| JSON bg content + content-boundary validation | `bgr:src/game/content/bgPresets.json`, `bgBindings.json`, `loadContent.ts` diff | BRANCH-ONLY | validation style matches base §7.9 | concept only (defer) | medium | JSON belongs at the moment levels/authoring need serialization; B1 stays TS-typed. Note the branch's *second, broken* loader (`BgContentLoader.ts` shape mismatch) as a cautionary example of duplicate sources of truth |
| Canonical source of truth for BG selection | — | MISSING | — | build new (B1) | — | today: five globals with four writers; B1 defines one typed state + resolver |

## Tooling (labs / dev UI)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| BgLab (F7/U): kind switch, preset index, flow colors/α, ribbon/segment tuning, localStorage presets (`CM_BG_LAB_PRESETS_v1`), JSON textarea | `src/ui/BgLabUI.ts` | CONFIRMED | works; writes globals; installs `__CM_BG_LAB_getFlowOverrides__` consumed by prod render path; `load` does `location.reload()` | adapt (B2+) | medium | round-trips only its own `BgLabState`, not renderer presets; must be re-pointed at the B1 typed state instead of raw globals |
| GridLab (G): 5 sliders → `__CM_GRID__` | `src/ui/GridLabUI.ts` | CONFIRMED | dev-only, not persisted | adapt (B2+) | low | becomes params of the `shader` layer's grid-landscape preset |
| BgDevUI layer editor | `bgr:src/ui/BgDevUI.ts` (1613 + 17 `.bak`) | BRANCH-ONLY | full layer CRUD UI over override-patches | reject code, keep as UX reference | high if ported | override/patch model requires per-frame merge; future authoring should edit and export **complete resolved presets** |
| Change-type taxonomy (realtime/rebuild/structural) | `bgr:src/game/bg/lab/BgLabBus.ts` | BRANCH-ONLY | good idea | concept only | — | apply on change events, never per frame |
| Dev summoner / Enemy Lab | `src/dev/*` | CONFIRMED | out of BGR scope | — | — | untouched |

## Effects (VFX, particles, reactions)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| VFX ring buffers (muzzle/tracer/hit/explosion) | `src/game/vfx/VFXSystem.ts` | CONFIRMED | solid, alloc-free | reuse as-is | low | the reaction source; already feeds three consumers |
| Flow disturbance kick (explosion/hit → bg) | `WebGLSceneRenderer.collectFlowDisturbances` + `flowStep.stepFlowParticle` | CONFIRMED | pure fn, smoke-tested | reuse as-is | low | template for future `BackgroundReaction` inputs |
| Event-driven chromatic aberration | `main.ts:577-587` + `PostProcessPass` `uCAIntensity` | CONFIRMED | good | reuse as-is | low | — |
| Batched particle pass (≤512 POINTS, additive) | `src/render/webgl/ParticlePass.ts` + `engine/fx/ParticleStore.ts` | CONFIRMED | good | reuse as-is | low | already usable as a background-ish layer by draw order; a `particles` layer kind later just re-orders it |
| Central reaction state | — | MISSING | — | build later (only if ≥2 more consumers appear) | — | three consumers currently re-derive decay independently; acceptable at this scale |
| Influence map / ping FX | `bgr:.../interaction/InfluenceMap.ts` (1-line stub) + BgPipeline ping-pong | BRANCH-ONLY | stub | reject | — | never implemented; base's disturbance path supersedes the intent |

## Resources (textures, RTs, assets)

| Capability | Location | Status | Quality | Decision | Risk | Reason |
|---|---|---|---|---|---|---|
| Atlas + texture loading (NEAREST, pivots, anims) | `src/render/sprites/SpriteAtlas.ts`, `SpriteTexture.ts`, `SpriteSystem.ts` | CONFIRMED | good for entities | adapt for BG sprite layer | low | needs: `TEXTURE_WRAP_* = REPEAT` option (currently CLAMP_TO_EDGE hardcoded), POT-size awareness for repeat, and explicit ownership/disposal for level-scoped textures |
| Texture repeat/wrap contract | — | MISSING | — | build new (B1, pure fn + sampler option) | — | wrapped tile origins must be a pure, tested function; seam risk at non-integer scroll is the classic failure |
| RT helpers | `src/graphics/RenderTarget.ts` (resize-capable) | CONFIRMED | good | reuse as-is | low | `bgr`'s `GlRt.ts` duplicate rejected |
| Resource disposal on layer swap | — (base never disposes; `bgr` BgPipeline disposes on kind swap) | MISSING in base | — | build new (B1 minimal: dispose on layer remove/kind change) | low | page-lifetime leaks are currently invisible because nothing swaps |
| Context-loss handling | — | MISSING | — | build later (explicit non-goal of B1) | — | no `webglcontextlost` handling anywhere today |

## Tests

| Capability | Location | Status | Decision | Reason |
|---|---|---|---|---|
| Pure flow stepping (incl. disturbance) | `bg/FlowDisturbanceKick.smoke.ts` → `flowStep.ts` | CONFIRMED | reuse as pattern | the exemplar for B1 pure-function tests |
| Post/atmos shader source guards | `PostProcessPass.smoke.ts`, `AtmosphericFXPass.smoke.ts` | CONFIRMED | reuse as pattern | shader compile errors are **not** catchable in Node; source-string assertions are the accepted proxy |
| FX toggle state | `FxToggleState.smoke.ts` | CONFIRMED | reuse as pattern | template for BG state tests |
| Scene pass ordering | `SceneRenderOrder.smoke.ts` (exists, **not registered** in `runSmokes.ts`) | CONFIRMED | adapt | register it or fold its asserts into B1's ordering test |
| Display math | `DisplayRenderer.computeDisplay` — untested | CONFIRMED gap | build new (cheap) | pure function, trivial to cover |
| Full smoke suite | `npm run smoke` | CONFIRMED FAIL (pre-existing `BombExplosionChain` / `DamageSystem.onExplosion`, documented in AGENTS.md §8) | — | any B-session must report this failure distinctly from its own results |
| GL-context render tests | — | MISSING | build much later (browser harness) | out of scope for B-series |

## Historical branches (summary — details in `FABLE_BRG_BRANCH_MATRIX.md`)

| Branch | Status | Decision |
|---|---|---|
| `bgr` | BRANCH-ONLY value: schema + mesh renderer + techniques | hand-port selectively (see deep dive) |
| `CM`, `vector`, `audit/*`, `feature/visual-layer-2-atmospheric-fx`, `claude_refactor`, `feature/bugfix` | integrated into base (byte-identical or evolved files) | nothing to transfer |
| `main` | tree identical to base | vault; nothing to transfer |
| `gem-git` | trivial assets | ignore |
| `replit-agent`, `gem-replit` | unavailable on remote | recorded as unavailable |
