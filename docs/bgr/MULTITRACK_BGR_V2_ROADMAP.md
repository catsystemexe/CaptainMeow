# Captain Meow — Multitrack BGR V2 Roadmap

Status: ACTIVE WORKSTREAM / IMPLEMENTATION CONTROL DOCUMENT
Baseline branch: `pixel_bgr`
Baseline checkpoint at roadmap creation: `b1d0443bfe927eee4f00af5479dece0b8442d797`
Last updated: 2026-09-04

## Purpose

This document is the canonical implementation roadmap for the Multitrack Pixel BGR Engine V2 workstream.

It does not replace the project-level canonical documents in `docs/project/*`. It defines the focused architecture, milestones, verification gates, and status for this BGR workstream.

Current repository implementation remains primary evidence for what exists. Historical BGR handoffs and archived branches are evidence only unless explicitly promoted.

## Current confirmed baseline

The current `pixel_bgr` implementation already contains the B1–B6 generation of the Pixel BGR system:

- typed background layers, including sprite layers;
- sprite opacity, normal/additive blend, parallax X/Y, offsets, repeat X/Y, nearest-filtered texture rendering;
- scene/chunk background composition;
- Pixel BGR Lab with scene/chunk/layer/property/placement/marker authoring surfaces;
- validated JSON export/import and local draft persistence;
- visual canvas placement;
- global/chunk presentation markers;
- world-X timeline with chunk move/resize and overlap detection;
- unified gameplay authoring seek based on actual gameplay Player X;
- world/camera X/Y support, including vertical camera scroll.

The current BGR scene model remains chunk-centric:

```text
BackgroundScene
├─ globalLayers[]
├─ chunks[]
│  ├─ startX
│  ├─ length
│  ├─ layers[]
│  └─ markers[]
└─ markers[]
```

Multitrack V2 is an extension/rearchitecture above this baseline, not a rewrite of B1–B6.

## Architectural objective

Separate three domains that are partially coupled in V1:

```text
GAMEPLAY WORLD
- Player
- camera
- gameplay chunks / encounters
- gameplay markers

BGR COMPOSITION
- scene environment
- tracks
- segments
- decorative / seam-cover objects

PRESENTATION
- evaluated render instances
- texture resources
- composite ordering
```

They share world coordinates, camera scroll, Player X reference, and presentation context, but they do not share data ownership.

### Core ownership rule

Gameplay chunks are not the canonical owner of V2 background composition.

Gameplay chunk timing and BGR segment timing may overlap on the same world-X axis, but their segmentation remains independent.

## Accepted V2 architecture decisions

### 1. General track array with explicit roles

V2 uses a general `tracks[]` collection rather than hard-coded scene properties.

Conceptual contract:

```ts
interface BackgroundTrack {
  id: string;
  name: string;
  role: "far" | "mid" | "near" | "foreground" | "custom";
  mode: "sequence" | "repeat";
  parallax: { x: number; y: number };
  zBase: number;
  enabled: boolean;
  segments: BackgroundSegment[];
  objects: BackgroundObject[];
}
```

The standard authoring preset may expose Far / Mid / Near / Foreground, but persistence remains extensible.

### 2. Gameplay is a reference lane, not a BGR track

The editor may display Gameplay between Near and Foreground for reference, but gameplay does not own BGR segments, texture state, parallax, or BGR Z values.

Gameplay remains a separate authoritative system.

### 3. Track-space geometry

Stored BGR segment/object X geometry is track-space.

Terminology:

```text
startTrackX  = stored fixed position in track-space
trackScrollX = cameraScrollX × parallaxX
screenX      = startTrackX − trackScrollX
```

Equivalent Y semantics apply where relevant.

Do not equate `playerWorldX` and `cameraScrollX`.

### 4. Player-X timeline projection

The timeline cursor is gameplay world-space Player X.

Track content is projected onto the shared world-X authoring timeline according to track parallax. Track-space geometry is not silently rewritten as gameplay world coordinates.

### 5. Parallax edit semantics

Changing track parallax requires an explicit semantic choice.

Default:

```text
Preserve world timing / rebase
```

The editor rebases track-space placement so authored gameplay timing remains stable.

Advanced explicit operation:

```text
Preserve track geometry
```

This intentionally changes gameplay-world timing.

No silent semantic change is allowed.

### 6. Segment geometry

Conceptual segment contract:

```ts
interface BackgroundSegment {
  id: string;
  startTrackX: number;
  widthPx: number;
  asset: BackgroundAssetRef;
  offsetY: number;
  opacity: number;
  blend: "normal" | "additive";
  localZ: number;
  fadeInPx?: number;
  fadeOutPx?: number;
  enabled: boolean;
}
```

Track owns primary parallax. Per-segment parallax override is not part of the initial V2 contract.

### 7. Derived overlap

Geometric overlap is derived from segment placement:

```text
overlap = A.startTrackX + A.widthPx - B.startTrackX
```

Overlap geometry is not stored redundantly.

`fadeInPx` / `fadeOutPx` are separate presentation properties.

### 8. Objects / seam covers

Tracks may own independently placed decorative objects that do not need to belong to one segment.

Conceptual contract:

```ts
interface BackgroundObject {
  id: string;
  asset: BackgroundAssetRef;
  startTrackX: number;
  y: number;
  width?: number;
  height?: number;
  localZ: number;
  opacity: number;
  blend: "normal" | "additive";
  enabled: boolean;
}
```

Typical uses include seam covers, props, foreground debris, environmental set pieces, and local composition corrections.

### 9. Explicit sequence/repeat mode

Track behavior is explicit:

```text
mode: "sequence" | "repeat"
```

Unique timeline sequencing and infinite repeat semantics must not be implicitly mixed.

Legacy V1 sprite-repeat behavior may be preserved by the compatibility adapter.

### 10. Scene environment

Procedural scene-wide effects such as stars belong to environment configuration, not segmented tracks.

Initial target:

```ts
interface BackgroundEnvironment {
  starfield?: StarfieldConfig;
}
```

### 11. Composite Z

BGR ordering uses:

```text
effectiveZ = track.zBase + localZ
```

Suggested authoring bands:

```text
Far          0–999
Mid       1000–1999
Near      2000–2999

GAMEPLAY RENDER BOUNDARY

Foreground 4000–4999
```

Gameplay remains a separate render stage, not a BGR track. The exact numeric boundary is an implementation detail subject to renderer integration, but the ownership rule is fixed.

### 12. Shared evaluator invariant

Runtime and Pixel BGR Lab preview must consume the same coordinate/evaluation logic.

Target pure API shape:

```ts
evaluateBackgroundScene(scene, context): EvaluatedBackgroundFrame
```

Context conceptually includes:

```text
playerWorldX
cameraScrollX
cameraScrollY
viewportWidth
viewportHeight
```

Output conceptually separates content behind gameplay, foreground content, and evaluated environment state.

No duplicated preview-only transform implementation is allowed.

### 13. Resource vs render-instance ownership

V2 separates reusable texture/resource identity from segment/object render-instance identity.

Current V1 texture caching keyed by logical layer ID is acceptable for V1, but V2 renderer work should move toward shared texture resources keyed by stable asset identity or normalized URL.

### 14. Persistence strategy

Keep the same format family with a new version:

```json
{
  "format": "captain-meow-background-scene",
  "version": 2,
  "scene": {}
}
```

V1 data is not destructively rewritten in place.

Target compatibility path:

```text
parse V1
→ validate V1
→ adapt V1 to V2 runtime/editor representation
```

V2 becomes the new authoring model only after compatibility behavior is verified.

## Target scene model

Conceptually:

```text
BackgroundSceneV2
├─ environment
├─ tracks[]
│  ├─ role
│  ├─ mode
│  ├─ parallax
│  ├─ zBase
│  ├─ segments[]
│  └─ objects[]
└─ presentationMarkers? / presentation configuration

Gameplay reference
└─ external authoritative data only
```

Exact persisted type names and module placement are implementation decisions within M1/M3, provided they preserve the accepted contracts above.

# Implementation roadmap

## M1 — V2 domain model + shared evaluator foundation

Status: COMPLETE

### Implementation checkpoint (2026-09-03)

- Added pure V2 domain contracts in `src/render/bg/v2/BackgroundV2Types.ts`, coordinate/projection/rebase helpers in `BackgroundV2Math.ts`, and the shared deterministic evaluator in `BackgroundV2Evaluator.ts`.
- Added Node-compatible M1 coverage in `BackgroundV2.smoke.ts` for transforms, projection/rebase failure handling, filtering, gameplay-boundary classification, ordering, determinism, and source immutability.
- Repeat-instance materialization, viewport culling, V1 adaptation, persistence, renderer/resource integration, and Pixel BGR Lab integration remain explicitly deferred.
- STATIC VERIFY: targeted V2 smoke, `npm run typecheck`, `npm run build`, and `git diff --check` passed.

### Objective

Introduce pure, isolated V2 domain contracts and evaluation mathematics without changing current B1–B6 runtime behavior.

### Scope

- V2 scene/environment/track/segment/object type definitions;
- track roles and explicit sequence/repeat modes;
- track-space/world/screen coordinate helpers;
- world-timeline projection helpers;
- effective-Z helpers;
- parallax-rebase pure helper contract;
- pure V2 evaluator producing render-instance data;
- focused Node-compatible smoke coverage.

### Non-goals

- no Pixel BGR Lab UI changes;
- no current renderer wiring;
- no GPU texture-cache refactor;
- no V1 adapter yet;
- no persistence write-path changes;
- no runtime feature switch;
- no Replit/manual UI work.

### Acceptance criteria

- V1 BGR files/contracts remain behaviorally untouched;
- evaluator is independent of DOM/WebGL;
- identical input produces deterministic output;
- player world position and camera scroll remain distinct inputs;
- track-space placement is explicit in types/math;
- behind-gameplay vs foreground ordering is explicit in evaluator output;
- no duplicate preview/runtime coordinate implementation introduced.

### STATIC VERIFY

- targeted new V2 smoke tests;
- `npm run typecheck`;
- `npm run build`;
- `git diff --check`;
- full focused diff review.

### RUNTIME VERIFY

Not required for M1 because no live runtime/UI/render wiring changes are permitted.

---

## M2 — Coordinate contract + parallax rebase semantics

Status: COMPLETE

### Implementation checkpoint (2026-09-03)

- Hardened named track, screen, camera-scroll, and X projection contracts while retaining the M1 evaluator behavior.
- Added explicit non-invertible-parallax results for zero, `NaN`, and infinite parallax; finite negative parallax remains supported and round-trippable.
- Added explicit preserve-world-timing and preserve-track-geometry operations, including complete interval rebasing of both start and extent.
- STATIC VERIFY: targeted V2 smoke, `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- V1 adaptation, repeat materialization, renderer/runtime wiring, UI, and persistence remain deferred.

### Objective

Harden shared coordinate semantics before migration or UI integration.

### Scope

- explicit track-space/world-space/screen-space conversion contracts;
- timeline projection in both directions where valid;
- default preserve-world-timing rebase operation;
- explicit preserve-track-geometry operation;
- X/Y math coverage;
- edge cases for zero/invalid parallax handled by validated contract rather than silent ambiguity.

### STATIC VERIFY

- focused pure math smoke suite;
- typecheck/build;
- diff review.

### RUNTIME VERIFY

Not required unless implementation touches existing runtime wiring.

---

## M3 — V1 compatibility adapter

Status: STATIC COMPLETE / RUNTIME VERIFY PENDING

### Implementation checkpoint (2026-09-03)

- Added a pure V1 compatibility adapter that maps each valid sprite layer to one V2 custom track/object while preserving placement, parallax, presentation properties, source identity, and deterministic compatibility Z order.
- Preserved half-open chunk activation intervals, exact per-axis repeat flags (with repeat materialization deferred), V1 markers/actions, and unsupported shader/flow layers as explicit compatibility metadata.
- Added typed deterministic diagnostics for unsupported layers/repeat semantics, unresolved marker targets, ambiguous identities, and invalid source data.
- Added Node-compatible static equivalence coverage for global/chunk sprite transforms through the V2 evaluator, deterministic output, source immutability, and preservation without silent repeat expansion.
- Live renderer/runtime equivalence remains deferred to the first M4 integration gate; no visual or runtime compatibility is claimed by this checkpoint.

### Objective

Allow current chunk-centric V1 background scenes to be interpreted through the V2 evaluation model without destructive persistence migration.

### Scope

- V1 → V2 adapter;
- preserve current global/chunk layer behavior;
- preserve sprite repeat semantics;
- preserve marker ownership semantics unless explicitly deferred;
- validation/error reporting for unsupported or ambiguous legacy states.

### Acceptance criteria

Existing B1–B6 authored/demo scenes remain representable without silent content loss.

### STATIC VERIFY

- fixture-based V1/V2 equivalence smokes;
- typecheck/build;
- existing relevant BGR smokes.

### RUNTIME VERIFY

Required before declaring compatibility complete: live BGR scenes compared against current V1 behavior.

---

## M4 — Renderer instance/resource model

Status: COMPLETE — STATIC + RUNTIME VERIFIED

### M4 static implementation checkpoint (2026-09-03)

- Added a reusable deterministic visual verification scene and `window.__CM.bgrVerify.visual()` / `.clear()` hooks for local opacity, blend, finite segment boundary, foreground ordering, X/Y parallax, and shared-resource acceptance.
- Added a pure evaluated-instance to sprite-command boundary with normalized URL resource identity, deterministic ordering preservation, explicit/native sizing, V1 compatibility activation/repeat materialization, and explicit segment/object clipping commands.
- Added a dedicated V2 WebGL sprite renderer whose texture cache is keyed by resource rather than instance, retains native metadata/error state, uses nearest/clamped shared textures, and materializes per-instance repeat positions on the CPU.
- Added the typed `scene-v2` runtime source, evaluator-backed behind-gameplay and foreground passes, resource metadata debug snapshot, and deterministic `window.__CM.bgrM4Demo.v2()` / `.compatibility()` verification hooks.
- Kept V1 scenes/layers, marker presentation, shader/flow passthrough, and the existing layer-keyed texture metadata API on their proven legacy rendering path during this controlled integration.
- Static checks pass. M3 runtime compatibility remains pending until representative V1 scenes are visually checked.

### M4 runtime verification checkpoint (2026-09-04)

- Local VS Code browser/runtime verification passed for opacity, normal vs additive blending, finite segment boundary/no bleed, foreground ordering over gameplay, X parallax, Y parallax, shared texture/resource reuse, and cleanup.
- No page errors or new M4-specific console/runtime errors were observed.
- Known baseline renderer warning: `WebGL: INVALID_OPERATION: uniform4f: location is not from the associated program`. This is a pre-existing baseline defect, is not M4-specific, and does not block M4 completion; it remains tracked separately.

### Objective

Enable multisegment composition efficiently while preserving existing WebGL sprite capabilities.

### Scope

- consume evaluated render instances;
- separate texture resource identity from render instance identity;
- shared texture use across multiple segments/objects;
- composite Z ordering;
- gameplay render boundary / foreground pass;
- segment coverage/clipping policy;
- retain current opacity, blend, nearest filtering, native-size behavior, repeat support, and X/Y parallax.

### STATIC VERIFY

- renderer-focused tests/smokes where practical;
- `npm run build`;
- relevant targeted render tests;
- diff review.

### RUNTIME VERIFY

Completed by the M4 runtime verification checkpoint above.

---

## M5 — Read-only multitrack Pixel BGR Lab

Status: COMPLETE — STATIC + RUNTIME VERIFIED

### M5 static implementation checkpoint (2026-09-04)

- Added typed `scene-v2` detection to Scene Lab and a deterministic, pure read-only projection for environment, role, custom, gameplay reference, and foreground lanes while preserving track/segment/object identity, geometry, enabled state, ordering metadata, and bounds.
- Added a horizontally scrollable read-only multitrack UI with shared GameplaySeek-backed Player X cursor, finite segment blocks, point/width-aware object markers, environment information, and no V2 authoring controls.
- Prevented Scene Lab construction from applying its persisted V1 draft over an active V2 source; the existing V1 draft and authoring path remains unchanged when V2 is not active.
- Gameplay reference uses current gameplay-owned data only. Because no gameplay-owned chunk/marker source currently exists, those overlays are deferred and the lane states their unavailability; legacy V1 `BackgroundScene` chunks/markers are not reinterpreted as gameplay data.
- Focused projection, source-preservation, V1 regression, GameplaySeek, and V2 checks pass, as do typecheck and production build.

### M5 runtime verification checkpoint (2026-09-04)

- Local VS Code browser/runtime verification passed for V2 source preservation, read-only mode, lane projection, segments, objects, the environment lane, the gameplay reference lane, shared Player X cursor / GameplaySeek synchronization, horizontal timeline scrolling, V1 regression, and cleanup.
- The active `scene-v2` source remained active when Scene Lab opened; `V2 · READ ONLY` was visible, and no V2 edit, delete, duplicate, resize, or drag controls were exposed.
- Environment, Far, Mid, Near, Gameplay reference, and Foreground lanes rendered; finite segment `segment-boundary` rendered at its authored `360..488` span; unavailable gameplay-owned chunks/markers were reported without reclassifying V1 background data.
- Clicking or dragging the single shared Player X cursor changed the authoritative gameplay Player X and world scroll; horizontal timeline scrolling preserved lane alignment and cursor synchronization.
- V1 Scene Lab reopened with its existing authoring controls intact. No page errors or new M5-specific console/runtime errors were observed.
- Known baseline renderer warning: `WebGL: INVALID_OPERATION: uniform4f: location is not from the associated program`. This remains a separate baseline defect, is not M5-specific, and does not block M5 completion; no fix is claimed here.

### Objective

Expose V2 composition as a multitrack timeline without enabling destructive authoring yet.

### Target lanes

```text
Environment
Far
Mid
Near
Gameplay reference
Foreground
```

Custom tracks may also be shown according to role/order.

### Scope

- read-only V2 track/segment visualization;
- single shared Player X cursor using existing GameplaySeek authority;
- gameplay reference lane uses current gameplay-owned data only;
- shared Player X cursor uses existing GameplaySeek authority;
- gameplay chunk/marker overlays are shown only when a real gameplay-owned source exists;
- V1 `BackgroundScene` chunks/markers are not reclassified as gameplay data;
- no second authoritative gameplay copy.

### STATIC VERIFY

- UI build;
- focused timeline projection tests;
- diff review.

### RUNTIME VERIFY

Completed by the M5 runtime verification checkpoint above.

---

## M6 — Segment authoring

Status: STATIC COMPLETE / RUNTIME VERIFY PENDING

### M6 static implementation checkpoint (2026-09-04)

- Added a pure immutable V2 segment edit path for lookup/selection, create, duplicate, delete, move, resize, property validation, stable identity, and geometric overlap calculation.
- Scene Lab now provides sequence-track selection and segment controls, isolated timeline move/edge-resize dragging, independent per-track geometry, overlap visualization, and a focused selected-segment inspector.
- Repeat tracks remain explicitly read-only for M6 placement semantics; track modes are visible and are never silently converted.
- Track parallax remains read-only, with the required future semantic choice surfaced: keep authored track-space positions or preserve visual alignment using an explicitly defined rebase.
- Successful edits replace the active authoritative `BackgroundSceneV2` through the typed in-memory state write path for live renderer observation. M6 adds no file or local-storage persistence.
- Focused editing/projection/timeline/Lab/gameplay-seek/V2 smokes, typecheck, and production build pass. The broad smoke runner reaches the documented unrelated `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion` baseline failure after the M6 smokes pass.
- Runtime browser verification remains pending; M6 is not complete until the manual authoring workflow is verified.

### Objective

Make V2 sequence tracks editable.

### Scope

- create/delete/duplicate/select segment;
- move/resize segment in track-space;
- independent segment lengths across tracks;
- geometric overlap visualization;
- selected segment properties;
- explicit track mode handling;
- parallax-change semantic choice surfaced in authoring flow.

### STATIC VERIFY

- pure state/editing tests;
- UI build;
- validation and persistence tests when write-path is enabled.

### RUNTIME VERIFY

Required: manual drag/resize/parallax/rebase workflow verification.

---

## M7 — Canvas placement + objects

Status: PLANNED

### Objective

Reuse the proven B4 placement workflow for V2 segments and independent track objects.

### Scope

- segment/object X/Y canvas placement;
- seam-cover/set-piece objects;
- local Z editing;
- vertical overlap;
- foreground object placement;
- asset selection and texture metadata reuse.

### STATIC VERIFY

- coordinate/edit-state smokes;
- build;
- diff review.

### RUNTIME VERIFY

Required: manual visual placement and camera X/Y verification.

---

## M8 — Environment / procedural stars + V2 authoring closure

Status: PLANNED

### Objective

Move scene-wide procedural presentation into explicit environment configuration and complete the V2 authoring baseline.

### Scope

- `scene.environment.starfield`;
- deterministic seed/config contract;
- environment authoring surface;
- V2 persistence/import/export closure;
- remaining migration/coexistence cleanup approved after runtime validation.

### STATIC VERIFY

- environment config tests;
- serialization/validation tests;
- build/typecheck;
- full BGR-focused diff review.

### RUNTIME VERIFY

Required: visual environment verification and end-to-end V2 authored scene playback.

# Milestone execution protocol

For each implementation milestone:

```text
verify X (`pixel_bgr` unless an active decision changes it)
→ inspect relevant current code/docs
→ create focused Y task branch
→ implement one milestone or smaller coherent batch
→ STATIC VERIFY
→ review full diff
→ PR/handoff Y → X
→ ChatGPT architecture/output audit
→ RUNTIME VERIFY when required
→ explicit merge authorization
→ update this roadmap/status if project truth changed
```

Do not use historical `bgr` or `feature/gameplay-polish` as implementation bases. They are retained as evidence/reference branches until their remaining unique value is explicitly resolved.

# Verification semantics

## STATIC VERIFY

Static verification may include:

- source/diff inspection;
- type/schema contracts;
- targeted smoke/tests;
- `npm run typecheck` with the known coverage limitation;
- `npm run build`;
- `git diff --check`.

Do not claim full test-suite health from `npm run test` or `npm run typecheck` alone.

The broad smoke runner currently has a known unrelated baseline failure involving `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion`; distinguish baseline failures from milestone regressions.

## RUNTIME VERIFY

Runtime verification includes live browser/game behavior, visual output, runtime logs/state, actual authoring interactions, and environment-specific behavior.

Never mark a runtime/visual acceptance criterion verified from source inspection alone.

# Current restart checkpoint

## Confirmed

- B1–B6 implementation is present on current `pixel_bgr` and remains the V2 compatibility baseline.
- actual gameplay Player X is the authoring cursor authority;
- gameplay seek wiring exists in the current runtime API;
- timeline drag repair is present;
- sprite rendering already provides reusable opacity/blend/parallax/repeat/nearest-filtered draw capability;
- X/Y camera/world math exists;
- V2 multitrack composition itself is not implemented.

## Accepted design decisions

- general tracks array + explicit roles;
- gameplay reference lane remains external to BGR ownership;
- stored track-space geometry;
- world-X Player cursor projection;
- preserve-world-timing parallax rebase as default;
- derived overlap geometry;
- independent track objects;
- explicit sequence/repeat modes;
- scene-level environment stars;
- `effectiveZ = track.zBase + localZ`;
- gameplay as render boundary rather than BGR track;
- one shared evaluator for editor/runtime;
- V2 persistence with non-destructive V1 adapter.

## Remaining decisions

No unresolved architectural decision currently blocks M1.

Renderer-specific numeric Z boundaries, clipping details, texture cache key normalization, and exact persistence module placement are intentionally deferred to the milestone where current implementation constraints can be evaluated directly.

## Next safe implementation task

**M3 — V1 compatibility adapter.**

No runtime/visual verification is required until V2 begins affecting live renderer or UI behavior.
