# Scene Lab Logic Authoring V1

Scene Lab authors canonical relationships directly in `BackgroundSceneV2.sceneLogic`. The **LOGIC** contents category separates Trigger, semantic Scene Event, and implemented Action definitions; inspectors own their properties and Trigger→Event / Event→Action bindings. IDs are deterministic, read-only reference identity, and referenced definitions cannot be deleted until bindings/references are removed.

State references are a bounded authored-address surface: `scene.scrollSpeed` (number), `player.alive` (boolean), and `player.shield` (number). They do not contain live values or writability claims. State increment/decrement is limited to number references, while set values must match the declared value type.

Legacy **EVE** remains the independent `BackgroundSceneV2.events[]` compatibility authoring surface. It is neither migrated nor bindable to canonical Events. Canonical logic has no timeline/canvas geometry: only Marker, Range, and Zone remain spatial, and no Event diamonds or fake X coordinates are created.

Canonical authored Scene Logic is production-active. The fixed-step Simulation path evaluates Marker/Range/Zone, Time, and State Triggers; occurrences materialize semantic Events and queue bound Actions for the existing Flow boundary. V2 Sequence Definitions/Instances and `Flow.start_sequence` are likewise integrated. Legacy `BackgroundSceneV2.events[]` entries remain compatibility data and are runtime-inert until explicitly migrated.

All displayed Scene Lab world-X coordinates use presentation-only whole-number rounding. Formatting does not quantize or mutate persisted geometry; decimal coordinates remain stored unchanged.

**Runtime status: ACCEPTED.** Static verification and browser/runtime acceptance cover canonical Trigger execution, Flow phasing, PLAY AGAIN/re-arm, authoring-seek spatial rebaseline safety, Scene replacement, Sequence regression, and V1 compatibility.
