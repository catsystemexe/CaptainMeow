# Captain Meow — Asset System Current-State Audit

Status: CANONICAL IMPLEMENTATION AUDIT / PHASE A

Audit snapshot: `pixel_bgr` remote HEAD `74688eb0e18c5125bd02bd8cb0a4a2a7e6d4d602` (2026-09-11).

Historical-snapshot note: these findings describe the pre-implementation Phase A
state. Phase B subsequently implemented the neutral core catalogue and derived
BGR compatibility view. Phase C then migrated BGR V2 segment/object persistence
to Asset-ID-only writes with catalogue-resolved legacy reads; static backdrop,
BGR V1, and runtime renderer URL ownership remain later work. Phase D subsequently
added repository-local static validation for current catalogue shape and files and
for derived migrated V2 segment/object references; the Phase A findings below
remain a historical snapshot.

## 1. Executive summary

The current architecture is compatible with the direction in `07-asset-system.md`, but it has not reached that target. BGR V2 already separates an asset-shaped value (`BackgroundAssetRef`) from an instance (`BackgroundSegment`, `BackgroundObject`, or `BackgroundStaticBackdrop`), and Scene Lab already has a small shared list (`BACKGROUND_ASSET_CATALOG`). However, `BackgroundAssetRef` persists both `id` and `url`, the renderer resolves by `url`, and validation only proves that both strings are non-empty. Consequently the URL, not the ID, remains effective persistent and runtime identity.

There is **no repository-wide canonical asset catalogue**. `BACKGROUND_ASSET_CATALOG` is the closest seed for the first domain, but it is UI-owned, only describes BGR sprites, is bypassed by built-in scene factories, and is not consulted by the renderer or validator. Sprite atlas frame/animation keys are a separate, valid specialised identity domain; renderer-local FX/enemy maps connect family/type IDs to atlas files. Neither should be promoted wholesale into a general catalogue.

Direct filename/path persistence is a material BGR problem: V1 scene layers persist `texture.url`, while V2 persists `asset: { id, url }`; exports and local-storage drafts preserve those paths. This can drift because the V2 fixture and the UI catalogue repeat the same ID/URL pairs and no check establishes ID-to-URL uniqueness or resolves an ID.

BGR/Scene Lab remains the correct first migration domain. It has authored persistent data, an existing catalogue-shaped list, explicit V1/V2 validation and serialization boundaries, and isolated URL-based render loaders. No Phase B blocker was found. Phase B must nevertheless decide catalogue ownership and ID syntax, and it must avoid changing persistence, renderer behaviour, atlas ownership, pivot, or geometry before the later migration phases.

## 2. Current ownership map

### BGR V2

```text
PixelBgrLabUI / built-in factories
→ BackgroundSceneV2 (BackgroundV2Types.ts)
→ BackgroundAssetRef { id, url } persisted by BackgroundV2Serialization.ts
→ no runtime ID lookup; BackgroundV2Evaluator copies the ref
→ BackgroundV2RenderCommands keys and commands by normalized asset.url
→ BackgroundV2SpriteRenderer Image.src → WebGL texture → top-left-positioned quad
```

`PixelBgrLabAssets.ts::BACKGROUND_ASSET_CATALOG` supplies selectable object assets and insertion defaults, but factories such as `createBackgroundV2DesertTestScene` construct duplicate `{id,url}` pairs directly. `findBackgroundAsset` is used by tests, not runtime resolution.

### BGR V1 compatibility path

```text
PixelBgrLabUI / createDemoScene
→ BackgroundScene → BackgroundLayer
→ SpriteBackgroundLayer.texture.url persisted by PixelBgrLabSerialization.ts
→ BackgroundSceneResolve / BackgroundV1Adapter
→ SpriteBackgroundLayerRenderer Image.src → WebGL texture
```

The V1 adapter manufactures `${trackId}:asset` IDs while retaining `layer.texture.url`; those IDs are derived compatibility labels, not stable catalogue identity.

### Gameplay sprites / atlases

```text
enemyTypes.json render.sprite.id / runtime animId
→ renderer-local enemySpriteAssets and fxSpriteAssets maps
→ SpriteSystem.load(atlas URL, PNG URL)
→ SpriteAtlas frame/animation key lookup + SpriteTexture
→ SpriteProgram/WebGLSceneRenderer
```

For `core` only, `assets/sprites/core.map.txt` → `tools/gen_atlas.mjs` → `public/assets/sprites/core.atlas.json`. The atlas JSON `texture` field points at the runtime PNG and is preferred over the fallback URL supplied to `SpriteSystem.load`. Other checked-in atlas JSON/PNG pairs have no generator source in this snapshot.

## 3. Filesystem ownership

| Path | Current ownership/evidence | Classification |
|---|---|---|
| `assets/sprites/core.map.txt` | Ordered frame-name source consumed by `tools/gen_atlas.mjs`. | Source metadata; canonical for generated core frame layout. |
| `public/assets/sprites/core.atlas.json` | Output target of `npm run gen:atlas`; consumed at runtime. | Generated runtime metadata; do not hand-edit. |
| `public/assets/sprites/core.png` | Runtime texture named by generated metadata; no editable image source is present. | Runtime-delivered asset; source provenance absent. |
| `public/assets/sprites/{basic_*,crawler_1,mine_1,shooter_1,void_1,enemy_bug1,w1_projectiles,explosion_*}.*` | Checked-in atlas/PNG pairs loaded or inspected by renderer/tests. No owning generator/source map was found. | Runtime-delivered; generation/provenance **UNKNOWN**. |
| `public/assets/bg/demo/` | Technical BGR raster fixtures plus `empty.nic`; three PNGs are registered in the BGR list. | Runtime-delivered test/demo assets; `.nic` has no active consumer found. |
| `public/assets/bg/test/desert/` | Practical authoring pack and descriptive `manifest.json`; the manifest is not imported by code. | Runtime-delivered test assets plus advisory metadata, not a runtime catalogue. |
| `public/assets/bg/b1_pixel_stars.svg` | V1 default and catalogue entry. | Runtime-delivered technical asset. |
| `public/assets/debug/bgr/` | V2 visual-verification SVG fixtures referenced directly by its factory. | Runtime-delivered debug fixtures. |
| `_patch/`, `*.bak*` | Preservation/history artifacts under repository policy; excluded from active ownership. | Historical, not authoritative. |

Source/runtime ownership is therefore explicit only for the generated core atlas map/output pair. Background artwork lives directly in the Vite public runtime root, and most sprite source provenance is not represented.

## 4. Existing ID / registry inventory

| Identity layer | Source and consumers | Persistence/runtime; authority | Suitability and reuse risk |
|---|---|---|---|
| `BackgroundAssetRef.id` | `BackgroundV2Types.ts`; factories, editor, evaluator | Persisted, but runtime ignores it; instance-supplied, not globally canonical. | Correct conceptual slot for future `AssetId`; unsafe to treat as canonical until URL duplication is removed through a compatibility migration. |
| `BACKGROUND_ASSET_CATALOG` / `findBackgroundAsset` | `PixelBgrLabAssets.ts`; Scene Lab and smokes | UI/runtime constant; canonical only for picker options, not for all BGR refs. | Best seed/domain inventory. Move or adapt behind neutral ownership rather than creating a second BGR list. Current `technical`, `pixelArt`, label and URL metadata are useful but incomplete. |
| V1 `SpriteBackgroundLayer.texture.url` | `BackgroundLayerTypes.ts`; authoring, serialization, renderer | Persisted and runtime-canonical path. | Requires a later adapter/migration; not reusable as identity. |
| V1-adapter `${trackId}:asset` | `BackgroundV1Adapter.ts` | Derived runtime compatibility ID. | Do not reuse: identity changes with authored track IDs and does not resolve anything. |
| Atlas frame/animation keys | `*.atlas.json`, `SpriteAtlas.frame/anim`; gameplay render definitions | Logical runtime IDs; generated for core, checked-in metadata elsewhere. | Preserve as specialised sub-resource IDs. A general definition may point to an atlas/region later, but duplicating frame maps would create conflicting authority. |
| Renderer FX ID → `SpriteSystem` map | `WebGLSceneRenderer.ts::fxSpriteAssets` / `fxSpriteSystems` | Runtime-only manual registration. | Evidence for resolver need, but coupled to WebGL construction and unsuitable as catalogue owner. |
| Enemy `typeId` → `SpriteSystem` map | `WebGLSceneRenderer.ts::enemySpriteAssets` / `enemySpriteMap`; enemy content IDs | Content identity plus runtime manual paths. | Keep enemy type/content authority separate; later catalogue integration may describe delivery, not redefine enemy IDs. |
| `SCENE_LAB_SCENE_CATALOG` | `SceneLabSceneCatalog.ts` | Built-in scene factory catalogue, not an asset catalogue. | Do not merge with asset definitions; it owns selectable scenes. |

**Answer:** an abstraction exists that should **underpin**, but should not itself remain the canonical catalogue: `BACKGROUND_ASSET_CATALOG` is the migration seed for BGR. A neutral, general catalogue contract should be created in Phase B and this list should eventually become its data/adaptor rather than coexist as a competing registry. No existing abstraction is broad or authoritative enough to become the general catalogue unchanged.

## 5. Direct-path reference inventory

| Class | Material references | Consequence |
|---|---|---|
| A — Persistent identity | V1 `texture.url`; V2 `BackgroundAssetRef.url`; both serializers/exporters and local-storage drafts retain them. Scene factories embed `/assets/bg/...`. | Renames/delivery changes break saved data; V2 `id` does not protect it. |
| B — Runtime implementation detail | `WebGLSceneRenderer` hard-codes core, projectile, enemy and FX atlas/PNG paths; background renderers set `Image.src` from scene URL. | Acceptable behind a future resolver, but currently exposed in BGR persistence. |
| C — Generated metadata | `core.atlas.json.texture` is emitted by `gen_atlas.mjs`; all atlas JSON files contain texture and frame paths/regions. | Preserve atlas metadata ownership; do not duplicate regions in a general catalogue. |
| D — Test fixture only | `/assets/debug/bgr/*.svg`, synthetic `/assets/stars.png`, `/manual.png`, and mutated/missing paths in smokes. | Assertions/visual verification, not production catalogue candidates by default. |
| E — Follow-up | Non-core checked-in atlas/PNG pairs and `desert/manifest.json`. | Their creation/provenance and whether the manifest should become source metadata are not statically established. |

## 6. BGR / Scene Lab current model

V1 owns global/chunk `BackgroundLayer`s. Sprite layers contain URL, filtering, opacity, blend, parallax, offset, and repeat. The UI exposes editable raw texture text; its picker matches catalogue entries by URL and otherwise labels the value “Manual URL.” Chunk identity and extent (`startX`, `length`) are independent of image width.

V2 owns tracks with `sequence` or `repeat` mode, plus segments and objects. Segments require authored `startTrackX`, `widthPx`, and `offsetY`; objects require `startTrackX` and `y`, with optional width/height. Both embed `{id,url}`. A static backdrop uses the same reference shape. Environment currently contains procedural starfield configuration and therefore has no file asset reference.

Scene Lab's selectable assets come from the manual `BACKGROUND_ASSET_CATALOG`. V2 object selection shows technical IDs in the `<select>`; inspectors show ID and URL. V1 displays catalogue `label` when URL-matched and otherwise “Manual URL.” Optional segment/object `name` supplies an authored display name for the instance via `v2EntityDisplayName`, not for the asset. No thumbnail field or image preview catalogue metadata exists; the live canvas is the only visual preview surface found.

Duplication exists between the UI list and V2 factories, between V1 defaults and the list, and between renderer sprite arrays and atlas filenames. Tests repeat paths as fixtures. The desert manifest is a third descriptive list but is not consumed.

## 7. Geometry findings

PNG header inspection found BGR demo images at 64×64, 128×64, and 256×127; every desert PNG is 1672×941. Thus there is no repository-wide fixed BGR segment width. The desert fixture sets `ASSET_WIDTH = 1672`, matching native image width, but intentionally overlaps mid segments (`startTrackX` 0 and 1600). V1 uses native image dimensions. V2 uses explicit segment width plus native texture height; an object uses explicit width/height when supplied and native dimensions otherwise. A segment width clips the draw horizontally rather than defining an independent image asset size.

The desert fixture also demonstrates non-uniform compensation: the 1672×941 sun is drawn as 836×471 and clouds as 1254×706; the foreground band is 1003×565. These are approximately uniform fractional resizes, but the schema permits independent width and height. Since renderers sample the complete rectangular texture, transparent padding directly affects visible placement, perceived scale, and bounds; no alpha-bound trimming is performed.

## 8. Pivot and placement findings

BGR V1 and V2 authored image coordinates are **top-left quad origins**. V2 computes `screen = authored track point - cameraScroll * parallax`; the render command retains that point; the renderer converts it to a center uniform by adding half the resolved width/height. V1 follows the same top-left-to-center draw conversion. Segment clipping begins at that top-left X. Scene Lab pointer placement inverts the same track transform, and its overlay places the box and origin dot at that top-left.

Gameplay atlas sprites are materially different: each `SpriteFrame` has pixel pivot `px,py`; the core generator defaults these to frame center. Exact visual intent for transparent BGR bounds and whether every legacy asset was exported around an intended top-left is **UNKNOWN — RUNTIME VERIFY REQUIRED**.

## 9. Scale findings

BGR schemas have no `scale` property. V1 is native-size only. In V2, omitted dimensions mean native texture dimensions; this is the effective 1:1 convention. Explicit width/height resize an object or backdrop to those dimensions, while segment `widthPx` always supplies width and native texture height remains in effect. Therefore scale is stored as per-instance dimensions, not asset metadata, and no default scale catalogue metadata exists. The desert examples prove fractional resize compensation is used. Nearest filtering and optional integer editor nudging support pixel-art placement, but fractional placement and arbitrary dimensions remain valid; integer-only scaling is not enforced. Parallax changes position, not image size, and layers add no extra scale transform.

Gameplay sprites separately use per-content/per-instance numeric sprite scale applied to atlas frame geometry; that convention must not be conflated with BGR width/height during Phase B.

## 10. Missing-asset / fallback behaviour

* BGR V1/V2 image failure transitions the renderer cache entry to `error`, logs one warning when drawn, skips drawing, and provides no placeholder. Scene Lab texture metadata reports error/unavailable only after the renderer has attempted loading; catalogue entries themselves are not file-validated.
* Unknown BGR asset IDs are accepted if `id` and `url` are non-empty. The URL still loads; no ID lookup or warning occurs. A V2 object whose ID is absent from the UI list can persist/render but is not a valid picker selection.
* `findBackgroundAsset` returns `null`, while UI callbacks simply do nothing for an unknown selection. Lane insertion reports only an entirely empty catalogue.
* Missing atlas JSON/PNG is caught by `SpriteSystem.load`, stored as `err`, warned, and leaves `ready=false`. Renderer selection consequently falls through to established glyph/procedural/quad paths where applicable.
* Unknown atlas frame/animation keys return `null`; animated selection also returns `null` for an empty/missing animation. Atlas JSON has no schema/file-existence validation at load time beyond fetch success and later lookups.
* `SpriteTexture` starts as a magenta 1×1 placeholder, but `SpriteSystem` does not become ready on failed load, so this is upload initialization rather than a guaranteed visible missing-asset placeholder.

## 11. Existing validation and test coverage

| Check | Command/context | Contract | Kind |
|---|---|---|---|
| `BackgroundV2Serialization.smoke.ts`, `BackgroundV2Persistence.smoke.ts` | Direct `tsx` or broad `npm run smoke` | Shape validation, required `{id,url}`, serialization/storage round trips. | Node/static. |
| `BackgroundV2DesertTestScene.smoke.ts` | Direct `tsx` or broad smoke | Fixture geometry, evaluator output, and that all fixture URLs occur in the UI catalogue. | Node/static; does not check files exist or ID mapping. |
| `BackgroundV2Renderer.smoke.ts` | Direct `tsx` or broad smoke | URL normalization/resource keys, dimensions, clipping/repeat command materialization. | Node/static command-level; not live WebGL loading. |
| `PixelBgrLabB4.smoke.ts` | Direct `tsx` or broad smoke | Catalogue ID uniqueness within list, URL assignment, coordinate inversion. | Node/static. |
| Scene Lab/BGR authoring smokes | Broad smoke or individual `tsx` | UI source/layout text and immutable editing/placement/serialization contracts. | Mostly Node/static source/DOM-stub checks. |
| `EnemySpriteSelection.smoke.ts` (`npm test`) | `npm test` | Enemy content sprite selection and corresponding checked-in atlas/PNG presence. | Node/static. |
| FX/death sprite smokes | Broad smoke | Atlas frame/animation and renderer-map selection contracts. | Node/static. |
| `npm run gen:atlas` | Generator (not run for this audit) | Regenerates only core atlas metadata from its map. | Node generator, mutating. |

Not covered: general ID uniqueness, ID→URL resolution, BGR file existence, duplicate file registration, catalogue-to-persistence resolution, alpha bounds, browser image decode/WebGL appearance, visible missing placeholders, or Scene Lab thumbnails. No runtime/visual verification was performed in this audit.

## 12. CURRENT → TARGET → GAP → RISK matrix

| Area | CURRENT | TARGET | GAP | RISK |
|---|---|---|---|---|
| Identity | V2 stores arbitrary ID plus URL; V1 stores URL. | Stable unique `AssetId`, distinct from filename/display name. | No enforced identity namespace or uniqueness. | Drift/collision and rename breakage. |
| Catalogue | UI-local BGR list plus renderer-local sprite maps. | One canonical catalogue, while respecting specialised ownership. | No neutral owner or complete consumers. | A new list could duplicate the useful existing BGR list or atlas maps. |
| Resolver | BGR resolves directly by URL; sprite systems receive paths. | `AssetId → runtime delivery`. | No ID resolver. | Premature renderer rewrite or behavioural change. |
| Persistence | URLs persisted in V1 and V2. | Persist Asset IDs; paths hidden. | Compatibility format/migration not yet designed. | Existing drafts/imports could break. |
| Scene Lab | Manual list; raw IDs/URLs shown; manual V1 URL accepted. | Canonical catalogue, display names and previews, technical inspector. | Picker is not catalogue-backed in the target sense; no thumbnail metadata. | UI/runtime lists diverge. |
| Pivot | BGR top-left; atlas frames explicit pixel pivots. | Explicit normalised pivot metadata. | No BGR asset pivot; mixed domain conventions. | Changing pivots moves existing compositions. |
| Scale | BGR native or per-instance dimensions; gameplay sprite scale is separate. | Explicit native/default scale with per-instance transform separated. | No BGR definition metadata or normalized convention. | Existing compensation could be accidentally doubled. |
| Validation | Scene shape only; limited list uniqueness smoke. | Unique IDs, files, types, dimensions, pivots and resolved references. | No cross-file/catalogue validation. | Silent drift until runtime. |
| Missing assets | Warn once and skip BGR; sprites warn/not-ready/fallback; unknown BGR IDs accepted. | Observable diagnostic and DEV placeholder where practical. | No ID-context diagnostic or BGR placeholder. | Invisible scene elements and weak author feedback. |
| Generated atlas ownership | Core map/generator/output is clear; other origins unclear. | Preserve specialised metadata and integrate without duplication. | General catalogue relationship remains undecided. | Hand edits or duplicate region truth. |

## 13. Recommended Phase B implementation boundary

Create a neutral asset-domain module outside `src/ui` and renderer implementation directories—likely `src/assets/`—because the contract must be consumable by authoring, validation, and browser runtime without UI/WebGL ownership. Create a minimal general contract rather than expanding `BackgroundAssetEntry` in place, then make the existing BGR entries the initial data source/adaptor so there is never a second BGR registry.

The minimum Phase B contract should contain: a branded/string `AssetId`; a small `AssetType` sufficient for standalone image initially; `AssetDefinition` with `id`, display name, type, and runtime delivery (initially URL), with optional BGR eligibility/category metadata only if required to adapt the existing list; construction-time duplicate-ID detection; and a pure resolver returning an explicit success/failure result. It should prove one representative BGR segment and object definition resolves without changing scene schemas.

Explicitly untouched in Phase B: V1/V2 persistence shapes, factories and saved keys; `BACKGROUND_ASSET_CATALOG` picker behaviour except a compatibility view backed by the new data; render commands/loaders; all artwork/paths; geometry/pivot/scale; atlas generator and frame keys; enemy content identity; and Scene Lab redesign. A temporary adapter should expose the current `BackgroundAssetEntry` shape (including `label`, `technical`, and `pixelArt`) from canonical definitions, and legacy `{id,url}` scene refs should continue passing their URL until Phase C.

## 14. Recommended first migration slice

**Confirmed:** BGR/Scene Lab segments and objects should be first. The narrowest viable Phase C slice is the catalogue-listed V2 segment/object assets: persist only `assetId`, resolve it at evaluation/render-command boundary, migrate the desert fixture and V2 import/storage compatibility, and make the existing picker consume those same definitions. Keep V1 URL layers and the V2 static backdrop as compatibility paths initially unless including the backdrop is required to avoid two V2 reference shapes. Do not include gameplay atlases, procedural environment/starfield, geometry changes, thumbnails, or artwork normalization.

## 15. Open questions / runtime gates

### STATICALLY RESOLVED

* BGR V1/V2 render paths use URL as effective identity and top-left positioning.
* V2 persists both ID and URL; no resolver validates their relationship.
* BGR has varied image dimensions; 1672 is fixture-specific, not global.
* `BACKGROUND_ASSET_CATALOG` is the reusable first-domain seed but not a canonical runtime catalogue.
* Only the core atlas has a repository generator/source map in the inspected snapshot.

### RUNTIME VERIFY REQUIRED

* Phase E1 subsequently added the catalogue-native V2 segment/object picker;
  its browser preview, selection ergonomics, and insert/save workflow still
  require the documented post-merge runtime gate.

* Whether transparent padding in each BGR image matches author expectations at the proven top-left origin.
* Visual equivalence of native versus explicit desert dimensions and whether the near-integer ratios intentionally compensate export scale.
* Actual browser decode/WebGL warning visibility and author-facing response to unavailable catalogue entries.
* Scene Lab picker/preview ergonomics and the intended asset display labels beyond static DOM/source evidence.

### DESIGN DECISION REQUIRED

* Exact `AssetId` naming convention, type taxonomy, and neutral module path.
* Whether V2 static backdrop migrates with segments/objects or remains a short-lived compatibility case.
* Compatibility policy for imported/saved `{id,url}` conflicts: prefer ID, verify URL, or preserve legacy URL with diagnostics.
* Whether dimensions/pivot/default scale enter the Phase B definition as optional reserved fields or wait for Phase F evidence.
* Provenance/source policy for background artwork and non-core atlases, and the catalogue-to-atlas sub-resource relationship.
