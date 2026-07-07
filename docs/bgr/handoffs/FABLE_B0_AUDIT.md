# FABLE B0 — Audit Handoff

## Repository & session

- Repository: `catsystemexe/MGoD`, local checkout `/home/user/MGoD` (remote session container;
  task text referenced `/workspace/MGoD` — actual mount differs, contents verified identical to
  the requested snapshot by commit hash).
- Session branch (synthetic, per AGENTS.md §9.2): `claude/captain-meow-bgr-audit-0acy0z`.
- Starting HEAD: `7d1e4857c1dceb828a3421f4450033c02c3f8b06` ("Merge branch 'FSM' into work").
- Authoritative base: `7d1e4857c1dceb828a3421f4450033c02c3f8b06` — **exact match** with starting
  HEAD (`git rev-parse HEAD`). Working tree clean at start.
- Base verification: `origin/work` and `origin/pixel_bgr` both point at this same commit —
  consistent with "pixel_bgr created from work" in the task.
- Final audit commit: `docs(bgr): add independent Fable background audit` — docs-only, created
  immediately after this file; the hash is necessarily recorded in the final session report
  (a commit cannot contain its own hash).

## Remote / fetch status

- `origin` present (proxy remote to GitHub). No temporary `audit-origin` needed.
- Read-only `git fetch origin <branch>` performed for all mandated branches; **no branch was
  checked out**; all inspection via `git show`/`git diff`/`git log` on `origin/*` refs.

## Branches inspected

`work`, `main`, `bgr`, `CM`, `vector`, `audit/claude-cm-prototype`, `audit/codex-cm-prototype`,
`feature/visual-layer-2-atmospheric-fx`, `feature/bugfix`, `claude_refactor`, `gem-git`,
`pixel_bgr` (== base).

## Unavailable branches

- `replit-agent` — no such ref on origin (`git ls-remote --heads` checked).
- `gem-replit` — no such ref on origin. (`gem-git` exists and was inspected instead: 2 trivial
  asset commits, irrelevant.)

## Baseline checks (at base, before any doc changes)

| Command | Result |
|---|---|
| `npm ci` | PASS (Node v22.22.2, npm 10.9.7) |
| `npm run typecheck` | PASS (scope caveat: main tsconfig does not cover all render/ui/dev/smoke roots — AGENTS.md §8) |
| `npm run test` | PASS (single `EnemySpriteSelection` smoke — not a full suite) |
| `npm run build` | PASS (Vite; chunks incl. `BgLabUI`, `GridLabUI`) |
| `npm run smoke` | FAIL — pre-existing `BombExplosionChain.smoke.ts` (`DamageSystem` `onExplosion` of undefined), exactly the known failure documented in AGENTS.md §8; all other smokes passed |
| `git diff --check` | PASS |
| `npm audit fix` | NOT RUN (forbidden by task) |

## Output files (all created this session)

- `docs/bgr/fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md`
- `docs/bgr/fable-audit/FABLE_BRG_BRANCH_MATRIX.md`
- `docs/bgr/fable-audit/FABLE_BRG_RENDER_PIPELINE.md`
- `docs/bgr/fable-audit/FABLE_BRG_BRG_BRANCH_DEEP_DIVE.md`
- `docs/bgr/fable-audit/FABLE_BRG_REUSE_RISK_MATRIX.md`
- `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`
- `docs/bgr/fable-audit/FABLE_BRG_B1_CONTRACT.md`
- `docs/bgr/fable-audit/FABLE_BRG_ROADMAP.md`
- `docs/bgr/handoffs/FABLE_B0_AUDIT.md` (this file)
- `docs/bgr/README.md` (index — created; `docs/bgr/` did not previously exist)

## Executive findings (condensed — full detail in the executive audit)

1. Base background = **one hard-coded branch** in `WebGLSceneRenderer.render()` selecting
   `DemosceneBg` | `FlowRibbonBg` | `FlowSegmentsBg` via untyped globals
   (`__CM_BG_KIND__`, `__CM_BG_PRESET__`, `__CM_BG_LAB__`). Not a layer system.
2. Scroll authority is gameplay-owned (`WorldScrollSystem`, fixed tick); renderer reads it via
   `window.__CM.game.world` — the main coupling risk.
3. Pipeline: SceneRT 896×504 NEAREST → BG pass → entity passes → VFX → particles →
   (optional) atmosphere → present with CRT post (CA/glow/scanlines/breathing) at integer scale.
4. **Confirmed absent**: background sprite/texture layer, layer model in runtime, palette/dither/
   pixelation, chunk/tilemap/timeline/level sections, video, ASCII layer, context-loss handling.
5. All prototype branches except `bgr` are already integrated into the base **by file port**
   (several byte-identical files); `main`'s tree is identical to base; `feature/bugfix` is an
   ancestor. Only `bgr` holds unintegrated capability.
6. `bgr` deep dive: valuable = `BgLayerV2` schema, `BaseRenderer` lifecycle + factory pattern,
   `MeshTerrainRenderer`, blendColor-opacity technique, posterize shader reference. Forbidden =
   its `WorldScrollSystem` (scroll authority inverted into BG pipeline), gutted scene renderer,
   per-frame `mergeDeep` of dev overrides, broken duplicate `BgContentLoader`.

## Architecture recommendation

**Option D (staged hybrid)** — stage 1 is exactly Option B: typed
`BackgroundLayerDescriptor` union + pure resolver functions + adapters over the three existing
passes + one new `sprite` layer kind; renderer keeps ownership; no compositor/RTs/JSON yet.
Full comparison in `FABLE_BRG_ARCHITECTURE_OPTIONS.md` (incl. component-by-component
now/later/never table and anti-pattern list).

## Recommended next session

**B1** per `FABLE_BRG_B1_CONTRACT.md` — goal, types, ownership, pure functions, tests,
acceptance criteria, likely files and forbidden scope are fully specified there.
Roadmap B1→B7 in `FABLE_BRG_ROADMAP.md` (B4 pixel post-FX and B5 perf measurement are
independent tracks; B6 level binding is blocked on level sections existing).

## Known uncertainties (UNKNOWN / INFERRED items)

- All performance statements (flow-segment draw-call cost ~1400×3/frame, mesh terrain on iPad,
  video upload thermals) are INFERRED — the repo contains zero benchmarks; B5 exists to fix this.
- `npm run smoke` result interpreted against AGENTS.md's documented pre-existing failure; no
  other failure signature was observed, but the suite was run once, not soak-tested.
- Whether saved user `CM_BG_LAB_PRESETS_v1` localStorage blobs exist in the wild (affects B2
  import strategy) — unknowable from the repo.
- `replit-agent`/`gem-replit` content — refs do not exist; nothing further inspectable.
- Browser-level visual verification was not possible in this environment (no display); pipeline
  order statements come from code reading, corroborated by existing smoke contracts
  (`SceneRenderOrder.smoke.ts`, pass-exit state comments).

## Explicitly unchanged

No runtime, renderer, gameplay, dependency, asset, config or test file was modified.
No branch checkout/merge/push-to-other-branch, no PR, no `npm audit fix`, no generators.
The only writes are the `docs/bgr/**` files listed above, in a single commit.

## Final git status

See final commit hash above; post-commit verification (status, show --stat, diff-tree,
typecheck/test/build re-run) recorded in the final session report. Working tree clean after
commit; only `docs/bgr/**` paths in the commit.
