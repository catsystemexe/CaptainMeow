# Captain Meow — Roadmap

Status: CANONICAL DEVELOPMENT / CONSOLIDATION ROADMAP
Last updated: 2026-08-26

This roadmap tracks repository/workflow/documentation consolidation and near-term engineering governance. It is not a substitute for a product/gameplay feature roadmap.

## Completed audit sequence

- P0 Source/access/authority inventory — COMPLETE
- P1 Audit workspace/bootstrap — COMPLETE
- F0 Preservation baseline — COMPLETE
- F1 Implementation × documentation audit — COMPLETE
- F2 GPT/GitHub/Replit workflow audit — COMPLETE
- F3 Instruction authority audit — COMPLETE
- F4 Consolidation proposal — COMPLETE / APPROVED

## Completed post-gate consolidation

### C1 Canonical docs bootstrap — COMPLETE

Seven canonical `docs/project/*` documents established and integrated through PR #124.

### C2 Instruction consolidation — COMPLETE

Project/repository instruction authority aligned. `AGENTS.md` reduced to repository-local engineering/executor rules and dynamic X/Y branch model. Integrated through PR #125.

### C3 Documentation migration — COMPLETE

README/current entry point corrected, historical documentation centrally classified, obsolete global authority claims retired. Integrated through PR #126.

### C4 Workflow normalization / CI — COMPLETE

Completed outcomes:
- minimal GitHub `Static Verify` CI integrated through PR #127;
- CI runtime verified through actual Actions execution;
- pre-existing `createGame.ts` syntax failure detected and repaired through PR #129;
- repair passed `npm ci` → `npm run typecheck` → `npm run build`;
- Replit `origin` normalized from historical `catsystemexe/MGoD` to `catsystemexe/CaptainMeow`;
- Replit workspace fast-forwarded safely to `pixel_bgr@940358eb9f35c73d9172c6962e483f8f1f6d51bb` with preservation branch intact.

## Current phase — C5 Drive synchronization

Goal: make Git canonical and Drive a one-way mirror/backup plus audit workspace.

Tasks:
- refresh canonical status docs before mirroring;
- mirror all seven `docs/project/*` documents into a dedicated Drive mirror location;
- preserve filenames and Git source metadata;
- keep Drive `___docs` explicitly historical;
- prevent Drive mirror copies from becoming competing edit authority;
- verify mirrored content against the Git source revision.

## C6 Branch reconciliation and cleanup

Run only after documentation/instruction authority and Drive mirror are stable.

Tasks:
- inspect the five `main`-unique commits relative to the audited lineage;
- classify each as preserve/promote/supersede;
- review preservation branch `backup/replit-bgr-lab-preaudit-20260825` separately;
- define retention policy for merged `codex/*` and consolidation/fix branches;
- delete/normalize branches only through an explicit approved cleanup batch.

## C7 Final consistency audit

Verify:
- code vs canonical docs;
- Project Instructions vs workflow docs;
- AGENTS vs current code;
- GitHub vs Drive mirror;
- Replit remote/branch expectations;
- CI semantics;
- remaining historical/stale authority claims;
- branch/preservation state after any approved reconciliation.

## Ordering rule

Do not move branch cleanup ahead of unique-content reconciliation. Do not convert historical documents into authority merely to simplify cleanup.