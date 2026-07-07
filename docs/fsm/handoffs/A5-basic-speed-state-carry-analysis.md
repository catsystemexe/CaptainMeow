# A5 — Basic Speed dead zone and state carry analysis

## Confirmed browser symptoms

Authoritative symptoms for this analysis:

- Basic Speed reacts.
- Basic Speed `0` through approximately `340` produces almost no visible browser difference.
- Around `350`, visible acceleration begins.
- Around or above `350`, grouped motion can become jerky, glitching, or stuttering.
- Changing Basic Speed appears to affect only the first FSM state; later states appear to use another, stale, default, or cached speed.

## Repository baseline

Baseline gate was run from `/workspace/MGoD`.

Starting HEAD:

```text
924fece Merge pull request #103 from catsystemexe/codex/analyze-preset-loss-and-state-speed-instability
```

The checkout initially exposed the selected snapshot as local branch `work`. Because the task is analysis-only and the only committed outputs are handoff documents, the analysis branch was created from that verified clean snapshot:

```text
codex/a5-basic-speed-analysis
```

Remote synchronization was not independently verified by `git fetch`/`git pull`; the session used the supplied clean snapshot. `git remote -v` printed no remotes.

Baseline validation before analysis:

```text
npm run typecheck  PASS
npm run test       PASS
npm run build      PASS
```

## U1.4.10 presence proof

All required U1.4.10 files were present:

```text
docs/fsm/handoffs/U1.4.10.md
src/dev/FsmStateEditorLiveInputStability.smoke.ts
src/game/enemies/FsmHighSpeedFollowStability.smoke.ts
src/dev/FsmRuntimeSpeedAndCohesionDiagnostics.smoke.ts
```

## Basic Speed UI-to-runtime trace

Concrete code path:

```text
DOM Basic Speed slider ds-fsm-base-speed
→ createRangeRow clamps to ENEMY_LAB_BASIC_SETUP_LIMITS.baseSpeed
→ syncBasicSetupToAuthoringDraft writes baseSpeed into authoring draft
→ currentDraftFsmOverride resolves the draft as resolvedFsmPresetOverride
→ DevSummoner emits actual SPAWN_ENEMY or SPAWN_ENEMY_GROUP payload
→ SpawnSystem resolves the override into the runtime preset
→ createFsmRuntimeSnapshot enters the initial state
→ EnemySystem / EnemyGroupRegistry reads fsmBaseSpeed(preset)
→ fsmSpeedMultiplier(active state)
→ fsmEffectiveSpeed = baseSpeed × state speedMultiplier
→ executeFsmMovement calculates the movement target from the active movement preset
→ fsmMovementReferenceSpeed reads the active movement preset speed vector magnitude
→ velocityFromFsmTarget computes raw velocity and rescales it by effectiveSpeed / referenceSpeed
→ final world velocity is written to entity or group anchor velocity
→ world delta = final velocity × dt
→ screen delta = world delta - scroll delta
```

Important exact findings:

- The DOM/editor/authoring/SPAWN/runtime `baseSpeed` path is not clamped at `340` or `350`; the UI range is `0..720` with step `5`.
- Runtime `baseSpeed` is read globally from `preset.definition.basicSetup.baseSpeed`, not from a state-local field.
- Runtime returns `null` only when `baseSpeed <= 0`; this means Basic Speed `0` falls back to raw preset velocity instead of producing zero movement.
- For any positive Basic Speed, `effectiveSpeed` is proportional to Basic Speed for every active state.
- Reference-speed normalization does not cancel Basic Speed; it cancels each movement preset's authored magnitude so a state using `straight.drift` (`115`) and one using `sine.soft` (`130`) both scale to the same final horizontal speed when their speed multiplier is `1`.
- Screen velocity is world velocity minus autoscroll velocity. Default autoscroll is `+60 px/s`, so left-moving enemies have screen velocity `-(effectiveSpeed + 60)`.

## Trace matrix 0–500

Controlled trace assumptions used to interpret the real path:

- `dt = 1/60`.
- Default world autoscroll `scrollVelocityX = +60 px/s`, so `scrollDx = +1 px/frame`.
- State speed multiplier `1`.
- State movement `straight.drift` unless noted; its raw reference speed is `115 px/s`.
- For positive Basic Speed, final leftward world speed is `-basicSpeed`.
- For Basic Speed `0`, `fsmBaseSpeed()` returns `null`, so final speed falls back to raw `-115 px/s`.
- Count `1` has no member correction. Group anchor values are the same as single-enemy anchor values.
- With Count `5`, member correction depends on Follow/Elasticity; with Follow `0` members can stay on the anchor, while Follow `>0` creates historical target lag and possible saturation.

| basicSpeed | state | effectiveSpeed | referenceSpeed | rawVx | finalVx | worldDx | scrollDx | screenDx | anchorSpeed | memberCorrection | saturatedMembers |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| 0 | straight.drift | null | 115 | -115 | -115 | -1.917 | 1.000 | -2.917 | 115 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 25 | straight.drift | 25 | 115 | -115 | -25 | -0.417 | 1.000 | -1.417 | 25 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 50 | straight.drift | 50 | 115 | -115 | -50 | -0.833 | 1.000 | -1.833 | 50 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 100 | straight.drift | 100 | 115 | -115 | -100 | -1.667 | 1.000 | -2.667 | 100 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 150 | straight.drift | 150 | 115 | -115 | -150 | -2.500 | 1.000 | -3.500 | 150 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 200 | straight.drift | 200 | 115 | -115 | -200 | -3.333 | 1.000 | -4.333 | 200 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 250 | straight.drift | 250 | 115 | -115 | -250 | -4.167 | 1.000 | -5.167 | 250 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 300 | straight.drift | 300 | 115 | -115 | -300 | -5.000 | 1.000 | -6.000 | 300 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 325 | straight.drift | 325 | 115 | -115 | -325 | -5.417 | 1.000 | -6.417 | 325 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 340 | straight.drift | 340 | 115 | -115 | -340 | -5.667 | 1.000 | -6.667 | 340 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 350 | straight.drift | 350 | 115 | -115 | -350 | -5.833 | 1.000 | -6.833 | 350 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 360 | straight.drift | 360 | 115 | -115 | -360 | -6.000 | 1.000 | -7.000 | 360 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 400 | straight.drift | 400 | 115 | -115 | -400 | -6.667 | 1.000 | -7.667 | 400 | Count 1: 0; Count 5: follow-dependent | follow-dependent |
| 500 | straight.drift | 500 | 115 | -115 | -500 | -8.333 | 1.000 | -9.333 | 500 | Count 1: 0; Count 5: follow-dependent | follow-dependent |

## First proportional-scaling divergence

The first concrete divergence is at `fsmBaseSpeed()` for exactly `baseSpeed = 0`:

```ts
return Number.isFinite(base) && base > 0 ? base : null;
```

That makes `0` mean “do not apply authoritative speed” rather than “move at zero speed”. `velocityFromFsmTarget()` then returns raw movement-preset velocity. This is not a `340` or `350` threshold.

For positive Basic Speed values, no proportional-scaling divergence was found in the UI-to-runtime-to-anchor path. The anchor's final world speed remains proportional across `25..500`.

## World versus screen speed

Default world autoscroll is `+60 px/s` in `WorldState`, updated every tick by `WorldScrollSystem`.

For left-moving FSM presets:

```text
screenVelocityX = worldVelocityX - scrollVelocityX
screenVelocityX = -effectiveSpeed - 60
```

Therefore:

- world speed scales correctly for positive Basic Speed;
- screen speed also scales correctly, offset by the constant autoscroll;
- there is no left-moving screen-space crossover at `350`;
- the only positive-speed crossover would be for right-moving `worldVelocityX = +60`, which is not the default left-moving FSM path.

## Autoscroll crossover analysis

The reported “near 350” threshold is not caused by autoscroll crossover.

For the tested left-moving states, screen velocity never crosses zero for positive Basic Speed. It is already leftward at Basic Speed `0` because `0` falls back to raw preset velocity, and it becomes increasingly leftward as Basic Speed increases.

Autoscroll does explain one perceptual issue: because screen speed includes a constant `60 px/s` offset, very low Basic Speed values are visually compressed relative to a moving camera. But it does not explain a sharp transition at `350`.

## State 1 trace

Controlled three-state FSM state 1:

```text
State 1: straight.drift
speedMultiplier = 1
```

| basicSpeed | runtime baseSpeed | state | effectiveSpeed | referenceSpeed | rawVx | finalVx | worldDx | screenDx |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 50 | 50 | 1 / straight.drift | 50 | 115 | -115 | -50 | -0.833 | -1.833 |
| 200 | 200 | 1 / straight.drift | 200 | 115 | -115 | -200 | -3.333 | -4.333 |
| 400 | 400 | 1 / straight.drift | 400 | 115 | -115 | -400 | -6.667 | -7.667 |

## State 2 trace

Controlled three-state FSM state 2:

```text
State 2: sine.soft
speedMultiplier = 1
```

`sine.soft` has a horizontal reference speed of `130 px/s`. Reference normalization intentionally rescales its raw horizontal velocity to the same effective speed as state 1.

| basicSpeed | runtime baseSpeed | state | effectiveSpeed | referenceSpeed | rawVx | finalVx | worldDx | screenDx |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 50 | 50 | 2 / sine.soft | 50 | 130 | -130 | -50 | -0.833 | -1.833 |
| 200 | 200 | 2 / sine.soft | 200 | 130 | -130 | -200 | -3.333 | -4.333 |
| 400 | 400 | 2 / sine.soft | 400 | 130 | -130 | -400 | -6.667 | -7.667 |

The sine modifier changes the target path's phase and vertical/lateral offset. It does not create a separate Basic Speed cache and does not reset `baseSpeed`.

## State 3 trace

Controlled three-state FSM state 3:

```text
State 3: straight.drift
speedMultiplier = 1
```

| basicSpeed | runtime baseSpeed | state | effectiveSpeed | referenceSpeed | rawVx | finalVx | worldDx | screenDx |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 50 | 50 | 3 / straight.drift | 50 | 115 | -115 | -50 | -0.833 | -1.833 |
| 200 | 200 | 3 / straight.drift | 200 | 115 | -115 | -200 | -3.333 | -4.333 |
| 400 | 400 | 3 / straight.drift | 400 | 115 | -115 | -400 | -6.667 | -7.667 |

## Transition lifecycle

State transitions do rebuild movement runtime data, but they rebuild it from the target resolved state while preserving the same runtime preset object and the same `definition.basicSetup.baseSpeed`.

Transition sequence:

```text
last tick before transition: current state's runtime movement is active
state entry: enterResolvedFsmState sets stateIndex, resets age, creates movement runtime from target state
first tick after transition: target state executes in the transition tick
second tick after transition: same state movement runtime continues
steady-state tick: no re-entry unless a transition condition fires
```

Direct answers:

1. Is baseSpeed copied only at spawn? **Yes, the resolved preset override is materialized at spawn, but the copied `definition.basicSetup.baseSpeed` remains global to all states. It is not copied only into State 1.**
2. Does state entry rebuild movement data with a default speed? **It rebuilds movement runtime from target state movement params; it does not rebuild `definition.basicSetup.baseSpeed` with a default.**
3. Is effectiveSpeed cached only for State 1? **No. It is recomputed from runtime preset baseSpeed and active state multiplier each tick.**
4. Does State 2+ use movement preset speed directly? **No for positive Basic Speed. It uses movement preset speed only as referenceSpeed for normalization. It uses raw preset speed directly only when effectiveSpeed is null, including Basic Speed `0`.**
5. Does transition overwrite runtime definition or velocity? **Transition overwrites `runtime.movement` and resets age; final velocity is then recomputed that tick. It does not overwrite runtime definition/baseSpeed.**
6. Is a state-local field shadowing Basic Speed? **No state-local base-speed field was found. The state-local speed field is `speedMultiplier`.**
7. Does resolver fallback differ between State 1 and later states? **No. Resolver fallback is state data dependent, not index dependent.**
8. Does group anchor transition differ from single-enemy transition? **The group anchor uses the same FSM runtime update/entry/velocity helpers as singles, then moves the group anchor. Members are separate cohesion followers.**
9. Are diagnostics stale after State 1? **Diagnostics are rewritten each movement tick for singles and group anchors. They can be absent or misleading before the first anchor tick, but they are not first-state-only cached after transitions.**
10. Is only member motion wrong while anchor remains correct? **For positive Basic Speed, yes: anchor speed scales correctly across states; visible grouped jerk/stutter is member cohesion/follow history pressure, not anchor baseSpeed loss.**

## Movement reference-speed audit

Hypotheses M1-M6:

- M1 — reference normalization cancels Basic Speed: **Rejected.** It divides by authored preset reference speed and multiplies by effectiveSpeed.
- M2 — raw movement output is already scaled: **Rejected.** Raw output is the movement preset's target delta over `dt`; final velocity is the scaled result.
- M3 — State 1 and State 2+ use different reference speeds: **Confirmed but benign.** `straight.drift` references `115`; `sine.soft` references `130`; final positive-Basic-Speed velocity still normalizes to `effectiveSpeed`.
- M4 — sine mainly changes phase/frequency, not translation: **Confirmed.** The sine modifier changes path shape/phase while the base movement still provides translation.
- M5 — some states have little translational output: **Confirmed for hold/low-translation states only.** `none.hold` has no reference speed and produces no movement unless another modifier creates a target delta.
- M6 — state transition resets reference speed to a preset default: **Rejected.** Transition recreates movement runtime from the target state's movement config; it does not reset Basic Speed.

## Group anchor versus member behavior

Count `1`:

- No member cohesion masks the anchor.
- Positive Basic Speed maps directly to anchor/world speed.
- No catch-up saturation is possible.

Count `5`:

- The group anchor still scales correctly with positive Basic Speed across states.
- Members follow anchor history when Follow is nonzero.
- Higher Basic Speed increases the spatial distance between current anchor and delayed historical samples.
- Elasticity maps to a lower/higher catch-up capacity; high elasticity lowers catch-up capacity.
- Member correction clamps to dynamic cap when distance pressure exceeds response/cap; saturated members can lag and then snap/oscillate as history samples and targets advance.

The group anchor is not the first-stage scaling failure. Member cohesion is the first visible stage that can hide or distort otherwise-correct anchor motion.

## Threshold around 350

Search found no `340`/`350` literal runtime threshold controlling FSM speed.

The closest concrete threshold mechanism is not a fixed constant; it is an effective-speed/follow/cohesion threshold:

```text
trail distance pressure ≈ effectiveSpeed × followDelay × memberSlotIndex
member correction capacity = max(minCatchupSpeed, anchorSpeed × 1.35, distance / responseTime), capped at 2400
```

For Count `5`, the farthest member has slot index `4`. Example with Follow `0.25s`:

```text
farthest sample age ≈ 1.0s
Basic Speed 340 → farthest trail pressure ≈ 340px
Basic Speed 350 → farthest trail pressure ≈ 350px
Basic Speed 400 → farthest trail pressure ≈ 400px
```

So the “near 350” change is an effective group-cohesion operating point, not a hard-coded threshold. Around that speed, large per-frame anchor movement plus delayed member targets makes catch-up and overshoot behavior visibly harsher, especially when state transitions reset movement path phase/history relationships.

## Glitch/stutter mechanism

Exact mechanism:

1. The group anchor's positive Basic Speed is applied correctly.
2. Follow `> 0` makes each member target a delayed anchor-history sample plus formation offset.
3. Higher Basic Speed increases the distance between the member's current position and its delayed target.
4. `applyMemberCohesion()` computes `desiredSpeed = distance / dt`, then caps correction to `dynamicCatchUpCap()`.
5. When target distance grows faster than members can settle smoothly, saturated correction and overshoot-prevention toggling produce visible snapping, lag, or stutter.
6. Transitions can amplify the visual jump because movement runtime target/phase is reset on entry while anchor history still contains the previous state's path.

This is T2/T5 with possible T7 spikes at transitions. It is not a culling/removal/recreation threshold and not renderer snapping.

## Hypotheses confirmed/rejected

Basic Speed dead zone:

- B1 — autoscroll masks world-speed changes below ~350: **Partially confirmed as perceptual compression, rejected as the exact 350 threshold.**
- B2 — Basic Speed is clamped/quantized below ~350: **Rejected.** UI clamps `0..720`, runtime has no 350 clamp.
- B3 — reference-speed normalization cancels scaling: **Rejected.**
- B4 — movement raw output is fixed: **Confirmed for raw preset output, rejected as final output.** Final positive-Basic-Speed velocity is scaled.
- B5 — members mask anchor scaling: **Confirmed for grouped visual behavior.**
- B6 — UI/diagnostics value is stale: **Rejected for the current path after U1.4.10.**

First-state-only:

- F1 — baseSpeed is applied only at spawn/State 1: **Rejected in runtime behavior. BaseSpeed is copied at spawn into the preset, then read globally for all states.**
- F2 — transition resets effectiveSpeed: **Rejected.**
- F3 — later states use stale/default reference speed: **Rejected.** They use their own active movement reference speed.
- F4 — later states read another speed field: **Rejected.** Later states read the same global baseSpeed plus their own speedMultiplier.
- F5 — speedMultiplier fallback differs by state: **Rejected as index behavior. Confirmed only when state data differs or omits multiplier.**
- F6 — transition overwrites final anchor velocity: **Partially confirmed for one tick because velocity is recomputed from the new target, rejected as a baseSpeed overwrite.**
- F7 — only visual output differs; runtime speed is correct: **Confirmed for positive Basic Speed.**

Threshold/glitch:

- T1 — autoscroll crossover: **Rejected.**
- T2 — member catch-up saturation: **Confirmed for grouped high-speed stutter.**
- T3 — culling/removal/recreation: **Rejected.**
- T4 — fixed-step instability: **Rejected as root cause; the fixed step is stable, but high per-frame displacement makes cohesion artifacts more visible.**
- T5 — Follow-history spatial gap amplification: **Confirmed.**
- T6 — renderer rounding/snapping: **Rejected.**
- T7 — transition one-frame spike: **Partially confirmed as an amplifier when movement runtime resets path/phase on state entry, not as the primary speed threshold.**

## Why existing tests pass

The existing tests pass because they validate narrower invariants than the reported browser perception:

- `FsmBasicSetupDraftSynchronization.smoke.ts` proves the DOM Basic Speed value reaches the SPAWN override; it does not compare browser screen-space motion across a sweep.
- `FsmSpeedAuthoritativeRuntime.smoke.ts` proves runtime world/anchor displacement changes with baseSpeed and multiplier; it does not assert low-speed perceptual distinguishability or multi-state browser presentation.
- `FsmRuntimeSpeedAndCohesionDiagnostics.smoke.ts` proves diagnostics fields exist and include speed/cohesion values; it does not fail when screen velocity is camera-offset or when group members look visually jittery at a particular operating point.
- `FsmHighSpeedFollowStability.smoke.ts` bounds catastrophic NaN/runaway behavior at high speed; it does not assert “visually smooth” member cohesion.
- `FsmGroupFollowRuntime.smoke.ts` verifies follow-delay mechanics; it does not sweep `0..500` through real DOM spawn and screen-space perception.
- `FsmStateEditorLiveInputStability.smoke.ts` proves live state slider editing does not tear down the active control; it does not verify Basic Speed across State 1/2/3 transitions.

## Exact root causes

1. **Basic Speed `0` root cause:** `fsmBaseSpeed()` treats `0` as null, so `0` falls back to raw preset movement instead of stopping. This is the first concrete proportional divergence.
2. **0–340 looks unchanged root cause:** the positive-speed world anchor is scaling, but grouped visual output is dominated by camera-offset screen motion and member follow/cohesion smoothing. The runtime does not contain a `0..340` dead zone. The browser symptom is a presentation/cohesion perception issue, not a Basic Speed propagation failure.
3. **Near-350 root cause:** no hard-coded `350` threshold exists. Around `350 px/s`, Count/Follow/Elasticity can push member target distances into a visibly harsher catch-up regime. The effective threshold is `effectiveSpeed × followDelay × slotIndex` relative to dynamic catch-up cap and response time.
4. **First-state-only root cause:** runtime baseSpeed is not first-state-only. The appearance comes from state-local movement shape changes, reference normalization differences, and member cohesion/history masking after transitions. Later states continue to compute `effectiveSpeed` from the same global baseSpeed.
5. **High-speed glitch root cause:** group member cohesion/follow history saturation and transition path/phase reset amplification, while the group anchor remains speed-correct.

## Recommended fixes

Separate minimal fixes only; no fixes were implemented in A5.

1. Basic Speed zero/dead-zone fix:
   - Decide product semantics for Basic Speed `0`.
   - If `0` means stop, change `fsmBaseSpeed()` to return `0` for finite zero and adjust `velocityFromFsmTarget()` to produce zero final velocity when effectiveSpeed is `0`.
   - Keep negative/invalid values as fallback/null.

2. First-state-only perception fix:
   - Add diagnostics that show active state, baseSpeed, speedMultiplier, referenceSpeed, final velocity, anchor speed, and member correction at each transition.
   - Consider visual UI labeling explaining that Basic Speed is global and State Speed × is per-state.
   - Do not duplicate baseSpeed into states.

3. High-speed glitch fix:
   - Tune member cohesion for delayed groups: cap per-frame correction, smooth target sample changes, or make dynamic cap/response depend explicitly on Follow × Count × anchor speed.
   - Preserve smoothness across state transitions by handling movement target/phase reset separately from anchor-history continuity.
   - Keep anchor movement authoritative and deterministic.

4. Missing regression coverage:
   - Add a DOM-spawn-driven sweep smoke that checks Basic Speed values `0,25,50,100,150,200,250,300,325,340,350,360,400,500` for both Count `1` and Count `5`.
   - Add a three-state transition smoke that asserts baseSpeed/effectiveSpeed remain equal across State 1/2/3 and after wraparound.
   - Add a group follow high-speed smoothness diagnostic smoke that asserts saturated member counts and maximum correction remain within expected bounds.

## Required regression tests

Recommended future tests:

- `FsmBasicSpeedZeroSemantics.smoke.ts`: proves chosen `0` behavior exactly.
- `FsmBasicSpeedDomSpawnSweep.smoke.ts`: uses DOM Basic Speed input and actual SPAWN click, then asserts SPAWN override, runtime baseSpeed, effectiveSpeed, finalVx, worldDx, scrollDx, and screenDx.
- `FsmBasicSpeedThreeStateCarry.smoke.ts`: State 1 straight, State 2 sine, State 3 straight; asserts baseSpeed and effectiveSpeed across transitions for `50`, `200`, `400`.
- `FsmGroupFollowCohesionThreshold.smoke.ts`: Count `5`, Follow/Elasticity matrix, Basic Speed sweep around `300..400`, asserting anchor speed remains correct while member saturation is reported.
- `FsmTransitionCohesionSpike.smoke.ts`: captures last tick before transition, entry tick, first/second tick after transition, and steady state for anchor and members.

## Temporary instrumentation

No production instrumentation was committed.

Manual analysis used repository searches, source inspection, and existing smoke tests. No temporary harness file remains in the tree.

## Temporary changes reverted

No temporary code/test/runtime changes were left in the working tree. The only committed diff is this handoff and the handoff README link.

## Explicitly not changed

- production code
- tests
- runtime semantics
- preset storage
- Count
- Formation
- Follow
- Elasticity
- FSM graph
- transitions
- Simple/Smart
