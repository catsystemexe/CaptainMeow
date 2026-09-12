# Captain Meow — Asset System

Status: DESIGN BASIS / PHASE H2a LIFECYCLE AND REFERENCE UX IMPLEMENTED
Last updated: 2026-09-12

This document defines the intended normative conventions and architecture for Captain Meow asset identity, preparation, cataloguing, validation, Scene Lab integration, and runtime resolution.

Actual implementation remains authoritative for currently implemented behavior. Where this document describes target behavior not yet present in code, it must be treated as an approved design basis rather than a claim about current runtime state.

Implementation status: Phase B provides the neutral branded `AssetId`, image
definition, duplicate-safe catalogue, pure resolver, and a catalogue-backed BGR
Scene Lab compatibility view. Phase C persists BGR V2 segment/object references
as stable Asset IDs and resolves them to URL-bearing runtime references while
reading canonical or legacy scenes. Static-backdrop and BGR V1 persistence remain
URL-bearing, and the renderer continues to consume resolved URLs internally.
Phase D adds structured static diagnostics for raw catalogue shape and duplicate
identity, local runtime-file existence, and migrated V2 segment/object reference
resolution. Phase F1 adds measured BGR preparation metadata and file-integrity
validation without changing runtime placement or rendering. Phase H1 adds canonical
lifecycle metadata, removed-ID tombstones, and deterministic known-reference safety
queries without changing persistence or delivery.

## 1. Purpose

The Asset System provides a stable layer between physical asset files and their use in scenes, gameplay, rendering, developer tools, and future authoring workflows.

Primary goals:
- stable persistent asset references;
- consistent preparation conventions;
- one canonical asset catalogue;
- human-readable naming in Scene Lab and other developer UI;
- safe file moves and renames without breaking scene data;
- automated validation of asset definitions and references;
- compatibility with future runtime optimisation without changing persistent scene identity.

## 2. Core rule

Persistent scene and gameplay data MUST reference assets by stable Asset ID.

Filenames, filesystem paths, and user-facing display names MUST NOT serve as persistent asset identity.

Example:

```ts
assetId: "bgr.desert.rock.large.01"
```

not:

```ts
asset: "/assets/desert/rock7-final-new.png"
```

## 3. Terminology

### Source Asset
Editable authoring source such as PSD, Procreate, Aseprite, or another master format.

### Runtime Asset
File delivered to or resolved by the running application, for example PNG, WebP, atlas region, or JSON metadata.

### Asset ID
Stable internal identifier used by persistent data and runtime lookup.

Example:

```text
bgr.desert.rock.large.01
```

### Filename
Physical runtime filename.

Example:

```text
rock_large_01.png
```

Filename is not persistent identity.

### Display Name
Human-readable label shown in Scene Lab or other UI.

Example:

```text
Large Rock 01
```

Display Name may change without migrating scene references.

### Asset Definition
Canonical catalogue record describing one reusable asset.

### Asset Instance
One concrete use of an asset in a scene or runtime composition, with instance-specific placement and transforms.

## 4. Conceptual pipeline

```text
SOURCE ASSET
    ↓
EXPORT / NORMALISATION
    ↓
RUNTIME ASSET
    ↓
ASSET CATALOGUE ENTRY
    ↓
VALIDATION
    ↓
SCENE / GAMEPLAY REFERENCE BY ASSET ID
    ↓
RUNTIME RESOLUTION
```

The catalogue is the abstraction boundary between persistent data and physical runtime delivery.

## 5. Asset taxonomy

Filesystem layout and semantic taxonomy are related but MUST NOT be treated as the same thing.

### Top-level semantic families

Current target families include:

```text
background
  environment
  segment
  object

gameplay
  player
  enemy
  projectile
  pickup

fx
  shield
  explosion
  particle

hud

dev
```

### Independent classification dimensions

An asset may additionally declare:
- `type` — what the asset is, e.g. segment, object, sprite, fx, hud;
- `environment` — e.g. desert, city, space;
- `family` — e.g. rock, tree, building, cloud;
- `layer` — e.g. far, mid, near, gameplay, foreground;
- `tags` — free search/filter metadata.

These dimensions support Scene Lab filtering without coupling UI organisation to directory structure.

## 6. Naming conventions

### Asset ID

Recommended form:

```text
bgr.desert.rock.large.01
```

Rules:
- lowercase ASCII;
- dot-separated hierarchy;
- no spaces;
- descriptive but stable;
- unique across the canonical catalogue;
- once used persistently, it MUST NOT be renamed without explicit migration;
- retired IDs MUST NOT be recycled for semantically different assets.

### Filename

Recommended form:

```text
rock_large_01.png
```

Rules:
- lowercase;
- snake_case;
- descriptive;
- physical organisation only;
- filename changes must not require persistent scene migration when Asset ID is unchanged.

### Display Name

Recommended form:

```text
Large Rock 01
```

Rules:
- human-readable;
- may change for clarity or UX;
- not a persistence key.

## 7. Source and runtime storage

Current repository conventions already distinguish source assets, runtime-delivered/generated assets, and repository-local tools through `assets`, `public/assets`, and `tools`.

Target responsibility:

```text
assets/
  source or authoring-owned material where appropriate

public/assets/
  runtime-delivered assets

tools/
  generators, validators, conversion utilities
```

The exact policy for large binary source files is still an open implementation decision. Source provenance must remain known even when editable masters are stored outside the main Git repository.


## 8.1 Implemented lifecycle and known-reference safety (Phase H1)

Every live `AssetDefinition` owns lifecycle state beside its canonical identity.
`active` definitions resolve normally. `deprecated` definitions also continue to
resolve themselves; an optional replacement ID is advisory and never redirects
runtime identity or rewrites a scene. All 15 current BGR definitions remain active.

Removed IDs are represented separately as `RemovedAssetTombstone` records beside
the live declarations. A tombstone reserves its ID permanently, is excluded from
normal catalogue lookup/resolution, and may retain an advisory replacement. The
catalogue and validator reject a live/tombstone collision. Lifecycle validation
also rejects invalid states, active replacements, unknown or non-active targets,
self-replacements, and replacement cycles.

`AssetReferenceIndex` deterministically derives references from registered built-in
scene factories rather than hand-maintained individual references. It indexes V2
segments, objects, and static backdrops. V1 URL correspondence is recorded as
`url-match`, never `exact-id`. Runtime/authoring references block known-safe
removal; verification/test-fixture references are informational. The query, unused-
candidate, and removal-assessment APIs are pure and browser/filesystem independent.

`UNUSED_CANDIDATE` means only that no blocking reference exists in supported,
repository-owned sources. The index cannot discover imported scenes, external
persisted files, browser localStorage, or dynamically constructed references. It
does not prove global non-use, delete files, deprecate entries, redirect resolution,
or automatically rewrite scenes.

Phase H2a exposes that canonical lifecycle and known-reference assessment in the
read-only Scene Asset Context. The selected asset shows separate blocking and
informational counts, expandable deterministic provenance records, scoped removal
wording, and the canonical limitation above. Deprecated definitions can also show
their advisory replacement ID. This UI adds no deletion, replacement, migration,
or reference-rewrite action; the DEV missing-asset placeholder remains deferred.

## 8. Implemented current BGR preparation convention (Phase F1)

`BACKGROUND_ASSET_DECLARATIONS` is the single owner of each BGR asset's identity,
URL, technical/pixel-art classification, and `background.preparation` metadata.
Do not add a parallel preparation map. Every current entry declares:

- `nativeSize`, measured from the physical runtime file rather than a scene instance;
- one or more `usage` roles: `segment`, `object`, or `static-backdrop`;
- `positioning.convention: "top-left"`, which records current compatibility behavior;
- horizontal `repeat.x` and a `seam` state of `seamless`, `not-seamless`, or `unknown`.

Current supported preparation-inspection formats are PNG (signature/IHDR header)
and SVG. SVG uses positive unitless or `px` root `width` and `height` when both
exist, otherwise positive `viewBox` width and height. Unsupported, malformed, or
dimensionless files are not assigned invented dimensions and fail repository
preparation validation.

All current entries are technical/test content (`technical: true`); F1 does not
invent production classifications. Multiple roles are valid. Repeatability and
seamlessness are independent claims, and an unproven seam remains `unknown`.
Only the explicitly authored demo stars tile is currently certified horizontally
repeatable and seamless.

### Segment authoring

1. Export a PNG or deterministic SVG under `public/assets/` and measure its
   intrinsic dimensions with the inspection utility.
2. Add its stable identity, delivery URL, measured `nativeSize`, `segment` usage,
   top-left positioning, and evidence-based repeat/seam state to the canonical
   declaration.
3. Author `startTrackX`, `offsetY`, and `widthPx` in the scene. `widthPx` is an
   instance width, not native-size metadata. `offsetY` remains the vertical
   placement/baseline control.
4. Choose a track whose `role` and parallax represent the intended environment
   depth, then run `npm run validate:assets` and select the declaration in Scene Lab.

There is **no universal segment width**. The renderer receives the authored width
and, because segment height is omitted, obtains height asynchronously from loaded
texture metadata. Until that metadata exists, no tile is emitted. This independent
width/native-height behavior is existing runtime behavior, not an aspect-ratio or
scale policy. Horizontal repeat in F1 metadata describes preparation knowledge;
BGR V2 sequence tracks do not consume it as a new runtime instruction.

### Object authoring

Objects may have arbitrary native dimensions; transparent padding and bounds must
be intentional. Declare `object` usage and author placement from the current
top-left origin. Scene `width` and `height` are optional, independent instance
overrides. When either is omitted, the renderer fills that dimension from the
loaded image's `naturalWidth`/`naturalHeight`; before load metadata is available,
the draw produces no tiles. F1 adds no runtime `scale`, pivot, or anchor behavior.

### Static-backdrop preparation

A catalogue asset known to serve the camera-fixed backdrop may declare
`static-backdrop`. Its current scene fields use the same top-left convention and
optional per-instance width/height fallback described above. F1 does not migrate
static-backdrop persistence or its existing URL-bearing runtime reference.

### Desert fixture evidence

Every catalogued Desert PNG measures **1672 × 941**. The sky backdrop and four
segment instances specify width 1672 (native horizontal scale); their omitted
height resolves to the native 941 after texture load. Object dimensions show a
mixed deliberate-looking fixture convention that F1 records but does not explain
or normalize:

| Asset ID | Usage / track role | Explicit instance size | Native-to-instance factors |
|---|---|---:|---:|
| `desert-test-sky` | static backdrop / camera-fixed | 1672 × native height | 1.000 × 1.000 |
| `desert-test-far-mesas` | segment / far | 1672 × native height | 1.000 × 1.000 |
| `desert-test-mid-mesas-a` | segment / mid | 1672 × native height | 1.000 × 1.000 |
| `desert-test-mid-mesas-b` | segment / mid | 1672 × native height | 1.000 × 1.000 |
| `desert-test-near-band` | segment / near; object / foreground | 1672 × native height; 1003 × 565 | 1.000 × 1.000; about 0.600 × 0.600 |
| `desert-test-sun` | object / far | 836 × 471 | 0.500 × about 0.501 |
| `desert-test-clouds` | object / far | 1254 × 706 | 0.750 × about 0.750 |

Thus 1672 is the native width of this fixture family, not evidence of a universal
segment standard. The repository does not establish whether the object sizes are
art direction, export compensation, or another convention; that question remains
explicitly unresolved.

### Validation

`npm run validate:assets` retains Phase D definition/reference checks and also
rejects missing/invalid preparation, non-positive native sizes, empty or unknown
roles, invalid repeat/seam combinations, uninspectable current files, and declared
sizes that disagree with physical PNG/SVG measurements.

## 9. Future target image preparation and pivot/scale model

The system SHOULD use per-type preparation rules rather than forcing all assets into one fixed canvas size.

### Common rules

For pixel-art runtime assets:
- lossless master/export path preferred;
- PNG is the default transparent raster runtime source unless later optimisation changes delivery;
- alpha must be explicit where required;
- avoid unintended transparent padding;
- preserve crisp pixel boundaries;
- use integer-aligned/integer-scale presentation where the rendering context requires pixel fidelity;
- colour/export settings must remain consistent within a visual family.

Runtime optimisation such as WebP or atlas packing MUST remain independent of persistent Asset ID.

### Background segment

A segment definition SHOULD support:
- native width and height;
- baseline semantics where applicable;
- repeatable yes/no;
- seam compatibility;
- left/right edge expectations;
- layer/environment classification.

A single universal segment width is not yet normative. It should be chosen only after auditing the current BGR implementation and authoring workflow.

### Scene/background object

Objects MAY use arbitrary native dimensions.

They SHOULD define:
- transparent visual bounds;
- pivot/anchor;
- default scale;
- optional layer hint;
- optional collision or interaction bounds where relevant.

## 10. Future target pivot, position, and scale

### Pivot

Recommended normalised pivot coordinates:

```text
0,0     = top-left
0.5,0.5 = centre
0.5,1   = bottom-centre
```

For many world/environment objects, `0.5,1` is the natural default because it represents the point where the object touches the ground.

### Position semantics

For asset instances:

```text
instance.x / instance.y = world or scene position of the asset pivot
```

This is a future target. Current BGR V2 explicitly defines top-left placement as
its compatibility convention; migrating to a normalized pivot would change scene
geometry and requires a separate approved migration.

### Scale

`scale: 1` SHOULD represent the canonical native authored size of the runtime asset.

If ordinary use requires arbitrary corrective scales such as `0.173`, that is evidence that asset preparation or canonical sizing should be reviewed.

## 11. Future target asset metadata model

Target conceptual definition:

```ts
interface AssetDefinition {
  id: AssetId;
  type: AssetType;
  file: string;
  displayName: string;

  width: number;
  height: number;

  pivot: {
    x: number;
    y: number;
  };

  defaultScale?: number;

  environment?: string;
  family?: string;
  layer?: AssetLayer;
  tags?: string[];

  repeatable?: boolean;
  deprecated?: boolean;
}
```

Target conceptual instance:

```ts
interface AssetInstance {
  assetId: AssetId;

  x: number;
  y: number;

  scale?: number;
  rotation?: number;
  flipX?: boolean;
  layer?: AssetLayer;
}
```

The implementation may use different concrete TypeScript shapes, but MUST preserve the distinction between reusable asset metadata and per-scene instance state.

## 12. Canonical Asset Catalogue

There SHOULD be one canonical catalogue/registry for assets that require stable identity.

Conceptually:

```text
runtime files
     ↓
Asset Catalogue
     ↓
┌───────────────┬────────────────┐
Scene Lab       Scene/Game Runtime
```

Rules:
- Asset IDs must be unique;
- Scene Lab must not maintain an independent competing registry;
- runtime code must not maintain a second competing registry for the same IDs;
- the catalogue resolves Asset ID to runtime delivery details;
- physical path is an implementation detail behind the catalogue boundary.

Existing specialised content sources and generated atlas metadata remain valid ownership domains where already established. The Asset System must integrate with those domains rather than duplicating them.

## 13. Scene Lab integration

Phase E1/S2 implement a compact catalogue-native picker and preview context for new
V2 segment and object insertion. Its options are projected from canonical BGR declarations:
the mutable Display Name is the primary UI label, Asset ID remains the persisted
identity, and the canonical runtime URL supplies both insertion delivery data and
the bounded DOM image preview. Asset ID and runtime path remain visible as
secondary technical details. H2a adds lifecycle and known-reference counts/details
to the selected-asset context. Advanced grouping, filtering, and search remain
future scope; V1 and the V2 static backdrop are unchanged.

Scene Lab SHOULD present human-oriented asset information by default:
- thumbnail or visual preview;
- Display Name;
- semantic category/family;
- environment/layer where useful.

Technical identity SHOULD remain available in a DEV inspector or tooltip:

```text
Display: Large Rock 01
ID: bgr.desert.rock.large.01
File: ...
Size: ...
Pivot: ...
```

The primary authoring UI SHOULD NOT require the user to work with raw filenames or long technical IDs.

Target picker capabilities, in order of usefulness:
1. catalogue-backed list;
2. preview/thumbnail;
3. family/category filtering;
4. environment filtering;
5. text search/tags;
6. optional recent/frequent items.

## 13. Runtime resolution

Target resolution flow:

```text
scene.assetId
    ↓
assetCatalogue.resolve(assetId)
    ↓
runtime file / atlas region / other delivery form
```

Persistent consumers remain stable even if runtime delivery later changes from standalone PNG to WebP, atlas region, or another optimised representation.

## 14. Missing asset behaviour

Silent failure is discouraged.

DEV behaviour SHOULD provide:
- visible missing-asset placeholder where practical;
- diagnostic containing unresolved Asset ID;
- enough context to locate the referencing scene/content record.

Production behaviour may differ by asset criticality, but missing persistent references must remain observable through validation or diagnostics.

## 15. Validation

Minimum target validation:
- Asset ID uniqueness;
- referenced runtime file exists;
- supported asset type;
- valid dimensions;
- pivot values within the allowed range;
- persistent scene/content references resolve to catalogue entries.

Recommended later validation:
- duplicate file registration;
- deprecated asset usage;
- invalid type/layer combinations;
- unused catalogue entries;
- seam compatibility for repeatable segments;
- preparation-policy violations.

Diagnostics should distinguish at least:

```text
ERROR
WARNING
INFO
```

Typical examples:

```text
ERROR   duplicate Asset ID
ERROR   missing referenced asset
WARNING deprecated asset reference
WARNING unused catalogue entry
```

## 16. Change safety

### Generally safe metadata changes
- Display Name;
- tags;
- catalogue grouping/category.

### Potentially breaking changes
- image dimensions;
- pivot;
- default scale;
- seam behaviour;
- animation frame geometry.

### Breaking changes
- Asset ID rename without migration;
- semantic reuse of an existing Asset ID;
- removal of an Asset ID still referenced by persistent data.

Before destructive asset changes, tooling SHOULD provide or emulate a `Find References` operation across scenes/content/catalogue consumers.

## 17. Lifecycle and deprecation

Initial lifecycle may remain simple:

```text
ACTIVE → DEPRECATED → REMOVED
```

Rules:
- existing IDs are never recycled;
- deprecation SHOULD identify a replacement where one exists;
- removal requires reference audit/migration;
- replacing artwork under an unchanged ID is acceptable only when geometry/semantics remain compatible with existing uses.

If geometry, pivot, or semantic role changes materially, a new Asset ID is usually safer.

## 18. Provenance and licensing

The schema SHOULD allow optional provenance metadata such as:
- internal;
- generated;
- external;
- author;
- licence;
- source URL or source record.

This does not need to be mandatory for all internal assets in V1, but the architecture should not prevent it.

## 19. Performance and optimisation boundary

Authoring identity and runtime optimisation are separate concerns.

This must remain possible without scene migration:

```text
Asset ID → PNG
```

later becoming:

```text
Asset ID → atlas region
```

or:

```text
Asset ID → WebP / generated runtime representation
```

Advanced loading, caching, atlas, compression, and memory-budget work is intentionally deferred until runtime evidence justifies it.

## 20. Testing contract

The implemented repository-local `validate:assets` command validates the current
canonical BGR declarations and derives migrated references from representative V2
scene objects. Diagnostics carry deterministic severity, code, message, and asset
or source context where applicable. Repository-local `/assets/...` URLs map to
`public/assets/...`; remote URLs are outside the current catalogue and are not
fetched. Static-backdrop and BGR V1 references remain outside the migrated
cross-reference scope.

Dimensions and pivots are not fields in the current general `AssetDefinition`, so
their validation is not applicable yet and remains deferred until the preparation
contract owns that metadata.

### Static/unit-level
- catalogue schema;
- duplicate ID detection;
- resolver behaviour;
- file/reference validation;
- scene/content reference validation.

### Smoke
- catalogue loads;
- representative segment resolves;
- representative object resolves;
- invalid reference fails predictably.

### Runtime/manual
- Scene Lab picker uses catalogue data;
- preview corresponds to selected asset;
- pivot placement is correct;
- scale semantics are consistent;
- missing-asset behaviour is visible and diagnostic.

Runtime/visual verification must not be inferred from static checks alone.

## 21. Approved design decisions

The following are approved design direction for future implementation:

| ID | Decision | Status |
|---|---|---|
| AS-01 | Persistent data references assets by stable Asset ID. | APPROVED |
| AS-02 | Asset ID, filename, and Display Name are distinct concepts. | APPROVED |
| AS-03 | Scene Lab should consume a canonical catalogue rather than maintain a parallel asset list. | APPROVED |
| AS-04 | Asset definition metadata and per-scene instance state are separate. | APPROVED |
| AS-05 | Runtime optimisation must not redefine persistent asset identity. | APPROVED |
| AS-06 | Pivot/anchor semantics are explicit and normalised. | APPROVED DESIGN DIRECTION |

## 22. Open decisions

The following remain intentionally unresolved until current implementation is audited:

| ID | Question | Status |
|---|---|---|
| AS-O1 | Exact concrete TypeScript catalogue shape and ownership path. | OPEN |
| AS-O2 | Exact source-asset storage policy for large editable binaries. | OPEN |
| AS-O3 | Exact segment native-width convention by BGR layer/type. | OPEN |
| AS-O4 | PNG-only V1 vs runtime WebP policy. | OPEN |
| AS-O5 | Relationship between general catalogue and existing generated atlas metadata. | OPEN |
| AS-O6 | Which existing asset families migrate first. | OPEN |

## 23. Change rule

When the implementation establishes or changes an Asset System contract:
1. verify current code and runtime ownership;
2. implement through the approved branch/PR workflow;
3. perform required static verification;
4. perform runtime/visual verification where authoring UX or placement semantics changed;
5. update this document when documented truth changes;
6. keep target-only sections clearly distinguished from implemented behaviour until migration is complete.
