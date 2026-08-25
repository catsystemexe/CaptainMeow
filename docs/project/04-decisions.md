# Captain Meow — Decisions

Status: CANONICAL ACTIVE DECISION REGISTER
Last updated: 2026-08-26

This document records current approved project/workflow decisions that should remain visible after the audit material becomes historical. It is not a substitute for detailed ADRs where a decision needs full technical rationale.

## D-001 — Git is canonical for implementation and versioned project documentation
Status: ACTIVE

Decision:
- actual repository code is authoritative for implemented/current behavior;
- canonical project documentation lives in Git;
- historical/stale documentation does not override code;
- active approved decisions may intentionally define future target behavior that differs from current implementation.

## D-002 — Drive is mirror/backup/audit, not competing authority
Status: ACTIVE

Decision:
- Google Drive stores audit working material and synchronized human-readable copies/backup;
- canonical project docs synchronize one-way GitHub → Drive;
- existing Drive `___docs` is historical/potentially stale unless verified against Git/current decisions.

## D-003 — Replit is runtime/Shell/visual verification
Status: ACTIVE

Decision:
- Replit is used for runtime behavior, environment-specific debugging, Shell when no connected execution path exists, and manual Preview/visual verification;
- Replit is not preferred for repository history, branch authority or canonical documentation;
- Replit Agent is not a required workflow dependency.

## D-004 — Cross-project communication framework
Status: ACTIVE

Approved roles:
- `[DESIGNER]` — determine what should change and why;
- `[INSTRUCTIONS]` — convert approved design into executor-ready implementation batches;
- `[IMPLEMENTATION]` — execute approved batches against actual project state.

Code mode is a process/safety overlay for implementation-oriented work, not a fourth peer role.

## D-005 — Dynamic integration branch model
Status: ACTIVE

Decision:
- retain abstract X/Y pattern;
- X = currently approved active integration branch resolved from current repository state/decision;
- Y = focused task branch created from verified X;
- do not hard-code `main` or `work` as integration authority;
- at the audit checkpoint `pixel_bgr` is the saved current integration baseline, but this is not a permanent naming rule.

## D-006 — Canonical project document set
Status: ACTIVE

Canonical core under `docs/project/`:
- `00-project-state.md`
- `01-architecture.md`
- `02-roadmap.md`
- `03-backlog.md`
- `04-decisions.md`
- `05-development-workflow.md`
- `06-chatgpt-project-profile.md`

Prefer this small set over multiple competing specifications. Detailed ADRs or subsystem documents may coexist when they have a clear narrower authority.

## D-007 — `AGENTS.md` is repository-local engineering guidance
Status: ACTIVE

Decision:
- keep current codebase engineering invariants and executor safety rules;
- remove/supersede stale fixed branch governance and broad cross-project conversational behavior;
- do not make `AGENTS.md` the project-wide workflow constitution.

## D-008 — Preserve before branch cleanup
Status: ACTIVE

Decision:
- `main`, the Replit preservation branch and historical task branches remain preserved until unique-content reconciliation;
- branch cleanup happens late in consolidation;
- no destructive cleanup is performed merely to make the repository look tidy.

## D-009 — Manual Replit changes must be preserved promptly in Git
Status: ACTIVE

Decision:
Before branch switching/synchronization/reset-like operations in Replit:
1. inspect working-tree state;
2. preserve valuable local changes on a branch/commit;
3. push when appropriate/authorized;
4. verify remote preservation.

Ad hoc `.bak` files are not the preferred normal preservation mechanism.

## D-010 — Static and runtime verification are distinct
Status: ACTIVE

Decision:
- static checks cannot prove runtime/visual behavior;
- implementation reports name the exact verification performed;
- user visual feedback is authoritative for UX acceptance where automated checks cannot establish visual correctness.

## D-011 — Minimal CI should replace repeated manual static verification
Status: ACTIVE DIRECTION / IMPLEMENTATION PENDING

Decision direction:
- add GitHub CI for stable type/build/test checks;
- do not make known-broken full smoke behavior a mandatory green gate until its baseline is repaired/classified.

## D-012 — Cross-project role framework is shared, project instructions extend it
Status: ACTIVE

Decision:
- universal role files contain no Captain Meow/APU branch names, secret names, deployment policy or local-machine assumptions;
- Captain Meow-specific source authority, executors and workflow boundaries live in project-specific instructions/profile;
- executor prompts receive the relevant operational rules without requiring a duplicate universal framework in every repository.

## Decision hygiene

When a decision is superseded:
- mark it SUPERSEDED rather than silently deleting its history;
- identify the replacing decision/document;
- update canonical project state/workflow if operational truth changes.