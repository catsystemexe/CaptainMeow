# Scene Logic Model V1

Status: APPROVED TARGET ARCHITECTURE

## Purpose and scope

Scene Logic is the subsystem contract for authoring how spatial, temporal, and
state conditions become meaningful scene occurrences and concrete runtime
consequences. This document defines the target model and its MVP boundaries; it
does not define serialization or exact TypeScript interfaces.

The six MVP concepts are:

```text
Space
Trigger
Event
Action
State
Sequence
```

These concepts MUST remain distinct. Geometry describes where; activation logic
describes when; semantic events describe what occurred; actions describe one
consequence. Implementation remains incremental, and current compatibility
contracts remain supported as specified in
`SCENE_LOGIC_MIGRATION_CONTRACT.md`.

## Space

Space owns authored geometry only. It MUST NOT directly own arbitrary behavior
or Actions.

```text
Space
├─ Marker
├─ Range
└─ Zone
```

- **Marker** is one position or boundary.
- **Range** is a one-dimensional interval.
- **Zone** is a two-dimensional area.

## Trigger

Trigger detects an activation condition. It MUST NOT directly perform arbitrary
side effects.

```text
Trigger
├─ Space
├─ Time
└─ State
```

MVP Space conditions are `cross` for a Marker and `enter`, `inside`, or `exit`
for a Range or Zone. MVP Time conditions are `at` and `after`. MVP State
comparisons are `==`, `!=`, `<`, `<=`, `>`, and `>=`. Every Trigger uses the
common `enabled` or `disabled` and `once` or `repeat` controls.

## Event

Event is a semantic statement that something meaningful occurred.

```text
Event
├─ Gameplay
└─ Scene
```

Examples include `boss_encounter_started`, `boss_defeated`, `level_completed`,
`scene_started`, and `scroll_stopped`. An Event may carry minimal context such
as `id`, `type`, optional `source`, and optional `payload`. It does not
inherently own spatial geometry.

Scene Logic MUST NOT introduce a second gameplay EventBus. Runtime Scene Logic
Events MUST integrate through the existing deterministic, phase-owned runtime
architecture or through explicit adapters to that architecture.

## Action

Action represents one concrete executable operation and owns the consequence of
an activation flow.

```text
Action
├─ Entity: spawn, destroy, move, enable, disable
├─ World: start_scroll, stop_scroll, set_scroll_speed
├─ State: set, increment, decrement
└─ Flow: start_sequence, complete_scene, complete_level, restart_level
```

An Action MUST NOT be an opaque composite operation. For example,
`start_boss_fight` is not an acceptable single Action when it hides several
side effects; those effects must remain explicit operations.

## State

State identifies authoritative runtime values that Triggers read and State
Actions write.

```text
State
├─ Scene: scrolling, scrollSpeed, bossFight, phase, sceneCompleted
└─ Entity: alive, enabled, health, shieldEnergy, position
```

These values are conceptual MVP candidates, not a new storage schema. Scene
Logic MUST NOT create a parallel gameplay-state database. It MUST reference
authoritative runtime state through future explicit adapters or contracts.

## Sequence

The MVP Sequence is Linear and MAY contain Event Steps, Action Steps, and Wait
Steps. An MVP Wait is duration-only. A Trigger is not a Sequence step.

```text
Trigger
→ Event
→ Action.start_sequence
→ Sequence
```

A **Sequence Definition** is the reusable authored ordering of steps. A
**Sequence Instance** is a particular insertion and execution of that
definition within a Scene. Inserting a Sequence into a Scene MUST preserve the
instance's identity; it MUST NOT flatten the steps into unrelated copied
primitives.

Sequence runtime implementation is deferred until the preceding primitives are
stable.

## Conceptual data flow

The normal target flow is:

```text
authoritative geometry or time/state input
→ Trigger evaluates
→ Event states the meaning of the activation
→ Action executes one consequence
→ optional Linear Sequence coordinates explicit steps
```

Geometry and logic are separate: Space can be referenced by a Space Trigger,
but Space does not execute behavior. Likewise, Event communicates meaning but
does not acquire geometry merely because a spatial Trigger emitted it.

All gameplay-relevant evaluation and execution MUST obey the existing 60 Hz
fixed-step simulation, deterministic ordering, phase ownership, and injected
randomness contracts. Render timing, wall-clock timing, and presentation state
MUST NOT become gameplay authority.

## Relationship to Scene and Level

A Scene is the authoring and instance context that contains or references Scene
Logic definitions and preserves inserted instance identity. Scene completion is
an explicit Flow Action, not an implied property of a spatial Event. A Level
may coordinate one or more Scenes and is completed or restarted only through
explicit Flow Actions. Neither container changes the authority boundaries for
EventBus, State, or fixed-step execution.

## Explicit MVP exclusions

The following are **OUT OF MVP**:

- `if/else` branching;
- parallel execution;
- loops;
- nested sequences;
- `wait_until`;
- a general graph editor;
- Trigger steps inside a Sequence;
- exact TypeScript, schema, serialization, adapter, or UI contracts.

Runtime types, adapters, serialization, and tooling are future incremental
implementation work and require their own verified changes.
