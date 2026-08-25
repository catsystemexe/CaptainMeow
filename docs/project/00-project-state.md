# Captain Meow — Project State

Status: CANONICAL CURRENT-STATE SUMMARY
Last audited: 2026-08-26

This document summarizes the currently verified project state. It does not override actual code for implemented behavior or explicit active decisions for intended future behavior.

## Repository

Canonical repository: `catsystemexe/CaptainMeow`.

Current saved integration baseline at the audit checkpoint:
- branch: `pixel_bgr`
- commit: `f75dfba00e736af327ac72db9d227cc30315eb75`
- GitHub default branch: `pixel_bgr`

`work` is an older ancestor of `pixel_bgr` and must not be assumed to be the current integration branch.

`main` diverges from `pixel_bgr`. At the audit checkpoint it contains five commits not present on `pixel_bgr`; therefore it must be preserved until those commits are classified/reconciled.

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

Replit app `C_M` / project URL name `CM` is the current runtime/Preview environment identified during audit.

Replit is not a source of repository authority. Its intended role is:
- runtime;
- manual Shell when no connected execution path exists;
- browser/Preview/visual verification;
- environment-specific debugging.

Replit Agent is not a required workflow dependency.

At the audit checkpoint Replit `origin` still used the historical repository name `catsystemexe/MGoD`; GitHub redirected it to `catsystemexe/CaptainMeow`. Normalization remains pending.

## Documentation state

The repository contains valuable but mixed-age documentation.

Current canonical project documentation is being consolidated under `docs/project/`.

Known historical/stale categories include:
- root FSM audit/proposal/session documents unless a current decision explicitly promotes content from them;
- June repository audit documents as historical snapshots;
- `docs/architecture/CM_Architecture_v3.1.md` as a stale global-SSOT claim;
- historical Drive `___docs` material;
- handoffs as implementation/session evidence rather than permanent authority.

`README.md` was identified by the audit as materially stale and remains pending update.

## Audit status

Pre-consolidation audit phases P0, P1, F0, F1, F2, F3 and F4 are complete.

Approved consolidation direction:
1. Git repository = canonical implementation and versioned project documentation.
2. Drive = synchronized mirror/backup plus audit workspace.
3. Replit = runtime/Shell/visual verification.
4. ChatGPT = design, audit, authority resolution and orchestration.
5. Codex = preferred execution-backed environment for non-trivial code changes.
6. Cross-project roles = `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]`; Code mode is a process/safety overlay.
7. Active integration branch is dynamically resolved; fixed `work/main` authority is retired.
8. Branch cleanup occurs only after unique-content reconciliation.

## Current consolidation work

This canonical-doc bootstrap is being prepared on:
`consolidation/canonical-docs-bootstrap-20260826`

No historical documents or branches are deleted by this bootstrap.