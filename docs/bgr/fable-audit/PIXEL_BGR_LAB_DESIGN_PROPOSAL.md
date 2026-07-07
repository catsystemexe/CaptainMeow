# CAPTAIN MEOW — Pixel BGR Lab Design Proposal

## Status

Design proposal only. No implementation is approved by this document.

## Purpose

Pixel BGR Lab is a visual authoring tool for composing production background scenes from pixel-art assets, chunk sequences, background layers, environmental markers, and optional FX.

It is not a pixel-art drawing application. Pixel assets are expected to be created in external tools such as Procreate, Aseprite, Resprite, or similar software.

The Lab must author the same typed content model that the runtime consumes.

```text
Pixel BGR Lab output
        =
background runtime input
```

There must not be a separate editor-only scene format that requires an unrelated conversion pipeline.

---

## Core design principles

1. Sprite/pixel-art content is the primary production background medium.
2. Background scenes are spatially composed from ordered chunks.
3. Chunks contain and configure render layers, placed decorations, environmental markers, and transitions.
4. Procedural, shader, flow, atmospheric, and particle systems supplement sprite content rather than replace it.
5. Post-FX is a scene presentation stage, not a normal chunk layer.
6. World scroll remains gameplay-owned and is read by the background renderer.
7. The Lab must preview the same renderer contracts used by the game.
8. Runtime content must be typed, validated, versioned, and exportable.
9. Browser globals and localStorage must not be the production source of truth.
10. The Lab should be implemented incrementally after the runtime data contracts exist.

---

## Conceptual scene model

```text
BackgroundScene
├─ metadata
├─ globalLayers[]
├─ chunks[]
│  ├─ id
│  ├─ start / length
│  ├─ layers[]
│  ├─ decorations[]
│  ├─ markers[]
│  └─ transitions
└─ postFxProfile
```

### Global layers

Global layers persist across multiple chunks or the full scene.

Examples:

- distant starfield,
- global sky gradient,
- persistent fog,
- low-frequency shader field,
- full-level atmospheric layer.

### Chunk-local layers

Chunk-local layers exist only within a defined spatial section.

Examples:

- station exterior,
- asteroid belt,
- city skyline,
- tunnel walls,
- foreground machinery,
- local dust or debris.

---

## Background chunks

A `BackgroundChunk` represents a spatial section of the scrolling level.

A chunk should define:

```text
id
start position
length
layers
decorations
markers
entry/exit transition
optional environment profile
```

Example sequence:

```text
[ ORBIT ][ ASTEROID BELT ][ STATION APPROACH ][ STATION INTERIOR ]
```

Chunks are not tilemaps and should not become a second gameplay director.

Their primary responsibilities are:

- spatial background composition,
- layer activation,
- background transitions,
- environmental presentation markers,
- resource planning and visibility boundaries.

---

## Layer model

Each chunk contains an ordered list of render layers.

Initial production layer types:

```text
SpriteLayer
PlacedSpriteLayer / DecorationLayer
ShaderLayer adapter
FlowLayer adapter
AtmosphereLayer reference
```

Possible later layer types:

```text
TileLayer
MeshLayer
ParticleLayer
VideoLayer
AsciiLayer
```

### Common layer properties

Only properties with real runtime support should be included in shared contracts.

Likely properties:

```text
id
enabled
order or list position
opacity
blendMode
coordinateSpace
parallaxX
parallaxY
offsetX
offsetY
independentVelocityX
independentVelocityY
```

The implementation should avoid universal fields that some layer types silently ignore.

---

## Sprite layer

A `SpriteLayer` represents a large texture or repeatable background strip.

Expected properties:

```text
asset reference
width / height or intrinsic size
anchor / origin
position
parallax X/Y
independent velocity X/Y
repeat X/Y
opacity
blend mode
filtering
visibility
overscan
```

Supported repeat modes should initially remain minimal:

```text
single
repeat X
repeat Y
repeat XY
```

Mirror repeat, stretch, slicing, and complex tiling can be added later if justified.

---

## Placed decorations

Placed decorations are background-only sprite instances positioned inside a chunk.

Examples:

- asteroid,
- broken satellite,
- tower,
- pipe,
- wreckage,
- distant ship silhouette,
- light panel.

Expected properties:

```text
asset reference
chunk-local position
layer/depth association
anchor
scale
flip X/Y
opacity
tint
visibility
```

Decorations should not become gameplay entities unless they require gameplay behavior, collision, damage, or simulation ownership.

Rotation should either be disabled for strict pixel-art use or limited to pixel-safe increments such as 90°.

---

## Environmental markers and triggers

Chunks may contain presentation-oriented markers.

Supported trigger locations:

```text
on chunk enter
on chunk exit
at local X
at chunk progress
```

Safe background actions:

```text
set layer visibility
animate layer opacity
change atmosphere preset
trigger particle burst
pulse shader parameter
change background-local velocity
activate light flash
set post-FX profile or intensity
emit named environment marker
```

Named markers are preferred over direct gameplay coupling.

Examples:

```text
station_power_on
meteor_storm_start
boss_arena_enter
reactor_warning
```

Gameplay systems may choose to react to a marker through an explicit interface, but the background system must not directly own:

```text
enemy spawning
boss state
player damage
weapon rules
enemy FSM
```

---

## FX classification

### Persistent chunk FX

Examples:

```text
fog
dust
rain
embers
nebula
light shafts
ambient debris
```

### Reactive FX

Examples:

```text
explosion illumination
hit shockwave
bomb distortion
audio pulse
screen-space flash
```

### Screen post-FX

Examples:

```text
palette reduction
dithering
pixelation
CRT
scanlines
chromatic aberration
color grading
```

Post-FX should be configured by the scene or chunk profile, but rendered as a final presentation stage rather than as a normal spatial layer.

---

# Pixel BGR Lab capabilities

## 1. Scene management

The Lab should support:

- create scene,
- load scene,
- rename scene,
- duplicate scene,
- validate scene,
- import/export scene,
- display schema version,
- preserve unsaved drafts,
- reset to last saved state.

LocalStorage may be used for drafts and autosave only. It must not be the canonical production content store.

---

## 2. Chunk timeline

The Lab should provide a horizontal spatial timeline:

```text
[ CHUNK A ][ CHUNK B ][ CHUNK C ][ CHUNK D ]
```

Required operations:

- add chunk,
- duplicate chunk,
- delete chunk,
- reorder chunk,
- resize chunk length,
- select chunk,
- jump to chunk start,
- preview chunk boundaries,
- inspect entry/exit transitions.

The viewport position must be visible on the timeline.

---

## 3. Layer panel

For the selected scene or chunk:

- add layer,
- remove layer,
- duplicate layer,
- reorder layer,
- enable/disable layer,
- lock layer,
- solo layer,
- rename layer,
- inspect layer type,
- display warnings and validation errors.

The layer order in the editor must correspond deterministically to runtime render order.

---

## 4. Asset browser

The Lab should provide an asset browser for available background textures and sprite decorations.

Useful metadata:

```text
asset id
source path
pixel dimensions
file size
filtering mode
category
tags
recommended repeat mode
recommended anchor
optional palette information
```

The first version may use direct runtime asset references. A formal asset catalog can be added later.

---

## 5. Sprite placement and transform tools

The canvas should allow:

- drag placement,
- numeric position editing,
- anchor selection,
- pixel-safe scaling,
- flip X/Y,
- duplicate,
- delete,
- snap to pixel grid,
- move between layers,
- opacity editing,
- tint editing where supported.

Non-integer transforms should trigger warnings when they can produce blurred pixel art.

---

## 6. Parallax controls

The Lab must clearly distinguish:

```text
world scroll
camera scroll
layer parallax multiplier
background-local animation
independent layer velocity
```

Per-layer controls:

```text
parallaxX
parallaxY
velocityX
velocityY
offsetX
offsetY
```

Preview controls:

```text
play
pause
scrub
loop
scroll speed
camera Y simulation
reset position
```

The preview must use the same offset and wrap calculations as runtime.

---

## 7. Repeat, wrap, and seam inspection

Required controls:

- repeat X,
- repeat Y,
- single placement,
- repeat origin,
- overscan,
- seam preview.

Required debug overlays:

```text
tile bounds
repeat origin
texture bounds
viewport bounds
overscan bounds
seam warning
```

The Lab should expose visible gaps, incorrect origins, and subpixel seams before export.

---

## 8. Pixel-perfect preview

The Lab must use the same relevant render conditions as the game:

```text
fixed internal resolution
nearest texture filtering
same viewport logic
same camera transform
same letterboxing behavior
same layer renderer
```

Useful warnings and overlays:

```text
pixel grid
subpixel position warning
non-integer scale warning
non-integer output size warning
filtering state
asset native size
runtime viewport
```

CSS `image-rendering: pixelated` alone is not sufficient and must not be treated as a full pixel-art pipeline.

---

## 9. Chunk transitions

Initial transition support should remain limited.

Recommended first set:

```text
hard boundary
overlap
fade in
fade out
simple crossfade
```

Possible later transitions:

```text
parallax interpolation
shader parameter transition
atmosphere transition
color transition
mask-based transition
```

The Lab should not introduce a generic animation graph in the first version.

---

## 10. Marker editor

The Lab should allow:

- add marker,
- position marker on chunk timeline,
- choose enter/exit/local-X/progress trigger,
- assign background action,
- assign named environment event,
- preview marker activation,
- inspect conflicting or unreachable markers.

Markers should be visually represented in the chunk timeline and viewport.

---

## 11. Reactive environment preview

The Lab should simulate presentation events:

```text
hit
explosion
bomb
bass pulse
mid pulse
high pulse
screen shake
camera movement
```

The Lab must reuse the runtime reaction model or shared pure functions. It must not contain an independent second implementation of reaction behavior.

---

## 12. Atmosphere and procedural adapters

The Lab should eventually expose existing renderer capabilities through typed adapters:

```text
DemosceneBg
FlowRibbonBg
FlowSegmentsBg
AtmosphericFXPass
Grid shader controls
```

The current procedural BgLab may remain as a specialized technical panel, but its values should gradually map to typed runtime descriptors.

Pixel BGR Lab and Procedural BgLab should remain conceptually separate:

```text
Pixel BGR Lab
= scene, chunk, layer, sprite, marker authoring

Procedural BgLab
= detailed procedural shader/flow parameter tuning
```

---

## 13. Palette and pixel post-FX preview

Later versions should support preview and authoring of:

```text
palette preset
palette size
ordered dithering
noise dithering
pixelation scale
color quantization
color grading
CRT
scanlines
chromatic aberration
```

The UI should expose at least three views:

```text
raw selected layer
composited scene before post-FX
final scene after post-FX
```

This distinction is required to identify whether a visual issue originates in the asset, layer composition, or post-processing.

---

## 14. Import, export, and validation

The Lab must operate on one canonical typed scene schema.

Required capabilities:

- import scene,
- export scene,
- validate scene,
- display validation errors,
- version content format,
- migrate older format where practical,
- copy/paste chunk,
- copy/paste layer,
- duplicate scene elements,
- preserve stable IDs.

The exact storage format may initially be TypeScript, JSON, or another validated representation. The critical requirement is:

```text
one schema
one validation path
one runtime resolver
```

---

## 15. Debug overlays

Recommended overlays:

```text
chunk bounds
layer bounds
sprite bounds
anchor points
parallax origin
world X/Y
chunk-local X/Y
camera viewport
visible/cull region
repeat boundaries
active layers
active markers
```

Later performance overlays:

```text
draw calls
visible sprite count
texture memory
active render passes
estimated overdraw
frame time
```

Performance numbers must be treated as measured data, not assumptions.

---

# MVP scope

## Pixel BGR Lab MVP

The first usable editor version should include:

```text
scene load/save
chunk timeline
chunk creation and ordering
layer list
sprite layer creation
asset selection
sprite placement
parallax controls
repeat/wrap controls
scroll playback preview
pixel-perfect warnings
import/export
validation
```

Explicit non-goals:

```text
advanced procedural editing
reactive environment authoring
palette/dither pipeline
video layers
ASCII layers
full performance profiler
generic animation graph
production asset database
```

---

## Pixel BGR Lab phase 2

```text
chunk transitions
placed decorations
marker editor
atmospheric layer references
procedural adapters
reaction preview
shared environment events
```

---

## Pixel BGR Lab phase 3

```text
palette/dither preview
pixel post-FX profiles
performance overlays
asset metadata catalog
advanced animation
mesh/tile tooling
video/ASCII experiments
```

---

# Runtime and editor ownership

Recommended ownership:

```text
BackgroundScene content
        ↓
validation / normalization
        ↓
BackgroundState / resolver
        ↓
renderer-owned layer drawing
        ↓
scene render target
        ↓
post-FX / presentation
```

Editor ownership:

```text
Pixel BGR Lab
        ↓
mutates validated editor model
        ↓
exports BackgroundScene
        ↓
preview uses same runtime resolver and renderer adapters
```

The editor must not own production rendering rules independently.

---

# Required implementation order

Pixel BGR Lab should not be implemented before the runtime contracts exist.

Recommended dependency order:

```text
1. Typed background layer model
2. Sprite layer renderer
3. Pure parallax and wrap functions
4. Chunk/scene content model
5. Runtime chunk selection
6. Pixel BGR Lab MVP
7. Markers and transitions
8. Reactive preview
9. Palette/dither/post-FX tooling
10. Experimental layer types
```

---

# Architectural boundaries

## Must remain outside Pixel BGR Lab

```text
pixel-art drawing tools
gameplay director
enemy spawning
combat rules
player damage
weapon state
enemy FSM
level gameplay scripting
runtime dependency installation
```

## Must be shared with runtime

```text
scene schema
layer descriptors
validation
normalization
parallax calculations
wrap calculations
chunk selection
marker evaluation contracts
render adapters
resource references
```

---

# Open design decisions

These decisions should be finalized before implementation of the Lab:

1. Canonical content storage: TypeScript descriptors, JSON, or validated generated content.
2. Asset identity: direct URL, asset ID, manifest entry, or hybrid.
3. Coordinate spaces supported in the first release.
4. Whether placed decorations are a dedicated layer type or a child collection of sprite layers.
5. Whether global layers and chunk-local layers share the same descriptor union.
6. Resource loading and disposal ownership.
7. Missing asset fallback behavior.
8. Exact chunk overlap and transition semantics.
9. Whether markers may emit only named events or also execute typed presentation actions.
10. How procedural BgLab presets map into typed background descriptors.

---

# Acceptance criteria for the future Lab MVP

The MVP is acceptable when:

- a scene can be created, loaded, edited, validated, and exported,
- chunks can be created, resized, ordered, and previewed,
- sprite layers can be added and rendered with deterministic ordering,
- sprite textures can repeat without visible gaps under normal settings,
- parallax preview matches runtime calculations,
- integer/pixel-safe warnings are visible,
- the editor preview uses the runtime renderer path,
- exported content can be loaded by the game without a separate conversion step,
- malformed content produces clear validation errors,
- no gameplay authority is introduced into the background editor,
- localStorage is not the only source of production content,
- feature-off/default runtime behavior remains compatible with the existing background stack.

---

# Final recommendation

Pixel BGR Lab should be built as a visual scene/chunk/layer compositor over the same typed contracts used by the game runtime.

The production hierarchy should be:

```text
sprite/pixel-art assets
        ↓
ordered background layers
        ↓
spatial chunks
        ↓
background scene
        ↓
optional atmosphere, reactions, and post-FX
```

The Lab should begin only after the typed layer model, sprite renderer, parallax/wrap math, and chunk model are stable enough to be reused directly.
