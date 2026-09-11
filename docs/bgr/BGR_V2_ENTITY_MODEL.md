# Background V2 entity model

Status: **current canonical contract** for Background V2 scene entities and their authoring commands.

## Entity hierarchy

A **Scene** is the top-level authored container. A **Layer/Track** is a structural parallax container, not a physical visual entity. It owns role, parallax, Z base, sequence/repeat mode, enabled state, and its visual entities. Layer configuration remains in the existing lane/track controls; a Layer receives no Lock, Duplicate, Flip, Rename, Delete, or other entity RMB menu.

A **Segment (SEG)** is a physical visual asset entity and the background composition primitive. It owns an asset reference, authored X extent, Y offset, visual properties, and independent selection/editing.

An **Object (OBJ)** is a physical visual asset entity and the discrete scene entity primitive. It owns an asset reference, independent X/Y placement, optional width/height, visual properties, and independent selection/editing. It does not define the continuous background sequence.

SEG and OBJ are peers contained directly by a Layer. Neither contains the other. Both may share asset identity, enabled state, visual transforms, duplication, authoring lock, display name, and deletion, while retaining different composition/runtime roles.

## Logical/helper entities

An **Event (EVE)** is scene-global rather than a Layer child. It has canonical world X, enabled state, logical type, and a user-facing name where supported.

**Trigger (TRI)** and **Marker (MAR)** remain reserved. A future Trigger may react to player/world conditions and reference discrete entities such as OBJ; a future Marker may be a helper authored entity. Neither is a physical asset, and this contract introduces no TRI/MAR schema, runtime, control, or fake mutation authority. Their target item commands are Lock/Unlock, Duplicate, Rename, and Delete once those entity types exist.

## Stable identity and display names

`id` is stable machine identity. `name` is an editable user-facing label. Rename writes `name`, never `id`, so future Trigger-to-Object, Event-to-target, and authoring references remain safe. Segment and Object accept additive `name?: string`; Event retains the required signal-name behavior and permits an additive level-end display name. UI labels fall back to `name || id`. Existing scenes without names remain valid.

## Authoring lock

`locked?: boolean` is persistent authoring metadata on SEG, OBJ, and EVE; absent/false means unlocked. Lock is authoring-only and is separate from `enabled`, visibility, Event activation, and gameplay state. Runtime evaluation ignores it.

A locked entity remains visible according to existing runtime fields, selectable, and inspectable. It cannot be moved, resized, Y-dragged/nudged, renamed, duplicated, flipped, or deleted. Its menu exposes active **Unlock**, with its other mutating commands disabled. Enabled/visibility presentation remains governed independently by existing controls.

## Geometry-preserving flip

SEG and OBJ accept additive `flipX?: boolean` and `flipY?: boolean`; absent/false means unflipped. Flip mirrors the rendered asset via UV orientation within the same authored bounds. It does not change X/Y, width/height, segment ordering, track sequence, or world timing, and it does not duplicate textures.

## Context commands

The existing unified entity context-menu authority provides:

- SEG and OBJ: Lock/Unlock, Duplicate, Flip Horizontal, Flip Vertical, Rename, Delete.
- EVE: Lock/Unlock, Duplicate, Rename, Delete; Events never receive Flip commands.
- TRI and MAR: reserved, with no functional item menu yet.

Opening an entity menu selects that entity. Visual and Event selections remain independent, right-click never begins a drag, and opening/dismissing a menu does not mutate scene data. Duplicate uses canonical helpers and deterministic offsets; a created copy is unlocked. Rename is inline, trims whitespace, commits with Enter or blur, cancels with Escape, and never changes stable identity. Repeat-track Segment commands continue to respect sequence-only authoring authority.
