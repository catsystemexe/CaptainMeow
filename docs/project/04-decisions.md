# Captain Meow — Decisions

Status: CANONICAL ACTIVE DECISION REGISTER
Last updated: 2026-09-06

This document records current approved project/workflow decisions that should remain visible after historical audit material becomes non-authoritative.

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

## D-003 — VS Code is the primary runtime/environment verification surface
Status: ACTIVE

Decision:
- local VS Code is used for app execution, Shell/PowerShell, runtime logs, browser/UI/visual verification and environment-specific checks;
- VS Code is evidence/runtime infrastructure, not repository authority;
- VS Code Agent is a deliberately low-cost runtime operator with default role `READ / EXECUTE / OBSERVE / REPORT`;
- VS Code Agent is not the default designer, architect, implementer or refactoring agent;
- runtime findings requiring source changes return to ChatGPT/Codex for focused implementation.

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
- `pixel_bgr` is the current approved integration line at this checkpoint, but this is not a permanent naming rule.

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
- do not make `AGENTS.md` the project-wide workflow constitution;
- current code/runtime contracts and canonical project docs remain separate authority layers.

## D-008 — Preserve before destructive cleanup
Status: ACTIVE

Decision:
- unique-content reconciliation precedes destructive cleanup;
- retention of already-classified historical evidence is a hygiene choice, not current workflow authority;
- branch deletion, history rewrite, force-push and destructive cleanup remain explicitly authorized actions.

## D-009 — Unknown/local work must be preserved before repository-state changes
Status: ACTIVE

Decision:
Before branch switching/synchronization/reset-like operations in any local runtime environment:
1. inspect working-tree state;
2. preserve valuable local changes on a branch/commit;
3. push when appropriate/authorized;
4. verify remote preservation.

Ad hoc backup files are not the preferred normal preservation mechanism.

## D-010 — Static and runtime verification are distinct
Status: ACTIVE

Decision:
- static checks cannot prove runtime/visual behavior;
- implementation reports name the exact verification performed;
- user visual feedback is authoritative for UX acceptance where automated checks cannot establish visual correctness.

## D-011 — Minimal CI provides baseline static verification
Status: ACTIVE / IMPLEMENTED

Decision:
- GitHub Actions workflow `.github/workflows/static-verify.yml` provides the minimal repository CI baseline;
- baseline sequence is Node 20 → `npm ci` → `npm run typecheck` → `npm run build`;
- task-specific smokes/tests remain separate explicit evidence;
- known unrelated failures must be distinguished from regressions introduced by a focused patch.

## D-012 — Cross-project role framework is shared, project instructions extend it
Status: ACTIVE

Decision:
- universal role files contain no Captain Meow-specific branch names, deployment policy or local-machine assumptions;
- Captain Meow-specific source authority, executors and workflow boundaries live in project-specific instructions/profile;
- executor prompts receive the relevant operational rules without requiring a duplicate universal framework in every repository.

## D-013 — Pixel BGR Dev Workspace v1 replaces floating-overlay optimization as the active UX direction
Status: ACTIVE

Decision:
- do not continue micro-polishing the old floating Pixel BGR Lab by default;
- implement a dual GAME/DEV display model;
- in DEV mode treat the page as a workspace containing game viewport, contextual side regions and a full-width bottom multitrack timeline;
- Phase 1 is shell recomposition, not an editor/runtime rewrite;
- preserve verified BGR V2 editing, serialization, renderer and exact timeline-coordinate contracts.

Active plan:
- `docs/bgr/PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md`.

## Decision hygiene

When a decision is superseded:
- mark it SUPERSEDED rather than silently presenting obsolete behavior as current;
- identify the replacing decision/document where useful;
- update canonical project state/workflow if operational truth changes.
