# Captain Meow — Asset System Implementation Roadmap

Status: ACTIVE IMPLEMENTATION ROADMAP / PHASE F1 BGR SCOPE COMPLETE
Last updated: 2026-09-12

This roadmap turns `07-asset-system.md` into a staged implementation plan. The
Phase B core contract and the Phase C BGR V2 segment/object persistence migration
exist. Phase D static validation is implemented for the metadata and migrated
references the current contract actually owns, but the broader target Asset System
does not yet.

Implementation truth remains current code. The roadmap must be updated when repository evidence changes the required sequence or scope.

## 1. Objective

Move Captain Meow from ad hoc or subsystem-local asset references toward a stable Asset System with:
- persistent Asset IDs;
- canonical catalogue/registry ownership;
- consistent preparation metadata;
- validation;
- Scene Lab catalogue integration;
- safe migration of existing scene/background assets;
- room for future runtime optimisation without breaking persisted scenes.

## 2. Sequencing principle

Do not begin by normalising every image size or reorganising directories.

Preferred order:

```text
AUDIT REALITY
→ DEFINE IDENTITY / CONTRACT
→ INTRODUCE CATALOGUE / RESOLVER
→ MIGRATE REFERENCES
→ VALIDATE
→ INTEGRATE SCENE LAB
→ STANDARDISE PREPARATION
→ ADD CHANGE-SAFETY TOOLING
→ OPTIMISE ONLY WHEN JUSTIFIED
```

Identity and reference stability are higher priority than cosmetic filesystem cleanup.

## 3. Phase A — Current-state audit

Priority: P0

### Goal

Establish the actual asset pipeline before changing it.

### Inspect
- `assets/`;
- `public/assets/`;
- `tools/` asset generators/converters;
- current BGR asset loading and registration;
- Scene Lab asset lists and picker logic;
- scene/chunk/background definitions;
- direct string/path references to asset files;
- generated atlas metadata and source ownership;
- segment/object dimensions currently in use;
- current pivot/placement semantics;
- current scale conventions;
- current asset-related tests/smokes;
- naming collisions and duplicated registries;
- runtime fallbacks for missing assets.

### Required classification

For each relevant asset path/registry/reference:

```text
CURRENT
TARGET
GAP
RISK
```

### Deliverable

A focused Asset System audit note or implementation task input containing:
- current ownership map;
- direct-path reference inventory;
- candidate canonical catalogue location;
- migration risks;
- unresolved geometry/pivot questions.

### Gate

No broad asset reorganisation before this audit is complete.

## 4. Phase B — Core contract

Priority: P1

Status: COMPLETE. The neutral core and BGR compatibility view are implemented;
persisted references and renderer URL ownership remain deliberately unchanged.

### Goal

Introduce the minimum stable identity model without redesigning artwork.

### Target scope
- `AssetId` type/convention;
- `AssetType` or equivalent taxonomy boundary;
- `AssetDefinition` shape;
- `AssetInstance` distinction where relevant;
- canonical catalogue/registry ownership;
- resolver from Asset ID to runtime representation.

### Must preserve
- existing runtime behaviour;
- deterministic scene evaluation;
- current atlas/content ownership where already authoritative;
- existing developer-tool workflows unless explicitly migrated in the same task.

### Acceptance criteria
- one stable Asset ID resolves predictably;
- duplicate IDs are impossible or detected;
- existing runtime asset delivery still works;
- no parallel competing registry is introduced.

## 5. Phase C — Existing reference migration

Priority: P1

Status: BGR V2 segment/object persistence COMPLETE. New writes store Asset ID
only, legacy `{id,url}` reads resolve through the catalogue, and static backdrop,
BGR V1, and renderer/runtime-reference migration remain outside this portion.

### Goal

Replace persistent direct filename/path identity with Asset IDs in the highest-value asset family first.

### Initial candidate

BGR / Scene Lab segments and objects are the likely first migration domain because they are directly authorable and persistent.

This must be confirmed by Phase A evidence.

### Migration sequence

```text
inventory existing references
→ assign stable Asset IDs
→ register catalogue entries
→ replace persistent direct paths
→ preserve runtime resolution
→ verify saved/fixture scene behaviour
```

### Scope rule

Do not redraw or cosmetically normalise assets during structural migration unless a concrete compatibility defect requires it.

### Acceptance criteria
- migrated scene data references Asset IDs;
- runtime resolves those IDs correctly;
- representative existing scenes render equivalently;
- missing IDs fail diagnostically rather than silently.

## 6. Phase D — Validation

Priority: P1

Status: COMPLETE FOR CURRENT CONTRACT. Static validation covers IDs, duplicates,
supported definition/runtime shape, blank display-name warnings, local runtime
files, and derived BGR V2 segment/object references with structured diagnostics.
Dimension and pivot checks remain deferred because the general asset definition
does not yet own those fields. Static backdrop and BGR V1 are not migrated scope.

### Goal

Make catalogue/reference corruption detectable by static verification.

### Minimum validator checks
- duplicate Asset ID;
- missing runtime file;
- unsupported/invalid type;
- invalid dimensions where dimensions are explicit;
- pivot outside allowed range;
- unresolved persistent scene/content reference.

### Diagnostic classes

```text
ERROR
WARNING
INFO
```

### Integration target

Prefer a repository-local validator or smoke that can run without browser runtime where practical.

### Acceptance criteria
- invalid references fail a targeted static check;
- diagnostics identify the broken Asset ID and source record;
- validation does not require manual Scene Lab inspection for basic integrity.

## 7. Phase E — Scene Lab catalogue integration

Priority: P2

Status: **PARTIALLY COMPLETE / E1 catalogue-native V2 picker implemented**

E1 covers explicit V2 segment/object insert selection, Display Name options,
runtime-URL preview, technical ID/path details, and contextual selection sync.
The richer grouping, filtering/search, thumbnail tooling, deprecation, and
reference-count capabilities below remain potential E2 scope.

### Goal

Make Scene Lab consume the canonical catalogue instead of maintaining its own competing asset list.

### Target UX
- Display Name as primary label;
- preview/thumbnail;
- category/family grouping;
- environment filter where useful;
- technical inspector exposing Asset ID and path;
- Asset ID persisted in authored scene data.

### Later UX
- tag/text search;
- recent/frequent items;
- deprecation indicators;
- reference count where useful.

### Acceptance criteria
- adding an eligible catalogue entry makes it available to Scene Lab without adding a second registry entry;
- Scene Lab persists Asset ID rather than filename/display label;
- renamed Display Name does not break saved scene references.

### Verification

Requires runtime/visual verification in addition to static checks.

## 8. Phase F — Preparation convention implementation

Priority: P2

Status: **PARTIALLY COMPLETE. Phase F1 — BGR measured preparation contract is
complete.** Canonical BGR declarations now own measured native size, multi-role
usage, current top-left compatibility placement, and evidence-based repeat/seam
state. PNG/SVG inspection and repository validation enforce physical-file
agreement. Runtime geometry, renderer behavior, and persistence are unchanged.

Remaining Phase F work is deliberately deferred for animated/gameplay sprites,
future pivot/default-scale migration, collision bounds, and a source-art pipeline.

### Goal

Standardise asset preparation only after actual consumption patterns are understood.

### Define by asset type

#### Segments
- canonical or recommended native widths where justified;
- baseline semantics;
- seam requirements;
- repeatable flag/behaviour;
- layer/environment metadata.

#### Objects
- transparent bounds;
- pivot conventions;
- native scale expectations;
- optional collision/interaction bounds;
- layer hints.

#### Animated sprites
Only when needed:
- frame dimensions;
- animation IDs;
- FPS/loop semantics;
- sheet/atlas ownership.

### Acceptance criteria
- new assets can be prepared without reverse-engineering existing code;
- scale/pivot rules are explicit;
- asset creation does not depend on arbitrary per-scene correction factors.

## 9. Phase G — Existing asset normalisation

Priority: P2–P3

### Goal

Bring selected legacy assets into the approved preparation convention without unnecessary churn.

### Approach
- migrate family by family;
- preserve IDs where geometry and semantics remain compatible;
- create new IDs when pivot/geometry/meaning changes materially;
- avoid repository-wide rename sweeps without functional value.

### Candidate batches
- BGR segments;
- BGR objects;
- environment-specific props;
- gameplay presentation sprites;
- FX assets;
- HUD/dev assets.

Actual order depends on Phase A findings and active product work.

## 10. Phase H — Change safety and lifecycle tooling

Priority: P3

### Goal

Make destructive asset maintenance safe.

### Target capabilities
- `Find References` for an Asset ID;
- deprecated state;
- optional replacement Asset ID;
- unused asset detection;
- missing-asset placeholder in DEV;
- optional reference count in tooling.

### Acceptance criteria
- an asset cannot be safely removed without its references being discoverable;
- deprecated assets remain resolvable during migration;
- removed IDs are never silently recycled.

## 11. Phase I — Provenance metadata

Priority: P3

### Goal

Support ownership/licensing traceability where useful.

### Optional metadata
- internal/generated/external source class;
- author;
- licence;
- source URL/reference;
- editable-master location.

This phase may be pulled earlier if external or generated assets become a material project risk.

## 12. Phase J — Runtime optimisation

Priority: P4

### Goal

Optimise delivery only when profiling or asset volume justifies it.

Potential scope:
- preload policy;
- lazy loading;
- WebP conversion;
- sprite atlases;
- cache strategy;
- memory budgets;
- asset dependencies;
- hot reload for authoring.

### Non-negotiable invariant

Optimisation must occur behind Asset ID resolution so persistent scenes do not need migration merely because runtime delivery changes.

## 13. Priority summary

| Priority | Scope |
|---|---|
| P0 | Audit current asset directories, registries, references, dimensions, pivots, and Scene Lab ownership. |
| P1 | Stable Asset ID contract, canonical catalogue, resolver. |
| P1 | Migrate first persistent direct-path references to Asset IDs. |
| P1 | Add core validation. |
| P2 | Integrate Scene Lab with the canonical catalogue. |
| P2 | Finalise pivot/scale/preparation conventions from repository evidence. |
| P2–P3 | Normalise existing asset families incrementally. |
| P3 | Deprecation, Find References, unused detection, provenance. |
| P4 | Atlas/WebP/loading/cache/performance optimisation. |

## 14. Recommended implementation units

Avoid one large Asset System rewrite. Prefer focused tasks such as:

1. **Audit — current BGR/Scene Lab asset ownership and references**
2. **Core — introduce Asset ID/catalogue/resolver contract**
3. **Migration — BGR segment/object references to Asset IDs**
4. **Validation — duplicate/missing/reference checks**
5. **Scene Lab — catalogue-backed asset picker**
6. **Convention — pivot/native-scale/segment preparation rules**
7. **Safety — deprecation and reference discovery**
8. **Optimisation — only from measured need**

Each implementation task should use a focused branch and preserve the repository workflow defined in `AGENTS.md` and `05-development-workflow.md`.

## 15. Verification expectations by phase

### Documentation/audit only
- verify paths, symbols, and authority claims against repository state;
- inspect diff for accidental scope expansion.

### Core catalogue/reference implementation
- targeted TypeScript/static checks;
- targeted smokes for catalogue/resolver;
- build where browser import boundaries change.

### Scene Lab integration
- build/static checks;
- targeted tests where available;
- runtime visual verification of picker, labels, preview, persistence, pivot placement.

### Asset preparation changes
- build;
- relevant asset generator/atlas command when ownership requires it;
- runtime visual comparison;
- review generated diff carefully.

## 16. Explicit non-goals for early phases

Do not bundle the following into P0/P1 unless required by evidence:
- repository-wide filesystem cleanup;
- bulk image redraw/export;
- all-asset atlas conversion;
- WebP migration;
- cache/preload redesign;
- broad renderer refactor;
- general Scene Lab redesign unrelated to asset selection;
- replacement of existing specialised content registries that already have clear ownership.

## 17. Open implementation questions

These must be resolved from current code rather than guessed:
- Where should the canonical general-purpose asset catalogue live?
- Which existing registry is closest to the correct abstraction and can be extended rather than duplicated?
- Which BGR scene data currently stores paths versus logical IDs?
- What pivot semantics are already implicit in object placement?
- Are segment dimensions already constrained by renderer/chunk code?
- Which atlas metadata is generated and what source owns it?
- What is the minimum migration slice that proves the architecture without forcing a repository-wide conversion?

## 18. Stop conditions

Stop and return to design/audit rather than broadening implementation when:
- current asset ownership conflicts materially with the proposed catalogue model;
- persistent scene compatibility cannot be preserved safely;
- the proposed Asset ID boundary duplicates an existing canonical content/atlas identity layer;
- pivot/scale semantics cannot be determined from code/runtime evidence;
- migration would require unrelated renderer or BGR architecture changes.

## 19. Definition of completion

The Asset System foundation can be considered implemented when:
- persistent authoring data uses stable Asset IDs for the migrated scope;
- a canonical catalogue resolves those IDs;
- Scene Lab consumes that catalogue for the migrated scope;
- basic integrity is statically validated;
- pivot/scale conventions are explicit for supported asset types;
- asset changes can be made without treating filenames as identity;
- canonical documentation reflects actual implemented state.

Advanced runtime optimisation is not required for foundation completion.
