# docs/bgr — Background / Render Stack (BGR)

Documentation for the Captain Meow background & render-stack effort (working branch lineage:
`work` → `pixel_bgr`).

## Fable independent audit (B0, 2026-07-07)

Independent audit of the actual state of the background/render stack at base
`7d1e485` (`work` == `pixel_bgr`), including history of all BGR-relevant branches.

| Document | Content |
|---|---|
| [fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md](fable-audit/FABLE_BRG_EXECUTIVE_AUDIT.md) | verdict, current capability table, ownership, strongest reusable systems, risks, confirmed-absent list, disagreements, baseline check results |
| [fable-audit/FABLE_BRG_BRANCH_MATRIX.md](fable-audit/FABLE_BRG_BRANCH_MATRIX.md) | lineage graph + per-branch matrix (HEAD, relation to base, unique BGR paths, integrated?, recommended action) |
| [fable-audit/FABLE_BRG_RENDER_PIPELINE.md](fable-audit/FABLE_BRG_RENDER_PIPELINE.md) | boot/update/render call graphs, pass order, resource ownership, scroll/camera flow, reaction flow, framebuffer flow, unsafe couplings, extension points |
| [fable-audit/FABLE_BRG_BRG_BRANCH_DEEP_DIVE.md](fable-audit/FABLE_BRG_BRG_BRANCH_DEEP_DIVE.md) | `bgr` branch component-by-component: schema, BgPipeline, mesh terrain, post-FX, content, dev UI — reuse/adapt/reject decisions with reasons |
| [fable-audit/FABLE_BRG_REUSE_RISK_MATRIX.md](fable-audit/FABLE_BRG_REUSE_RISK_MATRIX.md) | runtime/renderer/content/tooling/effects/resources/tests/branches — capability × status × decision × risk |
| [fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md](fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md) | Options A–D compared; recommendation (D staged, stage 1 = B), minimum viable architecture, deferred items, anti-patterns, migration boundary, component now/later/never evaluation |
| [fable-audit/FABLE_BRG_B1_CONTRACT.md](fable-audit/FABLE_BRG_B1_CONTRACT.md) | proposed (not implemented) B1 contract: types, ownership, data/render/resource flow, pure functions, tests, acceptance, likely files, forbidden scope; video & ASCII feasibility appendices |
| [fable-audit/FABLE_BRG_ROADMAP.md](fable-audit/FABLE_BRG_ROADMAP.md) | session plan B1–B7 with goals, scopes, non-goals, dependencies, tests, acceptance, risks, sizes, rollback boundaries |
| [handoffs/FABLE_B0_AUDIT.md](handoffs/FABLE_B0_AUDIT.md) | session handoff: repo/branch/HEAD verification, fetch status, branches inspected/unavailable, baseline results, findings summary, uncertainties |
| [handoffs/B1_TYPED_SPRITE_PARALLAX.md](handoffs/B1_TYPED_SPRITE_PARALLAX.md) | B1 implementation handoff: typed background state, renderer-owned layer dispatch, sprite/parallax repeat layer, texture lifecycle, validation, and visual verification steps |
| [handoffs/B2_BACKGROUND_SCENE_CHUNKS.md](handoffs/B2_BACKGROUND_SCENE_CHUNKS.md) | B2 implementation handoff: typed background scene/chunk descriptors, active chunk resolution, deterministic layer composition, runtime ids, texture lifecycle, validation, and visual verification steps |
| [handoffs/B3_PIXEL_BGR_LAB_MVP.md](handoffs/B3_PIXEL_BGR_LAB_MVP.md) | B3 implementation handoff: Pixel BGR Lab MVP authoring UI, typed state API, scene/chunk/layer editing, preview controls, import/export, validation, tests, and visual verification steps |
| [handoffs/B4_VISUAL_PLACEMENT_ASSET_WORKFLOW.md](handoffs/B4_VISUAL_PLACEMENT_ASSET_WORKFLOW.md) | B4 implementation handoff: visual placement on the actual game canvas, overlay/pointer controller, pixel-safe nudge controls, typed asset catalog using existing assets, renderer texture metadata, and targeted tests |

Reading order: executive audit → render pipeline → branch matrix → bgr deep dive →
architecture options → B1 contract → roadmap.
