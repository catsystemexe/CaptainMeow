# FABLE BRG — Roadmap (session plan)

Derived from this audit's findings, not from the previous B1–B6 plan. The ordering differs from
a "build the compositor first" plan deliberately: the audit showed the compositor-first path was
already tried on `bgr` and produced an unintegratable prototype. Sessions are sized for one
focused branch/PR each (AGENTS.md §3), each with a rollback boundary.

Sequence: **B1 → B2 → B3 → (B4 ∥ B5) → B6 → B7?** — B4/B5 are independent of each other.

---

## B1 — Typed layer descriptors + resolver + sprite layer

- **Goal**: descriptor-driven background path per `FABLE_BRG_B1_CONTRACT.md`; legacy path as fallback.
- **Scope**: types, pure functions (+smokes), 3 adapters, `SpriteLayer` renderer, typed
  `BackgroundState` + global shim, dispatch inside `WebGLSceneRenderer`.
- **Non-goals**: everything in contract §13.
- **Dependencies**: none.
- **Likely files**: contract §11.
- **Tests**: contract §9.
- **Acceptance**: contract §12.
- **Risks**: GL state leakage between adapters (mitigate: reuse the existing pass-exit contracts);
  behavioral drift of flow presets (mitigate: adapters wrap the *same instances*).
- **Estimated size**: M (≈600–900 new lines incl. tests, ~60 edited).
- **Rollback boundary**: delete `bg/layers/**` + `BackgroundState.ts`, revert the renderer branch
  edit — legacy globals path is untouched underneath.

## B2 — BgLab v2: labs write descriptors, opacity for procedural layers

- **Goal**: BgLabUI/GridLabUI edit the B1 `BackgroundState` (layer list CRUD, per-layer
  enable/opacity/parallax), replacing direct global writes; implement constant-alpha opacity for
  shader/flow adapters (the `bgr` `blendColor`/`CONSTANT_ALPHA` technique).
- **Scope**: `src/ui/BgLabUI.ts`, `GridLabUI.ts`, adapters' blend handling; localStorage presets
  now serialize **complete `BackgroundState`** (not patches — explicit anti-`bgr`-overrides decision).
- **Non-goals**: new layer kinds; JSON game content; authoring polish.
- **Dependencies**: B1.
- **Tests**: state round-trip smoke (serialize→parse→validate→equal); opacity resolve rules.
- **Acceptance**: F7 lab edits layers live; saved lab presets reload identically after refresh;
  `__CM_BG_LAB_getFlowOverrides__` hot-path read removed or event-driven.
- **Risks**: breaking existing saved `CM_BG_LAB_PRESETS_v1` blobs (mitigate: one-way import).
- **Size**: M. **Rollback**: revert UI files; B1 state remains hotkey-driven.

## B3 — Mesh terrain layer (hand-port from `bgr`)

- **Goal**: `meshTerrain` as a new descriptor kind, hand-ported from
  `bgr:src/game/bg/runtime/base/MeshTerrainRenderer.ts` against the B1 adapter interface;
  copy/refresh `docs/bg/mesh_terrain.md`.
- **Scope**: one new renderer file + one typed params block + default preset
  (from `bgr:defaultMeshTerrainPreset.ts`) + registration in the resolver switch.
- **Non-goals**: MeshDevUI port (use B2 lab), scroll ownership changes (terrain reads
  world scroll × parallax like every layer — **not** `common.scrollSpeedX`).
- **Dependencies**: B1 (B2 helpful for tuning).
- **Tests**: pure grid/height math extracted flowStep-style into a testable module; smoke for
  seamless X-wrap invariant (the branch's "chunk seamlessok" behavior as a pure function).
- **Acceptance**: mesh terrain preset selectable; typecheck/test/build green; manual iPad/desktop
  visual check; no per-frame allocation.
- **Risks**: perf UNKNOWN on iPad (120×80 grid line mesh) — include a draw-time probe and be
  prepared to halve grid density by default.
- **Size**: M–L. **Rollback**: remove the kind + file; resolver ignores unknown kinds by design.

## B4 — Pixel post-FX track (palette / dither / pixelation) — independent

- **Goal**: optional palette-quantization + ordered dithering + pixelation step in the present
  pass, extending `PostProcessPass`/`Graphics.present()` with typed toggles (extend `FxToggleState`).
- **Scope**: `src/graphics/**` only + main.ts toggle wiring; palette as small LUT texture or
  uniform array; reference material: `bgr:PostFxRenderer` posterize/neon snippets.
- **Non-goals**: BG-only post (needs stage-2 compositor — explicit trigger, see options doc);
  per-layer post.
- **Dependencies**: none (parallel to B1–B3).
- **Tests**: shader-source smoke (existing pattern); FxToggleState extension smoke.
- **Acceptance**: hotkey/console toggle produces palette-reduced dithered output over the whole
  scene; OFF path byte-identical to today; build+smokes green.
- **Risks**: fragment cost on iPad (extra texture fetches) — keep single-pass, measure.
- **Size**: S–M. **Rollback**: toggles default OFF; delete pass variant.

## B5 — Perf measurement + flow segment batching decision — independent

- **Goal**: turn the audit's INFERRED perf risks into data: draw-call counts, frame times on
  iPad/desktop for flow segments (1400×3 draws), mesh terrain (post-B3), atmosphere ON.
- **Scope**: a dev-only frame-stats probe (draw counter wrapper or `EXT_disjoint_timer_query`
  where available) + a short findings doc; **only then** decide instancing work.
- **Non-goals**: the optimization itself (separate task if justified).
- **Dependencies**: none (better after B3).
- **Acceptance**: numbers in a doc; go/no-go recommendation for instanced segments.
- **Size**: S. **Rollback**: dev-only probe behind DEV flag.

## B6 — Level binding + background director (only when level sections exist)

- **Goal**: `levelId`/scroll-position → `BackgroundState` selection with fade transition;
  the `bgr:BgBinding` shape as input; content-boundary validation in the `loadContent.ts` style
  if/when presets move to JSON.
- **Scope**: small director module (gameplay side chooses *id*, render side resolves *state* —
  keeps authority split clean), transition = crossfade via double-draw with opacity ramp.
- **Non-goals**: chunk streaming, prefetch, timeline scripting (still absent underlying systems).
- **Dependencies**: B1 (+B2 for authoring); **blocked on a level/section concept existing in
  gameplay** — do not start before then; that dependency is why this is last.
- **Tests**: pure selection fn (scrollX/levelId → presetId), transition progress fn.
- **Risks**: inventing level structure ad hoc — must follow, not lead, the level design.
- **Size**: M.

## B7 (optional/backlog) — new layer kinds as one-session adapters

Each is one adapter + params block on the B1 spine, in whatever order design demands:
`atmosphere` (existing pass as layer, fix double gate), `particles` (reorder existing pass),
instanced glyph/ASCII layer, video layer (only after B5-style measurement + real asset),
tile layer (needs tile content pipeline first).

---

## Why this order (audit-grounded)

1. **B1 first** because every other ambition (labs, mesh, director, new kinds) needs the typed
   spine, and the audit showed the base's only extension point today is a hard-coded branch.
2. **B2 before B3** so mesh tuning doesn't resurrect a bespoke dev panel (`bgr`'s MeshDevUI path).
3. **B4 independent** because pixel-art post lives at the present seam, not in the layer system —
   coupling them (as `bgr` did with `PostFxRenderer`-as-layer) created two post systems.
4. **B5 before any optimization** because all perf claims in this audit are INFERRED; the repo
   has zero benchmarks.
5. **B6 last** because chunk/segment/timeline/level-section support is confirmed absent
   engine-wide; a director without levels would be an empty manager class (anti-pattern 5).
