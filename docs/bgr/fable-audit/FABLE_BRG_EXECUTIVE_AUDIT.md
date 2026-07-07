# FABLE BRG — Executive Audit (B0)

Independent background/render-stack audit of Captain Meow (MGoD).

- Audit date: 2026-07-07
- Auditor: Claude (Fable) — independent session, no prior audit taken as authority
- Repository: local checkout of `catsystemexe/MGoD`
- Authoritative base: `7d1e4857c1dceb828a3421f4450033c02c3f8b06` (tip of `work`, identical to `pixel_bgr`)
- Verification: `git rev-parse HEAD` returned exactly the authoritative base at audit start; working tree clean.
- Evidence labels used throughout: `CONFIRMED` / `BRANCH-ONLY` / `INFERRED` / `RECOMMENDED` / `UNKNOWN`.

---

## 1. Executive verdict

**CONFIRMED — the current engine has a working single-pass procedural background, not a layer system.**
The background is one hard-coded branch point inside the entity renderer
(`src/render/webgl/WebGLSceneRenderer.ts:1051-1084`): `__CM_BG_KIND__ === "flow"` selects
`FlowSegmentsBg`/`FlowRibbonBg`, anything else selects `DemosceneBg`. Exactly one background
pass runs per frame. There is no layer list, no ordering, no per-layer opacity/blend/parallax
in the runtime path. Calling the current state a "layer system" would be wrong.

**CONFIRMED — a real layered compositor prototype exists, but only on branch `bgr`, and it is
not integratable as-is.** `origin/bgr` (`d7a280a`, 2026-02-24) contains `src/game/bg/**`:
a typed layer schema (`BgLayerV2`: id/kind/enabled/opacity/blend/parallaxMul/params),
a `BgPipeline` compositor with per-layer blending and a ping-pong post-FX chain,
a `MeshTerrainRenderer`, a `PostFxRenderer` (posterize/fog/neon/glitch/barrel/scanlines),
JSON content presets with `loadContent` validation, and a 1613-line `BgDevUI`.
It forked from `d5713376` (2025-12-31) and is **219 commits behind** the current base —
it predates FSM enemies, the sprite contract, pickups, and the current `WebGLSceneRenderer`.
Its `WorldScrollSystem` hands scroll authority to the BG pipeline (an authority inversion
forbidden by AGENTS.md §7.7), and its entity renderer was stripped to placeholders.
**Its schema and several pure ideas are worth porting by hand; its runtime must not be
cherry-picked.** See `FABLE_BRG_BRG_BRANCH_DEEP_DIVE.md`.

**CONFIRMED — all other historical BGR work is already integrated into the base.**
The `vector` branch's bg stack (DemosceneBg/FlowRibbonBg/FlowSegmentsBg/presets/BgLabUI) and
the `feature/visual-layer-2-atmospheric-fx` + `claude_refactor` stack (PostProcessPass,
AtmosphericFXPass, SdfPass, flowStep disturbances, cosinePalette, grid landscape, GridLabUI)
exist in the base as byte-identical or slightly-evolved files. `main`'s tree is byte-identical
to the base. `feature/bugfix` is an ancestor of the base. Nothing needs to be transferred
from those branches.

## 2. Current engine capability (verified against code)

| Capability | Status | Evidence |
|---|---|---|
| Fixed internal resolution + integer scale + letterbox | CONFIRMED | `src/graphics/Graphics.ts` (SceneRT 896×504 NEAREST), `src/graphics/DisplayRenderer.ts` `computeDisplay()` |
| Procedural shader backgrounds (7 modes) | CONFIRMED | `src/render/webgl/bg/DemosceneBg.ts` (uMode 0–7), presets in `bgPresets.ts` (2 visible, 6 hidden) |
| Procedural flow ribbons/segments with parallax layer multipliers | CONFIRMED | `FlowRibbonBg.ts`, `FlowSegmentsBg.ts`, `flowPresets.ts` (2 presets, far/mid/near `parallax[].factor`) |
| Reactive background (explosion/hit → flow disturbance) | CONFIRMED | `WebGLSceneRenderer.collectFlowDisturbances()` → `flowStep.ts` `stepFlowParticle()` |
| Audio-reactive atmospheric overlay (default OFF) | CONFIRMED | `AtmosphericFXPass.ts`, gated by `FxToggleState` (`DEFAULT_ATMOSPHERIC_FX_ENABLED = false`) |
| CRT post-process (scanlines, glow, CA, breathing) | CONFIRMED | `src/graphics/PostProcessPass.ts`, driven per-frame from `src/main.ts:577-593` |
| Batched GPU particles (512, POINTS) | CONFIRMED | `src/render/webgl/ParticlePass.ts` + `src/engine/fx/ParticleStore.ts` |
| Entity sprite atlases (NEAREST, pivots, animations) | CONFIRMED | `src/render/sprites/*` — used for entities only, never for background |
| SDF vector entities, glyphs, proc-parts, mesh (GLB) player | CONFIRMED | `SdfPass.ts`, `GlyphDB.ts`, `drawProcPartsAt`, `MeshPass.ts` |
| Background **texture/sprite** layer | **confirmed absent** | no background pass samples any texture; sprite path is entity-only |
| Layer model (order/opacity/blend/visibility) in runtime | **confirmed absent** in base; BRANCH-ONLY on `bgr` | base: hard-coded branch; `bgr`: `src/game/bg/schema/BgPreset.ts` |
| Palette reduction / dithering / pixelation post-FX | **confirmed absent** in base | `PostProcessPass.ts` fragment shader contains CA+glow+scanline+breath only; `bgr` `PostFxRenderer` has posterize (BG-only) |
| Chunk streaming / tilemap / timeline / level sections | **confirmed absent** | repo-wide grep; "chunk" hits are GLB parsing (`MeshLoader.ts`); `bgr` "chunk" commits mean seamless mesh scroll wrap, not level chunks |
| Video layer | **confirmed absent** | no `HTMLVideoElement`/video texture code anywhere |
| ASCII/text background layer | **confirmed absent** | glyph system draws per-cell quads for entities; no text layer |
| Context-loss handling | **confirmed absent** | no `webglcontextlost` listener in `src/` |

## 3. Actual ownership (as-built)

- **Frame loop**: `src/main.ts` `frame()` owns rAF, calls `loop.step(dt)` (fixed 60 Hz,
  `src/engine/core/Loop.ts`, `dt = 1/60`), then render with `loop.getAlpha()` interpolation. CONFIRMED.
- **World scroll**: gameplay-owned. `WorldScrollSystem` (`src/game/systems/WorldScrollSystem.ts`)
  advances `world.scrollX += world.speedX * dt` and dead-band-follows `scrollY` inside the fixed tick.
  CONFIRMED.
- **Scroll handoff to renderer**: **browser global**. `WebGLSceneRenderer.render()` reads
  `(window as any).__CM?.game?.world` (`WebGLSceneRenderer.ts:1036`). Same for `renderVFX`.
  This is the single most load-bearing coupling in the render stack. CONFIRMED.
- **Background selection**: browser globals `__CM_BG_KIND__`, `__CM_BG_PRESET__`, `__CM_BG_LAB__`,
  `__CM_GRID__`, written by hotkeys in `main.ts` (`[`/`]`/`B`/`G`/`U`) and by `BgLabUI`/`GridLabUI`,
  read every frame by the renderer. No typed runtime model. CONFIRMED.
- **Gameplay authority**: background state never feeds back into gameplay. The reactive path is
  one-directional: DamageSystem → `VFXSystem` ring buffers → renderer reads. CONFIRMED.

## 4. Strongest reusable systems (for a future hybrid compositor)

1. **`Graphics` RT/present split** — SceneRT → present with integer scale is exactly the skeleton
   a pixel-art pipeline needs; a palette/dither pass slots into `present()` naturally. CONFIRMED.
2. **`flowStep.ts`** — pure, GL-free, unit-tested particle stepping incl. disturbances; the model
   for how B1 pure functions should be written. CONFIRMED.
3. **Existing BG passes as layer candidates** — `DemosceneBg`, `FlowRibbonBg`, `FlowSegmentsBg`,
   `AtmosphericFXPass` all already accept `{logicW, logicH, timeSec, scrollX, scrollY, presetIndex}`-shaped
   draw args; they are one adapter away from being resolver-driven layers. CONFIRMED.
4. **`bgr` schema (`BgLayerV2`) and per-layer blend technique** — `gl.blendColor` +
   `CONSTANT_ALPHA` for layer opacity without touching shader code (`BgPipeline.draw`). BRANCH-ONLY, port by hand.
5. **`SpriteSystem`/`SpriteAtlas`/`SpriteTexture`** — atlas loading, NEAREST filtering, pivots,
   animation frames. Missing only REPEAT wrap and disposal to serve a background sprite layer. CONFIRMED.

## 5. Highest risks

1. **Global-variable runtime contract.** Every BG behavior flows through `globalThis.__CM_*`;
   there is no single source of truth and no validation. Any new layer system must first
   introduce a typed state object or it will inherit this. CONFIRMED (risk), RECOMMENDED (fix in B1).
2. **Draw-call volume in flow segments.** `FlowSegmentsBg` issues one `drawArrays` per segment
   (preset `countBase: 1400`, ×3 layers with densityMul) with per-draw uniform updates.
   INFERRED iPad risk — no benchmark exists; treat as a measurement task, not a fact.
3. **`bgr` cherry-pick temptation.** Its runtime rewires scroll authority into the BG pipeline
   and strips the entity renderer; a naive port would regress AGENTS.md §7.7 invariants.
   CONFIRMED (from `bgr` `WorldScrollSystem.ts` comment: "autoscroll světa je nyní řízen pouze BG pipeline").
4. **No render-time tests with a GL context.** Shader regressions are only caught by
   source-string smoke tests (`PostProcessPass.smoke.ts`, `AtmosphericFXPass.smoke.ts`). CONFIRMED.
5. **`renderEnemies()`/EnemyRT is dead code** (`Graphics.ts:118`, zero callers) — a trap for
   anyone assuming a second RT is already in use. CONFIRMED.

## 6. Disagreements with obvious architectural assumptions

1. **"The bgr branch is the architecture to resume."** Disagree. Its *schema* is the valuable
   artifact; its *pipeline* violates current ownership rules, allocates every frame
   (`mergeDeep(preset, overrides)` per draw), and reads dev-UI overrides from
   `__CM.bgLabState` in the hot path. Port ideas, not files.
2. **"A separate compositor (Option C) is needed to add sprite layers."** Disagree for B1.
   The base already composites BG → entities → particles → atmosphere → post inside one
   SceneRT; a typed layer list resolved before the existing passes achieves sprite +
   parallax without new render targets.
3. **"BG presets belong in `src/game/content`."** Only partially. Current BG presets are
   *render content* (shader parameters), not gameplay content; they have no gameplay IDs to
   cross-validate. B1 should keep typed TS descriptors in the render layer and defer JSON
   content until level binding actually exists (bgr's `BgBinding` shows the eventual shape).
4. **"CSS `image-rendering: pixelated` means pixel-art pipeline exists."** It does not —
   the real pixel discipline comes from the 896×504 NEAREST SceneRT + integer scaling;
   palette/dither quantization is confirmed absent.

## 7. Recommended next step

**RECOMMENDED: Option D (staged hybrid) — implement B1 as typed layer descriptors + a
renderer-owned resolver that adapts the three existing BG passes and adds one sprite layer
type.** No new compositor class, no new render targets, no content JSON yet.
Details in `FABLE_BRG_ARCHITECTURE_OPTIONS.md` and `FABLE_BRG_B1_CONTRACT.md`;
session plan in `FABLE_BRG_ROADMAP.md`.

## 8. Baseline check results (this audit, at base commit)

| Command | Result |
|---|---|
| `npm ci` | PASS |
| `npm run typecheck` (`tsc --noEmit`; does not cover all of `src/render`, `src/ui`, `src/dev`, smokes) | PASS |
| `npm run test` (single `EnemySpriteSelection` smoke — not "the test suite") | PASS |
| `npm run build` (Vite production) | PASS |
| `npm run smoke` (full runner) | FAIL — exactly the pre-existing `BombExplosionChain.smoke.ts` / `DamageSystem` `onExplosion` failure documented in AGENTS.md §8; all prior smokes passed; failure exists at base, unrelated to this audit |
| `git diff --check` | PASS |

Node v22.22.2, npm 10.9.7.
