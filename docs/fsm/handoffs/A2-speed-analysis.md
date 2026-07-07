# A2 — Authoritative FSM Speed analysis

## Confirmed browser symptom

Browser runtime was reported authoritative for this audit: Basic Setup Speed and state Speed × have no visible runtime effect, while Count, Behavior, Formation, and Elasticity do.

## Repository baseline

- Repository: `/workspace/MGoD`.
- Starting branch: `work`.
- Starting HEAD: `9632623 Merge pull request #99 from catsystemexe/codex/fix-fsm-speed-and-diagnostics-issues`.
- Required prior implementation is present as `3b93307 fix(fsm): apply authoritative speed and restore dev panels`.

## Existing implementation summary

The current code has two FSM preset draft owners in Enemy Lab:

1. `FsmPresetEditorModel` owns top-level preset metadata and Basic Setup draft fields.
2. `FsmPresetAuthoringModel` owns the FSM authoring draft used by `currentDraftFsmOverride()` for manual SPAWN.

The Basic Setup Speed input writes only the editor draft. Manual SPAWN resolves only the authoring draft. Therefore the UI-displayed Basic Setup Speed stops affecting runtime at the editor-draft-to-authoring-draft boundary.

State Speed × writes the authoring draft directly and reaches runtime as canonical `state.speedMultiplier`. The runtime path applies it to the group anchor or single enemy velocity. Existing code inspection and focused runtime smokes do not show a state-multiplier data-flow loss after the authoring draft.

## Single-enemy call graph

`DevSummoner` Speed/State controls → editor draft for Basic Setup or authoring draft for State → `currentDraftFsmOverride()` → `resolveEphemeralFsmPreset(authoringModel.draft.preset)` → `createDevSummonerSpawnPayload()` → `emitNext(SPAWN_ENEMY)` → `SpawnSystem.spawnEnemy()` → `createFsmRuntimeSnapshot()` → `EnemySystem.update()` → `updateResolvedFsm()` → `executeFsmMovement()` → `fsmEffectiveSpeed()` → `fsmMovementReferenceSpeed()` → `velocityFromFsmTarget()` → `e.vel.x/y = final velocity` → `e.pos.x/y += e.vel.x/y * dt`.

## Group-anchor call graph

`DevSummoner` Speed/State controls → editor draft for Basic Setup or authoring draft for State → `currentDraftFsmOverride()` → `resolveEphemeralFsmPreset(authoringModel.draft.preset)` → `createDevSummonerGroupSpawnPayload()` → `emitNext(SPAWN_ENEMY_GROUP)` → `SpawnSystem.update()` → `EnemyGroupRegistry.create({ fsmPreset })` → `createFsmRuntimeSnapshot()` on the anchor proxy → `EnemyGroupRegistry.updateAnchors()` → `updateResolvedFsm()` → `applyStateFormation()` → `executeFsmMovement()` → `fsmEffectiveSpeed()` → `fsmMovementReferenceSpeed()` → `velocityFromFsmTarget()` → `group.vel.x/y = final velocity` → `group.anchor.x/y += group.vel.x/y * dt` → `applyMemberCohesion()` writes member velocities toward the anchor.

## Basic Setup Speed ownership

| Stage | Owner/value | Result |
|---|---|---|
| Initial preset load | `FsmPresetEditorModel.draft.basicSetup.baseSpeed`; separately `FsmPresetAuthoringModel.draft.preset.basicSetup.baseSpeed` is loaded from saved content | Both start equal. |
| Slider input | `createRangeRow(...).value`, then `editFsmBasicSetupDraft()` | The visual slider and editor model change. |
| Basic Setup model | `presetModel.setBasicSetup({ baseSpeed })` | Changed value is preserved in the editor draft. |
| FSM authoring draft | `authoringModel.draft.preset.basicSetup.baseSpeed` | First divergence: it remains the old loaded value. |
| `resolvedFsmPresetOverride` | `resolveEphemeralFsmPreset(authoringModel.draft.preset)` | Contains the stale baseSpeed. |
| SPAWN payload | `resolvedFsmPresetOverride` copied by single/group payload helpers | Contains the stale baseSpeed. |
| SpawnSystem/runtime | SpawnSystem preserves the override it receives | Runtime preserves the stale baseSpeed. |

## State Speed multiplier ownership

- Canonical field: `FsmStateDefinition.speedMultiplier`.
- UI listener: `stateSpeedSlider.slider` `input` listener calls `editStateFormationDraft()`, which calls `authoringModel.setLabFormationField(..., "speedMultiplier", stateSpeedSlider.value)`.
- Draft write: `writeStateFormation()` writes `state.speedMultiplier` and deletes legacy `formationOverride`.
- Resolve: `resolveStateFormationFields()` copies canonical `speedMultiplier` to resolved states.
- Runtime read: `fsmSpeedMultiplier(state)` reads canonical `state.speedMultiplier` first, then legacy `formationOverride.speedMultiplier`, then `1`.
- No inspected code normalizes a finite positive canonical multiplier back to `1`.

## Movement output semantics

`executeFsmMovement()` updates the movement preset runtime and returns a target position for the current tick, after modifiers. `velocityFromFsmTarget()` converts that target into raw velocity using `(target - currentPosition) / dt`. It then applies `effectiveSpeed / movementPresetReferenceSpeed` when the movement preset exposes a reference speed. Movement presets do not directly write authoritative entity positions in this path.

## Reference-speed calculation

`fsmMovementReferenceSpeed()` reads movement preset params. It returns `hypot(speedX, speedY)` when present, otherwise `abs(speed)` when present, otherwise `null`. It depends on the selected movement preset's baked params, not on Basic Setup Speed. Therefore `effectiveSpeed / referenceSpeed` cannot collapse to `1` for all user Basic Setup values unless the user value exactly equals the preset reference speed.

## Final velocity writer

- Single enemies: `EnemySystem.update()` writes `e.vel.x` and `e.vel.y` from `velocityFromFsmTarget()`.
- Group anchors: `EnemyGroupRegistry.updateAnchors()` writes `group.vel.x` and `group.vel.y` from `velocityFromFsmTarget()`.
- Group members: `EnemyGroupRegistry.applyMemberCohesion()` later overwrites member entity velocity so members follow the anchor; this is not the anchor velocity writer.

## Position integration owner

- Single enemies: `EnemySystem.update()` integrates `e.pos.x += e.vel.x * dt` and `e.pos.y += e.vel.y * dt`.
- Group anchors: `EnemyGroupRegistry.updateAnchors()` integrates `group.anchor.x += group.vel.x * dt` and `group.anchor.y += group.vel.y * dt`.
- `dt` is seconds. Velocity is multiplied by `dt` exactly once in the authoritative integration statements above.
- Renderer-facing screen position is world position minus scroll. Scroll can add a constant screen-space component, but it does not erase a changed world delta.

## End-to-end trace matrix

The matrix below uses one editable user preset conceptually matching the audited DOM path. The first failing column for Basic Setup cases is `authoring draft baseSpeed`; runtime columns therefore remain fixed at the loaded base speed. State multiplier cases reach runtime in code inspection and focused smokes.

### Basic Setup Speed — Count = 1 and Count = 3

| Movement | Case | UI displayed baseSpeed | Basic Setup model baseSpeed | authoring draft baseSpeed | SPAWN override baseSpeed | runtime definition baseSpeed | multiplier | effectiveSpeed | reference speed | raw velocity | speed scale | final velocity | world delta after 1s | first failed column |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|
| straight | A | 50 | 50 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | preset `speedX/speedY` magnitude | preset-derived | loaded/reference | loaded-scaled | loaded-scaled | authoring draft baseSpeed |
| straight | B | 100 | 100 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | preset `speedX/speedY` magnitude | preset-derived | loaded/reference | loaded-scaled | loaded-scaled | authoring draft baseSpeed |
| straight | C | 200 | 200 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | preset `speedX/speedY` magnitude | preset-derived | loaded/reference | loaded-scaled | loaded-scaled | authoring draft baseSpeed |
| sine | A/B/C | 50/100/200 | 50/100/200 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | sine preset magnitude | preset-derived target velocity | loaded/reference | unchanged across A/B/C | unchanged across A/B/C | authoring draft baseSpeed |
| charge | A/B/C | 50/100/200 | 50/100/200 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | charge `speed` | preset-derived | loaded/reference | unchanged across A/B/C | unchanged across A/B/C | authoring draft baseSpeed |
| hold | A/B/C | 50/100/200 | 50/100/200 | loaded value | loaded value | loaded value | 1 | loaded value × 1 | null | zero | fallback no target | zero | zero | authoring draft baseSpeed; hold also has intentional zero raw output |

### State Speed × — Count = 1 and Count = 3

| Movement | Case | UI multiplier | draft multiplier | runtime active-state multiplier | effectiveSpeed | reference speed | raw velocity | speed scale | final velocity | world delta after 1s | first failed column |
|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|
| straight | D | 0.5 | 0.5 | 0.5 | base × 0.5 | preset magnitude | preset-derived | `(base × 0.5)/reference` | scaled half | scaled half | none found in inspected path |
| straight | E | 1 | 1 | 1 | base × 1 | preset magnitude | preset-derived | `base/reference` | scaled base | scaled base | none found in inspected path |
| straight | F | 2 | 2 | 2 | base × 2 | preset magnitude | preset-derived | `(base × 2)/reference` | scaled double | scaled double | none found in inspected path |
| sine | D/E/F | 0.5/1/2 | 0.5/1/2 | 0.5/1/2 | base × multiplier | sine preset magnitude | sine target velocity | effective/reference | proportionally scaled | proportionally scaled | none found in inspected path |
| charge | D/E/F | 0.5/1/2 | 0.5/1/2 | 0.5/1/2 | base × multiplier | charge `speed` | charge target velocity | effective/reference | proportionally scaled | proportionally scaled | none found in inspected path |
| hold | D/E/F | 0.5/1/2 | 0.5/1/2 | 0.5/1/2 | base × multiplier | null | zero | no non-zero target | zero | zero | no failed speed column; hold intentionally cannot display speed changes |

Screen delta after scroll equals integrated world delta minus scroll delta for all rows. Since scroll is independent of the FSM speed fields, the first speed-specific divergence remains the stale Basic Setup authoring draft.

## First divergence

The first proven divergence for Basic Setup Speed is:

`Basic Setup Speed UI/editor model → FSM authoring draft`.

The changed value is in `FsmPresetEditorModel.draft.basicSetup.baseSpeed`, but `currentDraftFsmOverride()` resolves `authoringModel.draft.preset`, whose `basicSetup.baseSpeed` was not updated by `editFsmBasicSetupDraft()`.

For State Speed ×, no data-flow divergence was found from UI listener through resolved state, effective speed, final velocity, and integration. If browser-visible State Speed × still does not change movement for a non-hold movement preset, the next audit should capture actual browser diagnostics at the final velocity/integrated-delta fields; the inspected code path itself preserves the canonical multiplier.

## Hypotheses confirmed/rejected

- H1 — stale Basic Setup draft: confirmed.
- H2 — state multiplier written to wrong field: rejected; UI writes canonical `speedMultiplier`.
- H3 — reference speed cancels user Speed: rejected; reference speed comes from movement preset params, not Basic Setup Speed.
- H4 — final velocity overwritten later: rejected for single enemies and group anchors; group members are intentionally cohesion-controlled.
- H5 — integration ignores velocity: rejected; integration uses final velocity times seconds dt.
- H6 — scroll masks visible result: rejected as root cause; scroll is independent and subtractive in screen space.
- H7 — existing tests bypass the real UI lifecycle: confirmed.
- H8 — slider visual value and numeric model value differ: rejected for the local slider/editor model; confirmed only in the sense that the model changed is not the authoring model used for SPAWN.

## Why existing tests pass

Existing Speed runtime smokes construct already-correct resolved FSM preset objects or spawn payloads directly, so they prove SpawnSystem, movement conversion, and integration after a correct override exists. They omit the real Enemy Lab DOM lifecycle step where Basic Setup input writes `FsmPresetEditorModel` while SPAWN resolves `FsmPresetAuthoringModel`. They assert internal velocity/integrated displacement after direct construction, not the full DOM → editor draft → authoring draft → SPAWN path. The straight/sine/charge reference-speed cases are valid for runtime math but do not test draft ownership. Hold correctly remains zero.

## Exact root cause

`src/dev/DevSummoner.ts` has split ownership for the same FSM preset. `editFsmBasicSetupDraft()` updates only `presetModel.setBasicSetup(...)`. `currentDraftFsmOverride()` ignores `presetModel.draft` and resolves `authoringModel.draft.preset`. Because Basic Setup edits are not mirrored into `authoringModel.draft.preset.basicSetup`, the SPAWN override contains the loaded/saved baseSpeed rather than the displayed slider value.

## Recommended minimal fix

Exact file: `src/dev/DevSummoner.ts`.

Exact function: the local `editFsmBasicSetupDraft` callback near the Enemy Lab FSM wiring.

Exact incorrect path: `presetModel.setBasicSetup(...)` is called, but `authoringModel.draft.preset.basicSetup` is not updated before `currentDraftFsmOverride()` resolves the manual-spawn override.

Exact proposed correction: after normalizing/updating the editor draft, also update the authoring draft's `preset.basicSetup` through a typed authoring-model method or a narrowly scoped method such as `FsmPresetAuthoringModel.setBasicSetup(next)`, then revalidate. Avoid direct untyped mutation from `DevSummoner` if practical.

## Required regression test

Add a DOM-path smoke that mounts Enemy Lab, selects or creates an editable user FSM preset, changes `#ds-fsm-base-speed` by dispatching the actual `input` event, clicks the actual SPAWN button, captures the emitted `SPAWN_ENEMY` and `SPAWN_ENEMY_GROUP` payloads, and asserts `payload.resolvedFsmPresetOverride.definition.basicSetup.baseSpeed` equals the displayed slider value for Count 1 and Count 3. Extend it to set `#ds-fsm-state-speed` and assert resolved active-state `speedMultiplier` plus one integrated tick/second displacement for a non-hold preset.

## Files inspected

- `AGENTS.md`
- `docs/fsm/handoffs/U1.4.4.md`
- `docs/fsm/handoffs/U1.4.5.md`
- `docs/fsm/handoffs/U1.4.6.md`
- `docs/fsm/handoffs/U1.4.7.md`
- `src/dev/DevSummoner.ts`
- `src/dev/FsmPresetAuthoringModel.ts`
- `src/dev/EnemyLabPresetModel.ts`
- `src/dev/FsmPresetEditorModel.ts`
- `src/dev/FsmRuntimeDiagnostics.ts`
- `src/engine/core/events.ts`
- `src/game/systems/SpawnSystem.ts`
- `src/game/systems/EnemySystem.ts`
- `src/game/enemies/EnemyGroups.ts`
- `src/game/enemies/fsm/MovementResolver.ts`
- `src/game/enemies/fsm/resolve.ts`
- `src/game/enemies/fsm/schema.ts`
- `src/game/enemies/FsmSpeedAuthoritativeRuntime.smoke.ts`
- `src/game/enemies/FsmBaseSpeedRuntime.smoke.ts`
- `src/dev/EnemyLabInitialPresetAndDiagnosticsContent.smoke.ts`
- `src/dev/FsmRuntimeDiagnostics.smoke.ts`

## Commands executed

```bash
pwd
find .. -name AGENTS.md -print
git status --short --branch
git branch -vv
git log -12 --oneline --decorate
git remote -v
npm run typecheck
npm run test
npm run build
npx tsx src/game/enemies/FsmSpeedAuthoritativeRuntime.smoke.ts
npx tsx src/game/enemies/FsmBaseSpeedRuntime.smoke.ts
npx tsx src/dev/EnemyLabInitialPresetAndDiagnosticsContent.smoke.ts
npx tsx src/dev/FsmRuntimeDiagnostics.smoke.ts
rg -n "baseSpeed|speedMultiplier|effectiveSpeed|referenceSpeed|rawVelocity|finalVelocity|integratedDelta|resolvedFsmPresetOverride|SPAWN_ENEMY_GROUP|SPAWN_ENEMY|movementPresetId|vel.x|vel.y|pos.x|pos.y|scrollX" src/dev src/engine src/game
```

## Temporary instrumentation used

No production instrumentation was added. Temporary shell output files were written under `/tmp` only for inspection convenience.

## Temporary changes reverted

No temporary repository changes were made. No production files were edited.

## Explicitly not changed

- production code
- runtime semantics
- tests
- Count
- Formation
- FSM graph
- transitions
- Simple/Smart
