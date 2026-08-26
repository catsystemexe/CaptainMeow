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

`main` was reconciled during C6. Its five commits not present on `pixel_bgr` are historical merge-topology only; the final `main` tree contributes no net unique file-state content requiring promotion. Retaining or deleting the branch is therefore a historical-retention choice rather than a data-preservation requirement.

The active integration branch is a resolved project-state fact, not a permanent hard-coded branch name. Current work must verify the approved integration branch before implementation.

## Preserved Replit evidence

A Replit-only BGR Lab state was preserved before consolidation:
- branch: `backup/replit-bgr-lab-preaudit-20260825`
- commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Its functional `createGame.ts` seek-wiring intent was subsequently promoted to canonical integration through PR #129 and passed Static Verify. The branch now remains preservation/history evidence only; it must not be merged automatically.

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

The BGR B1–B6 line is represented in `pixel_bgr`.

## Runtime environment

Replit app `C_M` / project URL name `CM` is the runtime/Preview environment identified during audit.

Replit is not a source of repository authority. Its intended role is:
- runtime;
- manual Shell when no connected execution path exists;
- browser/Preview/visual verification;
- environment-specific debugging.

Replit Agent is not a required workflow dependency.

Last verified live Replit checkpoint:
- active branch: `pixel_bgr`;
- HEAD: `940358eb9f35c73d9172c6962e483f8f1f6d51bb`;
- working tree: clean;
- `origin`: `https://github.com/catsystemexe/CaptainMeow`;
- preservation branch remains intact;
- `gitsafe-backup` remains untouched.

All Git commits between that checkpoint and the C7 audit checkpoint were documentation-only, so this is not an implementation/runtime divergence.

## Static verification / CI

Minimal GitHub CI is active at `.github/workflows/static-verify.yml`.

Validated baseline:
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

## Drive canonical mirror

Dedicated mirror location:
- `___CaptainMeow/___CANONICAL_MIRROR`
- contents: all seven canonical `docs/project/*` documents plus `README_MIRROR` manifest.

Git remains canonical. Drive copies are one-way mirror/backup only and must not become an independent edit authority.

The C7 audit found the mirror content aligned with the pre-C6 canonical Git state, while `README_MIRROR` provenance still referenced the earlier initial snapshot. After this final canonical closeout is integrated, affected mirror files and the manifest must be synchronized to the resulting Git checkpoint.

## Audit and consolidation status

Pre-consolidation audit phases P0, P1, F0, F1, F2, F3 and F4 are complete.

Integrated post-gate work:
1. C1 canonical `docs/project/*` bootstrap — PR #124.
2. C2 instruction-authority consolidation — PR #125.
3. C3 documentation migration/historical classification — PR #126.
4. C4 workflow normalization/minimal CI — PR #127 plus baseline repair PR #129.
5. Replit remote/branch normalization — complete and independently reconciled to GitHub `pixel_bgr`.
6. C5 GitHub → Drive canonical mirror — complete.
7. C6 branch unique-content reconciliation — complete; six obsolete historical PRs closed without merge; physical branch deletion remains optional hygiene.
8. C7 final consistency audit — complete; no new architecture/runtime conflict found.

Approved operating model:
1. Git repository = canonical implementation and versioned project documentation.
2. Drive = synchronized mirror/backup plus audit workspace.
3. Replit = runtime/Shell/visual verification.
4. ChatGPT = design, audit, authority resolution and orchestration.
5. Codex = preferred execution-backed environment for non-trivial code changes.
6. Cross-project roles = `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]`; Code mode is a process/safety overlay.
7. Active integration branch is dynamically resolved; fixed `work/main` authority is retired.
8. Branch cleanup follows unique-content reconciliation and explicit authorization.

## Current next work

The consolidation/audit program is at final closeout. Remaining items are non-blocking maintenance/hygiene unless explicitly promoted:
- synchronize final canonical closeout docs and `README_MIRROR` to Drive after Git integration;
- optionally delete already-classified historical task branches;
- decide long-term retention of `main` and the Replit preservation branch;
- triage dependency/security findings and GitHub Actions runtime-maintenance warnings;
- reconcile broader smoke-suite baseline/semantics;
- review `.bak`, dump and `_patch` preservation artifacts before any deletion.
