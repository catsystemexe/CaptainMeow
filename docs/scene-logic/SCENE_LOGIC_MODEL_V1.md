# Scene Logic Model V1

Status: APPROVED TARGET ARCHITECTURE

## Purpose and scope

Scene Logic defines how a Scene describes meaningful conditions and consequences without making presentation data authoritative for gameplay. This document is the canonical target architecture for that subsystem. It defines the domain boundaries and MVP vocabulary, but intentionally does not prescribe TypeScript interfaces, storage schemas, adapters, or editor controls.

Implementation remains incremental. Existing compatibility contracts remain supported until equivalent target behavior is implemented and verified; see `SCENE_LOGIC_MIGRATION_CONTRACT.md`.

## The six MVP concepts

The Scene Logic MVP consists of six distinct concepts:

```text
Space
Trigger
Event
Action
State
Sequence
```

Each concept MUST retain its own responsibility. An authored object MUST NOT collapse geometry, activation, semantic meaning, and side effects into one generic contract.

### Space

Space owns authored geometry only:

```text
Space
├─ Marker
├─ Range
└─ Zone
```

- **Marker** is a single position or boundary.
- **Range** is a one-dimensional interval.
- **Zone** is a two-dimensional area.

Space MUST NOT directly own arbitrary behavior or Actions. Geometry may be referenced by a Trigger, but geometry alone does not cause a side effect.

### Trigger

Trigger detects an activation condition:

```text
Trigger
├─ Space
├─ Time
└─ State
```

MVP conditions are:

| Trigger kind | Subject | Conditions |
| --- | --- | --- |
| Space | Marker | `cross` |
| Space | Range or Zone | `enter`, `inside`, `exit` |
| Time | Scene timing | `at`, `after` |
| State | Authoritative value | `==`, `!=`, `<`, `<=`, `>`, `>=` |

All Trigger kinds support `enabled` / `disabled` and `once` / `repeat` behavior. A Trigger MUST NOT directly perform arbitrary side effects.

### Event

Event is a semantic statement that something meaningful occurred:

```text
Event
├─ Gameplay
└─ Scene
```

Representative event types include `boss_encounter_started`, `boss_defeated`, `level_completed`, `scene_started`, and `scroll_stopped`. An Event may carry minimal context such as `id`, `type`, optional `source`, and optional `payload`.

An Event does not inherently own spatial geometry. Spatial placement belongs to Space, and activation belongs to Trigger.

### Action

Action represents one concrete executable consequence:

```text
Action
├─ Entity
├─ World
├─ State
└─ Flow
```

MVP candidate operations are:

| Action kind | Operations |
| --- | --- |
| Entity | `spawn`, `destroy`, `move`, `enable`, `disable` |
| World | `start_scroll`, `stop_scroll`, `set_scroll_speed` |
| State | `set`, `increment`, `decrement` |
| Flow | `start_sequence`, `complete_scene`, `complete_level`, `restart_level` |

An Action SHOULD expose one operation. It MUST NOT use an opaque composite operation such as `start_boss_fight` to conceal multiple unrelated side effects; those consequences belong in explicit Actions or a Sequence.

### State

State is a reference to authoritative runtime state:

```text
State
├─ Scene
└─ Entity
```

Conceptual MVP values may include:

- Scene: `scrolling`, `scrollSpeed`, `bossFight`, `phase`, `sceneCompleted`.
- Entity: `alive`, `enabled`, `health`, `shieldEnergy`, `position`.

A State Trigger reads authoritative state. A State Action writes authoritative state through a future explicit contract or adapter. Scene Logic MUST NOT create a parallel gameplay-state database.

### Sequence

The MVP Sequence is linear:

```text
Sequence
└─ Linear
   ├─ Event Step
   ├─ Action Step
   └─ Wait Step (duration only)
```

A Trigger is not a Sequence step. A typical composition is:

```text
Trigger
→ Event
→ Action.start_sequence
→ Sequence
```

#### Sequence Definition and Sequence Instance

A **Sequence Definition** is a reusable authored description of ordered steps. A **Sequence Instance** is a particular insertion and execution of that definition within a Scene. Inserting a Sequence into a Scene MUST preserve the instance's identity; it MUST NOT flatten the steps into unrelated copied primitives.

**SL-13 runtime-core status:** The standalone runtime implements stable Definition/Instance identity, `idle → running → completed`, referenced Event and Action steps, and duration-only Wait steps driven only by caller-supplied fixed-step time. Immediate steps and zero-duration waits advance in authored order in the same update; positive waits consume available simulation time and carry leftover time into later steps. Execution uses injected Event/Action adapters, creates no EventBus, and does not mutate authored Definitions. Scene ownership/persistence, entity/Space bindings, `Action.start_sequence` composition, and authoring UI remain deferred to SL-14/SL-15.

## Conceptual data flow

The common spatial flow is:

```text
Space geometry
→ Trigger evaluates a condition
→ Event states what occurred
→ Action applies one consequence
→ optional Linear Sequence orders further Events, Actions, and duration waits
```

Not every Event must originate from a spatial Trigger: gameplay systems may report semantic Events, Time or State Triggers may activate logic, and Actions may start a Sequence. These paths MUST preserve the same concept boundaries.

## Runtime authority invariants

### EventBus authority

Scene Logic MUST NOT introduce a second competing gameplay EventBus. Runtime Scene Logic Events must integrate through the existing deterministic, phase-owned runtime architecture or through explicit adapters into that architecture. Event production and consumption must continue to respect event-phase ownership and routing rules.

### State authority

Scene Logic MUST NOT become an independent gameplay-state authority. State references and State Actions must use explicit future adapters or contracts to read and write the authoritative Scene, world, and entity state.

### Deterministic fixed-step behavior

Gameplay-relevant Trigger evaluation, Event routing, Actions, waits, and Sequence progress MUST follow the existing fixed-step simulation and deterministic phase order. They MUST NOT depend on render-frame delta, wall-clock time, browser refresh timing, audio timing, or presentation clocks. Duration waits are simulation durations, not an authorization for wall-clock execution.

## Relationship to Scene and Level

A **Scene** is the authored context that owns or references Scene Logic placements and Sequence Instances. Space geometry is expressed in the Scene's relevant coordinate system, while logic remains separate from visual/background geometry ownership.

For the MVP, **1 Level = 1 Scene**. The session is the authoritative Level lifecycle owner with `ACTIVE` and `COMPLETED` states. `Flow.complete_level` idempotently transitions `ACTIVE → COMPLETED`; gameplay simulation freezes while rendering/UI continues, and the HUD offers `LEVEL COMPLETE` plus `PLAY AGAIN`. Play again restarts the same Level/Scene through the canonical reset path and returns it to `ACTIVE`.

Scene Logic Actions invoke that authoritative flow behavior; they do not own completion or mutate rendering/HUD state. Multi-Scene Levels, next-Level progression, and production Trigger/Event/Action composition are outside this MVP decision.

## Explicit MVP exclusions

The following are **OUT OF MVP**:

- conditional `if/else` Sequence branches;
- parallel Sequence execution;
- loops;
- nested Sequences;
- `wait_until`;
- a general graph editor;
- Trigger steps inside a Sequence;
- opaque composite Actions;
- a generic Scene Logic state database;
- a second gameplay EventBus;
- exact TypeScript interfaces, persistence schemas, adapters, or UI design.

These exclusions are not implementation estimates. Any later addition requires an explicit contract beyond this V1 MVP.
