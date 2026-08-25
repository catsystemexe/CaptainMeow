# Captain Meow — Project State

Status: CANONICAL CURRENT-STATE SUMMARY
Last audited: 2026-08-26

This document summarizes the currently verified project state. It does not override actual code for implemented behavior or explicit active decisions for intended future behavior.

## Repository

Canonical repository: `catsystemexe/CaptainMeow`.

Current saved integration baseline after canonical-doc and instruction-authority integration:
- branch: `pixel_bgr`
- commit: `d4529ca39ea5f763549c0e8f5e939eeef04e91e6`
- GitHub default branch: `pixel_bgr`

`work` is an older ancestor of the active integration line and must not be assumed to be current.

`main` diverges from `pixel_bgr`. At the audit checkpoint it contained five commits not present on `pixel_bgr`; therefore it remains preserved until those commits are classified/reconciled.

The active integration branch is a resolved project-state fact, not a permanent hard-coded branch name. Current work must verify the approved integration branch before implementation.

## Preserved unfinished Replit work

A newer unfinished Replit-only BGR Lab change was preserved before consolidation:
- branch: `backup/replit-bgr-lab-preaudit-20260825`
- commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

This branch is PRESERVED UNFINISHED EVIDENCE. It is not automatically the canonical implementation branch and must not be merged without explicit review.

## Current implementation shape

Captain Meow is a TypeScript/Vite browser game with a deterministic fixed-step gameplay core and development/authoring tooling.

Verified implementation families include:
- engine loop, EventBus and entity infrastructure;
- gameplay world/session systems;
- player, enemies, FSM/behavior systems and group/spawn tooling;
- weapons, projectiles, collisions, damage, scoring and pickups;
- data-driven gameplay/content definitions;
- WebGL rendering and presentation layers;
- background/BGR scene systems;
- Pixel/Scene BGR authoring tools, timeline and gameplay seek support;
- developer UI/labs and smoke checks.

The BGR B1–B6 line is already represented in `pixel_bgr`. The preserved Replit branch contains a later unfinished follow-up, not the whole BGR implementation.

## Runtime environment

Replit app `C_M` / project URL name `CM` is the runtime/Preview environment identified during audit.

Replit is not a source of repository authority. Its intended role is:
- runtime;
- manual Shell when no connected execution path exists;
- browser/Preview/visual verification;
- environment-specific debugging.

Replit Agent is not a required workflow dependency.

At the audit checkpoint Replit `origin` still used the historical repository name `catsystemexe/MGoD`; GitHub redirected it to `catsystemexe/CaptainMeow`. Normalization remains pending.

## Documentation state

Canonical maintained project documentation is now established under `docs/project/`.

Repository-local executor/engineering authority is the consolidated `AGENTS.md`.

Historical/stale material is preserved and classified through `docs/HISTORICAL_DOCUMENTS.md`. Key classes include:
- root FSM audit/proposal/final/session documents as historical lineage rather than current global authority;
- June repository audit documents as historical snapshots;
- `docs/architecture/CM_Architecture_v3.1.md` as superseded global authority;
- `docs/decisions/ADR_0001_ModeLockedInit.md` as historical/not currently implemented;
- BGR handoffs as implementation/session evidence;
- historical Drive `___docs` material.

`README.md` is being refreshed in C3 to point to current canonical sources instead of the obsolete “no gameplay implemented” description.

## Audit and consolidation status

Pre-consolidation audit phases P0, P1, F0, F1, F2, F3 and F4 are complete.

Integrated post-gate work:
1. C1 canonical `docs/project/*` bootstrap — merged via PR #124.
2. C2 instruction-authority consolidation — merged via PR #125.
3. C3 documentation migration/historical classification — active focused change set.

Approved operating model:
1. Git repository = canonical implementation and versioned project documentation.
2. Drive = synchronized mirror/backup plus audit workspace.
3. Replit = runtime/Shell/visual verification.
4. ChatGPT = design, audit, authority resolution and orchestration.
5. Codex = preferred execution-backed environment for non-trivial code changes.
6. Cross-project roles = `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]`; Code mode is a process/safety overlay.
7. Active integration branch is dynamically resolved; fixed `work/main` authority is retired.
8. Branch cleanup occurs only after unique-content reconciliation.

## Current next work

After C3 integration, remaining governance/workflow priorities are:
- align actual ChatGPT Project Instructions UI with the versioned project profile/shared framework;
- normalize the Replit `origin` after confirming/preserving runtime workspace state;
- introduce minimal GitHub CI with accurate validation semantics;
- establish one-way GitHub → Drive canonical-doc synchronization;
- reconcile `main`-unique commits and preserved unfinished BGR work before branch cleanup;
- perform final consistency audit.
