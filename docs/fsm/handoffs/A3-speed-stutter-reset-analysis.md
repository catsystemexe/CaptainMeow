# A3 — Speed, high-speed stutter, and silent reset analysis

## Confirmed browser symptoms

Browser report treated as authoritative:

- Follow works.
- Follow + Elasticity creates useful soft motion.
- Count works.
- State Behavior, Formation, and Elasticity work.
- Basic Speed has no obvious visible effect.
- At Speed values above roughly 300, enemies glitch/stutter.
- During state-parameter editing the app can appear to reset/reload silently with no visible error.

## Repository baseline

- Repository path: `/workspace/MGoD`.
- Starting branch: local `work` checkout supplied to Codex.
- Starting HEAD: `33fb575 Merge pull request #101 from catsystemexe/codex/add-general-group-follow-delay`.
- Expected prerequisite present as `c39437b feat(fsm): add group follow delay`; this is the repository's actual U1.4.9 commit. The prompt's `e620025` identifier was not present in this checkout.
- U1.4.8 speed synchronization is present: `FsmPresetAuthoringModel.setBasicSetup()` exists and `DevSummoner` mirrors normalized Basic Setup into the authoring draft before rendering.

Baseline validation passed:

```bash
npm run typecheck
npm run test
npm run build
npx tsx src/dev/FsmBasicSetupDraftSynchronization.smoke.ts
npx tsx src/game/enemies/FsmSpeedAuthoritativeRuntime.smoke.ts
npx tsx src/game/enemies/FsmGroupFollowRuntime.smoke.ts
npx tsx src/dev/FsmGroupFollowUiAndPersistence.smoke.ts
npx tsx src/dev/FsmRuntimeDiagnostics.smoke.ts
```

## Speed data-flow audit

The current Basic Speed path is intact through the authoritative runtime:

```text
Basic Speed UI
→ presetModel.setBasicSetup(...)
→ normalized presetModel.draft.basicSetup
→ authoringModel.setBasicSetup(normalizedBasicSetup)
→ authoringModel.draft.preset.basicSetup.baseSpeed
→ currentDraftFsmOverride()
→ resolvedFsmPresetOverride
→ SPAWN_ENEMY or SPAWN_ENEMY_GROUP payload
→ SpawnSystem
→ ent.fsm or group.fsm
→ fsmEffectiveSpeed(baseSpeed × state speedMultiplier)
→ fsmMovementReferenceSpeed(movement preset params)
→ raw velocity from target delta / dt
→ final velocity scaled by effective/reference
→ e.pos += e.vel * dt or group.anchor += group.vel * dt
→ screen delta = world delta - world.scroll delta
```

Key code facts:

- `editFsmBasicSetupDraft` writes both the editor model and authoring model.
- `currentDraftFsmOverride()` resolves the authoring draft, not stale saved content.
- Runtime speed math computes `effectiveSpeed = baseSpeed * speedMultiplier`.
- Reference speed is the source movement preset's own speed magnitude and is used only as a scale denominator.
- Single FSM enemies integrate once in `EnemySystem`.
- Group anchors integrate once in `EnemyGroupRegistry.updateAnchors`.
- Group members are not independently FSM-speed authoritative; their entity velocity is overwritten by cohesion toward the anchor/history target.

## Speed trace matrix

Measured/derived for `straight.drift` at fixed `dt = 1 / 60` and world autoscroll `60 px/s`. `straight.drift` has movement reference speed `115` from `speedX = -115`.

| Speed UI | editor draft baseSpeed | authoring draft baseSpeed | SPAWN override baseSpeed | runtime definition baseSpeed | state multiplier | effectiveSpeed | referenceSpeed | raw velocity | final velocity | integrated world delta/tick | screen delta/tick with autoscroll |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 50 | 50 | 50 | 50 | 1 | 50 | 115 | -115 | -50 | -0.83 | -1.83 |
| 100 | 100 | 100 | 100 | 100 | 1 | 100 | 115 | -115 | -100 | -1.67 | -2.67 |
| 200 | 200 | 200 | 200 | 200 | 1 | 200 | 115 | -115 | -200 | -3.33 | -4.33 |
| 300 | 300 | 300 | 300 | 300 | 1 | 300 | 115 | -115 | -300 | -5.00 | -6.00 |
| 400 | 400 | 400 | 400 | 400 | 1 | 400 | 115 | -115 | -400 | -6.67 | -7.67 |

State Speed × path is also intact for non-hold movement:

| Basic Speed | State Speed × | effectiveSpeed | final velocity for `straight.drift` | world delta/tick | screen delta/tick |
|---:|---:|---:|---:|---:|---:|
| 100 | 0.5 | 50 | -50 | -0.83 | -1.83 |
| 100 | 1.0 | 100 | -100 | -1.67 | -2.67 |
| 100 | 2.0 | 200 | -200 | -3.33 | -4.33 |
| 100 | 3.0 | 300 | -300 | -5.00 | -6.00 |

For `hold`, raw velocity is zero, reference speed is null, and visible displacement remains zero regardless of Basic Speed or State Speed ×. That is expected because Speed scales movement output; it does not create movement for hold.

## First Speed divergence

No code-level divergence remains in the Basic Speed or State Speed × data path after U1.4.8/U1.4.9. Values scale through authoring draft, spawn override, runtime definition, effective speed, final velocity, integration, and diagnostics.

The first user-visible divergence is not a stale data stage; it is the presentation/authoring expectation boundary:

1. Built-in FSM presets commonly start in `none.hold` or transition into hold, where Speed cannot visibly move the enemy.
2. Left-moving world-space enemy speed is viewed through a camera that autoscrolls right at `60 px/s`, so screen-space speed is `enemy world velocity - 60`, not just the Speed value.
3. In Count > 1 groups, member movement is cohesion-owned, so Basic/State Speed affects the anchor; members only reveal that indirectly through catch-up/trail behavior.

## High-speed movement audit

The high-speed glitch begins in group member cohesion, not in Basic Speed propagation or fixed-step integration.

At high anchor speed, the anchor target scales linearly, but members are bounded by cohesion catch-up caps:

- Elasticity `0` maps to rigid cohesion with max catch-up speed `480 px/s`.
- Elasticity `3` maps to elastic cohesion with max catch-up speed about `360 px/s`.
- Elasticity `8` maps to elastic cohesion with max catch-up speed about `160 px/s`.
- Follow creates spatial separation proportional to anchor speed: `slotIndex × followDelay × anchorSpeed`.

For Count `5`, Follow `0.25`, slot 4 targets an anchor sample about `1.0s` old. At Speed `400`, the historical trail is about `400 px`; at Speed `600`, about `600 px`, before formation offsets. Elasticity `8` can only close at `160 px/s`, so the member cannot hold the displayed formation and lags/catches continuously. Rigid/low-elasticity members avoid some lag but can saturate and cross targets abruptly.

## Anchor behavior at high speed

Anchor movement is stable and scales linearly:

| Behavior | Count | Speed | anchor world delta/tick | anchor screen delta/tick | Finding |
|---|---:|---:|---:|---:|---|
| straight | 1/5 | 100 | ~1.67 px | ~2.67 px | stable |
| straight | 1/5 | 200 | ~3.33 px | ~4.33 px | stable |
| straight | 1/5 | 300 | ~5.00 px | ~6.00 px | stable |
| straight | 1/5 | 400 | ~6.67 px | ~7.67 px | stable but visually fast |
| straight | 1/5 | 600 | ~10.00 px | ~11.00 px | stable but large per-frame displacement |
| hold | 1/5 | 100..600 | 0 | -1.00 px from camera only | Speed cannot show because raw movement is zero |
| sine/charge | 1/5 | 100..600 | scales with effective speed/reference branch | scales plus autoscroll | no branch discontinuity at 300 |

## Member cohesion behavior

Member stutter is explained by target distance, catch-up saturation, and target crossing:

| Count | Follow | Elasticity | Speed | member target distance pressure | max correction speed | Result |
|---:|---:|---:|---:|---:|---|
| 5 | 0 | 0 | 100..400 | formation offset only | 480 | stable/rigid |
| 5 | 0.10 | 3 | 300 | up to ~120 px historical offset for slot 4 | ~360 | borderline but usually coherent |
| 5 | 0.25 | 3 | 400 | up to ~400 px historical offset for slot 4 | ~360 | lag and catch-up saturation |
| 5 | 0.25 | 8 | 300 | up to ~300 px historical offset for slot 4 | ~160 | visible lag/jitter likely |
| 5 | 0.25 | 8 | 600 | up to ~600 px historical offset for slot 4 | ~160 | severe catch-up saturation and apparent glitching |

The correction path is first-order/saturated, not a spring with velocity memory, so it does not numerically explode. It can still visibly jitter because the target moves several pixels per tick while the member is capped, formation offsets can change immediately, and rigid mode snaps velocity toward the instantaneous target every tick.

## Follow history behavior

History storage is bounded and ordered:

- Capacity is derived from `maxDelay + 0.5s` at 60 samples/s plus safety entries.
- Samples are pushed in tick order after anchor integration.
- Ring wrap uses `anchorHistoryStart` and logical indexing.
- Sampling clamps to earliest/latest and linearly interpolates between adjacent samples.

No unsorted timestamp or wrap bug was found. However, higher speed amplifies spatial gaps between adjacent 60 Hz samples. At Speed `600`, adjacent samples are about `10 px` apart before path curvature, and the farthest member at Follow `0.25`/Count `5` intentionally targets a point about `1s` behind the anchor.

## dt and integration behavior

No dt unit bug or duplicate integration was found:

- The fixed simulation dt is seconds.
- `WorldScrollSystem` uses `world.speedX * dt`.
- FSM target velocity is target delta divided by `dt`, then final displacement is `vel * dt`.
- Single enemies integrate exactly once in `EnemySystem`.
- Group anchors integrate exactly once in `EnemyGroupRegistry.updateAnchors`.
- Group members are integrated once after cohesion velocity is applied.

UI interaction can cause render-frame variability, but authoritative simulation code uses the provided fixed-step dt. No milliseconds-as-seconds path was found.

## Rendering/screen-space behavior

Rendering subtracts `world.scrollX` from entity/world positions. This means left-moving enemies are visually faster than their world velocity by the rightward camera speed. The renderer rounds some draw coordinates to integer pixels, which can make large per-tick deltas look steppy, but this is secondary. The authoritative world position already shows large per-frame member deltas under high Speed + Follow + Elasticity.

## Reset classification

The observed “silent reset/reload” is best classified as an Enemy Lab DOM/editor remount/re-render interruption, not a proven full page reload or game-world reset.

The state parameter sliders call `editStateFormationDraft` on every `input` event. That function mutates up to four fields and immediately calls `renderPresetEditor()`. `renderPresetEditor()` then clears/rebuilds `stateList` and moves the same `editorSection` node during the active slider gesture. This can detach and reattach the focused input while dragging/typing, making the panel appear to reset, selected state collapse/reopen, or active control interaction terminate without a visible error.

This is correlated specifically with state-parameter editing and rerender, not spawn lifecycle, culling, or game boot.

## Reset reproduction matrix

| Field | Slow click/change | Rapid 50-100 changes | Slider drag | Keyboard input | Classification |
|---|---|---|---|---|---|
| Behavior | rerenders selected state after change | repeated rerender | n/a | select keyboard can rerender | Enemy Lab editor rerender |
| Shape | click rerenders | repeated node rebuild | n/a | n/a | Enemy Lab editor rerender |
| Spacing | input rerenders each value | high churn | focus/control can be detached mid-drag | high churn | Enemy Lab editor rerender |
| Elasticity | input rerenders each value | high churn | focus/control can be detached mid-drag | high churn | Enemy Lab editor rerender |
| Follow | input rerenders each value | high churn | focus/control can be detached mid-drag | high churn | Enemy Lab editor rerender |
| Speed × | input rerenders each value | high churn | focus/control can be detached mid-drag | high churn | Enemy Lab editor rerender |
| Trigger type/value | change/click rerenders | repeated rerender | n/a | stepper click rerenders | Enemy Lab editor rerender |

## Error/rejection findings

No code path intentionally calls `location.reload()`. No uncaught exception path was identified for normal slider values because `setLabFormationField` clamps finite values and `renderPresetEditor` is synchronous. The most relevant failure mode is not an exception with recovery; it is deliberate full editor rerender during an active edit event.

## Mount/boot/reset counters

Temporary counter instrumentation was not committed. The code inspection classification is:

- Window/global lifetime: no evidence of full reload.
- Game boot/world creation: no state-edit code calls game boot or world reset.
- DevSummoner constructor/init: no state-edit code constructs a new `DevSummoner`.
- Enemy Lab mount: panel remains owned by the same `DevSummoner`; the selected-state editor subtree is rebuilt/moved.

## Timer/listener/memory audit

Findings:

- `DevSummoner.init()` starts one `refreshTimer` and `destroy()` clears it.
- Runtime diagnostics body-level panel is appended once during init and removed by a cleanup handler.
- Body-level compact select popovers are destroyed by their select cleanup handlers.
- State-row event listeners are recreated during rerender and old nodes are removed with `stateList.textContent = ""`; this is churn, not retained growth.
- Follow history is bounded per group and removed when group members reconcile to zero.
- No unbounded history-buffer growth was found.
- No repeated global listener installation per state edit was found; global diagnostics listeners are installed once during init and removed on destroy.

## Hypotheses confirmed/rejected

### Speed

- S1 — Basic Speed still stale in one lifecycle path: rejected for current code; U1.4.8 fixed the stale editor/authoring split.
- S2 — State multiplier stale in one lifecycle path: rejected; state edits write canonical `speedMultiplier` and resolver exposes it.
- S3 — reference speed cancels scaling: rejected; it normalizes movement preset output and final velocity still equals effective speed for straight/charge/similar presets.
- S4 — later writer overwrites final velocity: rejected for single enemies and group anchors; confirmed by design for group members, whose visible movement is cohesion-owned.
- S5 — screen scroll masks world-speed differences: partially confirmed as a visibility factor; not the authoritative speed root cause.
- S6 — high speed is clamped or quantized: rejected for anchor/final velocity; confirmed only for group member catch-up velocity caps.

### Stutter

- G1 — cohesion overshoot: confirmed as the primary group/member stutter mechanism, especially with high Speed + Follow + Elasticity/catch-up caps.
- G2 — Follow history interpolation jumps: rejected as a ring/order bug; interpolation is ordered and bounded.
- G3 — insufficient history sample density: partially confirmed as visual amplification at high speed; 60 Hz samples are correct in time but large in space at Speed 400-600.
- G4 — culling/removal/recreation: rejected as primary; cleanup uses group anchor/cull reference and no repeated spawn lifecycle was found.
- G5 — dt spikes: rejected in authoritative fixed-step code.
- G6 — renderer/pixel snapping: partially confirmed as a secondary visual amplifier, not root cause.
- G7 — duplicate integration: rejected.

### Reset

- R1 — uncaught exception: rejected for normal state edits; no required exception path found.
- R2 — unhandled rejection: rejected; state editing is synchronous.
- R3 — full page reload: rejected by code audit; no reload path found.
- R4 — game-world reset only: rejected; state edit code does not call world reset.
- R5 — DevSummoner remount only: rejected as full remount; confirmed only as selected-editor subtree re-render/reparent.
- R6 — recursive rerender/stack overflow: rejected; rerender is direct per event, not recursively self-triggered by programmatic `value` sets.
- R7 — event/timer leak: rejected as root cause; cleanup paths exist and state edits do not add global listeners.
- R8 — memory pressure from history or DOM leaks: rejected as primary; buffers are bounded and DOM churn is removed, not retained.
- R9 — dev server/HMR reload: not supported by repository code; no evidence from inspection.

## Why current tests pass

Current tests pass because they test correct internal contracts but not the problematic browser perception/interaction envelope:

- Speed synchronization smoke verifies DOM Basic Speed reaches spawn override and one runtime tick.
- Runtime speed smoke verifies authoritative velocity scaling.
- Follow smoke verifies delay semantics and bounded history.
- UI/persistence smoke verifies field storage and reload.
- Diagnostics smoke verifies fields are reported.

They do not assert visible screen-space deltas against autoscroll, do not test hold/no-motion UX, do not measure member catch-up saturation across the full high-speed matrix, and do not simulate long slider drags where `input` handlers rebuild the active editor subtree on every event.

## Exact root causes

1. **Speed non-response:** No stale speed pipeline remains. The browser-visible non-response is caused by Speed being an anchor/movement-output scalar that is visually hidden in common cases: hold movement produces zero raw velocity, screen-space includes rightward autoscroll, and group members are cohesion-controlled rather than directly speed-controlled.
2. **High-speed stutter/glitch:** High Speed + Follow creates large historical target distances; Elasticity maps to lower catch-up caps, so members saturate/lag/cross targets while the anchor remains stable. History sampling is correct but spatial gaps become large at high speed.
3. **Silent reset/reload:** The state editor rerenders and reattaches the active editor subtree on every state parameter `input` event. This is an Enemy Lab editor DOM rerender interruption, not a proven full page reload, game-world reset, or uncaught exception recovery.

## Recommended Speed fix

Separate minimal UX/runtime fix:

- Make Runtime Diagnostics and/or the Basic Speed label show both world velocity and screen velocity (`world velocity - scrollX velocity`) for the anchor.
- Disable or annotate Speed when the selected state movement is `none.hold`, because there is no raw movement output to scale.
- For Count > 1, label Speed as “Anchor Speed” or add a member/anchor indicator so users do not expect every member velocity to equal Basic Speed.

## Recommended stutter fix

Separate minimal movement fix:

- Add a group-member velocity/correction diagnostic and regression smoke for high Speed + Follow + Elasticity.
- Tune or derive member catch-up caps from `effectiveSpeed` and `maxTrailDelay`, or clamp allowed Follow/Speed combinations for high-elasticity groups.
- Preserve Follow time semantics; do not change history ordering unless a browser trace proves a separate history bug.

## Recommended reset fix

Separate minimal UI fix:

- Do not rebuild/reparent the selected-state editor on every slider `input` event.
- Update the model and local label live during `input`, then run full `renderPresetEditor()` on `change`/commit, or split render into targeted text/value updates that preserve the active input node.
- Add stable editor mount/session counters and an event-log smoke around repeated state slider input.

## Required regression tests

- DOM smoke: select non-hold movement, set Basic Speed 50/100/200/300/400, click actual SPAWN, assert override, runtime definition, effective speed, final velocity, world delta, and screen delta fields.
- DOM smoke: select `none.hold`, vary Speed, assert diagnostics show zero raw/final movement and a UX warning/disabled state.
- Runtime smoke: Count 5, line, Follow 0/0.10/0.25, Elasticity 0/3/8, Speed 100/200/300/400/600; assert anchor remains stable and member catch-up saturation is bounded/reported.
- UI smoke: dispatch 100 rapid `input` events to Spacing/Elasticity/Follow/Speed × and assert no DevSummoner remount, no game boot/world reset, no full page unload marker, and the active editor node/focused control remains stable or intentionally commits only on `change`.

## Temporary instrumentation used

No production instrumentation was committed. Analysis used code inspection, existing diagnostics fields, existing smoke tests, and temporary shell command output only.

## Temporary changes reverted

No temporary repository production/test changes were made. Final diff contains only this handoff and README index update.

## Explicitly not changed

- production code
- tests
- runtime semantics
- Count
- Formation
- Follow
- Elasticity
- FSM graph
- transitions
- Simple/Smart
