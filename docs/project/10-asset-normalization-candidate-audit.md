# Captain Meow — Asset Normalization Candidate Audit

Status: CANONICAL G0 AUDIT / PROPOSAL

Audit snapshot: `pixel_bgr` remote HEAD
`4ac25e34b66eb1e2498179336981a015ce916446` (2026-09-12).

## Scope

This audit classifies every entry in `BACKGROUND_ASSET_DECLARATIONS` for Phase G.
It is an inventory and decision record, not an asset migration. No physical asset,
Asset ID, URL, scene dimension, renderer, persistence path, or Scene Lab behavior
is changed by G0.

The active BGR catalogue contains 15 declarations. All 15 are explicitly marked
`technical: true`; none is established as production art. The shallow review of
other asset domains at the end only decides whether later audits are warranted.

## Method

Evidence was collected from the canonical declarations, physical PNG/SVG headers,
the Phase F1 inspection/validation contract, and repository-wide exact searches
for every Asset ID and runtime URL. Static references were then traced through the
two checked-in V2 scene factories, the V1 factory/default path, serialization and
persistence smokes, the picker compatibility view, evaluator, render commands,
and sprite renderer.

For authored object dimensions, factors are `instance / native` on each axis.
For segments, the horizontal ratio is `widthPx / nativeWidth`; their omitted
height uses native texture height at render time. “Native fallback” below means a
dimension is omitted and the renderer obtains it from loaded texture metadata.
No alpha-bound claim is made: the current inspector deterministically reads file
canvas dimensions, not non-transparent pixel bounds.

Reference discovery is deterministic for literal IDs and URLs in checked-in
source, but it is not a general reference index. It cannot prove references in
external/imported persisted scenes, user local storage, string concatenation, or
IDs supplied at runtime. Catalogue-derived picker entries are availability, not
authored scene references. A generalized Find References facility belongs to
Phase H and was not introduced for this audit.

## Current evidence

- Phase F1 validation establishes that all 15 declared native sizes match their
  physical PNG/SVG files and that their preparation records are valid.
- Every declaration uses top-left compatibility placement. There is no runtime
  pivot or catalogue default-scale system.
- Only `bgr-demo-stars-tile` declares `repeat.x: true` and a proven `seamless`
  seam. Every other declaration has `repeat.x: false` and `seam: unknown`.
- V2 sequence segments use authored width as a horizontal clip/draw extent and
  native texture height. Therefore a width ratio is not, by itself, a complete
  two-axis image scale or evidence of bad export geometry.
- The Desert family shares a measured 1672 x 941 canvas. Its segment widths are
  native. Its three explicit object sizes closely match deliberate nominal
  factors of 0.50, 0.75, and 0.60, with at most one-pixel integer rounding; no
  repeated arbitrary corrective factor is present.
- The debug SVG dimensions and authored dimensions deliberately exercise native,
  enlarged, and clipped cases. Making them uniform would reduce test coverage.

## Candidate matrix

Classification here answers whether physical normalization is justified now.
`TECHNICAL_TEST_ONLY` does not mean invalid: these assets are convention-compliant
technical fixtures whose differing geometry often supplies the behavior under
test.

| Asset / family | Current use | Native geometry | Instance pattern | Classification | Risk | ID strategy | Benefit | Recommendation |
|---|---|---:|---|---|---|---|---|---|
| `b1-technical-stars-svg` — Technical demo: B1 stars (SVG); `/assets/bg/b1_pixel_stars.svg`; SVG | Declared segment/object/static-backdrop; canonical ID appears only in a catalogue smoke. The same URL is used by V1 runtime factories under URL identity and the derived `m4-shared-stars` V2 compatibility ID. | 128 x 64 | V1 native fallback; repeat is instance-owned there. No canonical-ID V2 scene instance. | `TECHNICAL_TEST_ONLY` | LOW if untouched; ID/URL migration is outside G0 | Preserve this ID for equivalent delivery cleanup. Resolve V1 alias/reference lifecycle separately before any geometry-changing replacement. | **NO NORMALIZATION VALUE**; current asymmetry is an identity/reference issue, not pixel evidence. | Leave physical file unchanged; defer reference unification to lifecycle work. |
| `bgr-demo-stars-tile` — Technical demo: seamless repeat/parallax raster pixel-art tile; `/assets/bg/demo/bgr_demo_stars_tile.png`; PNG | Declared segment/object/static-backdrop; available through picker; only literal ID reference outside its declaration is a picker/catalogue smoke. | 64 x 64 | No known authored scene dimensions. | `TECHNICAL_TEST_ONLY` | LOW | Preserve ID for equivalent cleanup; new ID if seam or geometry semantics change. | **NO NORMALIZATION VALUE**; it is the sole positively certified horizontal seamless fixture. | Preserve as the repeat/seam control. |
| `bgr-demo-orientation` — Technical demo: orientation/origin/bounds/drag raster pixel-art test; `/assets/bg/demo/bgr_demo_orientation.png`; PNG | Declared segment/object/static-backdrop; picker availability and picker/catalogue smoke only. | 128 x 64 | No known authored scene dimensions. | `TECHNICAL_TEST_ONLY` | LOW | Preserve only for geometry-compatible cleanup; changed origin/bounds require a new ID. | **NO NORMALIZATION VALUE**; non-square bounds are test intent. | Preserve unchanged. |
| `bgr-demo-chunk-band` — Technical demo: chunk-local placement/boundary raster pixel-art test; `/assets/bg/demo/bgr_demo_chunk_band.png`; PNG | Declared segment/object/static-backdrop; picker availability and picker/catalogue smoke only. | 256 x 127 | No known authored scene dimensions. | `TECHNICAL_TEST_ONLY` | LOW | Preserve only for geometry-compatible cleanup; changed boundary geometry requires a new ID. | **NO NORMALIZATION VALUE**; unusual height is part of boundary coverage, not evidence of an export defect. | Preserve unchanged. |
| `desert-test-sky` — Technical test: desert sky; `/assets/bg/test/desert/desert_sky.png`; PNG | Static backdrop in `bgr-v2-desert-authoring-test`; camera-fixed; technical runtime authoring fixture. | 1672 x 941 | width 1672, height native fallback = 1.000 x 1.000; x 0, y -180. | `TECHNICAL_TEST_ONLY` | MEDIUM if changed because a built-in scene and persistence-compatible ref depend on its geometry | Preserve for equivalent cleanup; new ID if bounds/native geometry change existing placement. | **NO NORMALIZATION VALUE**; already native-sized. | Non-candidate. |
| `desert-test-clouds` — Technical test: desert clouds; `/assets/bg/test/desert/desert_clouds.png`; PNG | Object on far/sequence track in Desert fixture; technical runtime and serialization fixture. | 1672 x 941 | 1254 x 706 = 0.7500 x 0.7503 (uniform nominal 0.75 with integer rounding); x 720, y -70. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve only if canvas and top-left placement stay compatible; otherwise new ID. | **NO NORMALIZATION VALUE**; one deliberate-looking authored scale is not corrective-export evidence. | Keep; art intent versus export compensation remains unknown but does not justify migration. |
| `desert-test-far-mesas` — Technical test: desert far mesas; `/assets/bg/test/desert/desert_far_mesas.png`; PNG | Segment on far/sequence track in Desert fixture; technical runtime, serialization, and persistence evidence. | 1672 x 941 | widthPx 1672 = 1.000 horizontal; native-height fallback; start 0, offsetY -120. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve for equivalent cleanup; new ID for changed bounds/native geometry. | **NO NORMALIZATION VALUE**; native width and no seam/repeat claim. | Non-candidate. |
| `desert-test-mid-mesas-a` — Technical test: desert mid mesas A; `/assets/bg/test/desert/desert_mid_mesas_a.png`; PNG | Segment on mid/sequence track in Desert fixture; technical runtime fixture. | 1672 x 941 | widthPx 1672 = 1.000 horizontal; native-height fallback; start 0, offsetY -55. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve for equivalent cleanup; new ID for changed bounds/native geometry. | **NO NORMALIZATION VALUE**. | Keep as authored overlap-family member. |
| `desert-test-mid-mesas-b` — Technical test: desert mid mesas B; `/assets/bg/test/desert/desert_mid_mesas_b.png`; PNG | Segment on mid/sequence track in Desert fixture; technical runtime fixture. | 1672 x 941 | widthPx 1672 = 1.000 horizontal; native-height fallback; start 1600, offsetY -35. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve for equivalent cleanup; new ID for changed bounds/native geometry. | **NO NORMALIZATION VALUE**; 72 px A/B overlap is scene composition, not proof of seam failure. | Keep as authored overlap-family member. |
| `desert-test-near-band` — Technical test: desert near band; `/assets/bg/test/desert/desert_near_band.png`; PNG | Multi-role: segment on near/sequence track and object on foreground/sequence track in Desert fixture; technical runtime fixture. | 1672 x 941 | segment widthPx 1672 = 1.000 horizontal, start 260, offsetY 35; object 1003 x 565 = 0.5999 x 0.6004 (uniform nominal 0.60 with rounding), x 1850, y 175. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve only for compatible delivery cleanup; new ID if bounds alter either role. | **NO NORMALIZATION VALUE**; two intentional usage roles and one nominal object scale are not contradictory. | Preserve multi-role coverage; any future review must test both uses. |
| `desert-test-sun` — Technical test: desert sun; `/assets/bg/test/desert/desert_sun.png`; PNG | Object on far/sequence track in Desert fixture; technical runtime fixture. | 1672 x 941 | 836 x 471 = 0.5000 x 0.5005 (uniform nominal 0.50 with integer rounding); x 120, y -210. | `TECHNICAL_TEST_ONLY` | MEDIUM | Preserve only if bounds and placement remain compatible; otherwise new ID. | **NO NORMALIZATION VALUE**; the single nominal half-size instance does not establish export compensation. | Keep; do not convert uncertainty into a crop/rescale. |
| `shared-solid` — Technical verification: solid; `/assets/debug/bgr/bgr-test-solid.svg`; SVG | Four objects on far/sequence verification track; debug runtime, persistence smoke, and blend/opacity checks. | 64 x 64 | two at 96 x 96 = 1.500 uniform; two at 88 x 88 = 1.375 uniform. | `TECHNICAL_TEST_ONLY` | LOW | Preserve ID and geometry to retain assertions; changed geometry/test meaning requires new fixture ID. | **NO NORMALIZATION VALUE**; multiple scales are explicit test inputs. | Preserve unchanged. |
| `blend-backdrop` — Technical verification: blend backdrop; `/assets/debug/bgr/bgr-test-backdrop.svg`; SVG | Two objects on far/sequence verification track; debug runtime blend bases. | 64 x 64 | 112 x 112 = 1.750 uniform at two positions. | `TECHNICAL_TEST_ONLY` | LOW | Preserve ID and geometry for equivalent cleanup; semantic test change requires new ID. | **NO NORMALIZATION VALUE**; enlargement supports overlap/blend verification. | Preserve unchanged. |
| `finite-stripes` — Technical verification: finite stripes; `/assets/debug/bgr/bgr-test-stripes.svg`; SVG | Segment on near/sequence verification track; debug runtime plus persistence smoke. | 256 x 96 | widthPx 128 = 0.500 horizontal; native-height fallback; start 360, offsetY 300. | `TECHNICAL_TEST_ONLY` | LOW | Preserve ID and native geometry to retain boundary behavior; changed test geometry requires new ID. | **NO NORMALIZATION VALUE**; half-width clipping is explicitly the finite segment-boundary test. | Preserve unchanged. |
| `foreground-marker` — Technical verification: foreground marker; `/assets/debug/bgr/bgr-test-marker.svg`; SVG | Object on foreground/sequence verification track; debug runtime gameplay-overlap check. | 128 x 128 | 128 x 128 = 1.000 uniform; x 36, y 188. | `TECHNICAL_TEST_ONLY` | LOW | Preserve for equivalent cleanup; new ID if bounds/marker meaning change. | **NO NORMALIZATION VALUE**; already native-sized and purpose-built. | Preserve unchanged. |

Classification counts: `COMPLIANT` 0, `NORMALIZATION_CANDIDATE` 0,
`INTENTIONAL_EXCEPTION` 0, `TECHNICAL_TEST_ONLY` 15, `AMBIGUOUS` 0,
`DEFER` 0. The zero `COMPLIANT` count does not indicate contract failure; the
single primary classification records that all current entries are technical.
All 15 also pass the implemented preparation convention and validation. No asset
has concrete normalization benefit.

## Reference inventory details

| Scene / source | Reference type and track role | Assets and authored geometry | Status |
|---|---|---|---|
| `createBackgroundV2DesertTestScene` | static backdrop / camera-fixed | `desert-test-sky`: width 1672, height omitted | Built-in technical runtime authoring fixture |
| `createBackgroundV2DesertTestScene` | segment / far / sequence | `desert-test-far-mesas`: widthPx 1672, offsetY -120 | Built-in technical runtime authoring fixture |
| `createBackgroundV2DesertTestScene` | object / far / sequence | `desert-test-sun`: 836 x 471; `desert-test-clouds`: 1254 x 706 | Built-in technical runtime authoring fixture |
| `createBackgroundV2DesertTestScene` | segment / mid / sequence | `desert-test-mid-mesas-a`: widthPx 1672, offsetY -55; `desert-test-mid-mesas-b`: widthPx 1672, offsetY -35 | Built-in technical runtime authoring fixture |
| `createBackgroundV2DesertTestScene` | segment / near / sequence | `desert-test-near-band`: widthPx 1672, offsetY 35 | Built-in technical runtime authoring fixture |
| `createBackgroundV2DesertTestScene` | object / foreground / sequence | `desert-test-near-band`: 1003 x 565 | Built-in technical runtime authoring fixture |
| `createBackgroundV2VisualVerificationScene` | object / far / sequence | `shared-solid`: 96 x 96 twice and 88 x 88 twice; `blend-backdrop`: 112 x 112 twice | Debug runtime verification fixture |
| `createBackgroundV2VisualVerificationScene` | segment / near / sequence | `finite-stripes`: widthPx 128, offsetY 300 | Debug runtime verification fixture |
| `createBackgroundV2VisualVerificationScene` | object / foreground / sequence | `foreground-marker`: 128 x 128 | Debug runtime verification fixture |
| V1 defaults/demo (`createSpriteLayer`, `createDefaultBackgroundState`) | V1 sprite layer; global/repeating compatibility use | `/assets/bg/b1_pixel_stars.svg`: native fallback; canonical Asset ID is not stored, and an adapter-derived ID may be used | Technical runtime/demo path; URL match only, not a known canonical-ID scene reference |
| Scene Lab catalogue-derived picker | selectable declaration roles | all 15 entries; insertion dimensions depend on subsequent authoring | Runtime developer UI availability, not a scene reference |
| Catalogue, validation, serialization, and persistence smokes | assertions | exact IDs noted by repository search; no additional authored geometry beyond the factories above | Test-only evidence; not additional scenes |

The three demo raster IDs and canonical `b1-technical-stars-svg` ID have no known
V2 scene instance. The B1 physical URL does have active V1 technical references,
but the V1 contract is URL-based and therefore cannot prove that those instances
refer to the canonical ID. This is a lifecycle/reference-discovery limitation,
not evidence for pixel normalization.

## Family-level findings

### Demo and B1 technical family

The 64 x 64, 128 x 64, and 256 x 127 canvases exercise different repeat,
orientation, and boundary cases. Different sizes across those semantic tests are
not a family inconsistency. The stars tile is the only declared seamless member;
the other seam states remain correctly unknown. B1's canonical-ID/legacy-URL
alias should be handled by reference lifecycle work rather than changing pixels.

### Desert authoring family

All seven catalogued Desert images share 1672 x 941 native geometry. Four segment
uses and the backdrop use native width. Mid A starts at 0 and Mid B at 1600, an
authored 72 px overlap on a sequence track; neither repeat nor seamlessness is
declared, so this is not a failed repeat seam. OffsetY varies by depth/content and
does not repeat as a bitmap-bound correction.

The explicit object factors form clean nominal scales after integer rounding:
sun 0.50, clouds 0.75, and foreground near-band 0.60. Each appears once as an
authored object; there is no repeated corrective constant across scenes. The
repository cannot distinguish art direction from export compensation statically,
but that uncertainty supplies no concrete product benefit because this is a
technical test pack and native segment uses are already consistent.

### Visual-verification SVG family

This family deliberately covers native object size, multiple uniform enlargement
factors, and a segment clipped to half its native width. Normalizing instances or
physical canvases toward one size would make the fixture less useful. No member
claims repeat/seam compatibility.

## Non-candidates

All 15 canonical BGR assets are non-candidates. None shows incompatible seams in
a repeated family, repeated arbitrary export correction, duplicated delivery for
one semantic identity, inconsistent proven transparent padding, or an actual
validation exception. Size difference alone was not used as defect evidence.

## Unknowns

- Alpha bounds of the PNGs were not inspected. Current tooling does not establish
  whether transparent padding is intentional, and no repeated placement pattern
  makes alpha-bound analysis a prerequisite for the current no-op decision.
- The artistic reason for the Desert 0.50/0.75/0.60 object sizes is not recorded.
  Visual review would be required before changing them, but no change is proposed.
- External/user-authored persisted scenes and browser local storage are outside
  static repository traversal, so reference counts are lower bounds.
- Dynamically constructed IDs cannot be exhaustively found with exact-text search.
- Non-core atlas source provenance remains unknown; G0 does not infer normalization
  needs from delivered atlas sizes.

## Other asset domains

| Domain | Shallow classification | Phase G disposition |
|---|---|---|
| Gameplay presentation sprites | Active production runtime atlases and content-selected animation/frame IDs; pivot/frame geometry affects gameplay presentation and existing scenes. | `DEFER`: audit by atlas family only when provenance and runtime visual gates are available. Do not copy frame ownership into the general catalogue. |
| FX | Active renderer-owned atlas mappings; effect identity and atlas delivery are specialized runtime concerns. | `DEFER`: consider a focused future family audit, not part of BGR normalization. |
| HUD/dev assets | BGR debug SVGs are already classified above; no separate canonical production HUD asset family was established by this shallow pass. | `DEFER`: inventory only when an owning catalogue/source boundary exists. Technical fixtures should normally remain unchanged. |
| Atlas/generated metadata | `assets/sprites/core.map.txt` owns generated `public/assets/sprites/core.atlas.json`; other checked-in atlas provenance is unknown. | `INTENTIONAL_EXCEPTION` for specialized/generated ownership and `DEFER` for provenance audit. Never normalize by hand-editing generated output. |

These domain labels are family-level future-routing decisions, not additions to
the 15-entry BGR classification counts.

## Proposed Phase G batches

### G1 — no-op for current canonical BGR assets

- Exact Asset IDs: all 15 IDs in the candidate matrix.
- Evidence: all are technical, all pass physical-dimension/preparation validation,
  and no concrete seam, padding, duplicate, correction-factor, or validation
  defect was found.
- Expected physical changes: none.
- Expected scene changes: none.
- ID strategy: preserve all existing IDs; no replacement IDs.
- Required runtime verification: none for the no-op decision.
- Rollback risk: none, because no implementation change is proposed.

No G2 implementation batch is justified. Other asset domains remain separate
future audits rather than implied migrations.

## Decision gate

**No current BGR normalization is justified. Proceed to Phase H.** Phase G can be
considered complete for the active canonical BGR scope because G0 classified all
entries and recommends no physical work. This does not declare gameplay sprites,
FX, HUD, or non-core atlas provenance normalized.

Reopen a focused Phase G batch only when new evidence identifies an exact asset
and concrete product benefit (for example a proven repeated correction, seam
failure, transparent-padding defect, duplicate semantic delivery, or validation
exception). Any geometry/bounds change must reassess persisted-scene impact and
the preserve-ID/new-ID rule before implementation.
