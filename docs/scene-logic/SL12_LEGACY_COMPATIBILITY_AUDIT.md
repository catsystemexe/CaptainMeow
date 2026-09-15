# SL-12 Legacy Compatibility Audit

## Baseline

- Repository: `catsystemexe/CaptainMeow` (`origin` confirmed for fetch and push).
- Approved integration snapshot: `pixel_bgr` at expected and actual SHA `75acaa5f480cae20c7eecbaeef11b414f2a18a36`.
- The isolated checkout exposed that snapshot as local branch `work`; the exact SHA and clean worktree verified the supplied baseline under the repository's branch-selector rule.
- Audit branch: `codex/sl-12-legacy-migration-audit`.
- Scope: source-first documentation audit only. No schema, serialization, UI, evaluator, EventBus, or runtime behavior changed. No browser/game runtime was performed.

### Evidence inspected

Implementation and tests inspected directly:

- B5 types, ownership, validation, persistence, evaluation, effects, UI, and tests: `src/render/webgl/bg/layers/BackgroundSceneTypes.ts`, `BackgroundMarkerTypes.ts`, `BackgroundMarkerResolve.ts`, `BackgroundMarkerRuntime.ts`, `BackgroundPresentationOverrides.ts`, `BackgroundMarkers.smoke.ts`, `src/render/webgl/WebGLSceneRenderer.ts`, `src/render/BackgroundState.ts`, `src/render/bg/v2/BackgroundV1Adapter.ts`, `BackgroundV1Adapter.smoke.ts`, `src/ui/PixelBgrLabState.ts`, `PixelBgrLabValidation.ts`, `PixelBgrLabSerialization.ts`, `PixelBgrLabUI.ts`, `PixelBgrLabB5.smoke.ts`, and `src/game/authoring/GameplaySeek.smoke.ts`.
- V2 legacy events: `src/render/bg/v2/BackgroundV2Types.ts`, `BackgroundV2Validation.ts`, `BackgroundV2Serialization.ts`, `BackgroundV2Events.smoke.ts`, `BackgroundV2Serialization.smoke.ts`, `BackgroundV2Persistence.smoke.ts`, `src/ui/PixelBgrV2SceneEvents.ts`, `PixelBgrV2TimelineProjection.ts`, `PixelBgrV2EventsLane.smoke.ts`, and `PixelBgrV2LayerEventInspector.smoke.ts`.
- Canonical implementation: `src/game/scene-logic/Space.ts`, `Trigger.ts`, `TriggerRuntime.ts`, `Event.ts`, `EventRuntime.ts`, `Action.ts`, `ActionRuntime.ts`, `SceneLogicDocument.ts`, their adjacent smokes, `src/ui/SceneLogicEditing.ts`, `SceneLogicSpaceEditing.ts`, `SceneLogicInsertMenu.ts`, and their adjacent smokes.
- Canonical/current documentation: `SCENE_LOGIC_MODEL_V1.md`, `SCENE_LOGIC_MIGRATION_CONTRACT.md`, `SCENE_LOGIC_PERSISTENCE_V1.md`, `SCENE_LAB_SPACE_AUTHORING_V1.md`, `SCENE_LAB_LOGIC_AUTHORING_V1.md`, `SCENE_LOGIC_ROADMAP.md`, `docs/bgr/BGR_V2_ENTITY_MODEL.md`, and the current project state, decisions, workflow, and backlog.

Historical B5 handoffs were used only to locate evidence, not as authority.

## Executive verdict

The repository does **not** contain two generic Scene Logic authoring systems. It contains one generic canonical system (`sceneLogic`, authored by **SPACE** and **LOGIC**), one legacy V2 event compatibility surface (`events[]`, authored by **EVE**), and the older B5 presentation-specific marker/action editor on V1 background scenes.

The B5 contracts are live presentation behavior, evaluated inside the WebGL render path using renderer frame delta and presentation time. They do not execute through the fixed-step gameplay loop or gameplay EventBus. Their layer actions and environment-event diagnostic have no legitimate implemented canonical Action equivalents and must remain presentation-specific.

Legacy V2 `signal` is persisted and authored but runtime-inert. Its geometry/activation/meaning can be represented by canonical Marker → cross Trigger → Scene Event, but conversion must be an explicit author command rather than silent load adaptation. Legacy V2 `level-end` is also runtime-inert, and no implemented `complete_level`/`complete_scene` Action or verified authoritative completion adapter exists. It must coexist until those missing semantics are approved and implemented.

## Contract matrix

| Contract | Current owner | Runtime semantics | Canonical equivalent | Classification | Recommended migration |
| --- | --- | --- | --- | --- | --- |
| `BackgroundMarker` | V1/B5 background presentation | Render-loop crossing of player world X; renderer-owned once/re-arm memory | Structurally Marker Space + cross Trigger, but not equivalent for presentation effects | KEEP AS PRESENTATION-SPECIFIC | Option D — compatibility coexistence |
| `BackgroundMarkerAction` | WebGL background presentation overrides | Immediate render-state mutation; pulse advances by render `dt` | No implemented equivalent; layer controls are BGR-specific and pulse is presentation-timed | KEEP AS PRESENTATION-SPECIFIC | Option D — compatibility coexistence |
| `BackgroundEnvironmentEvent` | WebGL presentation/debug override state | Last-value presentation diagnostic only; no dispatch or queue | None; it is not a canonical semantic Scene Event | KEEP AS PRESENTATION-SPECIFIC | Option D — compatibility coexistence |
| `BackgroundSceneEvent.signal` | V2 `events[]` persistence and EVE authoring | Serialization/UI/timeline only; no runtime consumer | Marker Space → cross Trigger → Scene Event, without an Action by default | MIGRATE | Option C — explicit one-time author migration |
| `BackgroundSceneEvent.level-end` | V2 `events[]` persistence and EVE authoring | Serialization/UI/timeline only; helper is test-only; no completion side effect | Marker → cross Trigger → completion Event → **missing implemented/authoritatively mapped completion Action** | ADAPT | Option D — compatibility coexistence pending flow authority |

## BackgroundMarker

### Contract trace

- **Type/schema and ownership:** a `BackgroundScene` can own global `markers[]`; each `BackgroundChunk` can own chunk-local `markers[]`. A marker has authored `id`, local `x`, `enabled`, `once`, and ordered `actions[]`. IDs are required to be unique only within their immediate owner.
- **Validation:** B5 validation requires a non-empty owner-local ID, finite X, booleans, an action array, valid action shapes, and valid pulse duration. A chunk marker outside `[0, chunk.length]` is a warning, not an error. Runtime resolution performs only a shallower structural check and filters disabled markers.
- **Serialization/persistence:** V1 export/import and local draft storage clone and JSON-round-trip the complete scene, including global/chunk markers and actions. Old scenes with no markers remain valid. The V1→V2 adapter does not convert markers to `sceneLogic`; it clones them into non-persisted `BackgroundV1CompatibilityState.markers` and records diagnostics. No non-test production caller of that adapter was found.
- **Authoring UI:** the legacy Pixel BGR V1 **Markers** tab selects either global or current chunk ownership and supports create, duplicate, delete, order, ID/X/enabled/once edits, ordered action editing, runtime reset, and manual fire. Direct editor mutations update a cloned V1 draft and, when valid, replace the active background scene; manual fire and reset use presentation globals consumed by the renderer.
- **Authored ID versus runtime ID:** global runtime identity is `global-marker:${marker.id}`; chunk identity is `chunk-marker:${chunk.id}:${marker.id}`. The runtime prefix/owner qualification is not persisted.
- **World-X resolution:** global `worldX = marker.x`; chunk `worldX = chunk.startX + marker.x`. Resolved markers sort by world X, owner/source order, then runtime ID.
- **Enabled semantics:** disabled markers are omitted during resolution and cannot cross or be manually found in the resolved set. It is an activation gate, not geometry visibility.
- **Crossing/fire semantics:** the first sample or a scene-key change establishes a baseline and fires nothing. Only forward crossings satisfying `previousX < marker.worldX && currentX >= marker.worldX` fire. Backward movement never fires. Manual fire bypasses crossing and once/re-arm memory.
- **Once and runtime memory:** `once: true` records the runtime ID in `firedOnce`; it cannot fire again until reset/scene change. `once: false` is armed when sampled left of the marker, fires on the next forward crossing, disarms, and rearms only after moving left of it. Runtime memory is renderer-owned (`sceneKey`, `previousScrollX`, two `Set`s), never persisted, and explicitly resets on background reset/fallback change or gameplay seek.
- **Runtime authority:** execution occurs in `WebGLSceneRenderer` while drawing an enabled V1 scene with the layer fallback. It samples player position but is render/presentation runtime, not the fixed-step gameplay loop, EventBus, or deterministic gameplay state.
- **Tests:** marker resolution/crossing/action/pulse/immutability, author helpers/validation/round-trip, V1 adapter preservation, and seek reset are covered by the inspected smokes.

### Classification and recommendation

**KEEP AS PRESENTATION-SPECIFIC — Option D, compatibility coexistence.** The shape resembles canonical Space + Trigger, but its actual purpose and all effects are bounded to legacy B5 background presentation. Destructive conversion (A) risks losing owner-local identity, manual-fire behavior, and presentation actions. A load adapter (B) would create hidden canonical objects alongside an active renderer path and invite double fire without providing equivalent actions. An explicit conversion command (C) still cannot preserve the effects. Coexistence (D) preserves round trips and behavior with the least UI/runtime risk; future removal requires a separately approved presentation automation replacement and browser verification.

## BackgroundMarkerAction

All four actions are interpreted only by `applyBackgroundMarkerActions`. They mutate `BackgroundPresentationOverrides`; they do not emit to the gameplay EventBus, write gameplay state, or execute through canonical `ActionRuntime`.

| Action | Owner and side effect | Time/determinism | Implemented canonical equivalent | Verdict |
| --- | --- | --- | --- | --- |
| `set-layer-enabled` | Sets renderer override `layerEnabled[layerRuntimeId]`; the override is applied to composed background layers | Immediate on a render-path fire; presentation state | None. Canonical Entity enable/disable is not implemented and a BGR layer is not a gameplay Entity | Presentation-specific; do not add a generic Action merely for this |
| `set-layer-opacity` | Clamps and sets sprite-layer opacity and cancels an active pulse | Immediate on a render-path fire; presentation state | None | Presentation-specific visual property |
| `pulse-layer-opacity` | Creates/replaces one pulse per layer; render frames advance `elapsedMs` by renderer `dt * 1000` and linearly interpolate opacity | Explicitly presentation-duration based, frame-step dependent, and not deterministic gameplay simulation | None; canonical duration concepts do not authorize wall-clock/render-time Actions | Presentation-specific; especially unsuitable for gameplay Scene Logic |
| `emit-environment-event` | Replaces `lastEnvironmentEvent` with a diagnostic record | Immediate presentation timestamp; no dispatch | None; despite its name, no semantic Event runtime or EventBus message is produced | Presentation/debug-specific |

Missing layer targets are recorded in `missingTargets`; they do not fail gameplay. Layer target IDs are already runtime-qualified (`global:<layer>` or `chunk:<chunk>:<layer>`) and validation warns when unavailable. Mutation is transient and resets with presentation overrides.

**KEEP AS PRESENTATION-SPECIFIC — Option D, compatibility coexistence.** Options A–C have high behavior-loss and double-authority risk because canonical Action V1 implements only `World.stop_scroll`, State set/increment/decrement, and `Flow.restart_level`. Coexistence retains exact target references and persistence. A future replacement should be a separately designed presentation automation domain, not generic gameplay Scene Logic leakage.

## BackgroundEnvironmentEvent

### Contract trace

- **Shape:** `{ name, markerRuntimeId, sceneId, worldX, presentationTimeMs }`.
- **Producer:** only `emit-environment-event` in `applyBackgroundMarkerActions`, using the renderer's accumulated presentation seconds converted to milliseconds.
- **Consumers:** the renderer copies the current value into `globalThis.__CM_BGR_MARKER_DEBUG__`; the B5 marker UI displays only its `name`. Tests inspect the override value. No gameplay, EventBus, canonical Event runtime, audio, or other production consumer was found.
- **Lifetime:** exactly one transient `lastEnvironmentEvent`; a later event overwrites it, and presentation reset clears it. It is neither queued nor persisted.
- **Authority:** background render state plus telemetry/debug display. It has no gameplay meaning or delivery guarantee.

**KEEP AS PRESENTATION-SPECIFIC — Option D, compatibility coexistence.** Mapping it to a canonical Scene Event would incorrectly turn a last-value renderer diagnostic into semantic runtime authority. Options A–C would change lifetime and delivery semantics and risk duplicate reporting. Retain it with the B5 compatibility path; it may be retired only together with that path after its debugging value is replaced or declared unnecessary.

## BackgroundSceneEvent.signal

### Contract trace

- **Schema/validation:** scene-global V2 union member `{ id, type: "signal", worldX, enabled, name, locked? }`. IDs are unique within legacy `events[]`; world X is finite/non-negative; name is required/non-empty; `locked`, when present, is boolean; unknown fields are rejected.
- **Persistence:** V2 serialization structurally clones the scene, validates it, and round-trips `events[]` unchanged alongside optional `sceneLogic`. Parsing injects no canonical objects and performs no reinterpretation.
- **Authoring/timeline:** **EVE** creates signals at player X snapped to 16 world units, assigns collision-free legacy IDs (`event`, `event-2`, ...), and supports enabled toggle, rename, lock, duplicate, delete, and drag. Timeline ordering is a derived world-X/ID sort; ordinal numbers are presentation-only.
- **Runtime:** no evaluator or dispatch call site was found. It executes through serialization and direct UI replacement of the active V2 scene only. V2 background evaluation/rendering does not consume it, and it is not a gameplay EventBus event.

### Exact candidate mapping

An explicit conversion of legacy signal `L` should create:

```text
Marker:  { id: allocate(`${L.id}:marker`, Space IDs), position: L.worldX }
Trigger: { id: allocate(`${L.id}:trigger`, Trigger IDs), kind: "space",
           relation: "cross", markerId: <generated Marker ID>,
           mode: "once", enabled: L.enabled }
Event:   { id: allocate(`${L.id}:event`, Event IDs), category: "scene",
           type: L.name }
Binding: { triggerId: <generated Trigger ID>, eventId: <generated Event ID> }
```

- The legacy ID should **seed all three generated IDs**, not become only one of them. Reusing it verbatim for one concept would imply that the legacy combined object primarily owned geometry, activation, or meaning; it owned all three. Qualified suffixes make the split reviewable and references explicit.
- `allocate(stem, collectionIds)` means use `stem` if absent, otherwise the first free `${stem}-2`, `${stem}-3`, and so on. Space collision checks span Marker/Range/Zone; Trigger and Event checks use their own canonical namespaces. The conversion must allocate in persisted legacy order against both pre-existing and earlier-generated IDs, then validate the whole document atomically.
- `enabled` maps to `Trigger.enabled`. Marker has no enabled field; Event meaning is not disabled.
- `locked` does **not** map into canonical logic. It is authoring metadata controlling whether the source may be edited. The conversion command must refuse a locked source (or require explicit unlock); after successful conversion, no lock is fabricated on canonical definitions because their schema has none.
- `signal.name` is the canonical `SceneEventDefinition.type`, not an extra payload. The implemented canonical Event has only `id`, `category`, and `type`; inventing a payload would violate strict persistence. This mapping preserves the authored semantic string without pretending that literal `"signal"` is the meaning.
- No Action binding is required. Canonical Events may exist without consequences, and inventing one would change behavior.
- Migration must not load-adapt or silently reinterpret `events[]`. The proposed author command should preview and atomically add the canonical graph, then remove only the selected legacy source in the saved result after explicit confirmation. Cancel/failure leaves it unchanged. Retaining both active representations after canonical runtime integration would risk double fire; removing before explicit success would risk data loss.

### Options and recommendation

- **A — destructive conversion:** low long-term UI complexity but unacceptable implicit data-loss/round-trip risk and no author review of generated IDs.
- **B — load-time adapter:** preserves old files but creates hidden canonical authority, unstable collision outcomes when the authored document changes, ambiguous round trips, and eventual double fire.
- **C — explicit one-time author migration:** visible deterministic IDs, atomic validation, author-controlled source removal, straightforward backward compatibility, and a clear removal path. It adds a bounded command/preview but no permanent second runtime authority.
- **D — coexistence:** safe today, but indefinite EVE/LOGIC duplication leaves authoring ambiguity and becomes a double-fire risk once canonical runtime wiring exists.

**MIGRATE — Option C, explicit one-time author migration.** SL-12A now implements the focused authoring command for one selected unlocked signal. It builds and validates the complete canonical graph atomically, removes only that source signal on success, and leaves runtime evaluation unchanged. Browser/runtime verification remains a post-merge gate.

## BackgroundSceneEvent.level-end

### Contract trace

- **Schema/validation:** `{ id, type: "level-end", worldX, enabled, name?, locked? }`; at most one level-end exists scene-wide, including disabled entries. The UI create path omits `name`; generic persisted validation permits it, while the edit helper rejects a name patch by producing an invalid union/edit result.
- **Persistence/UI/timeline:** it follows the same unchanged V2 round trip and EVE timeline as signal. EVE creates it at snapped player X, toggles enabled, locks/unlocks, drags, and deletes it; duplication is forbidden.
- **Runtime usage:** `getV2LevelEndWorldX` returns the enabled level-end X, but its only call site is its smoke test. No renderer, fixed-step system, flow owner, EventBus route, or completion side effect consumes `level-end`.

### Candidate boundary and blocker

Geometry and activation could become a canonical Marker and once/cross Trigger with `enabled` mapped to the Trigger. Semantic meaning could be a `SceneEventDefinition` such as `level_completed`, but an exact choice between scene and level completion is not established by current behavior because current behavior completes neither. More importantly, implemented canonical Flow Actions include only `restart_level`; `complete_scene` and `complete_level` are conceptual target candidates, not implemented contracts. No authoritative completion owner/adapter was verified in this audit.

`locked` remains source authoring metadata and cannot enter strict canonical definitions. Legacy ID allocation could follow the signal strategy only after the semantic Event type and Action are approved.

### Options and recommendation

- **A:** destructive conversion would falsely claim completion semantics and can remove the only authored boundary before an executor exists.
- **B:** a load adapter would fabricate an incomplete graph and make round trips/authority opaque.
- **C:** an author command cannot yet present an honest complete mapping; creating only Marker/Trigger/Event would preserve inertness but misleadingly imply migration completeness.
- **D:** retains exact ID, boundary, enabled, lock, uniqueness, and round-trip behavior without double fire while the authoritative flow contract is established.

**ADAPT — Option D, compatibility coexistence pending flow authority.** Do not remove or reinterpret it. A future adapter/conversion requires an approved semantic type, implemented `complete_level` or `complete_scene` Action, a verified authoritative flow owner, fixed-step routing, and runtime evidence.

## Dual-authority analysis

Current authoring surfaces are:

1. **SPACE** — the only canonical geometry surface, editing `scene.sceneLogic.spaces` Marker/Range/Zone.
2. **LOGIC** — the only generic canonical logic surface, editing `scene.sceneLogic` Trigger/Event/Action/State references and Trigger→Event/Event→Action bindings. Authored logic remains runtime-inert; standalone runtime primitives exist but no production composition call site wires the scene document to the game loop.
3. **EVE** — the legacy V2 `scene.events[]` compatibility surface. It combines world X, activation, and event label/type and is independent from/bindable to neither SPACE nor LOGIC.
4. **Legacy B5 Markers tab** — available for V1 background scenes, not a V2 contents row. It authors presentation markers/actions and exposes presentation debug/manual-fire controls.

Therefore the exact verdict is:

```text
one generic Scene Logic system
+ presentation-specific compatibility systems
+ one legacy V2 event compatibility surface
```

There are not two generic systems today because EVE has no generic Trigger/Action relationships or runtime evaluator, and B5 markers target background presentation only. A future migration must nevertheless prevent EVE and generated canonical graphs from both becoming active runtime authority.

## Persistence and ID strategy

- Preserve current independent `events[]` and `sceneLogic` round trips until an explicit migration command succeeds. Parsing must never inject, delete, or reinterpret either contract.
- Use qualified generated stems derived from each legacy ID, with deterministic first-free numeric suffix allocation in the relevant canonical namespace. Never use array ordinal or world X as identity.
- Allocate all definitions/bindings in memory, validate the full V2 scene, and commit atomically. On collision, validation failure, lock, or cancellation, preserve the exact source scene.
- A successful signal conversion removes the selected legacy signal only as part of the same explicit author transaction. Export/reimport then contains the canonical graph, not both representations.
- Do not persist runtime marker memory, presentation overrides, environment diagnostics, derived ordinals, or generated runtime IDs.
- A level-end remains in legacy `events[]` until completion ownership is resolved; no partial conversion marker should claim it has migrated.

## Runtime-risk analysis

| Risk | Evidence and control |
| --- | --- |
| Presentation described as gameplay determinism | B5 crossing/actions run in `WebGLSceneRenderer`; pulse uses render `dt`. Documentation and future tests must keep this boundary explicit. |
| Double fire | A silent adapter or coexistence of active EVE and canonical graphs could activate one boundary twice. Use explicit atomic source replacement, and do not runtime-enable conversion output before an integration gate. |
| Seek/reset drift | B5 has explicit renderer reset and baseline-without-retro-fire semantics. Any future canonical runtime migration needs fixed-step seek/reset tests rather than copying renderer memory implicitly. |
| ID/reference breakage | Owner-local legacy IDs are not canonical global Space identity. Qualified deterministic allocation plus whole-document validation is required. |
| Locked metadata loss | Locked is persisted UI state only. Refuse conversion while locked rather than smuggling it into strict canonical runtime schemas. |
| Unsupported Actions | Layer state/opacity/pulse are presentation contracts; level completion lacks an implemented Action. Do not broaden canonical Action simply to close an audit row. |
| EventBus duplication | Neither legacy environment events nor V2 events use EventBus. Future gameplay-semantic dispatch must use an explicit adapter into the existing phase-owned bus, never another queue. |
| Shadow State | None of these migrations requires a State record. Do not introduce one to remember migration, pulse progress, or fired status. |
| Round-trip surprise | Load-time materialization would not serialize symmetrically. Keep old data unchanged or perform an explicit persisted conversion. |

## Recommended migration sequence

1. **SL-12A — signal author-migration command (implemented; runtime gate pending).** Scope: one selected unlocked `BackgroundSceneEvent.signal`; exact mapping and allocator specified above; confirmation plus atomic validation/removal. Runtime evaluation, EventBus, Actions, level-end, B5 markers, and bulk migration remain excluded. Focused static coverage proves collision allocation, lock refusal, rollback, round trip, and explicit-only UI routing. The post-merge runtime gate must verify cancel/commit and the resulting EVE/SPACE/LOGIC state in Scene Lab.
2. **SL-12B — authoritative completion contract discovery/design.** Scope: trace and approve the actual scene/level completion owner, semantic Event type, Action name, phase, reset/seek behavior, and adapter. Exact legacy contract: `BackgroundSceneEvent.level-end`. Exclude schema/runtime implementation and B5. Static gate: architecture decision cross-checked against EventBus/flow code. Runtime gate: none for design; a later implementation batch must require fixed-step and browser/gameplay verification.
3. **SL-12C — level-end adapter/migration (blocked on SL-12B and Action implementation).** Scope: one explicit level-end conversion using the approved Marker → cross Trigger → Event → completion Action mapping. Exclude restart semantics, presentation actions, and bulk migration. Static gate: atomic ID/reference/persistence tests. Runtime gate: fixed-step crossing causes exactly one authoritative completion, including seek/reset/disabled cases.
4. **No B5 migration batch is recommended.** Keep marker, marker actions, and environment diagnostic together as one presentation-specific compatibility subsystem. Consider retirement only after a separately approved presentation replacement exists and visual equivalence is verified.

## Explicit non-goals

- No automatic adapter, runtime compatibility removal, schema edit, or Scene Lab redesign. The later SL-12A batch added only the explicitly approved signal authoring migration.
- No runtime enablement of V2 `events[]` or authored `sceneLogic`.
- No new EventBus, event type, Action, flow behavior, State database, or renderer behavior.
- No conversion of B5 presentation effects into generic gameplay Actions.
- No claim that conceptual `complete_scene`/`complete_level` operations are implemented.
- No merge, deployment, generator, build, or runtime/visual test.

## Decision gate

**READY FOR MIGRATION IMPLEMENTATION: NO**

The authoring-only SL-12A signal mapping is implemented, with its post-merge runtime gate still required. The overall legacy migration gate remains **NO** because `level-end` lacks a verified authoritative completion owner and an implemented canonical completion Action, and because canonical scene-document runtime composition has no production fixed-step integration call site. B5 remains intentionally presentation-specific rather than a migration blocker.

Blockers/unknowns are therefore explicit:

1. whether the legacy name `level-end` means `level_completed` or `scene_completed` in authoritative gameplay flow;
2. which current/future owner performs that completion and in which fixed-step phase;
3. the approved and implemented completion Action/adapter contract;
4. runtime integration evidence proving exactly-once behavior without EVE/canonical double authority.
