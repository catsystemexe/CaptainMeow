# Scene Lab Space Authoring V1

Status: IMPLEMENTED (STATIC VERIFY; RUNTIME GATE REQUIRED)

Scene Lab exposes one canonical `SPACE` category with Marker, Range, and Zone children. It writes directly to `BackgroundSceneV2.sceneLogic.spaces`; opening a legacy-valid Scene does not add `sceneLogic`, while the first Space creation initializes the complete V1 document.

- Marker is authored at Player/current X and is selected and dragged on the world-X timeline.
- Range defaults to 100 world units and is moved or edge-resized on the dedicated Space timeline overlay lane.
- Zone defaults to 100 world units wide and from 25% to 75% of the 504-unit game-space height. Its DEV-only canvas overlay uses world position minus current scroll, and body dragging preserves width and height.
- IDs are deterministic (`marker_1`, `range_1`, `zone_1`) and unique across Space kinds. IDs are read-only in this version.
- Referenced Spaces cannot be deleted; Triggers are never cascade-deleted.

Legacy `EVE` remains the `BackgroundSceneV2.events[]` compatibility authoring surface. `TRI` remains reserved. The former `MAR` placeholder is removed, while legacy B5 `BackgroundMarker` remains a separate compatibility contract. This version adds no duplicate/rename command, Trigger/Event/Action authoring, runtime evaluator, EventBus wiring, or gameplay behavior.
