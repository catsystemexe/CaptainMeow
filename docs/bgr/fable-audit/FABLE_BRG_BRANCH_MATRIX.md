# FABLE BRG — Branch Matrix

Base = `7d1e4857c1dceb828a3421f4450033c02c3f8b06` (tip of `work` == `pixel_bgr`).
All branches inspected via `git show`/`git diff`/`git log` against fetched `origin/*` refs —
**no branch was checked out**. Common fork point of every prototype branch:
`d5713376` "proto" (2025-12-31), which is 219 commits behind the base.

Lineage (CONFIRMED via `git merge-base` / `git log --not`):

```
d5713376 (proto)
 ├── CM (40 commits) ── vector (+4) ──┬── bgr (+31)                       [ends 2026-02-24]
 │                                    ├── audit/claude-cm-prototype (+21) ── feature/visual-layer-2-atmospheric-fx (+8) ── claude_refactor (+14, merges feature/sdf-polish)
 │                                    └── audit/codex-cm-prototype (== vector, same HEAD)
 ├── gem-git (+2 trivial asset commits)
 └── (separate FSM/work lineage) … → feature/bugfix → … → work == pixel_bgr == BASE ── main (+5 empty-tree merges)
```

Key mechanism: **BGR features moved from prototype branches into the `work` lineage by
file port, not by merge** — e.g. base `FlowRibbonBg.ts` and `BgLabUI.ts` are byte-identical
to `vector`'s, and base `PostProcessPass.ts`/`flowStep.ts`/`cosinePalette.ts` are byte-identical
to `feature/visual-layer-2-atmospheric-fx`'s, even though those commits are not ancestors of the base.

| Branch | HEAD | Relationship to base | Relevant commits | Unique BGR paths | Unique capability | Already integrated? | Stale/diverged | Quality | Recommended action | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `work` | `7d1e485` | **is** the base | — | — | — | — | no | — | reference snapshot | CONFIRMED |
| `pixel_bgr` | `7d1e485` | identical to base (created from `work`) | — | — | — | — | no | — | working branch for the BGR effort | CONFIRMED |
| `main` | `9840121` | base + 5 merge commits; **tree byte-identical to base** (`git diff HEAD origin/main` is empty) | `9840121`, `1339f40`, `8cc33e8`, `d9edb5c`, `fc207df` (all vault merges) | none | none | n/a | no | — | treat as read-only vault; transfer nothing | CONFIRMED |
| `bgr` | `d7a280a` | vector + 31 commits; forked pre-FSM, 219 behind base | `a41eaaa` "bg engine mvp", `76ad8f2` multi-layer, `9987775`/`11f38ba` mesh bg + seamless scroll, `0d49517` flow legacy, `d7a280a` "pingFx progress" | `src/game/bg/**`, `src/game/content/bgPresets.json`, `bgBindings.json`, `src/ui/BgDevUI.ts`, `docs/bg/mesh_terrain.md` | layered preset schema V2, BgPipeline compositor, MeshTerrainRenderer, PostFxRenderer (posterize/fog/neon/glitch), JSON bg content + validation | **no** — nothing from it is in base | heavily stale; incompatible runtime ownership | mixed: schema good, pipeline over-built, 17 `.bak` copies of BgDevUI | port schema + selected pure ideas by hand; **never cherry-pick runtime commits** | CONFIRMED |
| `CM` | `ea71bf9` | 40 commits from `d5713376`; not an ancestor of base | `8634ff0` "side scrolling basic", `ea71bf9` "scrolling world rules clean MVP" | none bg-specific (world/camera rules) | first world-space scroll model (`WorldScrollSystem` with center-follow Y) | **yes, in evolved form** — base `WorldScrollSystem` supersedes it (dead-band camera, clamped world) | fully superseded | early MVP | nothing to transfer; historical evidence of the scroll contract | CONFIRMED |
| `vector` | `4afc4f4` | CM + 4 commits | `769b9a4` glyph module, `4afc4f4` "background visual effects" (adds `src/render/webgl/bg/*`, `BgLabUI`) | origin of `DemosceneBg`, `FlowRibbonBg`, `FlowSegmentsBg`, `bgPresets`, `flowPresets`, `BgLabUI` | first shader/flow bg stack | **yes** — `FlowRibbonBg.ts` and `BgLabUI.ts` byte-identical in base; others evolved in base (disturbances, modes 6/7) | superseded by base copies | prototype that became production | nothing to transfer | CONFIRMED |
| `audit/codex-cm-prototype` | `4afc4f4` | **same commit as `vector`** | — | — | duplicate ref | yes (== vector) | — | — | ignore; duplicate pointer | CONFIRMED |
| `audit/claude-cm-prototype` | `9d83965` | vector + 21 commits; entirely contained in `feature/visual-layer-2-atmospheric-fx` history | `0d26d4f` bomb explosion + EXPLOSION event, `bd849aa` reactive bg disturbances, `0633820` PostProcessPass v1, `c4ab91c` v2, `aa74829` event-driven CA, `9d83965` AudioSystem v1 | none beyond its successor branch | staging branch for Visual Layer 1/2 | **yes** via file port (see below) | superseded | good (tested commits) | nothing to transfer | CONFIRMED |
| `feature/visual-layer-2-atmospheric-fx` | `c0a1acd` | continues audit/claude-cm-prototype (+8) | `c82cf3a` AtmosphericFXPass, `b4898b3`/`e9e932b` SDF pipeline, `f7fabcc` FFT smoothing, `0ed390a`/`c0a1acd` event gating | origin of `AtmosphericFXPass`, `PostProcessPass`, `SdfPass`, `flowStep`, `cosinePalette` | Visual Layer 2 + Display Reality Layer | **yes** — `PostProcessPass.ts`, `flowStep.ts`, `cosinePalette.ts` byte-identical in base; `AtmosphericFXPass.ts` differs by 44 lines (base is newer); `SdfPass` evolved further in base | superseded | good | nothing to transfer | CONFIRMED |
| `claude_refactor` | `db3c960` | continues atmospheric branch (+14, incl. merge of `feature/sdf-polish`) | `291ded3` parallax stars + grid landscape modes, `39ecc0a` GridLab G-panel, `16c595c` dt clamp, `165f093` `desynchronized: true` | origin of DemosceneBg modes 6/7 and `GridLabUI` | synthwave grid landscape, parallax stars, iOS stall fixes | **yes** — `DemosceneBg.ts`, `GridLabUI.ts`, `gl.ts` byte-identical in base; SdfPass superseded by base | superseded | good | nothing to transfer | CONFIRMED |
| `feature/bugfix` | `3b4c86a` | **ancestor of base** (`git merge-base --is-ancestor` true; base is 137 ahead) | `212e671` "separate atmospheric and post fx toggles" (origin of `FxToggleState`), `64919b6` enemy culling | none outside base | — | fully merged | no | — | nothing to transfer | CONFIRMED |
| `gem-git` | `a46757b` | `d5713376` + 2 commits (asset upload, `ship.txt`→`ship.png`) | — | none | none | irrelevant | obsolete | — | ignore | CONFIRMED |
| `replit-agent` | — | **unavailable** — no such ref on `origin` (checked `git ls-remote --heads`) | — | — | — | — | — | — | record as unavailable | CONFIRMED |
| `gem-replit` | — | **unavailable** — no such ref on `origin` | — | — | — | — | — | — | record as unavailable | CONFIRMED |

Notes:

- `FSM`, `feature/sprite-layer`, `feature/enemy-fsm`, `weapon-system` and ~100 `codex/*` task
  branches exist on the remote; they are the `work` lineage's own history and were not
  BGR-audited beyond confirming the base contains their merged results (base HEAD is the
  `FSM`→`work` merge).
- The only branch holding **unintegrated** BGR capability is `bgr`. Every other mandated branch
  is either the base itself, a vault of the base, an ancestor, a duplicate ref, or a prototype
  whose files were ported into the base long ago.
