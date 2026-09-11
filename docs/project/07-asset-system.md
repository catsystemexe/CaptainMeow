# Captain Meow — Asset System

Status: DESIGN BASIS / PHASE C BGR V2 PERSISTENCE IMPLEMENTED
Last updated: 2026-09-11

This document defines the intended normative conventions and architecture for Captain Meow asset identity, preparation, cataloguing, validation, Scene Lab integration, and runtime resolution.

Actual implementation remains authoritative for currently implemented behavior. Where this document describes target behavior not yet present in code, it must be treated as an approved design basis rather than a claim about current runtime state.

Implementation status: Phase B provides the neutral branded `AssetId`, image
definition, duplicate-safe catalogue, pure resolver, and a catalogue-backed BGR
Scene Lab compatibility view. Phase C persists BGR V2 segment/object references
as stable Asset IDs and resolves them to URL-bearing runtime references while
reading canonical or legacy scenes. Static-backdrop and BGR V1 persistence remain
URL-bearing, and the renderer continues to consume resolved URLs internally.

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

## 8. Image preparation contract

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

## 9. Pivot, position, and scale

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

Position MUST NOT implicitly mean the top-left pixel of the bitmap unless a specific asset type explicitly defines that convention.

### Scale

`scale: 1` SHOULD represent the canonical native authored size of the runtime asset.

If ordinary use requires arbitrary corrective scales such as `0.173`, that is evidence that asset preparation or canonical sizing should be reviewed.

## 10. Asset metadata model

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

## 11. Canonical Asset Catalogue

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

## 12. Scene Lab integration

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
