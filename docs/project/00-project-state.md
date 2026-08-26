# Captain Meow — Project State

Status: CANONICAL CURRENT-STATE SUMMARY
Last audited: 2026-08-26

This document summarizes the currently verified project state. It does not override actual code for implemented behavior or explicit active decisions for intended future behavior.

## Repository

Canonical repository: `catsystemexe/CaptainMeow`.

Current active integration line:
- branch: `pixel_bgr`
- GitHub default branch: `pixel_bgr`

Last implementation-bearing checkpoint independently verified by CI and Replit synchronization:
- commit: `940358eb9f35c73d9172c6962e483f8f1f6d51bb`

Documentation-only commits may advance `pixel_bgr` beyond that checkpoint. Therefore this document does not treat a pinned documentation HEAD SHA as a self-updating source of truth; current HEAD must be resolved from GitHub when needed.

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

The BGR B1–B6 line is already represented in `pixel_bgr`. The preservation branch contains a later unfinished follow-up, not the whole BGR implementation.

## Runtime environment

Replit app `C_M` / project URL name `CM` is the runtime/Preview environment identified during audit.

Replit is not a source of repository authority. Its intended role is:
- runtime;
- manual Shell when no connected execution path exists;
- browser/Preview/visual verification;
- environment-specific debugging.

Replit Agent is not a required workflow dependency.

Replit workspace normalization is complete at the verified checkpoint:
- active branch: `pixel_bgr`;
- HEAD: `940358eb9f35c73d9172c6962e483f8f1f6d51bb`;
- working tree: clean;
- `origin`: `https://github.com/catsystemexe/CaptainMeow`;
- preservation branch remains intact;
- `gitsafe-backup` remains untouched.

## Static verification / CI

Minimal GitHub CI is active at `.github/workflows/static-verify.yml`.

The validated baseline is:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

A pre-existing malformed authoring-seek wiring block in `src/game/boot/createGame.ts` was detected by CI and repaired through PR #129. The repair passed the full Static Verify sequence before merge.

This CI does not imply full test coverage. `npm run test` remains a targeted smoke and the broader smoke suite is not a required green gate until its semantics/baseline are reconciled.

## Documentation state

Canonical maintained project documentation is established under `docs/project/`.

Repository-local executor/engineering authority is the consolidated `AGENTS.md`.

Historical/stale material is preserved and classified through `docs/HISTORICAL_DOCUMENTS.md`.

Key classifications include:
- root FSM audit/proposal/final/session documents as historical lineage rather than current global authority;
- June repository audit documents as historical snapshots;
- `docs/architecture/CM_Architecture_v3.1.md` as superseded global authority;
- `docs/decisions/ADR_0001_ModeLockedInit.md` as historical/not currently implemented;
- BGR handoffs as implementation/session evidence;
- historical Drive `___docs` material.

## Audit and consolidation status

Pre-consolidation audit phases P0, P1, F0, F1, F2, F3 and F4 are complete.

Integrated post-gate work:
1. C1 canonical `docs/project/*` bootstrap — PR #124.
2. C2 instruction-authority consolidation — PR #125.
3. C3 documentation migration/historical classification — PR #126.
4. C4 workflow normalization/minimal CI — PR #127 plus baseline repair PR #129.
5. Replit remote/branch normalization — complete and independently reconciled to GitHub `pixel_bgr`.

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

Current consolidation phase: C5 GitHub → Drive one-way canonical-doc mirror.

After C5, remaining priorities are:
- reconcile `main`-unique commits;
- review preserved unfinished BGR follow-up before any cleanup;
- define branch-retention policy;
- perform final consistency audit.
