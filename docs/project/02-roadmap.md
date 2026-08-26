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

### C5 Drive synchronization — COMPLETE

Completed outcomes:
- canonical status refreshed before mirroring through PRs #130 and #131;
- dedicated Drive mirror folder `___CaptainMeow/___CANONICAL_MIRROR` created;
- all seven canonical `docs/project/*` documents mirrored from Git snapshot `bd468a98d216e941175a7ba14481efb5d2e63390`;
- `README_MIRROR` records source repository/branch/commit and one-way authority rule;
- Drive `___docs` remains historical and separate;
- mirror inventory verified at 7/7 canonical files plus manifest.

## Current phase — C6 Branch reconciliation and cleanup planning

Goal: reconcile preserved unique content before any destructive branch hygiene.

Tasks:
- inspect the five `main`-unique commits relative to the audited lineage;
- classify each as preserve/promote/supersede;
- review preservation branch `backup/replit-bgr-lab-preaudit-20260825` separately;
- define retention policy for merged `codex/*`, consolidation and fix branches;
- identify any branch that still carries unique valuable content;
- propose cleanup only after reconciliation;
- require explicit authorization before deleting or normalizing branches.

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
