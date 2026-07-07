# FABLE BRG — B1 Contract Proposal (design only — NOT implemented)

Everything in this document is RECOMMENDED design for the next implementation session.
Nothing here exists in the base. Type names are proposals, not decisions already made.

## 1. Goal

Replace the hard-coded background branch in `WebGLSceneRenderer.render()` with a
**typed, ordered background layer list** resolved by pure functions, dispatching to the three
existing procedural passes through thin adapters, and adding **one new layer kind: `sprite`**
(texture-backed, horizontally repeatable, parallax-scrolled). Visual output for existing
presets must be unchanged when the descriptor list mirrors today's globals.

## 2. Non-goals (forbidden scope expansion)

- No separate compositor class, no new render targets, no BG-only post chain.
- No changes to `src/game/**`, `src/engine/**`, `src/graphics/**`, entity passes, EventBus.
- No JSON content files, no schema versioning/serialization, no level bindings.
- No `BackgroundDirector`, timeline, chunks, reactions refactor, video, ASCII, tile layer.
- No removal of `DemosceneBg`/`FlowRibbonBg`/`FlowSegmentsBg` internals or their presets.
- No palette/dither/pixelation work (separate track at the present pass).
- No perf optimization of flow segment draw calls (measure first, separate task).
- No new `Math.random()` (per AGENTS.md §7.13 — seeds/hashes only).

## 3. Types (proposed; discriminated union, no `params: any`)

```ts
// src/render/webgl/bg/layers/BackgroundLayerTypes.ts  (proposed location)

export type BlendMode = "alpha" | "add" | "opaque";
export type CoordinateSpace = "screen" | "world";     // world => camera-subtracted before parallax

export type LayerCommon = {
  id: string;                 // unique within the list; renderer-cache key
  enabled: boolean;
  opacity: number;            // 0..1 (B1: sprite layer honors it; procedural adapters may document "ignored" — see §10)
  blend: BlendMode;
  space: CoordinateSpace;     // existing passes: "screen" with their own scroll semantics
  parallax: { x: number; y: number };     // multiplier on world scroll (0 = static, 1 = locked to world)
  velocity: { x: number; y: number };     // px/s layer-local drift, independent of scroll
  offset: { x: number; y: number };       // px origin offset
};

export type ShaderLayer       = LayerCommon & { kind: "shader";       presetIndex: number };
export type FlowRibbonLayer   = LayerCommon & { kind: "flowRibbon";   presetIndex: number };
export type FlowSegmentsLayer = LayerCommon & { kind: "flowSegments"; presetIndex: number; disturbances: boolean };
export type SpriteLayer       = LayerCommon & {
  kind: "sprite";
  texture: { url: string };            // B1: direct URL; atlas frames deferred
  repeatX: boolean;                    // wrap horizontally (seamless strip)
  repeatY: boolean;
  filter: "nearest";                   // B1 fixes NEAREST; "linear" is a later option
  overscanPx: number;                  // extra tiles drawn beyond viewport (default 0..64)
};

export type BackgroundLayerDescriptor =
  | ShaderLayer | FlowRibbonLayer | FlowSegmentsLayer | SpriteLayer;

export type BackgroundState = {
  layers: BackgroundLayerDescriptor[];  // draw order = array order (index 0 = back)
  fallback: "legacy";                   // what to do when layers is empty/invalid (see §10)
};
```

Ordering: array order only. No z/priority field in B1 — one source of ordering truth.

## 4. Ownership

| Concern | Owner (B1) |
|---|---|
| Type model location | `src/render/webgl/bg/layers/` — render layer, because BG presets are render content today (no gameplay IDs to cross-validate); revisit when level bindings exist |
| Descriptor creation | a `defaultBackgroundState()` factory mirroring today's globals, plus the hotkey/lab shim translating `[`/`]`/`B`/BgLabUI writes into descriptor mutations |
| Validation | `validateBackgroundState()` pure function, called on every state replacement (not per frame); invalid → warn once + fallback |
| Canonical runtime state | one module-level `BackgroundState` accessor (pattern: `FxToggleState`); legacy `__CM_BG_*` globals become a compat shim that writes into it |
| Texture load + ownership | the sprite layer renderer instance (keyed by layer `id`); disposes texture when its layer is removed or its `texture.url` changes |
| Parallax computation | pure `parallaxOffset()` — callers pass scroll in, no global reads |
| Wrap computation | pure `wrappedTileOrigins()` |
| Drawing | `WebGLSceneRenderer` (unchanged owner), which iterates resolved layers and calls adapters |
| Scroll | **unchanged**: gameplay `WorldScrollSystem`; renderer passes `(sx, sy)` down explicitly to adapters (adapters must NOT read `window.__CM`) |

## 5. Data flow

```
hotkeys / BgLabUI / console ──writes──► BackgroundState (typed, validated on write)
                                              │  (resolve on change or cheap per-frame filter — no allocation)
WorldScrollSystem (fixed tick) ─► world.scrollX/Y ─► renderer.render(alpha)
                                              │
                              resolveLayers(state) → visible ordered descriptors
                                              │
                    for each: parallaxOffset + velocity + offset → per-layer scroll
                                              │
                              adapter.draw(gl-args incl. explicit scroll)
```

## 6. Render flow (inside `WebGLSceneRenderer.render()`)

1. Read `BackgroundState`; if `layers` empty or invalid → **legacy path** (current hard-coded
   branch, untouched code).
2. `const visible = resolveLayers(state)` — filters `enabled`, validates, preserves order.
3. For each layer: compute `scroll' = parallaxOffset(worldScroll, layer, tSec)`; set blend per
   `layer.blend`; dispatch by `kind` to the adapter; adapters restore GL state per the existing
   pass contracts (BLEND off, no VAO bound on exit).
4. Entity passes and everything after remain byte-identical.

Adapters wrap the *existing instances* already constructed in the renderer ctor
(`this.bg`, `this.bgFlowRibbon`, `this.bgFlowSegments`) — no duplicate GL programs.

## 7. Resource flow (sprite layer)

- Lazy `SpriteTexture`-style load on first draw of a `sprite` layer; magenta 1×1 placeholder
  until ready (existing pattern in `src/render/sprites/SpriteTexture.ts`).
- **New sampler option**: `TEXTURE_WRAP_S/T = REPEAT` when `repeatX/Y` (requires POT texture;
  non-POT + repeat must fail validation with a clear warning — WebGL2 allows non-POT REPEAT,
  but B1 should still verify dimensions to avoid silent seams from bad art. Verify at load.)
- Disposal: adapter keeps `Map<layerId, {url, tex}>`; on layer removal/url change → `deleteTexture`.

## 8. Pure functions (each with Node smoke tests, no GL)

```ts
parallaxOffset(scroll: {x,y}, layer: LayerCommon, tSec: number): {x,y}
//   = scroll * parallax + velocity * tSec + offset   (per axis)

wrappedTileOrigins(offsetX: number, tileW: number, viewW: number, overscanPx: number): number[]
//   returns ascending draw origins covering [−overscan, viewW+overscan); must be stable for
//   negative offsets (the classic ((x % w) + w) % w seam case, cf. drawDebugBackground)

resolveLayers(state: BackgroundState): BackgroundLayerDescriptor[]
//   enabled filter + order preservation; no allocation when nothing changed (cache by state ref)

isLayerVisible(layer: LayerCommon): boolean
//   enabled && opacity > 0

selectFallback(state: BackgroundState | null | undefined): "layers" | "legacy"
//   empty/missing/invalid layers → "legacy"
```

## 9. Tests (B1 acceptance)

- `bg/BackgroundLayerResolve.smoke.ts`: ordering stability, enabled filtering, fallback selection
  (empty list, malformed layer, unknown kind → legacy), opacity-0 invisibility.
- `bg/ParallaxOffset.smoke.ts`: parallax 0 / 1 / 0.5, velocity drift, offset composition,
  negative scroll, non-finite inputs → safe defaults.
- `bg/WrappedTileOrigins.smoke.ts`: full coverage of viewport at any offset (incl. large negative),
  seam invariant: consecutive origins differ by exactly `tileW`; overscan honored.
- Register the suite in `src/smoke/runSmokes.ts` (and note `SceneRenderOrder.smoke.ts` is
  currently unregistered — register it in the same change if trivial).
- Existing smokes must stay green except the pre-existing `BombExplosionChain` failure, which
  must be reported as pre-existing per AGENTS.md §8/§15.

## 10. Fallback behavior

- `BackgroundState` absent/empty/invalid → current hard-coded branch runs (zero visual change).
- Sprite texture missing/failed → that layer draws nothing (transparent), one bounded warn;
  other layers unaffected. Never a magenta fullscreen flash in production path — placeholder is
  only sampled if the layer explicitly opts in (`debugPlaceholder?: true`, optional).
- Adapter throw at construction → layer skipped + warn (mirrors existing `SdfPass` try/catch
  degradation pattern).
- Opacity on procedural adapters: B1 may implement opacity for `sprite` only and document
  `opacity` as "must be 1 for shader/flow kinds in B1" in validation — implementing constant-alpha
  blending for the legacy passes (the `bgr` blendColor technique) is a B2+ enhancement.
  This must be an explicit validation warning, not a silent ignore.

## 11. Likely files

```
src/render/webgl/bg/layers/BackgroundLayerTypes.ts      (new — types + validate)
src/render/webgl/bg/layers/backgroundLayerMath.ts        (new — pure fns)
src/render/webgl/bg/layers/BackgroundLayerResolve.smoke.ts (new)
src/render/webgl/bg/layers/ParallaxOffset.smoke.ts       (new)
src/render/webgl/bg/layers/WrappedTileOrigins.smoke.ts   (new)
src/render/webgl/bg/layers/SpriteLayerRenderer.ts        (new — texture ownership + tiled draw)
src/render/webgl/bg/layers/adapters.ts                   (new — shader/flowRibbon/flowSegments wrappers)
src/render/BackgroundState.ts                            (new — typed state + compat shim)
src/render/webgl/WebGLSceneRenderer.ts                   (edit — BG branch → resolver dispatch + fallback)
src/main.ts                                              (edit — hotkeys write via shim)
src/smoke/runSmokes.ts                                   (edit — register new smokes)
```

## 12. Acceptance criteria

1. With no state changes, every existing preset (`shader` presets 0..1 visible, flow ribbon,
   flow segments incl. disturbances, `[`/`]`/`B` hotkeys, BgLab F7 flow overrides, GridLab G)
   renders as before (manual browser check + unchanged existing smokes).
2. A two-layer descriptor list (e.g. `shader` behind `sprite` with `parallax.x: 0.4`,
   `repeatX: true`) renders both layers in order with correct wrap and no seams at any scrollX.
3. All new pure-function smokes pass in Node; `npm run typecheck`, `npm run test`,
   `npm run build` pass; `npm run smoke` fails only on the pre-existing BombExplosionChain.
4. No new reads of `window.__CM.*` or `globalThis.__CM_*` inside `src/render/webgl/bg/layers/**`.
5. Diff confined to the §11 file list.

## 13. What B1 must NOT implement (repeat of the tripwires)

Compositor class, new RTs, BG-only post-FX, JSON presets, level bindings, director/timeline/
chunks, reaction refactor, particle/tile/video/ascii kinds, palette/dither, flow instancing,
context-loss handling, removal of legacy globals (shim only), any `src/game/**` edit.

---

## Appendix A — Video layer feasibility (assessment only)

- Upload: WebGL2 accepts `HTMLVideoElement` in `texImage2D`; a 896×504-cover video re-uploaded
  per frame is a full-texture DMA every frame — the single largest dynamic upload the engine
  would have (today's largest is 32×1). INFERRED: measurable cost on iPad; must be benchmarked
  before adoption.
- Decode: browser-owned; no frame-accurate sync API except `requestVideoFrameCallback`
  (Safari-supported); tick-determinism impossible and unnecessary (presentation-only layer).
- Autoplay: must be `muted` + `playsinline`, started after the same first-gesture gate the
  audio already uses (`armAudio` in `main.ts` is the existing pattern to piggyback on).
- Memory/bandwidth: video asset + decoder + texture; thermal cost on iPad is the real risk
  (sustained decode + upload + CRT post). UNKNOWN without measurement.
- Fallback: descriptor should carry a `poster`/static-texture fallback → degrade to `sprite` layer.
- Verdict: technically feasible as one more adapter later; **not recommended** until a concrete
  design asset exists and an iPad measurement session precedes it.

## Appendix B — ASCII/text layer feasibility (assessment only)

Current glyph path (`GlyphDB` + per-cell uniform-quad draws) is unusable fullscreen:
a 112×63 cell grid at 8px cells would be thousands of draw calls. Options:

| Variant | Compatibility with current renderer | Notes |
|---|---|---|
| Bitmap font atlas + **instanced quads** (one `drawArraysInstanced`, per-instance cell uv+color) | **best fit** — WebGL2 instancing available, atlas infra exists (`SpriteAtlas`) | one draw call; cell data in a per-frame-updated instance VBO (~112×63×few bytes, small) |
| Glyph texture atlas + CPU-built vertex buffer | fine | more CPU per frame than instancing, no new GL features |
| CPU text rasterization to canvas → texture upload | works | per-frame `texImage2D` of full screen — same cost class as video; reject for animation |
| SDF glyphs | overkill | SDF pass exists but is shape-based; text SDF atlas generation is a new toolchain |
| Post-process ASCII quantization (sample SceneRT, map luma→glyph in shader) | natural fit at the present pass | this is a **post-FX**, not a layer; pairs with the future PixelPostFx track; needs glyph atlas texture in the present pass |
| Verdict | — | instanced glyph-atlas layer for authored text layers; post-process quantization for the "ASCII filter" aesthetic. Both later; neither blocks B1. |
