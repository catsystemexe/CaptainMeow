# SL-12B Completion Contract Audit

## Baseline

- Repository: `catsystemexe/CaptainMeow`; `origin` was confirmed as the fetch and push remote.
- Approved integration branch: `pixel_bgr`.
- Expected base SHA: `52537026bfe5110828c0bf066c791a4cb9a65a46`.
- Actual supplied HEAD and remote `refs/heads/pixel_bgr`: `52537026bfe5110828c0bf066c791a4cb9a65a46`.
- The supplied checkout was clean and exposed the approved snapshot as local branch `work`. Under the repository branch-selector rule, the exact clean SHA plus the matching remote ref verified the baseline.
- Audit branch: `codex/sl-12b-completion-contract-audit`.
- Scope is documentation-only discovery/design. No Action, schema, migration, composition, EventBus, UI, or other source behavior is implemented here. No browser/game runtime verification was performed.

## Sources inspected

Implementation was treated as highest authority. The audit inspected:

- canonical Scene Logic definitions and standalone runtime primitives: `src/game/scene-logic/Action.ts`, `ActionRuntime.ts`, `Event.ts`, `EventRuntime.ts`, `Trigger.ts`, `TriggerRuntime.ts`, `StateRuntime.ts`, and `SceneLogicDocument.ts`;
- legacy type, validation, serialization, authoring, migration, timeline, and consumer evidence: `src/render/bg/v2/BackgroundV2Types.ts`, `BackgroundV2Validation.ts`, `BackgroundV2Serialization.ts`, `BackgroundV2Evaluator.ts`, `src/render/BackgroundState.ts`, `src/ui/PixelBgrV2SceneEvents.ts`, `SceneLogicLegacyMigration.ts`, `PixelBgrLabUI.ts`, and adjacent smoke files;
- gameplay lifecycle and deterministic routing: `src/game/boot/createGame.ts`, `src/game/data/SessionState.ts`, `WorldState.ts`, `src/game/systems/FlowSystem.ts`, `FlowDispatcher.ts`, `GameOverSystem.ts`, `RespawnSystem.ts`, `DirectorPhaseSystem.ts`, `DirectorSystem.ts`, `src/game/authoring/GameplaySeek.ts`, `src/engine/core/Loop.ts`, `events.ts`, `EventOwnershipMap.ts`, and `src/main.ts`;
- scene/background selection evidence: `src/ui/SceneLabSceneCatalog.ts`, `SceneLabLastScene.ts`, and `src/render/BackgroundState.ts`;
- canonical documentation: `SCENE_LOGIC_MODEL_V1.md`, `SCENE_LOGIC_MIGRATION_CONTRACT.md`, `SL12_LEGACY_COMPATIBILITY_AUDIT.md`, `SCENE_LOGIC_ROADMAP.md`, `SCENE_LOGIC_PERSISTENCE_V1.md`, and relevant project state, architecture, decisions, workflow, and backlog sections.

Repository-wide symbol and text searches covered restart/reset, game-over, victory/win, completion, level/scene, wave/session, transitions, and the exact legacy/helper/Action names. Backup and historical artifacts were excluded as authorities.

## Executive verdict

**Recommend Option D: neither `Flow.complete_level` nor `Flow.complete_scene` can honestly be implemented yet.** The historical label `level-end` proves only that an author can persist one inert world-X boundary per background Scene. It does not prove a Level domain, a Scene gameplay lifecycle, a completion transition, a next target, or save/progression behavior.

The closest implemented lifecycle authority is the game composition in `createGame`: it owns stable gameplay/session objects and a broad soft-reset closure. That closure is exposed as `game.reset()` and used by the HUD's “play again” path, but it is not a demonstrated level owner and does not even reset every value one would expect from a defined level restart (for example, world scroll and loop tick are not reset). [`createGame.ts` lines 451–528](../../src/game/boot/createGame.ts#L451-L528) [`createGame.ts` lines 624–640](../../src/game/boot/createGame.ts#L624-L640) [`main.ts` lines 171–175](../../src/main.ts#L171-L175)

Consequently:

- Action **ownership** should eventually reside in a single authoritative gameplay-flow owner adjacent to the current composition/session reset authority, not in rendering, the background state holder, Scene Lab, or Scene Logic itself.
- Scene Logic **document runtime integration** remains absent. Standalone Trigger/Event/Action primitives are not a production evaluator or composition call site.
- A future gameplay completion consequence must execute deterministically at the fixed-tick **Flow phase boundary**, after the crossing has been sampled from authoritative simulation position and before Audio/Cleanup. This phase decision does not create the missing lifecycle owner or authorize an Action type.
- No existing EventBus completion event exists. Do not add EventBus coupling merely to compensate for the absent owner.
- Both completion Action implementation and level-end migration are blocked.

## Current runtime lifecycle map

### Implemented game/session failure and restart path

`SessionState` contains tick/time, score, lives, wave, `gameOver`, and last-death position—no completion, current level, current scene, next level, victory, or progression field. [`SessionState.ts` lines 2–23](../../src/game/data/SessionState.ts#L2-L23)

Player death/lives can set `session.gameOver`; gameplay phase callbacks then guard on that flag. The HUD reads the same stable session object, and “play again” calls `game.reset()` before returning to play. [`RespawnSystem.ts` lines 41–70](../../src/game/systems/RespawnSystem.ts#L41-L70) [`createGame.ts` lines 539–550](../../src/game/boot/createGame.ts#L539-L550) [`main.ts` lines 171–180](../../src/main.ts#L171-L180)

The production reset closure clears non-player entities and transient registries, repairs the same player object, resets session score/lives/wave/game-over state, resets respawn state, and resets the Director. This is an implemented whole-game/session soft reset assembled by `createGame`, not an independently modeled Level transition. [`createGame.ts` lines 459–528](../../src/game/boot/createGame.ts#L459-L528)

No victory/win/completion state or transition was found. `GameOverSystem` can also derive game over from a killed-player Flow event, but it is not included in the production `FlowDispatcher` listener list; production respawn/lives logic directly owns the observed game-over mutation. [`GameOverSystem.ts` lines 6–20](../../src/game/systems/GameOverSystem.ts#L6-L20) [`createGame.ts` lines 174–199](../../src/game/boot/createGame.ts#L174-L199)

### Implemented wave progression

The Director owns definitions and mutable runtimes for waves, evaluates time/distance/after-wave conditions, emits spawn intent, and supports reset/DEV force-loop behavior. The composition mirrors Director HUD information into `session.wave`; it does not interpret “all waves complete” as Scene or Level completion. [`DirectorSystem.ts` lines 82–139](../../src/game/systems/DirectorSystem.ts#L82-L139) [`DirectorSystem.ts` lines 230–325](../../src/game/systems/DirectorSystem.ts#L230-L325) [`createGame.ts` lines 539–545](../../src/game/boot/createGame.ts#L539-L545)

Waves are therefore the closest implemented gameplay progression concept, but they are spawn schedules/counters rather than a Level lifecycle. Their existence cannot define what should follow a level-end boundary.

### Background Scene selection

`BackgroundState` can hold one V1 or V2 background Scene, publish it to listeners, and request presentation-marker reset when replaced. This is implemented background/presentation selection, not a gameplay Scene lifecycle: it has no start/complete/advance contract and does not own session state. [`BackgroundState.ts` lines 41–80](../../src/render/BackgroundState.ts#L41-L80)

Scene Lab has a catalog of background fixture factories and remembers a selected catalog ID. Those facilities load authoring/display content; they do not compose Scenes into a gameplay Level or advance gameplay. [`SceneLabSceneCatalog.ts` lines 7–16](../../src/ui/SceneLabSceneCatalog.ts#L7-L16) [`SceneLabLastScene.ts` lines 4–29](../../src/ui/SceneLabLastScene.ts#L4-L29)

### Deterministic lifecycle boundary

The engine runs a 60 Hz fixed tick in Input → Director → Simulation → Collision → Impact → Flow → Audio → Cleanup order. [`Loop.ts` lines 28–32](../../src/engine/core/Loop.ts#L28-L32) [`Loop.ts` lines 107–125](../../src/engine/core/Loop.ts#L107-L125) Production gameplay flow currently drains Flow-owned EventBus messages and dispatches them to score/respawn/loot/powerup listeners. [`FlowSystem.ts` lines 6–11](../../src/game/systems/FlowSystem.ts#L6-L11) [`FlowDispatcher.ts` lines 10–33](../../src/game/systems/FlowDispatcher.ts#L10-L33)

## restart_level authority

`Flow.restart_level` is an implemented strict Action definition and standalone executor. Its adapter accepts any injected object with `restartLevel()`, and execution delegates exactly once. It deliberately does not identify a production owner. [`Action.ts` lines 34–47](../../src/game/scene-logic/Action.ts#L34-L47) [`ActionRuntime.ts` lines 16–20](../../src/game/scene-logic/ActionRuntime.ts#L16-L20) [`ActionRuntime.ts` lines 81–83](../../src/game/scene-logic/ActionRuntime.ts#L81-L83)

Repository search found no production call to `createFlowActionRuntimeAdapter`, `executeFlowAction`, `materializeSceneEvent`, or Trigger evaluators. The persistence validator accepts `restart_level`, but persistence explicitly adds no runtime evaluation or wiring. [`SceneLogicDocument.ts` lines 159–168](../../src/game/scene-logic/SceneLogicDocument.ts#L159-L168) [`SCENE_LOGIC_PERSISTENCE_V1.md` lines 56–66](SCENE_LOGIC_PERSISTENCE_V1.md#L56-L66)

The only plausible existing production operation to inject after a deliberate contract change is the `createGame` soft-reset closure. It is **not currently safe to call that `restartLevel`** because its observed semantics are “reset most of the active game/session in place,” not a defined current-Level reload:

- it clears gameplay entities and transient effects;
- resets player, session, respawn, and Director;
- preserves stable player/session/world/runtime references;
- does not select or reload a Scene;
- does not reset `world.scrollX`, `world.scrollY`, or `world.speedX`;
- does not reset the private Loop tick/accumulator;
- has no Scene Logic runtime state to reset because no composed runtime exists.

Thus `restart_level` is presently a tested standalone primitive with an unresolved production semantic mapping. A future flow owner may wrap/refine `resetGame`, but the Action adapter must not be injected directly until the owner contract states the full reset boundary.

## Legacy level-end contract

The exact legacy type is `{ id, type: "level-end", worldX, enabled, name?, locked? }`. It lives in `BackgroundSceneV2.events[]`, alongside but independent from optional `sceneLogic`. [`BackgroundV2Types.ts` lines 83–97](../../src/render/bg/v2/BackgroundV2Types.ts#L83-L97)

Verified behavior is limited to persistence and authoring:

- **Persistence:** V2 serialization validates and structured-clones the complete Scene; parsing validates without adapting legacy events into Scene Logic. Events therefore round-trip as authored. [`BackgroundV2Serialization.ts` lines 70–104](../../src/render/bg/v2/BackgroundV2Serialization.ts#L70-L104)
- **Validation/uniqueness:** ID is required and unique among all legacy Scene events; `worldX` is finite/non-negative; `enabled` is boolean; `locked` and `name` are optional with their declared primitive types; at most one level-end exists Scene-wide, whether enabled or disabled. [`BackgroundV2Validation.ts` lines 96–117](../../src/render/bg/v2/BackgroundV2Validation.ts#L96-L117)
- **Authoring:** creation snaps player world X, creates an enabled item with a `level-end`-derived unique ID, and rejects a second level-end. It can be moved, enabled/disabled, locked/unlocked, or deleted; duplication is forbidden. Locked items reject edits other than lock and enabled. [`PixelBgrV2SceneEvents.ts` lines 33–70](../../src/ui/PixelBgrV2SceneEvents.ts#L33-L70)
- **Name:** `name` is incidental compatibility metadata for level-end. Creation omits it, validation does not require it, and no runtime meaning is derived from it. Signal alone requires a meaningful non-empty name. [`BackgroundV2Validation.ts` lines 105–114](../../src/render/bg/v2/BackgroundV2Validation.ts#L105-L114)
- **Helper:** `getV2LevelEndWorldX()` returns the first enabled boundary's X. Its only consumer is `BackgroundV2Events.smoke.ts`; no production caller exists. [`PixelBgrV2SceneEvents.ts` lines 74–80](../../src/ui/PixelBgrV2SceneEvents.ts#L74-L80)
- **Runtime:** neither the V2 evaluator/renderer nor the fixed-step game loop consumes `events[]`. No crossing, semantic occurrence, completion, transition, or state change is executed. Current behavior is completely runtime-inert.

**The historical name `level-end` is only a legacy label, not enough authority to define `Flow.complete_level`.** It gives useful author intent (“a unique end-like boundary”) but no implemented lifecycle semantics. Treating the label as stronger evidence than runtime behavior would invent the missing Level domain.

## Scene vs Level implementation status

| Domain/owner | Status | Exact evidence and conclusion |
| --- | --- | --- |
| Scene runtime owner | **CONCEPTUAL ONLY** | Canonical docs define Scene as an authored context, while `BackgroundSceneV2` persists render content and Scene Logic. No gameplay start/complete/advance owner or composed Scene Logic evaluator exists. The active background state holder is presentation selection, not gameplay lifecycle. [`SCENE_LOGIC_MODEL_V1.md` lines 90–99](SCENE_LOGIC_MODEL_V1.md#L90-L99) [`BackgroundState.ts` lines 46–67](../../src/render/BackgroundState.ts#L46-L67) |
| Level runtime owner | **ABSENT** | No Level object, Level ID/state, Scene list, load/advance transition, completion flag, or completion owner was found. `WorldState.worldW` is effectively unbounded and is not a Level model. [`WorldState.ts` lines 3–31](../../src/game/data/WorldState.ts#L3-L31) |
| Session/game owner | **PARTIAL** | `createGame` composes the stable session/world/systems and owns a broad soft reset; session owns game-over/lives/score/wave. It has failure/restart behavior but no victory/completion/progression lifecycle. [`createGame.ts` lines 60–72](../../src/game/boot/createGame.ts#L60-L72) [`createGame.ts` lines 451–528](../../src/game/boot/createGame.ts#L451-L528) [`SessionState.ts` lines 2–23](../../src/game/data/SessionState.ts#L2-L23) |
| Wave/progression owner | **IMPLEMENTED** | `DirectorSystem` owns wave runtimes, triggering, spawn scheduling, reset, and DEV force behavior. It does not own Level/Scene completion. [`DirectorSystem.ts` lines 82–139](../../src/game/systems/DirectorSystem.ts#L82-L139) [`DirectorSystem.ts` lines 230–325](../../src/game/systems/DirectorSystem.ts#L230-L325) |
| Background scene owner | **IMPLEMENTED** | `BackgroundState` selects/publishes one typed background Scene and resets presentation marker memory when it changes. It is a rendering/authoring owner only. [`BackgroundState.ts` lines 41–80](../../src/render/BackgroundState.ts#L41-L80) |

The canonical statement “A Level may compose one or more Scenes” is target architecture, not implemented repository truth. [`SCENE_LOGIC_MODEL_V1.md` lines 94–99](SCENE_LOGIC_MODEL_V1.md#L94-L99)

## Candidate completion Actions

### Option A — `Flow.complete_level`

- **Accuracy/compatibility:** superficially matches the legacy spelling, but no implemented Level exists and legacy behavior completes nothing.
- **Owner/progression:** no owner, next Level, terminal victory, or “return to title” decision exists.
- **Restart/save:** current reset cannot be assumed to reload the completed Level; no completion save/checkpoint policy exists.
- **Editor/Sequence:** would give the editor and future Sequences a false promise of meaningful Level completion.
- **Risk:** highest risk of turning a historical label into architecture.

### Option B — `Flow.complete_scene`

- **Accuracy/compatibility:** matches the fact that the marker is stored within one background Scene, but that Scene has no gameplay lifecycle and may not equal a gameplay Scene.
- **Owner/progression:** background selection can replace a Scene but cannot authoritatively end or advance gameplay.
- **Restart/save:** scene reload/reset behavior is undefined.
- **Editor/Sequence:** future sequences might legitimately complete a Scene, but implementing that operation now would still invent its consequence.
- **Risk:** substitutes storage containment for lifecycle authority.

### Option C — both eventually, legacy maps to one

The target vocabulary may eventually need both. Their distinct meanings require an implemented Level→Scenes relationship and transition policy first. Selecting either mapping now has the same unsupported assumptions as A or B and would make future Sequence behavior ambiguous.

### Option D — neither yet

This preserves semantic honesty and the legacy round trip while the actual flow domain is established. It is compatible with later A, B, or both, avoids shadow completion state, and does not force save/load or Sequence policy prematurely.

**Recommendation: Option D.** This is a decision to establish the lifecycle owner before adding a completion Action, not a recommendation to leave completion undefined indefinitely.

## Recommended canonical completion contract

No canonical completion Action or exact completion Event type is approved by this audit. The minimum owner contract that must be decided first is:

1. define gameplay `Scene` and/or `Level` identity and their containment relationship;
2. define whether crossing this legacy boundary completes a Scene, completes a Level, or requests a terminal game victory;
3. identify one authoritative gameplay-flow owner and its state machine (for example `active → completed → transitioning`), including idempotent duplicate-call behavior;
4. define the consequence: pause/continue simulation, stop scrolling, drain entities, play a sequence, load another Scene/Level, show victory UI, or a specified combination owned by explicit systems;
5. define restart, reload, checkpoint, and save/progression behavior;
6. only then add exactly the matching `Flow.complete_scene` or `Flow.complete_level` definition and adapter method.

Scene Logic must invoke that owner. It must not hold a parallel `completed` flag, infer progression from background content, directly mutate the UI, or implement a transition itself.

## Runtime phase / owner

### Action ownership

The future authoritative owner belongs in the gameplay composition/flow layer adjacent to the current session/reset authority. It should be injected into a Flow Action adapter. The renderer, `BackgroundState`, Scene Lab UI, and Scene Logic document are explicitly unsuitable owners because they are presentation, authoring, or declarative data surfaces.

### Deterministic phase

The exact required execution boundary is the existing fixed-tick **Flow phase**:

```text
Simulation updates authoritative player/world position
→ Scene Logic crossing/event integration (same fixed tick, before Flow)
→ Flow phase invokes the authoritative completion owner once
→ Audio
→ Cleanup
```

This preserves 60 Hz determinism and puts a flow transition beside existing Flow-owned state changes. The current ownership map already assigns state-changing damage/kill/pickup consequences to Flow, while the Loop guarantees Flow follows Simulation/Collision/Impact. [`EventOwnershipMap.ts` lines 15–29](../../src/engine/core/EventOwnershipMap.ts#L15-L29) [`Loop.ts` lines 114–123](../../src/engine/core/Loop.ts#L114-L123)

The post-Simulation Scene Logic integration point is still unimplemented and must be designed without moving the established phase order. “Post-trigger Scene Logic phase” must not become a ninth phase or private queue. If Trigger evaluation is hosted during Simulation, any EventBus message destined for Flow may use supported same-tick forward routing. If integration is hosted later than Flow, it must defer through supported next-tick routing instead of routing backward.

This phase conclusion identifies **where** a future consequence executes; it does not resolve **what** completion means or **who** owns it.

## EventBus relationship

Recommendation for the first future completion Action: **call the authoritative flow owner directly through the injected Action adapter while executing at the Flow boundary. Do not emit an EventBus event as well.** Calling and emitting would introduce two paths to the same transition and risk double authority.

Current facts:

- the one gameplay EventBus is created in `createGame`, supplied the static ownership map, and driven by `Loop`; [`createGame.ts` lines 51–59](../../src/game/boot/createGame.ts#L51-L59)
- `CMEventMap` and `CM_EVENT_OWNERSHIP` contain no Scene/Level completion event; [`events.ts` lines 5–46](../../src/engine/core/events.ts#L5-L46) [`EventOwnershipMap.ts` lines 5–30](../../src/engine/core/EventOwnershipMap.ts#L5-L30)
- `SceneEventRuntimeAdapter` intentionally defines only an external dispatch boundary, not a queue, phase, history, or execution policy. [`EventRuntime.ts` lines 5–18](../../src/game/scene-logic/EventRuntime.ts#L5-L18)

Not every semantic Scene Event must become an EventBus message. The composed Scene Logic runtime may materialize its semantic Event and resolve its bound Action within the fixed-tick integration, then hand that Action to the Flow executor. A **new Flow-owned EventBus event may be justified later** only if the future flow owner is demonstrably an existing/new Flow subscriber that must receive requests through the bus. In that case, its event type, Flow ownership, subscriber, same-/next-tick routing, and single transition path must be specified together. There is no evidence for such coupling today.

## Reset / seek / exactly-once semantics

These are required semantics for the eventual migrated crossing, conditional on first resolving the blocked completion domain:

### Crossing and once behavior

- Use a Marker cross Trigger with `mode: "once"`.
- Crossing remains forward-only: `previousX < marker.position && currentX >= marker.position`; the first sample establishes a baseline and emits nothing. [`TriggerRuntime.ts` lines 174–198](../../src/game/scene-logic/TriggerRuntime.ts#L174-L198)
- `legacy.enabled` maps exactly to `Trigger.enabled`; geometry and semantic definitions remain present when disabled.
- The Trigger's once memory prevents normal duplicate occurrences within one runtime activation.
- The authoritative completion operation must **also be idempotent per active Scene/Level identity**. Trigger memory cannot protect against multiple bindings, repeated requests, restored runtime state, or other completion sources. A duplicate completion request must return/no-op without a second transition, reward, save, or load.

### Backward seek

- Backward movement/seek must not rearm a once Trigger and must never “uncomplete” authoritative flow state.
- Ordinary runtime backward movement leaves both once memory and completed lifecycle state unchanged.
- Re-arming requires an explicit runtime activation reset tied to restart/reload of the same owning Scene/Level—not merely crossing left of the marker.

### `restart_level`

- If the chosen semantic owner is a Level, a successful authoritative `restart_level` must clear that Level activation's completion/idempotency state and all Scene Logic runtime Trigger memory, then establish fresh baselines before play resumes.
- If the eventual mapping is Scene completion, the contract must separately decide whether `restart_level` reloads all composed Scenes; this is currently a blocker, not permission to infer it.
- The existing `game.reset()` and standalone `restart_level` adapter do not yet satisfy this rule because neither is connected to Scene Logic runtime state.

### Scene reload

- Loading/reloading a Scene creates a new Scene Logic runtime activation: discard old Trigger/Event/Action execution memory and baseline from the new authoritative position.
- Whether a Scene reload clears Level completion depends on the missing containment/progression contract. It must not be guessed from background replacement.
- Runtime completion/idempotency state is never persisted inside `SceneLogicDocumentV1`; strict persistence explicitly excludes Trigger memory and Action execution state. [`SCENE_LOGIC_PERSISTENCE_V1.md` lines 56–62](SCENE_LOGIC_PERSISTENCE_V1.md#L56-L62)

### Authoring seek

- DEV/Scene Lab seeks must never execute gameplay completion. `seekGameplayToPlayerX` pauses, teleports, clears transients, and optionally restores pause, but is not a simulation tick or flow transition. [`GameplaySeek.ts` lines 65–88](../../src/game/authoring/GameplaySeek.ts#L65-L88)
- A seek must explicitly reset/rebaseline Scene Logic crossing runtime before gameplay resumes, so neither forward teleport nor the first resumed sample synthesizes completion.
- Preview/render timeline motion must remain presentation-only.

### Disabled source

- `legacy enabled: false` → generated Trigger `enabled: false`.
- Disabled samples should still advance the crossing baseline, matching the implemented Trigger primitive, so enabling cannot retroactively fire a crossing made while disabled. [`TriggerRuntime.ts` lines 174–191](../../src/game/scene-logic/TriggerRuntime.ts#L174-L191)

## Future migration graph

Authority is insufficient to define the **exact** graph. The required structural shape, once the lifecycle decision exists, is:

```text
Marker Space at legacy worldX
→ enabled once/cross Trigger
→ Scene Event describing the approved semantic occurrence
→ Flow Action invoking the approved completion owner
```

Decidable fields now:

- Marker position = `source.worldX`.
- Trigger kind/relation/mode = `space` / `cross` / `once`.
- Trigger `enabled` = `source.enabled`.
- `locked` remains legacy authoring metadata only; strict canonical definitions have no lock field. A locked source must not be migrated until explicitly unlocked, matching the SL-12A command safety rule.
- Allocate deterministic first-free IDs in each namespace from qualified stems derived from the legacy source ID; do not use world X or array ordinal.
- Add one Trigger/Event binding and one Event/Action binding.
- Validate the candidate Scene Logic document and full V2 Scene atomically.
- On success, remove the legacy source in the same explicit author transaction; on cancel/failure preserve it exactly.
- The legacy uniqueness rule (at most one level-end in `events[]`) does not automatically impose global uniqueness on generic canonical Events/Actions. The authoritative flow owner supplies idempotency; the migration command must refuse a second recognized generated completion chain unless a later contract explicitly supports it.

Undecidable fields, intentionally not named by this audit:

- Event `type` (`level_completed`, `scene_completed`, or another approved semantic type);
- Action `type` (`complete_level` versus `complete_scene`);
- the precise generated Event/Action ID stems containing that semantic name;
- completion owner identity/state machine and transition payload (the current Event/Action schemas have no payload);
- whether canonical completion is unique per Scene, per Level, or per activation;
- restart/reload/save/next-target behavior that depends on the absent Scene/Level model.

Event category would remain the only implemented canonical category, `scene`, unless a separately approved schema design introduces another category. Action category would be `flow`. Those category observations do not decide the blocked type names.

## Compatibility / double-authority analysis

### Legacy level-end only

Safe and exactly backward compatible today: it persists and remains runtime-inert. Keep EVE authoring available until an equivalent authoritative completion path is implemented and verified.

### Canonical graph only

Safe only after all of the following exist: approved completion semantics, one owner, an implemented Action/adapter, deterministic document composition, runtime reset/rebaseline behavior, an explicit author migration command, and targeted/runtime verification. At that point the canonical graph is the sole source.

### Both present

They may coexist in storage today because both are runtime-inert and persistence intentionally keeps the contracts independent. [`SCENE_LOGIC_PERSISTENCE_V1.md` lines 7–15](SCENE_LOGIC_PERSISTENCE_V1.md#L7-L15) Coexistence becomes unsafe the moment either legacy adaptation or canonical runtime integration can execute completion: the same authored boundary could transition twice or appear to have conflicting enabled state.

Follow the SL-12A precedent: no silent load adaptation. A future explicit command constructs the complete canonical graph, validates it, and removes only the selected unlocked legacy source atomically on success. Runtime code must not consume legacy `level-end` after canonical completion is enabled. Import must never auto-create a second graph.

## Required implementation sequence

1. **Lifecycle decision batch:** define gameplay Scene/Level identities, containment, completion state machine, terminal/next progression, and save/checkpoint policy.
2. **Authoritative flow-owner batch:** implement one gameplay-flow owner with idempotent completion and explicit restart/reload reset contracts; clarify/refactor the current broad reset only within that approved scope.
3. **Completion Action batch:** add exactly the chosen Flow Action type, strict schema/validation, adapter method, and targeted tests proving one delegation to the owner. Do not yet migrate legacy data.
4. **Scene Logic composition batch:** integrate Trigger → Event → Action processing into the existing fixed tick and Flow boundary, with explicit runtime activation/reset/rebaseline behavior and no second queue/bus.
5. **Runtime verification gate:** prove crossing, duplicate request, backward movement, restart, reload, game over, and authoring seek behavior in the production composition.
6. **Level-end author migration batch (SL-12C):** add explicit unlocked-source migration with deterministic IDs, atomic validation/removal, double-authority guards, persistence tests, and authoring UI.
7. **Compatibility retirement batch:** only after migrated content and production runtime evidence exist, remove legacy execution/authoring support through a separately approved compatibility plan. Do not silently rewrite old files.

## Blockers / unknowns

### Completion Action blockers

1. No implemented Level gameplay domain or Scene gameplay lifecycle owner.
2. No decision whether the boundary completes a Scene, a Level, or the whole game/session.
3. No completion state, idempotency owner, transition target, victory behavior, or progression/save policy.
4. The only reset candidate is a broad composition closure whose semantics are not a complete, named Level reload.
5. No production Scene Logic document composition/evaluation boundary exists; standalone adapters do not establish ownership.

### Level-end migration blockers

All completion Action blockers, plus:

1. Event type, Action type, and semantic ID stems remain undecidable.
2. Runtime reset/rebaseline integration for restart, reload, and authoring seek is absent.
3. No production proof exists for the Marker → Trigger → Event → Action vertical slice.
4. A migration command cannot yet verify that its generated graph has an executable, single-authority consequence.

## Decision gate

READY FOR COMPLETION ACTION IMPLEMENTATION: NO
READY FOR LEVEL-END MIGRATION IMPLEMENTATION: NO
