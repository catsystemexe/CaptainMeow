# FABLE BRG — Architecture Options (A–D)

Context: the base has exactly one hard-coded BG branch point
(`WebGLSceneRenderer.render()` lines 1047-1084), three working procedural passes,
gameplay-owned scroll, one SceneRT, and a present-time CRT pass. The target direction is a
hybrid compositor (sprites, pixel-art, parallax, chunks, procedural, SDF, particles, reactive,
palette/dither, video, ASCII) — **that direction is not approved architecture**; the options
below are judged against what the code actually needs next.

## Option A — direct extension (keep adding `if (bgKind === …)` branches)

Add sprite/other backgrounds as new branches inside `WebGLSceneRenderer.render()` and new
`__CM_BG_*` globals.

- **Benefits**: zero new concepts; smallest first diff; matches how grid landscape was added.
- **Technical cost**: each new kind grows the renderer's ctor (eager pass construction), the
  hotkey handler, and the untyped global surface. Layer *combination* (sprite behind flow in
  front of shader) is impossible without n² branch combinations — the target explicitly wants
  combinations.
- **Migration risk**: none now, compounding later; every added branch is future migration debt.
- **Compatibility**: perfect short-term.
- **Testability**: poor — logic stays interleaved with GL calls in a 1868-line class.
- **Performance**: neutral.
- **Extensibility**: dead end for the stated goal (combination of layers).
- **Overengineering risk**: none.
- Verdict: acceptable only if the project abandons the multi-layer goal.

## Option B — typed layer descriptors + renderer-owned resolver

Introduce `BackgroundLayerDescriptor[]` (discriminated union) + pure resolver functions
(ordering, visibility, parallax, wrap, fallback). `WebGLSceneRenderer` keeps ownership: it
resolves the active descriptor list each frame and dispatches to the existing three passes via
thin adapters, plus one new `sprite` layer type. No new render targets, no new compositor class.

- **Benefits**: layer combination becomes data; state gets one typed source of truth
  (replacing 5 globals); parallax/wrap/fallback become pure Node-testable functions;
  `bgr`'s proven schema shape is reused; existing passes untouched internally.
- **Technical cost**: descriptor types + resolver + 3 adapters (~40 lines each, shape proven by
  `bgr`'s `FlowSegmentsRenderer` wrapper) + sprite layer (atlas reuse + REPEAT wrap) + state shim
  so `[`/`]`/`B` hotkeys and BgLabUI keep working.
- **Migration risk**: low — the hard-coded branch remains as fallback until the resolver path is
  proven; diff is confined to `src/render/webgl/bg/**` + one call site in `WebGLSceneRenderer`.
- **Compatibility**: high; gameplay untouched; scroll stays gameplay-owned.
- **Testability**: high (pure functions + descriptor validation).
- **Performance**: neutral-to-equal; resolver must be allocation-free per frame
  (resolve on change, not per frame — the anti-lesson of `bgr`'s per-frame `mergeDeep`).
- **Extensibility**: each future kind (mesh, atmosphere, particles, video, ascii) is one adapter.
- **Overengineering risk**: low if the union starts with only the kinds that exist + `sprite`.

## Option C — separate background compositor now

Standalone `BackgroundCompositor` owning layer lifecycle, its own RT(s), resource manager,
possibly its own post chain (the `bgr` `BgPipeline` direction, done properly).

- **Benefits**: clean isolation; per-layer opacity via blendColor without touching pass shaders;
  enables BG-only post effects (posterize on background but not sprites) and overscan.
- **Technical cost**: new RT + memory (896×504 RGBA ≈ 1.8 MB each; `bgr` used 5), new
  ownership seam vs `Graphics` (who presents? who clears?), lifecycle/dispose management,
  GL state discipline between compositor and entity renderer — precisely where `bgr`
  accumulated its hacks (state capture storms, `__bgInputTex` mutation).
- **Migration risk**: high — replaces the working single-pass path wholesale; regression risk on
  iPad (extra fullscreen resolve per frame, INFERRED cost, unbenchmarked).
- **Compatibility**: medium; must renegotiate `Graphics.renderScene` contract.
- **Testability**: same as B for the pure parts; the compositor shell itself needs GL to test.
- **Extensibility**: highest ceiling.
- **Overengineering risk**: **high today** — the repo currently has 3 procedural kinds and zero
  sprite layers; a compositor for that is `bgr` history repeating.

## Option D — hybrid staged compositor (B now, C-shaped seams later)

Stage 1 = Option B exactly. Stage 2 (only when triggered): move the resolver's dispatch loop
behind a compositor facade with its own RT **when a concrete need arrives** — BG-only post-FX
(palette/dither on background only), layer count/perf requiring batching across kinds, or
video/ASCII layers needing their own resource lifetime.

- **Benefits**: all of B's low-risk value now; C's ceiling preserved because descriptors,
  resolver and adapters are exactly the pieces a compositor would consume; no throwaway work.
- **Cost/risk**: B's. The only extra discipline: keep resolver/adapters free of
  `WebGLSceneRenderer` internals so they can be lifted later (clean import boundary
  `src/render/webgl/bg/**` → no imports from the entity renderer).
- **Overengineering risk**: low, with an explicit tripwire list instead of speculative build-out.

## Comparison summary

| | A | B | C | D |
|---|---|---|---|---|
| Value now | low | high | high | high |
| Technical cost | lowest | low-mid | high | low-mid |
| Migration risk | none→compounding | low | high | low |
| Compatibility with current code | perfect | high | medium | high |
| Testability | poor | high | mixed | high |
| Performance impact | none | ~none | extra fullscreen resolve (INFERRED) | ~none now |
| Future extensibility | dead end | good | best | best |
| Overengineering risk | none | low | **high** | low |

## Recommendation

**RECOMMENDED: Option D — with stage 1 scoped exactly as Option B (that is the B1 session).**
Not because it is the cleanest architecture (that is C), but because it has the best
value/risk/migration-cost ratio against a codebase whose background is currently one branch
point and whose only compositor precedent (`bgr`) failed precisely by building C first.

### Minimum viable architecture (B1)

- `BackgroundLayerDescriptor` discriminated union: `shader | flowRibbon | flowSegments | sprite`.
- One typed `BackgroundState` (active descriptor list + fallback), replacing direct global reads;
  legacy globals become a compatibility shim writing into it.
- Pure functions: `resolveLayers`, `parallaxOffset`, `wrappedTileOrigins`, `selectFallback`.
- Three adapters over existing passes + one new `SpriteLayer` renderer.
- Contract details: `FABLE_BRG_B1_CONTRACT.md`.

### Architecture deferred until later

- Separate compositor class + BG-owned RTs (trigger: BG-only post-FX or measured perf need).
- `BackgroundDirector` / timeline / chunk streaming (trigger: level system with positions exists).
- JSON content + schema versioning (trigger: authoring/serialization need; until then TS descriptors).
- `PixelPostFxPipeline` (palette/dither/pixelation) — present-pass extension, independent of layers.
- Central `BackgroundReactionSystem` (trigger: >3 reaction consumers or gameplay-driven reactions).
- Video / ASCII layer kinds (feasibility notes in B1 contract; both are new adapters later).

### Anti-patterns to avoid (all observed in this repo's history)

1. **Per-frame config merging** (`bgr` `BgPipeline.draw` → `mergeDeep(preset, overrides)` every
   frame). Resolve on change events only.
2. **Renderer-owned scroll authority** (`bgr` `WorldScrollSystem` delegating autoscroll to BG
   `common.scrollSpeedX`). Scroll stays in the fixed tick.
3. **Dev-UI state in the hot path** (`__CM_BG_LAB_getFlowOverrides__` read per draw in base
   `FlowRibbonBg`; `__CM.bgLabState.overrides` in `bgr`). Dev UI edits descriptors; renderer
   reads descriptors.
4. **Duplicate loaders / sources of truth** (`bgr` had `BgContentLoader` *and* `loadContent`
   validation for the same JSON, one of them shape-broken).
5. **Empty manager classes** (`InfluenceMap {}`, `AugMask {}`, `FakeAudioSource {}` — 1-line
   stubs committed as architecture). No class without a concrete responsibility in the same PR.
6. **`.bak` file archaeology as versioning** (17 `BgDevUI.ts.bak_*` on `bgr`). Git is the history.
7. **Hidden GL state leakage between passes** — every adapter must leave BLEND/program/VAO as
   documented; base sprite path shows the manual-restore cost of getting this wrong.

### Migration boundary

Everything in stage 1 lives under `src/render/webgl/bg/**` (+ `src/render/BackgroundState.ts`
or equivalent single state module). Allowed call-site edits: the BG branch inside
`WebGLSceneRenderer.render()` and the hotkey/lab shims. **Not** touched: `src/game/**`,
`src/engine/**`, `src/graphics/**`, entity passes, EventBus, content JSONs. If a change appears
to require crossing that boundary, the change is out of B1 scope by definition.

## Component evaluation

Judged against the code, not against the target wishlist. "Manager/director/system classes with
no concrete responsibility in the same PR" are explicitly disallowed (see anti-pattern 5).

| Component | Verdict | Reason |
|---|---|---|
| `BackgroundLayerDescriptor` (discriminated union) | **required now (B1)** | the actual missing piece; everything else hangs off it |
| `BackgroundLayerResolver` (pure functions, not a class) | **required now (B1)** | ordering/visibility/fallback/parallax must be Node-testable; keep it functions, not a stateful class |
| `SpriteLayer` (renderer for texture-backed parallax layers) | **required now (B1)** | first genuinely new capability; forces the wrap/filter/ownership contracts to become real |
| `ShaderLayer` adapter (DemosceneBg) | **required now (B1)** | trivial wrapper; proves the adapter pattern on day one |
| `FlowLayer` adapters (ribbon + segments) | **required now (B1)** | same; keeps current visuals reachable through the new path |
| Parallax helper (pure `parallaxOffset`) | **required now (B1)** | shared by every layer kind; ~10 lines + tests |
| `BackgroundResourceManager` | **minimal inline version now, class later** | B1 needs only "load texture, own it, dispose on layer removal" — a Map inside the sprite layer suffices; a manager class is justified only when ≥2 layer kinds share textures |
| `BackgroundLayerRegistry` | **not recommended** (fold into resolver's kind-switch) | a `switch(kind)` factory (à la `bgr` `createRenderer`) is the registry; a registry object adds indirection with one call site |
| `TileLayer` | **required later** | tilemaps are confirmed absent engine-wide; needs level/content decisions first; sprite layer with repeat covers the near-term need |
| `ParticleLayer` | **optional later** | `ParticlePass` already exists and is batched; making it a descriptor kind is a re-ordering exercise, do it when a preset actually needs particles-behind-entities |
| `BackgroundDirector` | **required later, not before level sections exist** | today there is nothing to direct: no levelId, no scroll markers; `bgr`'s `BgBinding` sketches the eventual input |
| `BackgroundTimeline` / `BackgroundChunk` | **required later (chunked/segmented levels)** | confirmed absent underlying systems (no chunk streaming, no timeline anywhere); building them now would be pure speculation |
| `BackgroundScene/LevelDescriptor` | **later, with Director** | same dependency |
| `BackgroundReactionSystem` | **optional later** | three working ad-hoc reaction consumers exist (flow kick, CA, atmos gate); centralize only when a 4th consumer or gameplay-authored reactions appear |
| `PixelPostFxPipeline` (palette/dither/pixelation) | **required later, independent track** | confirmed absent; lives in `Graphics.present()`/`PostProcessPass` seam, orthogonal to the layer system; `bgr` `PostFxRenderer` posterize shader is reference material |
| `VideoLayer` | **not recommended until a concrete asset/design exists** | feasibility assessed (B1 contract §video); autoplay policy, per-frame `texImage2D` upload cost and iPad thermals make it a deliberate, measured decision |
| `AsciiLayer` | **optional later** | feasible via glyph-atlas instancing or post-process quantization (B1 contract §ascii); current per-cell-quad glyph path is unusable at fullscreen scale |
