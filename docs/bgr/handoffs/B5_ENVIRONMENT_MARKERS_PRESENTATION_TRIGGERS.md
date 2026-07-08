# B5 — Environment Markers and Presentation Triggers

## Repository/session baseline
Repository `/workspace/MGoD`; local checkout started as synthetic `work` at `1e41098 Merge pull request #116 from catsystemexe/codex/fix-layout-of-pixel-bgr-lab` and task branch `codex/b5-environment-markers` was created from that verified snapshot. The starting working tree was clean. Node was `v20.20.2`; npm was `11.4.2`. B1-B4 were present through typed layer rendering, scene chunks, Pixel BGR Lab MVP, visual placement, and the docked tab layout.

## Source documents used
`AGENTS.md`; `docs/bgr/fable-audit/PIXEL_BGR_LAB_DESIGN_PROPOSAL.md`; `docs/bgr/fable-audit/FABLE_BRG_ARCHITECTURE_OPTIONS.md`; B1, B2, B3, and B4 handoffs. Current implementation files were treated as authoritative when more specific than docs.

## Baseline validation
`npm ci` passed with existing audit advisories and no audit fix. `npm run typecheck`, `npm run test`, `npm run build`, and `git diff --check` passed during the session. Existing B1-B4 targeted smokes passed after updating the B4 docked-layout smoke for the new Markers tab.

## Implemented scope
Added typed global and chunk-local markers, deterministic marker resolution, forward-crossing runtime state, presentation-only layer overrides, opacity pulses, environment-event debug payloads, a Markers tab in Pixel BGR Lab, immutable marker/action editing helpers, validation, serialization preservation, demo markers, targeted smokes, and smoke-runner registration before the known BombExplosionChain failure.

## Files changed
See final diff/commit for the authoritative list: renderer state/types, BGR Lab state/UI/validation, smoke tests, smoke runner, and BGR docs.

## Marker content model
- global markers: optional `BackgroundScene.markers`.
- chunk-local markers: optional `BackgroundChunk.markers`.
- actions: `set-layer-enabled`, `set-layer-opacity`, `pulse-layer-opacity`, and `emit-environment-event`.
- ids: author ids remain owner-local; runtime ids are `global-marker:<id>` and `chunk-marker:<chunkId>:<id>`.
- compatibility defaults: absent marker arrays are valid and resolve to no markers.

## Position and crossing contract
- global/local X: global marker world X is `marker.x`; chunk marker world X is `chunk.startX + marker.x`.
- world-X resolution: pure resolver emits stable world-X order with authored-order tie breaks.
- forward crossing: fires on `previousScrollX < markerWorldX && currentScrollX >= markerWorldX`.
- backward movement: never fires markers.
- once/repeatable: once markers fire once per scene activation; repeatable markers re-arm after scroll moves back below their world X.
- initial activation: establishes baseline without retro-firing markers already behind or at the current scroll.
- scene reset: scene identity changes, typed-state changes, disable/clear, and explicit Lab reset clear runtime state.
- preview behavior: preview reset requests a marker runtime reset so authoring starts from a deterministic scroll baseline.

## Presentation override model
- layer enabled overrides: transient map by canonical B2 runtime layer id.
- opacity overrides: transient map by canonical B2 runtime layer id.
- pulses: transient per-target linear pulse state using presentation delta.
- environment events: presentation-only last event payload, not gameplay EventBus.
- authored scene immutability: actions apply to transient copies/overrides and never mutate source scene descriptors.

## Runtime integration
- effective scroll: marker runtime reads the same gameplay-vs-preview scroll selected for background rendering.
- frame evaluation: markers are resolved/evaluated once per renderer frame for typed scenes.
- renderer flow: scene chunks compose layers, marker actions update presentation overrides, overrides apply, then B1 layer resolver/dispatch draws.
- reset behavior: typed state changes and Lab reset clear marker runtime and presentation overrides.
- unchanged gameplay authority: WorldScrollSystem remains the gameplay scroll authority; markers only read scroll.

## Pixel BGR Lab
- Markers tab: added as the sixth docked tab.
- marker owner: edits global markers or currently selected chunk markers.
- marker operations: select, add, duplicate, delete, toggle, move up/down, edit id/x/enabled/once.
- action editors: all four action kinds are editable.
- layer target selector: built from current global/chunk runtime layer ids and preserves missing targets visibly.
- manual fire: queues selected marker runtime id for the renderer to apply through the same action application helper.
- runtime reset: requests runtime reset, clears presentation overrides in renderer on next frame, and establishes a new baseline.
- debug status: shows last fired marker and last environment event from renderer debug state.

## Serialization and validation
Existing envelope version remains 1. Export/import and draft persistence preserve marker arrays because they serialize the scene model directly. Validation rejects marker errors, warns for empty actions and missing targets, and old marker-less scene JSON remains importable.

## Demo markers
The B2/B4 technical demo now includes a global pulse marker near X=180, a chunk A marker that disables `chunk:chunk-a:near-rocks`, and a repeatable chunk B marker that enables `chunk:chunk-b:near-rocks` and emits `chunk-b-enter`.

## Tests added
`BackgroundMarkers.smoke.ts` covers marker resolution, crossing runtime, action application, pulses, environment events, and immutability. `PixelBgrLabB5.smoke.ts` covers marker helpers, action helpers, serialization, validation, old-scene compatibility, and tab registration.

## Visual Replit verification
Not performed in this terminal-only session. Manual steps are listed in the task prompt and should be executed in Replit: open the Lab, use Markers tab, reset demo, edit markers/actions, manual fire, reset runtime, scrub preview, and round-trip import/export.

## Acceptance criteria
Implemented within B5 scope except live browser/Replit visual verification, which remains manual. No gameplay EventBus integration, enemy spawning, damage, FSM, audio, framebuffer, or scripting was added.

## Known limitations
Manual fire is consumed on the next renderer frame. Environment event history is intentionally bounded to the last event. Only sprite-layer opacity can be visibly overridden because B1 shader/flow layer opacity is not implemented.

## Deferred scope
Gameplay triggers, audio cues, particle/atmosphere/post-FX editors, canvas marker dragging, timelines, conditions, randomness, and scripting remain deferred.

## Audit discrepancies
BGR design docs mention future environmental markers conceptually; the implementation is now limited to presentation-only markers and intentionally does not implement broader timeline/director behavior.

## Recommended next session
Run visual Replit verification and, if needed, add small UI polish for marker debug refresh after manual fire without waiting for a render-frame UI refresh.

## Commands executed
`git status --short --branch`; `git log`; `git branch -vv`; `git remote -v`; `node -v`; `npm -v`; `npm ci`; `npm run typecheck`; `npm run test`; `npm run build`; targeted B1-B5 smokes; `npm run smoke`; diff-review commands; final post-commit validation commands.

## Final verification
Typecheck, targeted test, build, new B5 smokes, and existing B1-B4 targeted smokes passed. Full smoke reached the known unrelated `BombExplosionChain.smoke.ts` failure after B5 smokes passed.

## Commit
`feat(bgr): add environment markers and presentation triggers`.

## Explicitly unchanged
WorldScrollSystem authority, gameplay EventBus, entity/VFX/particle/atmosphere/post-FX pass order, texture ownership, asset binaries, and hosted PR/push/merge state.
