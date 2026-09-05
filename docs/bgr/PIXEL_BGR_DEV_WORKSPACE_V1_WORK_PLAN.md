# Pixel BGR Dev Workspace v1 — Work Plan

Status: ACTIVE / APPROVED FOR INCREMENTAL IMPLEMENTATION
Created: 2026-09-06
Integration baseline at plan creation: `pixel_bgr@0d52e6ad098938f95ab568925ebdd35137ef7a91`

## Purpose

Replace the cramped floating Pixel BGR Lab layout with a dual-mode display model while preserving the already verified BGR V2 authoring/runtime contracts.

This plan is the active work plan for the current Pixel BGR dev-workspace implementation sequence. It defines target UX structure and scope; current code remains authoritative for implemented behavior.

## Verified baseline

Repair 01–05 infrastructure is complete and Repair 05 is runtime verified.

Verified V2 behavior includes:
- Desert fixture load;
- V2 timeline reachability;
- vertical workspace scrolling;
- horizontal timeline scrolling;
- timeline cursor seek;
- segment drag and selection;
- object selection;
- correct Player X mapping before and after horizontal scroll;
- displayed/runtime/store Player X agreement;
- Desert reset to exactly X=0 paused;
- no new BGR-specific runtime errors during the final Repair 05 acceptance pass.

Current structural problem:
- `PixelBgrLabUI` is still a fixed floating overlay;
- its narrow bounded container forces V2 environment, timeline and inspector content into nested scrolling/panel chrome;
- the timeline is structurally subordinate even though it is a primary authoring surface;
- further micro-polish of the floating overlay is not the default direction.

## Approved product direction

### GAME MODE

Purpose: runtime/gameplay viewing.

Rules:
- game canvas uses the maximum available viewport;
- authoring chrome is hidden;
- no persistent timeline, inspector or scene tree;
- retain only a small DEV launcher on the left and an existing/compatible hotkey where appropriate;
- switching GAME/DEV changes the presentation shell, not background runtime truth.

### DEV MODE

Purpose: authoring/debugging.

Target composition:

```text
┌────────────────────────────────────────────────────────────────────┐
│ TOP BAR: GAME/DEV · scene · transport/X · save/load/import/export │
├──────────────────┬──────────────────────────┬──────────────────────┤
│ LEFT NAVIGATOR   │      GAME VIEWPORT       │ RIGHT INSPECTOR      │
│ Scene / Assets   │                          │ selection properties │
│ / Environment   │                          │                      │
├──────────────────┴──────────────────────────┴──────────────────────┤
│ FULL-WIDTH MULTITRACK TIMELINE                                    │
│ Far / Mid / Near / Foreground / custom tracks / Objects / Player X│
└────────────────────────────────────────────────────────────────────┘
```

The target mental model is a dev application whose game canvas is one workspace region, not a panel floating over the game.

## Region hierarchy

### Tier 1 — primary authoring surfaces
1. Game viewport.
2. Multitrack timeline.

Both receive persistent workspace area.

### Tier 2 — contextual tools
3. Left navigator.
4. Right inspector.

They support the primary surfaces and may collapse on smaller desktops.

### Tier 3 — global controls
5. Top bar.

Contains only workspace/global controls, not detailed selected-element editing.

## Region responsibilities

### Top bar

Include:
- GAME / DEV mode;
- scene identity;
- play/pause/reset and Player X where appropriate;
- Save;
- Load;
- Import;
- Export.

Do not place segment/object/environment property editors in the top bar.

### Left navigator

Initial conceptual modes:
- `SCENE`;
- `ASSETS`;
- `ENV`.

`SCENE` contains the hierarchy rather than turning Tracks, Segments and Objects into separate application-level tabs.

Example:

```text
Tracks
  Far
    segment-a
    segment-b
  Mid
    segment-c
  Near
Objects
  object-a
  object-b
```

Phase 1 may use a simpler list if needed; sophisticated tree behavior is explicitly deferred.

### Game viewport

Acts as runtime preview and spatial authoring surface.

May show:
- selection overlay;
- placement bounds/anchor/origin;
- Player X/contextual guides where useful.

Preserve current renderer/runtime ownership. UI presence must not become runtime authority.

### Right inspector

Selection-driven single inspector.

No selection:
- scene summary.

Track selected:
- role/name/mode/repeat/parallax and applicable track properties.

Segment selected:
- asset;
- start X;
- length/width;
- Y/height where applicable;
- opacity;
- blend;
- localZ;
- parallax/inheritance;
- role and other existing supported segment properties.

Object selected:
- asset;
- X/Y;
- width/height;
- opacity;
- blend;
- localZ;
- role and other existing supported object properties.

Selection origin must not matter. Selecting from timeline, hierarchy or canvas should lead to the same selection state and inspector.

### Bottom multitrack timeline

Primary authoring surface, full application width below the main three-column region.

Requirements:
- Far, Mid, Near, Foreground, custom tracks and Objects support;
- fixed/sticky track-label column;
- horizontally scrolling timeline content;
- vertical scrolling only when the number of tracks requires it;
- Player X cursor;
- segment move;
- segment resize;
- overlap visualization;
- object markers;
- preserve exact V2 authored-bounds seek mapping;
- preserve horizontal-scroll mapping correctness.

The timeline spans beneath left navigator + canvas + right inspector, not only beneath the canvas.

## Migration of current floating Lab elements

| Current element | Target region |
| --- | --- |
| V2 scene toolbar | Top bar |
| Save / Load / Import / Export | Top bar |
| Clear saved V2 | Secondary/destructive action |
| Environment panel | Left `ENV` |
| Track list | Scene hierarchy + timeline labels |
| Segment list | Scene hierarchy + timeline |
| Object list | Scene hierarchy + Objects timeline row |
| Segment properties | Right inspector |
| Object properties | Right inspector |
| Placement controls | Right inspector + game viewport |
| Current X | Top bar + timeline |
| V2 timeline | Full-width bottom region |
| Validation warnings | Status/inspector area |
| Message/status box | Non-blocking status area |
| Floating Lab opacity control | Remove from ordinary authoring surface unless later justified |

## Consolidate / remove

Do not preserve these as target UX concepts:
- floating BGR window as the main authoring model;
- box-in-box panel chrome for every subsection;
- duplicate selection/property surfaces that require manual tab switching after selecting an item;
- dominant technical mode badges that consume authoring area.

Use spacing, typography, background levels and restrained dividers for hierarchy instead of nested borders.

## Responsive desktop behavior

### Wide desktop (roughly >=1500 px)

Target ranges:
- left navigator: ~240–280 px;
- right inspector: ~280–340 px;
- timeline: ~260–340 px high;
- center viewport consumes remaining width/height.

### Smaller desktop/laptop (roughly 1100–1499 px)

Priority order:
1. preserve useful canvas area;
2. preserve full-width timeline;
3. narrow/collapse left and right side regions.

Sidebars may be independently collapsible. Do not solve laptop layout by shrinking every region proportionally.

### Below roughly 1000 px

Full mobile authoring is out of scope.

Use at most one auxiliary sidebar at a time or a docked inspector if needed. Preserve a minimum useful viewport and timeline area.

## Interaction model

### Track selection

Selecting a timeline track label or scene-hierarchy track sets the shared selected track. Reflect selection in both surfaces and show track properties in the inspector.

### Segment selection

Selecting a segment sets selected track + selected segment and clears object selection. Reflect selection in timeline/hierarchy/canvas where applicable and show segment inspector.

### Object selection

Selecting an object from timeline, hierarchy or canvas sets the same object selection and inspector state.

### Segment drag / resize

Preserve the verified editing contract:
- body drag = move;
- left/right handles = resize.

Do not redesign timeline movement math during shell migration.

### Timeline seek

Clicking empty timeline content seeks Player X. Segment/object hit targets take precedence over background seek.

Preserve `createExactTimelineScale()` behavior and the verified authored-bounds mapping from Repair 05.

### GAME / DEV switch

Do not auto-pause solely because DEV mode opens. Runtime play/pause remains explicit state. DEV selection may remain internally preserved when returning to GAME mode, while all authoring chrome/placement overlays are hidden.

## Cursor flicker risk

The visible cursor flicker observed in the old Lab remains a UX finding, not a confirmed root cause.

Migration rules intended to reduce the risk:
- stable workspace shell DOM;
- stable timeline rows where practical;
- update properties/geometry rather than rebuilding interactive subtrees unnecessarily;
- explicit cursor states (`default`, `pointer`, `grab`, `grabbing`, `ew-resize`);
- no passive transparent pointer-intercepting layers above the timeline.

If flicker persists after shell migration, investigate it on the new structure instead of optimizing obsolete overlay DOM first.

## Migration strategy

Phase 1 is recomposition, not a full editor rewrite.

Preserve:
- existing V2 data model;
- current rendering/runtime contracts;
- current serialization schema;
- selection/editing semantics where already verified;
- timeline coordinate math;
- Repair 05 exact V2 timeline scale;
- `window.__CM` compatibility and current debug integration where applicable.

Preferred later decomposition, only when justified by the implementation:
- `PixelBgrDevWorkspace.ts`;
- `PixelBgrWorkspaceTopBar.ts`;
- `PixelBgrSceneNavigator.ts`;
- `PixelBgrInspector.ts`;
- `PixelBgrTimelineView.ts`;
- `PixelBgrViewportTools.ts`.

Do not force this component split in the first migration patch if it increases regression surface.

## Minimal Phase 1 scope

Implement incrementally in this order:

### P1.1 — Dual-mode shell foundation
- GAME / DEV presentation modes;
- small DEV launcher on the left;
- retain compatible existing hotkey behavior;
- establish workspace root/layout regions without changing BGR V2 model or timeline math.

### P1.2 — DEV grid composition
- compact top bar;
- left region;
- center game viewport region;
- right inspector region;
- bottom full-width timeline region.

### P1.3 — Full-width timeline migration
Preserve and relocate existing V2 functionality:
- exact scale;
- seek;
- horizontal scroll;
- Player X;
- segment selection;
- segment move/resize;
- overlap display;
- object markers/selection.

### P1.4 — Selection-driven right inspector
Move/recompose existing track/segment/object properties into a single contextual right inspector. Do not create a second property model.

### P1.5 — Basic left navigation
Provide a minimal scene/track/object navigation surface and environment access. Sophisticated hierarchy/asset tooling remains deferred.

### P1.6 — Structural responsive pass and UX polish
- collapsible/narrow desktop side regions;
- reduce nested panel chrome;
- verify pointer/cursor stability;
- retain usable timeline/canvas allocation.

## Explicitly out of scope for Phase 1

Do not redesign yet:
- thumbnail-rich asset browser;
- asset drag-and-drop to timeline/canvas;
- sophisticated scene tree;
- context menus;
- broad keyboard shortcut system;
- undo/redo;
- multiselect;
- track reorder/groups;
- custom-track creation UX overhaul;
- timeline zoom/minimap/ruler redesign;
- snapping redesign;
- marker architecture;
- blend architecture/UI overhaul;
- iconification/tooltips as a design project;
- mobile authoring;
- generic editor framework for unrelated dev tools;
- React/framework migration;
- BGR renderer/runtime architecture;
- V1 cleanup/migration unless required by a concrete compatibility regression.

## Verification policy

Each implementation slice requires STATIC VERIFY appropriate to UI/developer-tool work:
- inspect full focused diff;
- `git diff --check` where available;
- `npm run build`;
- relevant targeted smoke/tests;
- report known unrelated failures separately.

RUNTIME VERIFY is performed afterward in local VS Code / VS Code Agent when the slice changes visible/interacting UI behavior.

Never claim runtime/visual verification from static checks alone.

## Implementation safety

For each slice:
1. verify current integration branch X and HEAD;
2. create focused Y from verified X;
3. implement only the approved slice;
4. static verify;
5. commit and push Y;
6. review remote diff/evidence;
7. create PR Y -> verified X and merge only when authorized;
8. use VS Code / VS Code Agent for runtime verification when required;
9. route runtime source defects back to a focused implementation/repair branch.

No broad unrelated refactors, destructive history operations, branch deletion or deployment.

## Primary design principle

Do not optimize the obsolete mental model:

```text
GAME -> floating tool -> tabs -> nested panels -> timeline
```

Implement toward:

```text
BGR DEV WORKSPACE
├─ game viewport
├─ full-width multitrack timeline
├─ scene navigation
├─ contextual inspector
└─ compact workspace controls
```

Phase 1 succeeds when the BGR authoring experience is structurally a workspace while already verified V2 editing/runtime contracts remain intact.
