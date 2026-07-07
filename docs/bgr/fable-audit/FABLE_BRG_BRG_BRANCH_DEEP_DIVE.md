# FABLE BRG — `bgr` Branch Deep Dive

- Branch: `origin/bgr`, HEAD `d7a280a` "pingFx progress" (2026-02-24)
- Base of branch: `origin/vector` (`4afc4f4`) → fork point with current base: `d5713376` (2025-12-31)
- Distance: 31 commits ahead of `vector`; **219 commits behind** the current base `7d1e485`
- Inspected via `git show origin/bgr:<path>` and `git diff origin/vector origin/bgr` — no checkout
- Diff volume vs `vector`: 136 files, +34 722 / −8 533 (about half of that is `.bak` copies)

## 1. What the branch actually is

A one-month solo prototyping burst (2026-01-24 → 2026-02-24) that built a **layered background
compositor** (`src/game/bg/**`) beside the game, then progressively rewired `main.ts`,
`WorldScrollSystem`, `loadContent` and the scene renderer around it. Commits are checkpoint-style
("bg dev building layout", "pre pingpong", "fx bg more"), with 17 timestamped `.bak` copies of
`BgDevUI.ts` committed into the tree. It predates FSM enemies, the sprite/appearance contract,
pickups/weapons V2 and every AGENTS.md validation added since — nothing from it is in the base.

## 2. Component table (branch-only paths)

| Path | Symbol | Purpose | Dependencies | Current-base compatibility | Quality | Decision | Reason |
|---|---|---|---|---|---|---|---|
| `src/game/bg/schema/BgPreset.ts` | `BgLayerV2`, `BgPresetV2`, `BgBlend` | typed layer model: `id, kind, enabled, opacity 0..1, blend "alpha"\|"add", parallaxMul, seed?, params` + preset `{schemaVersion:2, seed, common, quality, layers[], fx?/aug?/interaction?/audio?}` | `BgBase` | conceptually clean; no runtime deps | good | **ADAPT** (port shape by hand into B1 types) | this is the layer contract the whole audit converges on; `kind: string` escape-hatch and `params: Record<string,any>` must become a discriminated union |
| `src/game/bg/schema/BgBase.ts` | `BgBaseCommon`, `BgBaseQuality`, `BgBase` | per-preset common block (timeScale, scrollSpeedX, exposure/contrast/gamma/vignette…) + quality (noiseTexSize, internalResolution) | none | mixes scroll authority (`scrollSpeedX`) into render content → conflicts with gameplay-owned `world.speedX` | mixed | **CONCEPT ONLY** | `quality` block is a good future idea; `common.scrollSpeedX` is the authority-inversion vector — do not port |
| `src/game/bg/schema/BgBinding.ts` | `BgBinding` | level→preset binding with fade/cross transition | none | no `levelId` concept exists in base session state (bgr `main.ts` probes `session.levelId` and finds nothing) | good sketch | **CONCEPT ONLY** (future B-session) | right shape for scroll-position/level transitions, but nothing to bind to yet |
| `src/game/bg/runtime/BgPipeline.ts` (578) | `BgPipeline` | the compositor: per-layer renderer cache keyed by layerId (kind-swap disposal), per-layer opacity via `gl.blendColor` + `CONSTANT_ALPHA` blend, postFx ping-pong RT chain, 8 % overscan RTs, full GL state capture/restore | `createRenderer`, `GlRt`, `mergeDeep`, `globalThis.__CM.bgLabState.overrides` | **incompatible as-is**: owns autoscroll (`autoX += common.scrollSpeedX*dt`), does `mergeDeep(preset, overrides)` **every frame** (per-frame allocation), 15+ `gl.getParameter` calls per frame (pipeline-stall risk, INFERRED), passes postFx input via mutation of `common.__bgInputTex` | over-built for its era | **REJECT code; ADAPT 3 ideas** | ideas worth porting: (a) blendColor/CONSTANT_ALPHA per-layer opacity, (b) layerId-keyed renderer cache with kind-swap disposal, (c) overscan padding for post distortion. The class itself duplicates what `Graphics`+`renderScene` already own in base |
| `src/game/bg/runtime/BgSystem.ts` | `BgSystem` | UV-gradient fullscreen test quad | none | trivially portable but pointless | scaffold | **REJECT** | superseded by BgPipeline within the branch itself; dead scaffold |
| `src/game/bg/runtime/BgDrawCtx.ts`, `BgSnapshot.ts`, `BgRuntimeDiff.ts` | types | draw context, snapshot, diff types | schema | fine | thin | **CONCEPT ONLY** | shapes are obvious; rewrite fresh in B1 |
| `src/game/bg/runtime/base/BaseRenderer.ts` | `BaseRenderer` | layer renderer interface: `init/rebuild/setUniforms/draw/dispose` | none | portable | good | **ADAPT** | `setUniforms(params:any,…)` needs typing; otherwise this is the right five-method lifecycle |
| `src/game/bg/runtime/base/createRenderer.ts` | `createRenderer(kind)` | kind→renderer factory (mesh/flowSegments/flowRibbon/postFx/shader) | all renderers | pattern portable | good | **ADAPT** (as B1 resolver seed) | exactly the resolver shape B1 needs, minus `default: shader` silent fallback (should be explicit fallback selection) |
| `src/game/bg/runtime/base/MeshTerrainRenderer.ts` (781) | `MeshTerrainRenderer` | procedural line-mesh terrain: perspective grid, 2-layer waves + domain warp + fbm bumps, depth-shaped amplitude, seamless scroll (the "chunk seamlessok" commits = wrap of mesh X, **not** level chunks) | BaseRenderer | GL-self-contained → portable with moderate effort; ~30 tuning params documented in `docs/bg/mesh_terrain.md` (branch) | best-engineered renderer on the branch | **ADAPT (later session, as one layer kind)** | genuinely unique visual capability absent from base; port = new file implementing the B1 layer interface, not a cherry-pick |
| `src/game/bg/runtime/base/PostFxRenderer.ts` (405) | `PostFxRenderer` | BG-only post chain: tint gradient, fog by height, chromatic aberration (near/far), scanlines, **posterize**, neon edge boost, barrel distortion, scatter, glitch slices | BaseRenderer; fed via `common.__bgInputTex` | conflicts with base's present-time `PostProcessPass` (two post systems); posterize is the only palette-ish code in the repo | feature-rich, hacky input contract | **CONCEPT ONLY** | mine it for shader snippets (posterize/fog/neon) when building the future pixel-art palette pass; do not port the renderer or its input mutation |
| `src/game/bg/runtime/base/ShaderBgRenderer.ts`, `FlowSegmentsRenderer.ts`, `FlowRibbonRenderer.ts` (~100 each) | wrappers | adapt legacy `DemosceneBg`/`FlowSegmentsBg`/`FlowRibbonBg` to `BaseRenderer` | legacy bg classes (branch versions) | base's bg classes have diverged (disturbances, modes 6/7) but the wrapper pattern maps 1:1 | thin, fine | **ADAPT** (rewrite against base classes) | proves the "adapter over existing passes" strategy (Option B/D) works — the wrappers are ~40 lines of real code each |
| `src/game/bg/runtime/fx/GlRt.ts` | `createColorRt/resizeColorRt/disposeRt` | color RT helpers | none | base already has `RenderTarget` class with resize | fine | **REJECT** | duplicate of existing base capability |
| `src/game/bg/runtime/fx/FxPass.ts` | `FxPass` | 5-line interface | — | — | stub | **REJECT** | never implemented |
| `src/game/bg/runtime/interaction/InfluenceMap.ts`, `augmentation/AugMask.ts`, `audio/FakeAudioSource.ts` | empty classes | reserved subsystems (influence/ping FX targets) | — | — | **1-line stubs** | **REJECT** | evidence of intended direction only; the actual "pingFx progress" work (`d7a280a`) landed in PostFxDevUI/BgPipeline ping-pong RTs, and the base meanwhile got a real reactive path (flow disturbances) |
| `src/game/bg/content/BgContentLoader.ts` | `BgContentLoader` | preset/bindings loader | local JSON | **broken vs its own content**: iterates `presetsJson as any[]` but `src/game/content/bgPresets.json` is `{schemaVersion, presets:[…]}`; treats bindings as `Record<levelId,presetId>` but `bgBindings.json` is `{bindings:[{levelId,presetId,transition}]}`. Branch `main.ts` bypasses it and reads CONTENT directly | superseded within the branch | **REJECT** | dead duplicate loader; the surviving path is `loadContent.ts` validation |
| `src/game/content/bgPresets.json` + `bgBindings.json` + `loadContent.ts` diff (+146) | `validateBgPresetsFile` etc. | JSON bg content validated at the content boundary, exposed as `CONTENT.bgPresets`/`CONTENT.bgBindings`; `main.ts` resolves levelId→preset→`bgPipeline.setPreset` with `DEFAULT_MESH_TERRAIN_PRESET` fallback | loadContent | validation style matches base's content normalization rules (§7.9) | good | **CONCEPT ONLY / ADAPT LATER** | proves the content-boundary validation pattern for bg presets; defer JSON until level binding exists (B1 keeps TS descriptors) |
| `src/game/bg/presets/defaultMeshTerrainPreset.ts` | `DEFAULT_MESH_TERRAIN_PRESET` | typed V2 fallback preset | schema | portable with mesh renderer | good | **ADAPT with mesh session** | canonical example of a full V2 preset incl. missing-content fallback usage |
| `src/game/bg/lab/BgLabState.ts` + `BgLabBus.ts` + `mergeDeep.ts` | `BgLabState`, `BgLabBus` | dev-lab state: `activePresetId + overrides (Partial<BgPreset>) + ui`; change bus with `"realtime"\|"rebuild"\|"structural"` change types | — | overrides-over-preset editing is why the pipeline mergeDeeps per frame | decent idea, wrong hot path | **CONCEPT ONLY** | keep the *change-type taxonomy* (realtime vs rebuild vs structural) for future authoring; apply overrides on change events, never per frame |
| `src/ui/BgDevUI.ts` (1613 + 17 `.bak`) | `BgDevUI` | full layer editor: per-layer enable/opacity/blend/parallax rows, path-based override writes (`setByPath` → `__CM.bgLabState.overrides`), JSON import/export of `{activePresetId, overrides, ui}` | BgLabState global | round-trips **overrides**, not presets — exported JSON is a patch against a preset that lives in code; needs `mergeDeep`'s fragile array-patch heuristics to re-apply | works but coupled to global override model | **REJECT code; keep as UI reference** | base's `BgLabUI` (F7) is the surviving lab; a future authoring session should export *complete resolved presets* instead of patches |
| `src/game/bg/dev/MeshDevUI.ts`, `PostFxDevUI.ts` | dev panels | slider panels bound to pipeline preset params | BgPipeline dev API (`getWorkingPreset/applyPresetNoReset`) | tied to rejected pipeline | fine for their purpose | **REJECT** | rebuild trivially against whatever B-series API exists when mesh/post layers are ported |
| `scripts/patch_flowRibbon_*.js`, `patch_flowPreset_*.js` | node scripts | one-shot source-patching scripts (sed-style codemods) | — | — | throwaway | **REJECT** | historical build artifacts; never run these against the current tree |
| `docs/bg/mesh_terrain.md` (237) | — | architecture + parameter documentation for MeshTerrainRenderer | — | — | good | **ADAPT** (copy alongside a future mesh port) | the only real documentation produced by the branch |

## 3. Cross-cutting runtime changes on the branch (the dangerous part)

| Path (branch diff) | Change | Verdict |
|---|---|---|
| `src/game/systems/WorldScrollSystem.ts` | autoscroll **removed from gameplay**: "autoscroll světa je nyní řízen pouze BG pipeline (common.scrollSpeedX); world.speedX ignorujeme". Camera window rewritten to start-centered range. | **MUST NOT be cherry-picked.** Scroll became renderer-owned → violates gameplay/presentation separation the base enforces (AGENTS.md §7.7). The base's dead-band camera is also simply newer. |
| `src/render/webgl/WebGLSceneRenderer.ts` | shrunk 1868→505 lines; commit `cd56d75` "renderer uses placeholders only, glyph pipeline detached"; entities drawn as colored placeholder quads | **MUST NOT be cherry-picked.** The branch deliberately gutted entity rendering to iterate on backgrounds; porting anything from this file would delete the current sprite/SDF/glyph contract. |
| `src/engine/core/events.ts` | adds `spawnSpace?: "screen" \| "world"` to the spawn event | superseded — base solved world/screen spawn semantics differently in the FSM lineage; do not port |
| `src/main.ts` | BgPipeline wiring, `window.__CM.bg` registry (`presets()/setPresetById/getActivePresetId`), levelId probing, DEV-gated dev UIs | wiring itself is rejected with the pipeline; the tiny `__CM.bg` dev-registry shape is a reasonable reference for B1's debug hooks |
| `tsconfig.json`, `vite-env.d.ts` | JSON module imports enabled | trivial; base already imports JSON content |

## 4. Explicit answers required by the audit brief

**Does the branch have a usable schema model?**
Yes — `BgLayerV2`/`BgPresetV2` is the single most valuable artifact on the branch: ordering by
array position, `enabled`, `opacity`, `blend "alpha"|"add"`, `parallaxMul`, per-kind `params`,
preset-level `seed` and `schemaVersion`. It needs: discriminated-union `params`, removal of
`kind: string` open escape hatch, removal of scroll authority from `common`. CONFIRMED.

**Is its runtime compatible with today's world/render ownership?**
No. Three hard conflicts: (1) BG pipeline owns autoscroll (`common.scrollSpeedX` + `autoX`)
while base gameplay owns `world.scrollX`; (2) its scene renderer predates and deletes the
current entity contract; (3) its per-frame `mergeDeep` + `__CM.bgLabState.overrides` read makes
dev-UI state part of the hot render path. CONFIRMED.

**Which files are worth a manual port?**
In order: `schema/BgPreset.ts` + `schema/BgBinding.ts` (shapes), `base/BaseRenderer.ts` +
`createRenderer.ts` (lifecycle/factory pattern), `base/MeshTerrainRenderer.ts` +
`presets/defaultMeshTerrainPreset.ts` + `docs/bg/mesh_terrain.md` (as a later layer kind),
the blendColor/CONSTANT_ALPHA opacity technique and layerId-keyed cache from `BgPipeline.ts`
(technique, not file), and `PostFxRenderer.ts`'s posterize/fog/neon shader snippets (for the
future pixel-art palette pass).

**Which implementations must never be cherry-picked?**
`WorldScrollSystem.ts`, `WebGLSceneRenderer.ts`, `main.ts` wiring, `events.ts` spawnSpace,
`BgContentLoader.ts` (broken), all `.bak` files, all `scripts/patch_*.js`.

**What is only historical evidence of direction?**
The 1-line stubs (`InfluenceMap`, `AugMask`, `FakeAudioSource`), `fx/FxPass.ts`, `BgSystem.ts`,
`BgLabBus` change-type taxonomy, the `fx?/aug?/interaction?/audio?` reserved blocks in the
preset schema, and the ping-pong "pingFx" experiments — they show the author intended
influence-map reactions, augmentation masks and audio-driven layers, none of which were built.
The base later shipped a *different, working* reactive path (flow disturbances + CA + FFT gate).

## 5. Integration risk summary

Porting the schema shape: **low risk** (pure types + pure functions, testable in Node).
Porting the mesh renderer: **medium** (self-contained GL, needs adapter + perf check on iPad).
Porting anything from `BgPipeline`/`main.ts`/`WorldScrollSystem`: **high → forbidden path**;
re-derive inside the base's ownership rules instead.
