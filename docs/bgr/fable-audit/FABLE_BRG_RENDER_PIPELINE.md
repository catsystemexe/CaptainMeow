# FABLE BRG — Actual Render Pipeline (base `7d1e485`)

Everything below is CONFIRMED from code at the authoritative base commit unless labeled otherwise.

## 1. Boot graph

```
index.html → src/index.ts → import ./main.ts
src/main.ts (module top level)
 ├─ kills previous rAF (window.__CM.__rafId) — HMR/reboot safe
 ├─ DOM setup: #root, canvas#game (image-rendering: pixelated), hudTop debug div
 └─ main() [async]
     ├─ new Graphics(canvas, "classic_896x504")        src/graphics/Graphics.ts
     │    ├─ getGL(canvas)                             src/graphics/gl.ts (webgl2, desynchronized:true, alpha:false)
     │    ├─ scene   = RenderTarget(896×504, NEAREST)  src/graphics/RenderTarget.ts
     │    ├─ enemies = RenderTarget(896×504, LINEAR)   ← DEAD: renderEnemies() has no callers
     │    ├─ blit    = createBlitProgram(gl)
     │    └─ postProcess = createPostProcessPass(gl)   src/graphics/PostProcessPass.ts
     ├─ createGame(() => canvas, 896, 504)             src/game/boot/createGame.ts
     │    ├─ createWorldState()  { scrollX/scrollY, speedX:60, worldH:900 }   src/game/data/WorldState.ts
     │    ├─ new VFXSystem(64)   ring buffers (muzzle/tracer/hit/explosion)   src/game/vfx/VFXSystem.ts
     │    ├─ new WorldScrollSystem(world, player, W, H)
     │    ├─ systems wiring (Director/Spawn/Weapon/Projectile/Enemy/Collision/…)
     │    └─ exposes world/vfx/store/loop via return AND window.__CM.game
     ├─ mountEnemyLabRuntime, HUDArcade, BgLabUI (F7/U), GridLabUI (G)
     ├─ createFxToggleState({postFx: __CM_POST_FX__, atmospheric: __CM_ATMOSPHERIC_FX__})
     ├─ new WebGLSceneRenderer(gl, store, 896, 504)    src/render/webgl/WebGLSceneRenderer.ts
     │    ├─ new DemosceneBg(gl) / FlowRibbonBg(gl) / FlowSegmentsBg(gl)   (all constructed eagerly)
     │    ├─ createAtmosphericFXPass(gl)
     │    ├─ createSdfPass(gl) [try/catch → null on compile fail]
     │    ├─ createMeshPass(gl) [try/catch → null] + loadGLB('/models/player_ship_1.glb')
     │    └─ SpriteSystem × N (core, 5 explosion atlases, w1 projectiles, 6 enemy atlases) — async loads
     ├─ new ParticlePass(gl, 896, 504) [try/catch → null]
     └─ requestAnimationFrame(frame)
```

## 2. Update graph (per rAF frame, `src/main.ts frame()`)

```
frame(now)
 ├─ dt = min((now-last)/1000, 0.05)            ← render dt clamp (iOS stall fix)
 ├─ loop.step(dt)                              src/engine/core/Loop.ts — fixed 1/60 accumulator
 │    └─ fixed tick phases: Input → Director → Simulation → Collision → Impact → Flow → Audio → Cleanup
 │         Simulation contains WorldScrollSystem.update(dt):
 │           world.scrollX += world.speedX * dt          (autoscroll, gameplay-owned)
 │           world.scrollY dead-band follow of player Y  (clamped to worldH)
 │         Impact: DamageSystem calls vfx.onExplosion(...) hooks (world coords)
 ├─ vfx.update(dt)      — per-frame cosmetic aging of ring buffers (NOT in fixed tick)
 ├─ audio.update(dt)    — per-frame audio pump
 ├─ per-frame aim update (cosmetic; uses world.scrollX/Y to convert world→screen)
 ├─ hud.update(...)
 └─ render (below) with a = loop.getAlpha()    — interpolation factor
```

## 3. Render graph and pass order

```
gfx.renderScene(cb)                               [FBO: SceneRT 896×504 NEAREST]
 ├─ clear black + 1px gray debug border (scissor)
 └─ cb(gl):
     1. renderer.render(a)                        WebGLSceneRenderer.ts:1026
        ├─ sx,sy = window.__CM.game.world.scrollX/scrollY      ← GLOBAL READ
        ├─ tSec  = renderer-local accumulated presentation time
        ├─ BG PASS (exactly one, hard-coded branch)             lines 1047-1084
        │    kind = globalThis.__CM_BG_KIND__ ("shader"|"flow"), preset = __CM_BG_PRESET__
        │    "flow" + __CM_BG_LAB__.kind==="flowSegments" → bgFlowSegments.draw({…, disturbances})
        │    "flow" otherwise                              → bgFlowRibbon.draw({…})
        │    else                                          → bg.draw({…})  (DemosceneBg, uMode preset)
        │    blending: DemosceneBg opaque (BLEND off); flow passes SRC_ALPHA/ONE_MINUS_SRC_ALPHA
        ├─ ENTITY PASS (single iteration over EntityStore, world→screen = pos − scroll,
        │    interpolation posPrev→pos by a, pixel snap for player/proj/bomb/enemy)
        │    per-entity priority: enemy sprite → SDF → proc parts → glyph stack → glyph
        │                        → player sprite → projectile sprite → colored quad fallback
        │    deferred sub-passes (collected then drawn): pickups → deathGhost FX → explosion FX
        │    order contract tested by sceneRenderPassRank (normal<pickup<deathGhost<explosion<debug)
        └─ debug collision rings (optional overlay)
     2. renderer.renderVFX(vfx)                   muzzle/tracers/hit sparks as quads (reads scroll globally again)
     3. particlePass.draw(particleStore, sx, sy)  batched POINTS, ≤512, additive (SRC_ALPHA, ONE)
     4. renderer.renderAtmosphere(now/1000, audio.getFreqs(), hasExplosionOrHit, scrollX)
          gate 1: shouldRenderAtmosphericFx(fxState)   (default OFF)
          gate 2: globalThis.__CM_ATMOSPHERIC_FX__ === true   (redundant double gate)
          AtmosphericFXPass: fullscreen domain-warp fbm, 32×1 R8 FFT texture (texSubImage2D per frame),
          additive blend; bass warp gated to active explosion/hit; parallax = scrollX × 0.15/896

gfx.present({postProcess, timeSec, caIntensity})  [FBO: default framebuffer]
 ├─ letterbox clear
 ├─ viewport = integer-scaled rect from computeDisplay() (DisplayRenderer.ts)
 └─ fullscreen triangle sampling SceneRT:
      postProcess ON  → PostProcessPass (chromatic aberration [uCAIntensity], phosphor glow 12%,
                        scanlines 4%, signal breathing ±1.2%)
      postProcess OFF → BlitProgram passthrough
 caIntensity computed in main.ts:577-587 from vfx.getExplosions()/getHits() (peak, TTL decay)
```

## 4. Resource ownership

| Resource | Owner | Created | Disposed |
|---|---|---|---|
| GL context | `Graphics` (`getGL` single source of truth) | boot | never (page lifetime) |
| SceneRT / EnemyRT | `Graphics` | boot | never; `RenderTarget.resize()` exists but SceneRT is never resized (fixed logic res) |
| BG pass programs/VAOs | each BG class (`DemosceneBg` etc.) | renderer ctor (eager, all three) | never |
| Sprite textures/atlases | each `SpriteSystem` | renderer ctor (async load) | never (no dispose path) |
| FFT texture | `AtmosphericFXPass` closure | pass creation | `dispose()` exists, never called |
| Particle VBO | `ParticlePass` | boot | `dispose()` exists, never called |
| VFX ring buffers | `VFXSystem` (gameplay side) | createGame | n/a (fixed arrays) |

## 5. Scroll / camera flow

```
WorldScrollSystem (fixed tick, Simulation)  — WRITES world.scrollX/scrollY
        │  (world is a stable reference held by createGame)
        ▼
window.__CM.game.world  ── read by ──►  WebGLSceneRenderer.render / renderVFX (camera subtract)
                        ── read by ──►  main.ts frame() (aim conversion, particle pass args, atmosphere)
                        ── read by ──►  EnemySystem / FSM (gameplay, screen-space transitions)
```

Distinctions that matter (CONFIRMED):

- **World scroll** = `world.scrollX` (autoscroll, gameplay authority).
- **Camera scroll** = `world.scrollY` (player-follow dead band; X has no separate camera).
- **Background-local animation** = `tSec` accumulated inside the renderer from `performance.now()`
  (presentation clock, allowed by AGENTS.md §7.1).
- **Parallax multiplier**: DemosceneBg per-preset scalar `uP2.w` (`p += uScroll * par` in shader);
  mode 6 stars use per-layer factors 0.12/0.30/0.65; grid landscape uses `scroll.x * 0.02`;
  AtmosphericFX uses 0.15/logicW. FlowSegments **ignores world scroll entirely**
  (`scrollX = 0` comment: "Screen-space flow") — segments have **independent layer velocity**
  (`motion.speedPxPerSec.base × layerMul[far/mid/near]`), which is layer-local motion, not parallax.
- **Camera shake / scripted offset**: confirmed absent.
- Parallax never affects gameplay coordinates (render-side subtraction only).

## 6. Event / reaction flow (reactive environment)

```
DamageSystem (Impact phase) ──hook──► VFXSystem.onExplosion / hit sparks   (world coords)
VFXSystem.update(dt) ages ring buffers (per-frame, presentation)
        │
        ├─► WebGLSceneRenderer.collectFlowDisturbances(sx,sy)   → screen-space FlowDisturbance[]
        │        └─► flowStep.stepFlowParticle(): radial vy kick, falloff by dist & TTL   (pure fn, smoke-tested)
        ├─► main.ts caIntensity (chromatic aberration peak, TTL decay)
        └─► main.ts hasEvent → AtmosphericFX bass gate (+ audio FFT via AudioSystem analyser)
```

- Reactions are **presentation-only**; nothing writes back to gameplay. CONFIRMED.
- Reactions are **pull-based** (renderer polls VFX ring buffers via `window.__CM.game.vfx`),
  not EventBus consumers. There is **no central reaction state**; three consumers re-derive
  their own decay curves from the same buffers. CONFIRMED.
- Determinism: flow kick uses `sin`-hash `rand01` (deterministic per inputs) but is driven by
  render-frame `dt` — visually deterministic-ish, not tick-deterministic. INFERRED (acceptable
  because presentation-only).
- The audio path is **audio-reactive visualization**, not an environment reaction system:
  FFT bins modulate warp/hue; event gating merely scales bins (AtmosphericFXPass `uploadFreqs`).

## 7. Framebuffer flow

```
[SceneRT 896×504 RGBA NEAREST] ← BG, entities, VFX, particles, atmosphere (all passes)
        │  sampled once
        ▼
[default FB, integer-scaled viewport] ← PostProcessPass OR BlitProgram
```

One offscreen RT, one present pass. No ping-pong, no MRT, no depth buffer (DEPTH_TEST disabled).
EnemyRT exists but is dead. `bgr`'s BgPipeline (BRANCH-ONLY) had 5 RTs + overscan; nothing of
that exists in the base.

## 8. Unsafe coupling (concrete)

1. `WebGLSceneRenderer.render()` reads `window.__CM?.game?.world` and
   `window.__CM?.game?.vfx` — renderer depends on debug-integration global shape
   (`WebGLSceneRenderer.ts:1036`, `:1654`, `:1702`). A rename in `createGame`'s `__CM`
   exposure silently kills camera + reactions (fallback 0 hides the failure).
2. BG kind/preset/lab/grid state are five untyped globals (`__CM_BG_KIND__`, `__CM_BG_PRESET__`,
   `__CM_BG_LAB__`, `__CM_GRID__`, `__CM_ATMOSPHERIC_FX__`) written from four places
   (main.ts hotkeys, BgLabUI, GridLabUI, console API) with no validation.
3. `DemosceneBg.draw()` reads `__CM_GRID__` directly inside the pass (mode 7) — a render pass
   reaching into dev-UI state (`DemosceneBg.ts:421`).
4. `FlowRibbonBg`/`FlowSegmentsBg` call `__CM_BG_LAB_getFlowOverrides__()` installed by
   `BgLabUI` (`FlowRibbonBg.ts:196,314`) — production render path silently depends on a
   dev-UI-installed global function (null-guarded, but still an implicit contract).
5. Double gating of atmosphere: `main.ts` checks `fxState` and `renderAtmosphere` re-checks
   `__CM_ATMOSPHERIC_FX__ === true` — two sources of truth for one toggle.
6. Sprite pass state restore is manual and repeated after every sprite draw
   (`gl.useProgram(this.prog); gl.bindVertexArray(...); gl.uniform2f(uLogic,…)`) — any new
   pass inserted mid-entity-loop must replicate this or corrupt subsequent draws.

## 9. Extension points (where a layer system can attach without surgery)

- `gfx.renderScene(cb)` callback composition in `main.ts:547-572` — passes are already
  sequenced here; a resolver-driven loop can replace the hard-coded BG branch inside
  `renderer.render()` or run just before it.
- All three BG passes already take `{logicW, logicH, timeSec, scrollX, scrollY, presetIndex}`
  draw-args objects — adapter-friendly.
- `gfx.present(opts)` — the natural seam for a future palette/dither/pixelation pass
  (swap/extend `PostProcessPass`).
- `FxToggleState` — the existing pattern for typed, testable toggle state that BG state
  should follow (instead of raw globals).
