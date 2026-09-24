# Scene Logic Migration Contract

Status: CURRENT / IMPLEMENTED V1 MIGRATION CONTRACT

## Purpose

This document records how verified legacy background contracts coexist with the implemented Scene Logic V1 architecture in `SCENE_LOGIC_MODEL_V1.md`. Migration remains explicit and non-destructive: compatibility data stays supported where retained, and authored conversion occurs only through the implemented migration commands.

## Legacy B5 markers

**CURRENT — presentation-specific compatibility implementation**

The legacy B5 model is:

```text
BackgroundMarker
├─ x
├─ enabled
├─ once
└─ actions[]
```

It conflates:

```text
Space + implicit Trigger + Actions
```

`BackgroundMarker` remains a presentation-specific compatibility implementation. It is not the future generic Scene Logic model and MUST NOT be promoted as the target source of domain boundaries.

**IMPLEMENTED V1 ARCHITECTURE**

Marker geometry belongs to Space, activation belongs to Trigger, semantic meaning belongs to Event, and executable consequences belong to Action.

## V2 scene events

**CURRENT — implemented compatibility contract**

`BackgroundSceneEvent` supports:

```text
level-end | signal
+ worldX
```

The contract combines spatial placement (`worldX`) with semantic occurrence (`level-end` or `signal`). Its behavior and schema remain supported during migration.

**IMPLEMENTED V1 ARCHITECTURE**

The corresponding responsibilities decompose as:

```text
Space
→ Trigger
→ Event
→ Action
```

Event does not inherently own spatial geometry. This target partially supersedes the long-term architectural interpretation of work-plan item P1.X.14, while P1.X.14 continues to describe the current implemented compatibility contract.

## Runtime EventBus authority

The existing deterministic, phase-owned EventBus/runtime architecture remains authoritative. Scene Logic MUST NOT introduce a second gameplay EventBus. Scene Logic runtime integration uses that architecture and explicit adapters that preserve event ownership, ordering, and routing constraints.

## Runtime State authority

Scene Logic MUST NOT introduce a parallel generic State database. State references, State Triggers, and implemented State Actions access authoritative runtime values through the bounded `StateRegistry`; no parallel generic State store exists.

## Scene Lab surfaces

**CURRENT — implemented compatibility/canonical UI structure**

The current Scene Lab exposes three distinct V2 surfaces: `EVE` authors the independent legacy `BackgroundSceneV2.events[]` compatibility contract, `SPACE` authors canonical geometry in `sceneLogic.spaces`, and `LOGIC` authors canonical Trigger/Event/Action/State-reference definitions and bindings. The legacy B5 Marker editor remains a separate V1 background presentation surface. These labels and surfaces do not override the Space / Trigger / Event / Action separation in the target model.

The evidence-backed SL-12 classification and migration design are recorded in `SL12_LEGACY_COMPATIBILITY_AUDIT.md`. B5 marker behavior remains presentation-specific. Legacy V2 signals and `level-end` use explicit author migration rather than load-time reinterpretation; unmigrated sources remain compatibility data and runtime-inert.

SL-12A implements the authorized exception for legacy V2 `signal`: an explicit Scene Lab command converts one selected unlocked signal into Marker → cross Trigger → Scene Event plus one Trigger/Event binding. It deterministically allocates first-free IDs from the legacy ID, validates the candidate canonical document and full V2 scene, removes the source only on success, and performs no automatic or runtime migration. Signal behavior remains unchanged.

SL-12C applies the same explicit-only, atomic pattern to one unlocked `level-end`. It maps `worldX` to a Marker, creates an enabled-matching forward `cross`/`once` Trigger, a Scene `level_complete` Event, a Flow `complete_level` Action, and both bindings. Qualified IDs use deterministic first-free `:marker`, `:trigger`, `:event`, and `:action` stems; the Space allocator shares the Marker/Range/Zone collision domain. A recognized existing completion Event/Action chain, lock, invalid candidate, or missing/wrong source returns the original Scene unchanged. Loading never performs migration. B5 remains outside this implementation.

## Sequence migration classification

**NEW / IMPLEMENTED V1**

Sequence has no legacy compatibility model in the verified B5 marker or V2 event contracts, so it is not a migration target. Scene Logic V2 persistence implements reusable Sequence Definitions and identity-bearing Sequence Instances directly. `Flow.start_sequence` targets an Instance, and linear Event/Action/Wait Steps execute through the canonical fixed-step runtime.

Generic Entity/Space Sequence parameter bindings, cross-Scene Sequence libraries, branching, parallel execution, loops, nested composition, and `wait_until` remain outside V1.

## Authority summary

```text
P1.X.14
= retained V2 compatibility contract

D-014 + SCENE_LOGIC_MODEL_V1.md
= implemented Scene Logic V1 architecture
```

The V1 migration workstream is closed. No automatic/load-time reinterpretation was introduced: legacy `signal` and `level-end` conversion remains explicit, B5 remains presentation-specific, and future migration/removal work requires a separate approved task.
