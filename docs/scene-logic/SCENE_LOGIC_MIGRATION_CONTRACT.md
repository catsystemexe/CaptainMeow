# Scene Logic Migration Contract

Status: CURRENT → APPROVED TARGET

This document records how implemented background contracts relate to the target
Scene Logic model. It does not change current runtime behavior, schemas,
serialization, or UI.

## Legacy B5 markers

**CURRENT:** `BackgroundMarker` is:

```text
BackgroundMarker
├─ x
├─ enabled
├─ once
└─ actions[]
```

This contract conflates Space, an implicit Trigger, and Actions. It remains a
presentation-specific compatibility implementation and MUST NOT be treated as
the future generic Scene Logic model.

**TARGET:** geometry, activation, and consequences are modeled separately as
Space, Trigger, and Action.

## V2 scene events

**CURRENT:** `BackgroundSceneEvent` is a `level-end` or `signal` occurrence with
`worldX`. It therefore combines spatial placement and semantic occurrence.
This V2 `events[]` world-X contract remains the implemented compatibility model.

**TARGET:** the long-term flow decomposes those responsibilities:

```text
Space
→ Trigger
→ Event
→ Action
```

Existing V2 behavior and schema remain supported until equivalent replacement
behavior is implemented and verified.

## Runtime authority invariants

The existing deterministic, phase-owned EventBus remains runtime authority.
Scene Logic MUST NOT create a second gameplay EventBus. Future Scene Logic
Events must use that architecture or explicit adapters that preserve its phase
and routing contracts.

Authoritative gameplay and scene state also remains in its owning runtime
systems. Scene Logic MUST NOT create a parallel generic State database. Future
Trigger reads and State Action writes must use explicit contracts or adapters
to the authoritative state.

## Scene Lab

**CURRENT:** Scene Lab rows labeled `EVE`, `TRI`, and `MAR` are transitional UI
structure. Those labels MUST NOT be treated as final domain authority or as a
reason to collapse the target concepts.

This migration contract does not authorize changes to the Scene Lab UI.

## Sequence

**NEW / DEFERRED:** Sequence has no compatibility model established by the
legacy B5 marker or V2 event contracts. Its implementation is deferred until
Space, Trigger, Event, Action, and State primitives are stable. The target
requirements for Linear Sequence and Definition/Instance identity are defined
in `SCENE_LOGIC_MODEL_V1.md`.

## Authority relationship and scope

`PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md` P1.X.14 records the **CURRENT
IMPLEMENTED CONTRACT**. D-014 and `SCENE_LOGIC_MODEL_V1.md` define the
**APPROVED TARGET ARCHITECTURE**. This is an explicit partial supersession, not
a claim that migration has already occurred.

Migration is incremental and is a follow-up architecture workstream. It MUST
NOT retroactively expand the approved Pixel BGR Workspace Phase 1 scope.
