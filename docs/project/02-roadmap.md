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

## Current phase — C1 Canonical bootstrap

Goal: establish a small authoritative `docs/project/` set without deleting historical material.

Tasks:
- create canonical project-state summary;
- create canonical architecture summary;
- create consolidation roadmap/backlog/decision register;
- create canonical development workflow;
- create project-specific ChatGPT profile;
- keep old documents intact until classification/migration is complete.

## C2 Instruction consolidation

Goal: align project and repository-local instructions with the approved role/workflow model.

Tasks:
- apply updated Captain Meow Project Instructions;
- restructure/shorten `AGENTS.md` around repository-local engineering invariants;
- remove fixed `main → work → X → Y` authority assumptions;
- retain dynamic X/Y task model;
- keep Code mode as process/safety overlay;
- avoid duplicating cross-project role definitions.

## C3 Documentation consolidation

Goal: remove competing authority while preserving useful history.

Tasks:
- classify existing repo documentation against `docs/project/`;
- mark stale/historical docs explicitly;
- promote still-valid design decisions into canonical docs/decision records;
- update stale README claims;
- define handoff lifecycle so handoffs remain evidence rather than permanent authority;
- preserve historical audits instead of silently deleting them.

## C4 Repository/runtime workflow hardening

Goal: reduce manual synchronization risk.

Tasks:
- normalize Replit `origin` from historical `catsystemexe/MGoD` to `catsystemexe/CaptainMeow`;
- establish explicit dirty-tree preservation gate in runtime workflow;
- define integration/PR authorization clearly;
- add minimal GitHub CI for stable static checks;
- keep known-broken smoke behavior out of mandatory green gates until repaired.

## C5 Drive synchronization

Goal: make Git canonical and Drive a one-way mirror/backup plus audit workspace.

Tasks:
- define which canonical `docs/project/*` files are mirrored;
- synchronize GitHub → Drive;
- label Drive `___docs` historical;
- prevent Drive copies from becoming competing write authorities.

## C6 Branch reconciliation and cleanup

Run only after documentation/instruction authority is stable.

Tasks:
- inspect the five `main`-unique commits relative to the shared baseline;
- decide preserve/promote/supersede for each unique change;
- review preservation branch `backup/replit-bgr-lab-preaudit-20260825` separately;
- define retention policy for merged `codex/*` branches;
- delete/normalize branches only through an explicit approved cleanup batch.

## C7 Final consistency audit

Verify:
- code vs canonical docs;
- Project Instructions vs workflow docs;
- AGENTS vs current code;
- GitHub vs Drive mirror;
- Replit remote/branch expectations;
- CI semantics;
- remaining historical/stale authority claims.

## Ordering rule

Do not move branch cleanup ahead of unique-content reconciliation. Do not convert historical documents into authority merely to simplify cleanup.