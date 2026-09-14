# Scene Logic Persistence V1

Status: IMPLEMENTED

## Version ownership and compatibility

Scene Logic is an optional additive block in `BackgroundSceneV2`. The outer Scene
wire version remains `version: 2`; the nested block independently requires
`sceneLogic.version: 1`. A valid V2 Scene without `sceneLogic` remains valid and
the parser does not inject an empty block.

The existing `BackgroundSceneV2.events[]` contract remains independent and
unchanged. Legacy events and `sceneLogic` may coexist and round-trip in one Scene.
No legacy event, `worldX`, or background marker is automatically migrated or
reinterpreted as Scene Logic.

## Canonical V1 shape

When `sceneLogic` is present, every collection below is required; empty arrays are
valid:

```text
sceneLogic
├─ version: 1
├─ spaces
│  ├─ markers[]
│  ├─ ranges[]
│  └─ zones[]
├─ states[]
├─ triggers[]
├─ events[]
├─ actions[]
├─ triggerEventBindings[]
└─ eventActionBindings[]
```

Space uses grouped arrays because Marker, Range, and Zone already have distinct
stable structures; persistence adds no synthetic Space discriminant. Triggers use
the implemented Marker-cross, Range, Zone, Time, and State authored union. Actions
use only the implemented `World.stop_scroll`, `State.set`, `State.increment`,
`State.decrement`, and `Flow.restart_level` definitions.

## Identity and reference integrity

Space IDs are unique across all three Space arrays. State, Trigger, Event, and
Action IDs are unique within their respective collections. Trigger-to-Event and
Event-to-Action bindings use those stable IDs, must resolve to definitions of the
correct kind, and reject duplicate exact pairs. Bindings have no independent IDs
and do not impose one-to-one cardinality or execution ordering.

State Trigger comparison values and State Action values must match the referenced
State's authored value type. Ordering comparisons and increment/decrement Actions
require number States. Runtime writability is deliberately not a persistence
validation concern.

## Authored-only boundary

Validation is strict at every Scene Logic object boundary and rejects unknown
fields. Consequently runtime Trigger memory, Event occurrences, Action execution
state, registries, adapters, and live World/Player values cannot be persisted in
this document. Invalid Scene Logic invalidates the entire Scene rather than being
dropped or replaced.

Scene Logic V1 adds no runtime evaluation or wiring and no Scene Lab UI contract.
Sequence definitions, instances, bindings, and wait steps are excluded; they
belong to later Scene Logic work.
