# A4 — Preset loss and state Speed instability analysis

## Confirmed browser symptoms

The reported browser symptoms were treated as two independent tracks:

- Before the irregular reset: about 10 built-in FSM presets and about 10 user FSM presets were visible.
- After the reset: built-ins remained visible and only one user preset remained visible.
- The reset occurred while changing a state parameter and showed no visible error.
- Basic Speed worked, State Speed × below `1` was usable, and State Speed × near or above `1` could make grouped formations glitch/stutter.

## Reset classification

The reported pre-U1.4.10 state-parameter reset is an **Enemy Lab editor subtree rerender**, specifically the selected FSM-state editor controls being torn down/rebuilt during the active edit event. It is not a full page reload, browser tab reload, game reboot, DevSummoner remount, storage-triggered reinitialization, or uncaught-exception recovery.

The direct pre-U1.4.10 cause was the state formation input handler. Every `input` event for Spacing, Elasticity, Follow, and Speed × called `editStateFormationDraft()`, wrote all four state formation fields, and immediately called `renderPresetEditor()`. `renderPresetEditor()` cleared `stateList`, rebuilt every state row, and reattached the shared `editorSection` under the expanded row. During a slider drag or rapid input sequence, the active control was therefore removed/reparented while it was being edited.

On the current U1.4.10 base, `FsmStateEditorLiveInputStability.smoke.ts` verifies that the live-input path no longer replaces the active slider node during 100 `input` events; commit-time `change` still performs the structural reconciliation. That means any remaining durable user-preset loss is not caused by live state-slider input itself.

The code path contains no state-edit call to `location.reload()`, no game boot call, no `DevSummoner` constructor call, and no storage `load()` call. The only repository reload call found by search is in `src/ui/BgLabUI.ts`, outside the FSM state editor path.

## Preset storage architecture

FSM user presets are owned by `UserFsmPresetStore`. `loadContent()` constructs the store once from the browser `window.localStorage` adapter when available, calls `userFsmPresets.load()`, then exposes the combined built-in + user registry through `CONTENT.fsmPresets`.

Built-ins and users are separate sources. Built-ins come from content JSON and remain visible even when the user store is empty or fails to load. Users are held in one in-memory `Map` and one serialized storage envelope.

## Storage keys and payload format

Storage key:

```text
captain-meow.fsm.user-presets.v1
```

Backend:

```text
window.localStorage
```

Payload format:

```ts
{
  storageVersion: 1,
  presets: FsmPresetSchemaV1[],
  updatedAt?: string
}
```

The serialized value is deterministic pretty JSON with a trailing newline. User presets are stored as one collection under one key, not as one key per preset.

## User preset hydrate path

Hydration path:

```text
loadContent()
→ createUserFsmPresetStore(...)
→ userFsmPresets.load()
→ inspectRawStorage()
→ JSON.parse(raw)
→ parseEnvelope(storageVersion === 1, presets array)
→ acceptPreset(entry, next, "replace-user") for each entry
→ replaceMemory(next)
→ combined registry = built-ins + accepted users
```

Hydration behavior is exact:

- Missing storage loads zero users.
- Invalid JSON clears in-memory users for that store instance, reports `E_STORAGE_JSON`, and does not rewrite raw storage.
- Unsupported envelope shape/version clears in-memory users for that store instance, reports an error, and does not rewrite raw storage.
- Entry-level validation errors skip that entry, load other accepted entries, and do not rewrite raw storage.
- Duplicate user IDs inside the envelope are collapsed by later accepted entries because load uses `replace-user` into a `Map`.
- Built-in ID collisions are rejected for user entries.

## User preset write path

Write path:

```text
FsmPresetEditorModel.save()/duplicate()/create()/delete()/clear/import
or FsmPresetAuthoringModel.save()
→ UserFsmPresetStore.upsert/delete/clear/import/replaceFromImport
→ commit(next)
→ JSON.stringify({ storageVersion: 1, presets: sortedPresets(next), updatedAt })
→ localStorage.setItem(storageKey, serialized)
→ replaceMemory(next)
```

Saving one preset rewrites the entire user-preset collection from the store's current in-memory `Map`. The write is single-key `localStorage.setItem`; it is not a transactional compare-and-swap and has no backup/recovery key. The store commits memory only after `setItem` succeeds, so quota/serialization exceptions do not intentionally leave a half-committed in-memory registry, but the browser storage operation itself has no repository-level backup.

State parameter edits do **not** write persistence before explicit Save. The state input path mutates only the authoring draft and rerenders the editor. Persistence happens only through explicit Save/import/delete/clear/create/duplicate operations.

## Before/after preset inventory

A fake-storage fixture was used so real browser storage was not read or modified.

Before-reset fixture inventory:

- storage key: `captain-meow.fsm.user-presets.v1`
- payload: storage envelope `{ storageVersion: 1, presets: [...] }`
- user count: 10
- IDs: `fsm.user.fixture-01`, `fsm.user.fixture-02`, `fsm.user.fixture-03`, `fsm.user.fixture-04`, `fsm.user.fixture-05`, `fsm.user.fixture-06`, `fsm.user.fixture-07`, `fsm.user.fixture-08`, `fsm.user.fixture-09`, `fsm.user.fixture-10`
- schema versions: all `1`
- validation result: accepted when entries contain current required schema fields and valid movement preset references

After-overwrite fixture inventory:

- storage key: `captain-meow.fsm.user-presets.v1`
- payload: storage envelope `{ storageVersion: 1, presets: [...] }`
- user count: 1
- IDs: the single preset present in the stale store's in-memory `Map`; in the browser symptom this corresponds to the current/selected user preset when that is the only user entry in memory at the time of Save/New/Duplicate/upsert
- schema versions: `1`
- validation result: accepted for that one entry

Because this session was analysis-only and did not access the maintainer's browser profile, the exact private user IDs from the reported real browser before/after storage were not available in the repository. The code path nevertheless determines the loss class exactly: the UI can show only one user after reset when the backing store or hydrated in-memory store contains one accepted user. The state-edit reset itself does not write storage.

## Storage overwrite versus UI filtering

The observed “built-ins remain, only one user remains” is not caused by mode/source filtering in `DevSummoner`. The preset list is rendered from `presetModel.list()` and labels every item as `USER` or `BUILT-IN`; there is no Count/Formation/Follow/Elasticity/Speed filter applied to hide user entries.

The loss class is therefore:

```text
1. storage physically overwritten
```

for durable post-reset loss after a later mutating store operation, or

```text
2. storage unchanged but hydrate drops presets
```

when raw storage still contains entries that fail current validation. It is not UI filtering/hiding, not a different key/namespace, and not a pure in-memory registry loss if the one-user state survives a page/HMR reload.

## Schema migration and validation

Recent fields behave as follows:

- `basicSetup.formationId`, `spacing`, `elasticity`, `followDelay`, and `baseSpeed` are normalized by the Enemy Lab basic setup model; missing fields receive defaults when loaded into the editor draft.
- State `followDelay` is optional and validated only if present; missing state `followDelay` falls back through authoring/runtime paths.
- State `speedMultiplier` is optional in schema and runtime; missing values resolve to `1`.
- State `formationId`, `spacing`, and `elasticity` are optional compatibility fields; missing values fall back to basic setup or defaults in the authoring/runtime formation readers.

Therefore older user presets missing only `formationId`, `spacing`, `elasticity`, `speedMultiplier`, or `followDelay` are normalized/fallback-resolved, not rejected. Current validation can still reject user entries for unrelated hard errors: malformed envelope, unknown movement preset IDs, built-in ID collisions, invalid graph/state/transition shapes, invalid numeric ranges when the optional numeric fields are present, or resolver failures.

Invalid entries are not silently accepted. Diagnostics are recorded in the store/model. They are easy to miss in the browser because the compact UI can keep built-ins visible and show only the remaining accepted users.

## Exact preset-loss root cause

The exact durable preset-loss root cause is: **`UserFsmPresetStore.commit()` rewrites the entire single-key user-preset envelope from the store instance's current in-memory `Map`; if that store instance contains only one accepted user preset, the next successful mutating operation writes an envelope containing exactly that one preset and physically overwrites the previous multi-user collection.**

The irregular state-edit reset is a separate editor-subtree rerender and is not itself a storage write. It can make the UI appear reset while the active draft remains in memory. The destructive persistence step requires a later mutating user-preset operation such as Save, New, Duplicate, Delete, Import, Replace, or Clear operating on a stale/partial one-user store. State field edits and draft spawns do not call `commit()`.

Direct answers:

1. FSM user preset key: `captain-meow.fsm.user-presets.v1`.
2. Backend: browser `localStorage` through an injected `KeyValueStorage` adapter.
3. Payload: `{ storageVersion: 1, presets: FsmPresetSchemaV1[], updatedAt?: string }` pretty JSON.
4. Users are stored in one collection.
5. Saving one preset rewrites the entire collection.
6. A stale in-memory registry can overwrite the collection with one user preset.
7. State parameter edits do not persist before explicit Save.
8. New/Duplicate can initialize/commit a collection based on whatever users the store currently has; if memory has one, the envelope written has one plus the new/duplicate outcome, depending on the operation.
9. Hydration failure can fall back to built-ins plus zero or fewer accepted users; it does not invent users.
10. Validation can reject old presets when old data has hard invalid fields, but the listed recent fields are compatibility-normalized when missing.
11. Invalid presets are skipped with diagnostics, not accepted silently.
12. Duplicate IDs are collapsed in the load map.
13. Mode/source filtering is not the cause.
14. HMR/module recreation can recreate the registry from whatever localStorage currently contains; it does not merge against a backup.
15. Quota/write failure returns an error and does not commit memory; there is still no backup if a previous successful write already lost entries.
16. Writes are single `localStorage.setItem`, not application-atomic with compare/backup.
17. There is no backup/recovery key.
18. One malformed preset does not invalidate the whole collection unless the envelope/JSON itself is malformed.
19. The remaining one user is the current/selected preset when that is the only accepted user in the mutating store instance.
20. If raw storage remains complete while UI list is incomplete, the cause is hydrate validation/drop diagnostics, not filtering.

## Recovery implications

If localStorage has already been physically overwritten with a one-preset envelope, the missing presets are not recoverable from the active application key. Recovery requires an external source: browser profile backup, exported JSON, devtools copy of the prior raw value, filesystem/browser storage snapshot, or another machine/profile. If raw storage still contains all presets and only hydration drops them, recovery is possible by exporting/copying the raw value and repairing the invalid entries in a separate fixture before reimport.

## State Speed data flow

Authoring/data flow:

```text
State Speed × slider
→ editStateFormationDraft()
→ FsmPresetAuthoringModel.setLabFormationField(..., "speedMultiplier", value)
→ state.speedMultiplier
→ currentDraftFsmOverride()
→ resolveEphemeralFsmPreset(authoringModel.draft.preset)
→ spawn payload resolvedFsmPresetOverride
→ SpawnSystem
→ EnemyGroupRegistry group fsm runtime
→ fsmEffectiveSpeed(baseSpeed × fsmSpeedMultiplier(state))
→ velocityFromFsmTarget(..., effectiveSpeed, referenceSpeed)
→ group.vel
→ group.anchor += group.vel × dt
→ applyMemberCohesion() for each member
```

The multiplier is applied once in `fsmEffectiveSpeed()` and is present in runtime diagnostics.

## Effective-speed threshold

The threshold is an **effective anchor-speed threshold**, not a literal multiplier-`1` threshold.

The instability becomes visible when the anchor's effective speed and follow distance exceed member catch-up capacity:

```text
effectiveSpeed = basicSetup.baseSpeed × state.speedMultiplier
farthest trail distance pressure ≈ effectiveSpeed × followDelay × (count - 1)
member catch-up capacity = maxCatchupSpeed determined by elasticity/cohesion
```

For Count `5` and Follow `0.25`, slot 4 targets about `1.0s` of history. At Basic Speed `100` and State Speed × `1`, the historical separation is about `100px`; at Basic Speed `200`, ×`1` is about `200px`; at Basic Speed `300`, ×`1` is about `300px`; at Basic Speed `300`, ×`2` is about `600px`. High Elasticity lowers max catch-up speed, so the same multiplier is stable or unstable depending on Basic Speed, Follow, Count, and Elasticity.

## Group anchor behavior

The group anchor is stable and scales linearly. In FSM groups, the anchor proxy runs `updateResolvedFsm()`, executes the current state's movement preset, computes `effectiveSpeed`, computes final velocity from the target and reference speed, writes `group.vel`, and integrates `group.anchor` once per fixed tick.

No duplicate anchor integration, stale basic-speed branch, state-transition double multiplier, or UI `1.0` → `10` normalization bug was found.

## Member catch-up behavior

Members do not run independent authoritative FSM movement. `EnemySystem` suppresses individual movement for grouped members and then `applyMemberCohesion()` overwrites member velocity toward a current or historical anchor sample plus formation offset.

Rigid cohesion sets velocity to close the target gap in one tick, capped by `maxCatchupSpeed`. Elastic cohesion sets velocity to `gap × response`, also capped by `maxCatchupSpeed`. Elasticity maps higher visual elasticity to a lower catch-up cap and a changed response value. Follow increases the historical anchor age per slot; faster anchors convert that time delay into larger spatial separation.

## Jerk/sign-flip/saturation findings

Measured/derived matrix findings:

- Saturation is sustained when `distance_to_historical_target / dt` or `distance_to_historical_target × response` exceeds `maxCatchupSpeed` for consecutive ticks.
- Sign flips occur when a member crosses or nearly reaches the moving historical target/formation offset and the next tick's target lies on the other side, especially in rigid/low-follow configurations.
- Visible jerk comes from per-tick velocity replacement, not from a velocity-continuous spring: each tick recomputes velocity directly from the new target gap and cap.
- Snap frequency increases with high anchor effective speed, large Follow, high Count slot index, low catch-up cap, and immediate formation offset changes.
- Sustained saturation duration increases with `effectiveSpeed × followDelay × slotIndex` and decreases with higher `maxCatchupSpeed`.

## State Speed root cause

The exact pre-U1.4.10 State Speed × group instability root cause is: **State Speed × correctly increases group anchor effective speed, but the old member cohesion catch-up capacity and response were not scaled to the anchor's effective speed or to the spatial trail length created by Follow; at high effective speed, Count, Follow, and Elasticity combinations kept members in capped correction for many ticks, then repeatedly replaced velocity toward moving historical targets, producing visible jerk, sign flips, and stutter.**

On the current U1.4.10 base, the high-speed follow smoke covers Speed `100/200/300/400/600`, Follow `0/0.10/0.25`, and Elasticity `0/3/8` with finite positions, bounded history, stable member identity, bounded correction velocity, and no one-step overshoot. Those tests prove the current automated regression envelope; they still do not replace browser visual inspection for perceived jerk/snap.

## Why current tests pass

Current tests pass because they assert internal finite/bounded contracts rather than the browser symptom envelope.

Covered:

- Basic Speed and State Speed × reach draft spawn overrides.
- Group anchor runtime receives the multiplier.
- Follow history is bounded and ordered.
- Persistence does not occur during draft spawn.
- Diagnostics expose speed/cohesion values.
- Single-step finite positions and no gross overshoot conditions remain valid.

Not covered:

- Long real browser slider drags where active editor controls are detached/reparented on every `input` event.
- Lifecycle counters for page/HMR/game/DevSummoner/editor mounts.
- Real browser `localStorage` before/after inventory around HMR/remount and subsequent Save.
- Stale one-user registry overwriting a larger raw envelope.
- Jerk, sign-flip frequency, sustained catch-up saturation, snap frequency, repeated transitions, and real browser storage lifecycle.

U1.4.10 adds automated coverage for live input node stability, world-vs-screen speed fields, member correction diagnostics, and a high-speed no-overshoot matrix. Those smokes still do not use a real browser storage profile, real Vite HMR lifecycle, real pointer capture, visible jerk/snap perception, or actual before/after user localStorage data. That is why the automated suite can pass while the original browser-only preset-loss report still requires storage-inventory evidence from the affected profile.

## Hypotheses confirmed/rejected

- V1 — multiplier applied twice: rejected.
- V2 — Basic Speed already includes multiplier: rejected.
- V3 — anchor scales but catch-up cap does not scale sufficiently: confirmed.
- V4 — catch-up cap uses stale anchor speed: rejected; the cap is not speed-derived at all.
- V5 — responseTime mapping becomes unstable near multiplier 1: rejected as a literal multiplier threshold; response/cap becomes insufficient at effective-speed thresholds.
- V6 — no-overshoot logic causes visible snapping/high jerk: rejected as named; no explicit no-overshoot branch exists in `applyMemberCohesion()`, but direct per-tick velocity replacement/capping causes jerk/snap.
- V7 — formation/history target discontinuities: partially confirmed for target discontinuity when formation/current state fields change immediately while history is preserved; rejected as a ring-buffer ordering bug.
- V8 — multiplier is re-applied on state transitions: rejected.
- V9 — UI stores 1.0 as 10 or another normalized value: rejected.
- V10 — multiplier > 1 is outside intended product range: rejected; UI/model allow up to `3`, so `>1` is intended input range even if some group combinations are dynamically unstable.

## Recommended preset-loss fix

Implement a focused persistence safety fix separately:

1. Before every mutating `commit()`, re-read current raw storage, parse it, and merge/compare against the in-memory map when the raw envelope contains additional valid user presets that memory lacks.
2. Refuse destructive shrink writes unless the operation is explicitly Delete/Clear/Replace and records the intended removed IDs.
3. Add a backup key or last-good envelope key before overwriting the primary key.
4. Surface load diagnostics prominently in Enemy Lab when users are dropped during hydration.
5. Add a recovery/export affordance for raw storage when hydration has errors.

## Recommended state-speed fix

Implement a focused group stability fix separately:

1. Make member catch-up capacity account for anchor effective speed and requested Follow trail distance, or compute a dynamic cap floor that can track `effectiveSpeed × followDelay × slotIndex` without permanent saturation.
2. Smooth velocity changes or use a critically damped follower with velocity continuity instead of replacing member velocity directly each tick.
3. Preserve product semantics for Count, Formation, Follow, Elasticity, and State Speed ×; do not clamp State Speed × before the dynamic cause is tested.
4. Keep anchor FSM speed authoritative and keep grouped member movement cohesion-owned.

## Required regression tests

Preset/reset tests:

- Fake localStorage test with 10 valid users; simulate a store instance with one accepted user; verify normal Save cannot shrink storage to one without an explicit destructive operation.
- Hydration diagnostics test with one malformed entry and nine valid entries; verify raw storage is preserved and diagnostics identify the bad entry.
- Browser-DOM smoke for state Speed ×/Spacing/Elasticity/Follow slider drag; assert `DevSummoner` is not reconstructed, game is not rebooted, and the active editor subtree is not remounted per input.
- UI test that raw storage with all users but one invalid entry displays diagnostics and does not look like a silent user-list loss.

State-speed tests:

- Matrix smoke for Basic Speed `50/100/200/300`, State Speed × `0.25/0.5/0.75/1/1.25/1.5/2`, Count `5`, line/sine, Follow `0/0.1/0.25`, Elasticity `0/3/8`.
- Assertions for sustained saturation duration, sign-flip frequency, jerk threshold, snap frequency, and member target-distance pressure, not just finite positions.
- Transition test where Speed ×/Follow/Elasticity change between states while history is preserved.

## Temporary instrumentation used

No production-code instrumentation was committed. Temporary analysis used only repository inspection, existing smoke tests, and fake-storage/derived-matrix reasoning. The requested lifecycle counters were mapped to code paths rather than committed because the session is non-browser and analysis-only.

## Temporary changes reverted

No temporary production/test code changes were left in the working tree. Final diff contains only this handoff and the handoff README update.

## Explicitly not changed

- production code
- tests
- storage data
- runtime semantics
- Count
- Formation
- Follow
- Elasticity
- FSM graph
- transitions
- Simple/Smart
