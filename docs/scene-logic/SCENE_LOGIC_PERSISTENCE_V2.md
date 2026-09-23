# Scene Logic Persistence V2

Status: IMPLEMENTED

## Versioning and compatibility

`BackgroundSceneV2` remains outer wire `version: 2`. Its optional `sceneLogic` block accepts the strict, unchanged `SceneLogicDocumentV1` contract or `SceneLogicDocumentV2`. Loading does not migrate V1 to V2. V2 contains every V1 collection plus required `sequenceDefinitions[]` and `sequenceInstances[]` collections.

## Authored Sequence data

A Sequence Definition is stored once as `{ id, steps }`. A Scene Sequence Instance stores only `{ id, definitionId }`; status, cursor, wait progress, queues, and tick state are runtime-only. Definition IDs and Instance IDs are unique in their collections, and every Instance resolves one Definition. `Flow.start_sequence` targets an Instance ID. Sequence Action steps may not reference `start_sequence`, so nested Sequence composition remains invalid.

V2 validation is strict: unknown fields and unresolved Event, Action, Definition, Instance, Trigger, Space, or State references invalidate the Scene. Existing Scene Lab edits preserve the document discriminant and Sequence collections, but no Sequence authoring UI is provided yet.

## Runtime policy

Scene activation creates fresh idle runtime Instances without executing steps. At each existing Flow phase the runtime executes one snapshot of pending Scene Logic Actions in authored order, stops a stale snapshot if restart changes the runtime generation, and—only while the Level remains active—updates Sequences with fixed-step `ctx.dt`. Actions queued by Sequence Event or Action steps execute on the next Flow tick. A Trigger-bound `start_sequence` therefore starts its target in the crossing tick's Flow phase and that Instance receives the same tick's fixed-step update.

Sequence Event steps materialize ordinary Scene Event occurrences with `sourceSequenceInstanceId`, dispatch through the existing Event adapter, and resolve the normal Event-to-Action bindings. Trigger events retain `sourceTriggerId`. Reset and Scene replacement recreate idle Instances; authoring seek only rebaselines Trigger position and preserves Sequence progress.

## Deferred bindings

SL-14 adds no Sequence-level Space or Entity binding map. Current steps consume stable Event and Action IDs, so a Space binding has no runtime consumer. The project also has no general authored gameplay Entity identity suitable for reusable Sequence binding. Both contracts remain deferred until a real consumer and stable Entity authority exist.
