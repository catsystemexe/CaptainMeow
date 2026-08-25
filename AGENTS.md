# AGENTS.md — Captain Meow Engineering Contract

## 1. Purpose

This file defines durable repository-local rules for AI coding/execution agents working in Captain Meow.

It exists to:
- protect user work and repository integrity;
- preserve runtime architecture and determinism;
- keep implementation changes focused and reviewable;
- define repository-local branch/snapshot safety;
- define exact validation semantics;
- prevent historical documentation or backup artifacts from becoming accidental authority.

This is **not** the project-wide ChatGPT communication-role framework and not a complete architecture specification.

Canonical project references:
- `docs/project/00-project-state.md`
- `docs/project/01-architecture.md`
- `docs/project/04-decisions.md`
- `docs/project/05-development-workflow.md`
- `docs/project/06-chatgpt-project-profile.md`

For implemented behavior, current code and runtime contracts remain primary evidence. Canonical docs describe maintained project truth but must be corrected when implementation proves them wrong.

## 2. Instruction and evidence handling

For repository-changing work, use this order when instructions conflict:
1. explicit current task instructions;
2. protection of user work and repository integrity;
3. repository-local engineering invariants in this file;
4. current code/runtime contracts and tests;
5. canonical `docs/project/*` decisions/workflow/architecture;
6. neighboring code conventions;
7. historical audits, handoffs, backup files, and legacy notes.

Do not silently resolve a material conflict by guessing.

If the conflict affects branch origin, architectural ownership, public/runtime contracts, user-owned changes, or task scope, stop modification and report the ambiguity unless the smallest safe interpretation is unambiguous.

Historical files, handoffs, `.bak` files, `_patch/`, audit snapshots, and archived specifications are evidence only unless explicitly promoted to current authority.

## 3. Current repository profile

Captain Meow is a TypeScript/Vite browser game and deterministic 2D arcade-engine project.

Current durable properties include:
- TypeScript ESM;
- strict TypeScript mode;
- Vite build;
- fixed-step simulation at 60 Hz;
- phase-owned EventBus;
- fixed-size generational `EntityStore`;
- data-driven enemy content;
- browser rendering/audio;
- Node-compatible smoke tests;
- runtime developer UI through debug integration.

Do not encode temporary branch names or one-off feature status here.

## 4. Dynamic branch and snapshot model

Use abstract branch roles rather than hard-coded branch names:
- **X** = currently approved active integration branch for the workstream;
- **Y** = focused task branch created from a verified snapshot of X.

Do **not** assume `main`, `work`, or even the GitHub default branch is X.

Resolve X from:
- the explicit current task;
- canonical project state/decisions;
- current repository evidence.

Ordinary non-trivial implementation should occur on Y when practical.

A normal task flow is:

`verified X snapshot → Y → focused implementation + validation → PR/handoff Y → X`

Higher-level integration/branch cleanup is outside an ordinary task unless explicitly authorized.

### Remote-action safety

Do not infer authorization to:
- merge;
- force-push;
- rewrite history;
- delete branches;
- deploy;
- reset/discard unknown work.

Push and hosted PR creation follow the current task/implementation profile. If they are not authorized, prepare a handoff instead.

## 5. Start-of-task repository inspection

Before substantial implementation, establish as much of the following as the execution environment exposes:
- repository identity;
- current/supplied snapshot or branch;
- HEAD;
- working-tree state;
- available remotes/upstream state;
- intended X;
- intended Y;
- intended PR/integration base;
- required prerequisite commits/features.

Inspect `AGENTS.md` and relevant canonical docs before editing.

Never overwrite unknown or user-owned changes.

Without explicit instruction, do not use destructive cleanup such as:
- `git reset --hard`;
- `git clean -fd`;
- `git checkout -- .`;
- `git restore .`;
- force push;
- history rewrite.

Do not use `git stash` as an automatic cleanup mechanism for unknown user work.

If unrelated changes exist, isolate and preserve them. Stop if safe isolation cannot be established.

## 6. Codex isolated checkout / branch-selector rule

Codex Cloud may expose the user-selected source snapshot under a synthetic local branch name and may omit ordinary remotes/upstream refs.

Therefore:
- do not infer repository branch authority from the local checkout name alone;
- do not reject a supplied snapshot merely because a local ref named X is absent;
- do not require fetch/pull when no remote exists;
- do not invent synchronization state;
- verify the supplied snapshot using HEAD, prerequisite commits/files/contracts, and working-tree state;
- create Y from the verified supplied HEAD when the task explicitly identifies that snapshot as X;
- report any inability to independently verify remote freshness.

If the required X/snapshot cannot be identified safely, do not create speculative branches or modify files.

## 7. Repository map and ownership

### `src/engine`
Low-level engine infrastructure:
- fixed-step loop;
- EventBus and phase ownership;
- ECS / EntityStore;
- input primitives;
- math helpers;
- low-level FX storage.

Do not place game-specific content/balance logic here.

### `src/game`
Gameplay domain and composition:
- bootstrapping;
- world/session state;
- gameplay systems;
- enemy behavior/FSM;
- content loading/normalization;
- attacks/collisions/damage/scoring;
- director/spawn orchestration;
- gameplay VFX triggers.

### `src/game/content`
Canonical gameplay content data. Important sources include:
- `enemyTypes.json`
- `behaviorPresets.json`
- `behaviorGraphs.json`
- `attackProfiles.json`
- `directorWaves.json`

Do not introduce parallel hard-coded registries for content-owned IDs.

### `src/game/defs`
Runtime definitions derived from content. Derived maps are runtime APIs, not primary sources of truth.

### `src/game/enemies`
Enemy behavior/runtime logic, including primitive behavior contracts, presets, attack controller, and FSM runtime.

### `src/game/systems`
Phase-connected gameplay systems such as director, spawn, player, weapons, projectile, enemy, collision, damage, impact, flow, scoring, respawn, pickups.

### `src/render`
Rendering interpretation. Rendering may own presentation timing/GPU state but must not become gameplay authority.

### `src/graphics`
Display/framebuffer/post-processing/scaling infrastructure.

### `src/audio`
Output-only audio. Audio must never become gameplay truth.

### `src/ui` and `src/dev`
Runtime/developer UI. Developer UI may inspect or invoke supported controls, but correctness must not depend on UI presence.

### `src/smoke`
Smoke runner and integration-oriented test utilities.

### `assets`, `public/assets`, `tools`
Source assets, runtime-delivered/generated assets, and repository-local generators/build utilities.

### `docs`
Canonical and historical documentation. `docs/project/*` is the maintained project-level canonical set. Other docs must be classified by purpose/currentness before being used as authority.

## 8. Content sources of truth

### Enemy type IDs
Primary source: `src/game/content/enemyTypes.json`.

Runtime derived access includes `CONTENT.enemyTypes` and `ENEMY_DEFS`.

### Behavior preset IDs
Primary source: `src/game/content/behaviorPresets.json`.

### FSM graph IDs
Primary source: `src/game/content/behaviorGraphs.json`.

### Attack profile IDs
Primary source: `src/game/content/attackProfiles.json`.

### Enemy render appearance
Primary source: `enemyTypes.json → render`.

Canonical enemy sprite ID: `render.sprite.id`.

Canonical enemy sprite animation: `render.sprite.animation` with expected fields such as `id` and `speed`.

Do not add new enemy animation ownership to legacy root `animId` fields without an explicit migration.

### Atlas metadata
Keep source metadata and generated runtime atlas output separate. Do not hand-edit generated atlas data when a source map/generator owns it.

## 9. Architectural invariants

### 9.1 Fixed-step simulation
Gameplay simulation runs at 60 Hz fixed timestep.

Gameplay decisions must not depend on render-frame delta, `performance.now()`, `requestAnimationFrame`, DOM refresh timing, audio timing, or renderer presentation clocks.

### 9.2 Runtime phase order
Expected fixed-tick order:
1. Input
2. Director
3. Simulation
4. Collision
5. Impact
6. Flow
7. Audio
8. Cleanup

Changing phase order is architectural work and requires dedicated analysis and regression verification.

### 9.3 Event ownership
Each event type has one owning phase. Use supported EventBus routing; do not create ad hoc duplicate queues.

Same-tick forward routing is allowed only where EventBus supports it. Routing back into an already-executed phase is forbidden.

`SPAWN_*` events that require next-tick routing must use `emitNext(...)`, not unsupported same-tick emission.

### 9.4 Spawn authority
Normal chain:

`intent producer → EventBus spawn event → SpawnSystem → EntityStore.spawn`

Director/player/weapon/FSM/behavior code should emit spawn intent rather than directly constructing gameplay entities.

### 9.5 Entity lifecycle
`EntityStore` is a fixed-size generational slot store.

Safe access respects slot, alive state, and generation.

Normal removal is two-stage: mark for removal, then commit in Cleanup.

Do not manually recycle slots or bypass generation checks.

### 9.6 Stable references
Composition intentionally keeps important runtime references stable. Soft reset may reset state in place while preserving player/runtime references.

Do not replace stable objects in ordinary cleanup/refactors without tracing all consumers.

### 9.7 Gameplay vs presentation
Gameplay state is authoritative. Rendering, VFX, and audio are outputs.

Presentation failure must not change collision, HP, damage, score, spawn decisions, cleanup, or wave progression.

### 9.8 Appearance fallbacks
Enemy appearance supports multiple paths (sprite/SDF/glyph/glyph collection/procedural/fallback). Do not remove fallback paths during a focused appearance task unless removal is explicitly requested.

### 9.9 Content normalization
Validate/normalize raw content at content/definition boundaries. Runtime systems should consume normalized definitions rather than reinterpret raw JSON repeatedly.

Compatibility parsing must not silently hide invalid newly required data.

### 9.10 Mutable definition data
Do not assign shared mutable definition objects directly to spawned entities. Materialize/clone mutable per-entity configuration.

### 9.11 Enemy behavior contract
Behavior V1 updates behavior state and movement targets. It should not directly write authoritative `entity.pos` or `entity.vel`; movement application belongs to the owning system layer.

### 9.12 Browser / Node boundary
Node smoke paths should not transitively require DOM/WebGL/Tone/browser listeners unless the boundary is explicit.

Prefer dependency boundaries/injection/adapters over generic try/catch import guards.

### 9.13 Randomness and determinism
Do not add new un-injected gameplay `Math.random()` calls.

Gameplay randomness should use an explicit RNG dependency. Existing composition/system uses may be legacy limitations, not preferred patterns.

## 10. Current technical exceptions

These are current exceptions, not preferred architecture.

### Monolithic `createGame.ts`
`createGame.ts` combines dependency construction, system wiring, browser/audio/dev UI/reset/debug integration. Do not expand or broadly refactor it during unrelated tasks.

### Existing `any` boundaries
The codebase contains many `any` boundaries. Avoid adding new `any` where a practical type exists, but do not turn unrelated work into repository-wide type cleanup.

### Legacy animation fields
Root `animId` still exists in some compatibility boundaries. Enemy appearance canonical ownership is under `render.sprite.animation`.

### `window.__CM`
Active debug/development integration point. Do not remove/rename without tracing all consumers.

### Backup/preservation artifacts
`.bak*`, dump, and patch artifacts are not active implementation sources. Do not modify or copy conventions from them unless the task is explicitly forensic/preservation work.

### Incomplete typecheck coverage
`npm run typecheck` does not independently cover the entire repository, including all renderer/audio/UI/dev/smoke roots.

### Known smoke failure
The broad smoke runner has a known pre-existing failure involving `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion`.

Until fixed:
- run broad smoke when required;
- report the exact failure;
- distinguish it from patch-introduced regressions;
- run narrower relevant smoke tests where practical;
- do not repair it as unrelated scope.

Remove this exception when the baseline failure is fixed.

## 11. Implementation and scope discipline

One implementation task should produce one coherent implementation unit.

Keep together inspection, implementation, targeted corrections, validation, diff review, and focused commit(s) only when they serve the same original objective.

Do not mix unrelated gameplay, renderer, UI, assets, cleanup, architecture, tuning, or documentation rewrites.

Prefer root-cause correction over symptom suppression or adding prohibitions around obsolete conventions.

Do not expand scope merely because adjacent cleanup is attractive.

If a concrete in-scope defect is discovered during verification, apply the smallest safe correction and rerun the relevant checks.

Return to planning/design when a required correction materially changes architecture, intended behavior, acceptance criteria, or task scope.

## 12. Diff and preservation discipline

Before completion, inspect the complete task diff/state.

Where available, use:
- `git diff --check`
- `git diff --stat`
- `git diff`
- `git status --short`

Check for:
- unrelated edits;
- generated noise;
- accidental backup edits;
- debug logs;
- stale comments;
- hidden API changes;
- duplicate ownership/sources of truth;
- formatting churn;
- unexpectedly broad JSON/content changes.

Do not create empty/process-only commits when no patch is required.

## 13. Validation command semantics

Available scripts include:
- `npm run dev`
- `npm run build`
- `npm run smoke`
- `npm run gen:atlas`
- `npm run typecheck`
- `npm run test`

Their meanings are not interchangeable.

### `npm run typecheck`
Runs `tsc --noEmit`. It is **not** a complete repository typecheck.

### `npm run test`
Currently runs one targeted EnemySpriteSelection smoke. It is **not** the full test suite.

### `npm run smoke`
Runs the broader smoke runner and currently has at least one known pre-existing failure.

### `npm run build`
Runs the Vite production build. Important for browser integration, renderer/UI, and module-boundary changes.

### `npm run gen:atlas`
Regenerates atlas metadata. Use only when atlas source/generator ownership changes.

## 14. Validation matrix

### Always
- inspect the full diff;
- `git diff --check` when available;
- `git status --short` when available.

### Engine/EventBus/Loop/EntityStore
- `npm run typecheck`
- `npm run smoke`
- relevant targeted smoke where available.

### Gameplay systems
- `npm run typecheck`
- `npm run smoke`
- narrower smoke directly with `tsx` when broad smoke is blocked by the known unrelated failure.

### Enemy behavior/content/appearance
- `npm run typecheck`
- `npm run test`
- `npm run build`
- relevant targeted content/enemy smokes.

### Renderer/WebGL/sprite animation
- `npm run test`
- `npm run build`
- relevant targeted render smokes.
- browser/manual verification for visible changes when available.

Do not rely on `npm run typecheck` alone for renderer roots.

### UI/developer tools
- `npm run build`
- targeted tests when available;
- browser/runtime verification when practical.

Check listener/timer cleanup, `window.__CM` compatibility, absent-dev-state behavior, and runtime payload shape where relevant.

### Content-only
- `npm run typecheck`
- `npm run build`
- targeted content/definition tests;
- verify referenced IDs and avoid formatting churn.

### Atlas/assets
- `npm run gen:atlas`
- `npm run build`
- review generated diff carefully.

### Documentation-only
- `git diff --check` when available;
- verify paths, symbols, branch claims, and authority claims against current repository state.

## 15. Static vs runtime verification

STATIC verification may include source/diff inspection, type/schema/contracts, tests/smokes, and environment-independent build.

RUNTIME verification includes live browser/game behavior, runtime logs/config, environment-specific dependencies, or manual visual checks.

Never claim runtime/visual verification from static evidence alone.

A passing automated check does not override concrete user visual evidence for UX correctness.

## 16. Handling existing failures

A pre-existing failure does not automatically block unrelated work.

For every relevant failure:
1. capture the exact failure;
2. determine whether the task touched the failing path;
3. distinguish baseline failure from new regression;
4. run narrower checks where practical;
5. report the limitation accurately.

Never state “all tests pass” when a relevant test/smoke command failed.

A changed failure signature should be treated as potentially new until verified.

## 17. Completion contract

A repository-changing task is complete only when applicable conditions are met:
- requested behavior/change is implemented;
- scope/non-goals remain controlled;
- no accidental second source of truth was introduced;
- architectural invariants remain intact or an approved architecture change is explicitly documented;
- relevant static verification was performed and reported accurately;
- runtime/visual verification is reported only if actually performed;
- complete diff/state was reviewed;
- valuable user work remains preserved;
- canonical docs were updated when the task changed documented project truth and the batch required that update;
- remote/deployment actions match explicit authorization.

Final reporting should state only what actually happened:
- completed changes;
- verification performed/results;
- deviations;
- documentation/tracking changes;
- branch/commit/PR state;
- remote/deployment actions actually performed;
- unresolved issues.

Do not require one fixed prose template for every task.

## 18. Audit-only work

When a task is explicitly audit-only:
- do not modify repository files;
- do not create commits/PRs;
- do not apply fixes;
- do not run generators expected to rewrite files.

Separate verified facts, interpretations, risks/conflicts, unknowns, and recommended next actions.

Read-only validation is allowed when useful.

## 19. Playbook maintenance

Update this file only for durable repository-wide engineering/executor contracts such as:
- runtime phase/event ownership;
- entity lifecycle;
- source-of-truth ownership;
- branch/snapshot safety;
- Codex checkout behavior;
- validation command semantics;
- durable technical exceptions.

Do not add:
- one-off task instructions;
- temporary feature tuning;
- long implementation narratives;
- broad ChatGPT role definitions;
- fixed response templates;
- temporary branch names;
- duplicate content already owned by `docs/project/*`.

When a temporary exception is resolved, remove it here and update the relevant canonical project documentation if needed.
