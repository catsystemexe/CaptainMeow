# Scene Logic Implementation Roadmap

Status: APPROVED / NEXT PRODUCT WORKSTREAM

## Workstream position and execution rule

The current active implementation workstream remains Pixel BGR Dev Workspace v1. Scene Logic v1 is the approved follow-up product workstream. This roadmap does not broaden the current Pixel BGR Workspace Phase 1 scope, and Scene Logic implementation begins only through focused, separately approved batches.

This document sequences implementation of the architecture approved by D-014. It is a planning contract, not a runtime claim or authorization to execute the entire roadmap. Exact TypeScript interfaces will be established only in the focused batches that verify their runtime owners and boundaries.

## Implementation sequence

```text
M0  Canonical architecture          COMPLETE
M1  Space foundation
M2  Trigger foundation
M3  Event integration
M4  Action execution
M5  State addressing
M6  Scene Logic composition
M7  Scene Lab authoring convergence
M8  Legacy migration
M9  Linear Sequence runtime          COMPLETE
M10 Sequence Lab                     COMPLETE
```

## M0 — Canonical architecture — COMPLETE

**Goal:** Establish the target domain boundaries and incremental migration rules before implementation.

**Scope:** D-014, `SCENE_LOGIC_MODEL_V1.md`, and `SCENE_LOGIC_MIGRATION_CONTRACT.md` are the canonical decision and contracts. Their key invariants are: Space owns geometry; Trigger owns activation; Event carries semantic meaning; Action represents an executable consequence; State addresses authoritative runtime state; and Sequence preserves the distinction between reusable definitions and identity-bearing instances. Runtime integration must retain the existing deterministic fixed-step, phase-owned EventBus and gameplay-state authorities.

**Exclusions:** M0 defines no exact TypeScript interfaces, persistence schema, adapters, or editor controls, and changes no compatibility behavior.

**Acceptance gate:** The canonical model, migration classification, runtime-authority constraints, and non-expansion of Pixel BGR Phase 1 are approved and recorded. **Gate complete.**

## M1 — Space foundation

**Goal:** Establish geometry-only Scene primitives.

**Scope:**

```text
Space
├─ Marker
├─ Range
└─ Zone
```

Add domain types, pure geometry helpers, validation, a Scene ownership/reference model, and targeted static tests. Space has stable identifiers and owns geometry only. BGR-track coupling is forbidden unless verified Scene ownership explicitly requires it.

**Exclusions:** Actions, Trigger behavior, Event semantics, UI, and serialization migration.

**Acceptance gate:** Geometry helpers are deterministic; identifiers are stable; validation has targeted coverage; and existing V2/B5 behavior does not regress.

## M2 — Trigger foundation

**Goal:** Evaluate bounded activation conditions independently from geometry, meaning, and consequences.

**Scope:**

```text
Trigger
├─ Space
├─ Time
└─ State
```

MVP relations are:

```text
Marker → cross

Range / Zone
→ enter
→ inside
→ exit

Time
→ at
→ after

State
→ ==
→ !=
→ <
→ <=
→ >
→ >=
```

All Trigger kinds share the `enabled`, `once`, and `repeat` lifecycle concepts. Trigger definitions and mutable runtime state remain distinct. Gameplay Trigger evaluation uses fixed-step simulation.

**Exclusions:** A Trigger does not directly execute arbitrary Actions. This milestone does not establish a parallel timing clock or State store.

**Acceptance gate:** Supported conditions produce repeatable occurrences under fixed-step execution; lifecycle behavior is covered; authored definitions remain unchanged by evaluation; and no Action is executed directly by a Trigger.

## M3 — Event integration

**Goal:** Introduce semantic Scene Logic Events while preserving existing runtime authority.

**Scope:** Define the bounded semantic occurrence contract and an explicit adapter into the existing phase-owned runtime/EventBus where appropriate. Event represents meaning, not geometry. Not every Scene Logic Event must map one-to-one to an EventBus message.

**Exclusions:** No second gameplay EventBus, duplicate event queue, or bypass of existing event-phase ownership and routing rules.

**Acceptance gate:** The deterministic, ownership-preserving path is demonstrated:

```text
Trigger occurrence
→ semantic Event
→ authoritative runtime routing
```

## M4 — Action execution

**Goal:** Route explicit Scene Logic consequences to verified existing runtime owners.

**Scope:**

```text
Action
├─ Entity
├─ World
├─ State
└─ Flow
```

Only operations with verified runtime ownership may be added. The recommended initial proof is `World.stop_scroll` and `World.start_scroll`, plus one safely mapped Entity Action if appropriate. Actions invoke existing owning systems rather than reimplementing gameplay.

**Exclusions:** Conceptual operations listed in the model are not automatically implementation scope. No parallel gameplay implementations or opaque composite Actions are permitted.

**Acceptance gate:** Each implemented Action has a documented authoritative owner, deterministic routing, and targeted evidence that it invokes rather than duplicates existing behavior.

### First vertical slice — early architecture proof

After the initial Space, Trigger, Event, and Action groundwork, prove:

```text
Marker
→ cross Trigger
→ Scene Event
→ stop_scroll Action
```

This vertical slice must precede broad horizontal expansion across every primitive family. Its purpose is to verify that the canonical abstractions compose with the real deterministic runtime before investing in a larger API surface.

## M5 — State addressing

**Goal:** Reference authoritative runtime state without shadow copies.

**Scope:** Introduce a bounded State addressing/adapter contract. Conceptual namespaces may include `scene.*` and `entity.*`, but registration begins only with values whose owners are verified in current code. State Actions `set`, `increment`, and `decrement` apply only to explicitly writable registered values.

**Exclusions:** Arbitrary object-property traversal, a generic parallel State database, implicit writability, and unverified values.

**Acceptance gate:** Demonstrate:

```text
State Trigger
→ Event
→ Action
```

The path reads and, where registered, writes authoritative state without parallel storage.

## M6 — Scene Logic composition

**Goal:** Establish one coherent Scene-level target data contract.

**Scope:**

```text
Scene
├─ visual/background content
├─ Space
├─ Triggers
├─ Events
└─ Action bindings
```

Persistence/schema integration may be designed and implemented in this milestone. It must provide a backwards-compatible loading strategy, stable IDs, separation of authored state from runtime execution state, and explicit schema/version migration where needed. Legacy V2 `events[]` must not be silently reinterpreted.

**Exclusions:** Compatibility removal and destructive reinterpretation of existing data.

**Acceptance gate:** The following example round-trips through the supported Scene persistence path while preserving stable references and compatibility behavior:

```text
Marker boss_gate
→ cross Trigger
→ Event boss_encounter_started
→ Action stop_scroll
```

## M7 — Scene Lab authoring convergence

**Goal:** Align Scene Lab authoring with the canonical domain model.

**Scope:** Target UX follows this principle:

```text
canvas / timeline
= geometry / world representation

inspector
= logic relationships and properties
```

Space is directly representable spatially where appropriate. Trigger, Event, Action, and State do not inherently require independent geometry. Current `EVE`, `SPACE`, and `LOGIC` surfaces must retain their documented compatibility/canonical boundaries and do not redefine domain architecture.

**Exclusions:** Do not preserve transitional labels or geometry-bearing logic objects merely for UI continuity; do not make UI state runtime authority.

**Acceptance gate:** Supported authoring relationships persist correctly, existing compatible content remains usable, and mandatory browser runtime/visual verification confirms the spatial and inspector interaction model.

## M8 — Legacy migration

**Goal:** Converge compatibility contracts onto one generic Scene Logic authoring system without premature removal.

**Scope:** Audit each of the following and classify it as `MIGRATE`, `ADAPT`, `KEEP AS PRESENTATION-SPECIFIC`, or `RETIRE`:

```text
BackgroundMarker
BackgroundMarkerAction
BackgroundEnvironmentEvent
BackgroundSceneEvent.signal
BackgroundSceneEvent.level-end
```

**Exclusions:** Do not remove a compatibility path before equivalent target behavior is implemented and verified.

**Acceptance gate:** Every listed contract has an evidence-backed classification and migration outcome; compatibility tests and required runtime verification pass; and two competing generic Scene Logic authoring systems do not remain.

**SL-12 status:** SL-12C implements explicit unlocked `level-end` migration and the focused production Marker-cross → Scene Event → Flow Action completion slice. The composed runtime reads the active V2 Scene document, evaluates authoritative player world-X after Simulation, and executes `Flow.complete_level` at the existing Flow boundary. Restart and Scene replacement re-arm Trigger runtime state and establish a fresh first-sample baseline; authoring seek preserves once/fired state and records the actual post-seek authoritative player world-X without evaluating logic, emitting an Event, or queuing an Action. Legacy `level-end` remains persisted but runtime-inert; B5 markers/actions/environment diagnostics remain presentation-specific. This does not establish generic Scene Logic or Sequence runtime support.

## M9 — Linear Sequence runtime

**Goal:** Add deterministic execution of reusable linear orchestration while preserving instance identity.

**Scope:**

```text
Sequence
└─ Linear
   ├─ Event Step
   ├─ Action Step
   └─ Wait Step
```

Implement distinct Sequence Definitions and Sequence Instances, identity-preserving insertion, deterministic fixed-step execution, and duration-only Wait. Instance lifecycle is `idle`, `running`, and `completed`. Sequence Steps reference canonical Scene Events and Actions by stable authored ID.

**Exclusions:** Branching, parallel execution, loops, nested sequences, `wait_until`, and generic expressions.

**Acceptance gate:** Multiple identity-bearing instances can execute supported Event/Action/Wait Steps deterministically and complete without Definition mutation, duplicate runtime authority, or wall-clock dependence.

**SL-13 status — CLOSED:** The standalone linear runtime core implements reusable Definitions, identity-bearing Instances, the `idle | running | completed` lifecycle, referenced Event/Action steps, duration-only Wait steps, pure validation, injected ownership adapters, deterministic same-update zero-wait/immediate traversal, and leftover-dt carry-forward. Definitions remain unchanged and multiple Instances retain independent cursors/wait progress. No EventBus was added. This standalone foundation was subsequently integrated into production by SL-14. Sequence-level Entity/Space parameter bindings are outside the V1 acceptance contract and remain a future capability pending a concrete consumer and stable Entity targeting authority.

## M10 — Sequence Lab

**SL-15 status: CLOSED. SL-15A — CLOSED.** SL-15A provides Definition authoring, ordered Event/Action/Wait editing, Scene Instance insertion, `Flow.start_sequence` authoring, and persistence/reopen coverage. It is merged and passed static plus browser runtime/visual acceptance. Sequence-level Entity/Space parameter bindings are explicitly outside V1 and do not block SL-15 closure.

**Goal:** Provide dedicated reusable Sequence Definition authoring.

**Scope:**

```text
Sequence Lab
→ author definition
→ save
→ Scene Lab
→ insert identity-bearing Sequence Instance
→ author Flow.start_sequence target
```

Scene visualization may expose Sequence content while preserving instance membership.

**Exclusions:** Destructive flattening of Sequence Instances and the advanced Sequence features excluded from M9.

**Acceptance gate:** A reusable Definition can be authored, saved, inserted as an identity-preserving Scene Instance, targeted by `Flow.start_sequence`, reopened with stable Step/Instance references, and verified through mandatory browser runtime/visual checks. **Gate complete through SL-15A.**

## Preferred focused implementation batches

This is a tentative implementation decomposition, not permission to execute all batches automatically. Every batch requires the normal scoped approval, branch, validation, and integration workflow.

```text
SL-01  Space core types + pure geometry helpers
SL-02  Marker cross Trigger runtime
SL-03  Scene Event runtime adapter
SL-04  first World Action adapter + vertical slice
SL-05  Range / Zone + enter/inside/exit
SL-06  Time Trigger
SL-07  State reference registry + State Trigger
SL-08  Entity / State / Flow Action adapters
SL-09  Scene persistence/schema integration
SL-10  Scene Lab Space authoring
SL-11  Scene Lab Trigger/Event/Action authoring
SL-12  legacy compatibility migration
SL-13  Linear Sequence runtime
SL-14  Sequence Scene integration
SL-15  Sequence Lab MVP
```

## Historical first implementation milestone

### SL-01 — Space core types + pure geometry helpers

SL-01 was the first implementation batch in this roadmap sequence. Its expected scope was:

```text
Marker
Range
Zone
validation
pure geometry helpers
targeted tests
```

Its explicit exclusions are:

```text
Trigger runtime
Event runtime
Actions
State adapters
UI
serialization migration
legacy removal
```

SL-01 must receive focused approval before it is marked in progress or implemented.

## SL-14 implementation status — CLOSED

SL-14 Sequence Scene integration passed static verification and browser/runtime acceptance and was merged in PR #303 at merge commit `998d8fd9951d8438c0134070881fbf227c40e6d2`.

- Strict Scene Logic V2 persistence owns reusable Sequence Definitions and identity-bearing Scene Sequence Instances. `Flow.start_sequence` executes Wait, Event, and Action Steps deterministically at the fixed-step Flow boundary through the canonical Event/Action path, including canonical `Flow.complete_level` composition.
- Scene replacement, PLAY AGAIN/restart re-arming, and authoring-seek rebaselining passed lifecycle acceptance. The `Sequence Verification V2` fixture proved marker crossing starts the Sequence once, completion is delayed rather than immediate, completed gameplay freezes while presentation remains responsive, restart permits a second genuine crossing, and Scene replacement does not leak Sequence progress. Browser verification established ordering, not instrumented exact 0.5-second timing; the Wait duration contract is covered independently by smoke verification.
- Marker, Range, and Zone authoring bounds now share one authority across the visual timeline, GameplaySeek, and Scene activation. Generic terminal-geometry authoring permits a tail beyond a terminal Marker.
- V1 remains unchanged, no second EventBus was introduced, and the V1 B2 Demo regression passed.
- Sequence Lab moved into the SL-15A authoring slice, which is CLOSED after static and browser runtime/visual acceptance. Sequence-level Entity/Space parameter bindings are outside Scene Logic V1 and may be reconsidered only with a concrete consumer.


## SL-15 implementation status — CLOSED

### SL-15A — CLOSED

SL-15A Sequence Lab authoring MVP was merged in PR #305 at merge commit `648efa10bdeaaedf4921127ea9ad63b88180c299`.

- Static verification passed for the focused authoring slice, including typecheck/build and targeted Sequence/Scene Logic smokes. The broader smoke runner still reaches the separately tracked pre-existing `BackgroundV2StaticBackdrop.smoke.ts:27` baseline failure.
- Browser runtime/visual acceptance passed for Definition authoring, ordered Wait/Event/Action Steps, Wait editing and reordering, identity-bearing Scene Sequence Instances, `Flow.start_sequence` authoring and target changes, referenced Instance/Definition deletion guards, normal Scene save/reopen persistence, Lab switching, authoring inertness, the SL-14 Sequence Verification V2 regression, and the V1 B2 Demo regression.
- VS Agent browser tooling cannot exercise the native `prompt()` used to create a brand-new Scene Event. This is classified as a non-blocking TOOLING limitation; Sequence Lab Event/Action authoring was verified with existing canonical Event/Action references.
- SL-15A changes authoring only and does not change Sequence runtime semantics, fixed-step ordering, Scene lifecycle, EventBus ownership, or persistence authority.
- SL-15 is CLOSED. Sequence-level Entity/Space parameter bindings, cross-Scene Definition libraries, and advanced Sequence features are outside V1 and remain future capabilities. No SL-15B implementation is required or authorized by this closure.


### SL-15 V1 scope decision — bindings not required

The V1 Sequence contract is complete without generic Entity/Space parameter bindings.

- Current Sequence Steps consume canonical Event/Action IDs and duration waits; no Step has a Space-binding runtime consumer.
- Current Scene Logic has no general Entity-targeted Action and no stable persisted authored gameplay Entity identity suitable for reusable Sequence targeting.
- Adding binding maps now would introduce schema, validation, runtime-resolution, lifecycle, and editor contracts without a concrete consumer.
- Bindings should be reconsidered only when a real product requirement creates a target-substitution problem: Entity-targeted Actions, Space-parameterized Steps, a cross-Scene Definition library, or repeated Sequence duplication caused by differing targets.

This decision re-scopes the older aspirational M9/M10 binding language; it does not remove any implemented runtime or authoring capability.
