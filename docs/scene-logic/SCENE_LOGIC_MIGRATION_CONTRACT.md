# Scene Logic Migration Contract

Status: CURRENT → APPROVED TARGET

## Purpose

This document records how verified existing background contracts relate to the target architecture in `SCENE_LOGIC_MODEL_V1.md`. It does not change runtime behavior, schemas, serialization, or UI. Migration is incremental, and compatibility behavior remains supported until equivalent replacement behavior is implemented and verified.

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

**TARGET**

Marker geometry belongs to Space, activation belongs to Trigger, and executable consequences belong to Action.

## V2 scene events

**CURRENT — implemented compatibility contract**

`BackgroundSceneEvent` supports:

```text
level-end | signal
+ worldX
```

The contract combines spatial placement (`worldX`) with semantic occurrence (`level-end` or `signal`). Its behavior and schema remain supported during migration.

**TARGET — approved architecture**

The corresponding responsibilities decompose as:

```text
Space
→ Trigger
→ Event
→ Action
```

Event does not inherently own spatial geometry. This target partially supersedes the long-term architectural interpretation of work-plan item P1.X.14, while P1.X.14 continues to describe the current implemented compatibility contract.

## Runtime EventBus authority

The existing deterministic, phase-owned EventBus/runtime architecture remains authoritative. Scene Logic MUST NOT introduce a second gameplay EventBus. Future runtime integration must use that architecture or explicit adapters that preserve its event ownership, ordering, and routing constraints.

## Runtime State authority

Scene Logic MUST NOT introduce a parallel generic State database. Future State references and State Actions must access authoritative Scene, world, or entity state through explicit contracts or adapters.

## Scene Lab surfaces

**CURRENT — transitional UI structure**

The current Scene Lab exposes three distinct V2 surfaces: `EVE` authors the independent legacy `BackgroundSceneV2.events[]` compatibility contract, `SPACE` authors canonical geometry in `sceneLogic.spaces`, and `LOGIC` authors canonical Trigger/Event/Action/State-reference definitions and bindings. The legacy B5 Marker editor remains a separate V1 background presentation surface. These labels and surfaces do not override the Space / Trigger / Event / Action separation in the target model.

The evidence-backed SL-12 classification and migration design are recorded in `SL12_LEGACY_COMPATIBILITY_AUDIT.md`. In particular, B5 marker behavior remains presentation-specific, legacy V2 signals are candidates for explicit author migration rather than load-time reinterpretation, and legacy `level-end` remains compatibility data until an authoritative completion owner and implemented Action exist.

This contract does not authorize a Scene Lab UI or serialization change.

## Sequence migration classification

**NEW / DEFERRED**

Sequence has no compatibility model in these verified B5 marker or V2 event contracts. Sequence implementation is deferred until the Space, Trigger, Event, Action, and State primitives are stable. Its eventual MVP must distinguish reusable Sequence Definitions from identity-preserving Sequence Instances.

## Authority summary

```text
P1.X.14
= CURRENT implemented V2 compatibility contract

D-014 + SCENE_LOGIC_MODEL_V1.md
= APPROVED future target architecture
```

This migration contract does not broaden Pixel BGR Workspace Phase 1. It authorizes no runtime, schema, serialization, adapter, test, or UI implementation work.
