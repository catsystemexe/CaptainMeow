# Captain Meow — Decisions

Status: CANONICAL ACTIVE DECISION REGISTER
Last updated: 2026-09-05

This document records current approved project/workflow decisions that should remain visible after audit material becomes historical. It is not a substitute for detailed ADRs where a decision needs full technical rationale.

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
Status: SUPERSEDED by D-013 and D-015 on 2026-09-05

Historical decision:
- Replit was used for runtime behavior, environment-specific debugging, Shell and manual Preview/visual verification;
- Replit was not repository authority;
- Replit Agent was not a required workflow dependency.

This remains historical workflow evidence only.

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

Prefer this small set over multiple competing specifications. Detailed ADRs or subsystem documents may coexist when they have clear narrower authority.

## D-007 — `AGENTS.md` is repository-local engineering guidance
Status: ACTIVE

Decision:
- keep current codebase engineering invariants and executor safety rules;
- remove/supersede stale fixed branch governance and broad cross-project conversational behavior;
- do not make `AGENTS.md` the project-wide workflow constitution.

## D-008 — Preserve before branch cleanup
Status: ACTIVE

Decision:
- unique-content reconciliation must precede destructive branch cleanup;
- once a branch has been proven to contain no unpromoted valuable content, retention becomes an explicit historical/hygiene choice rather than an unresolved authority requirement;
- the current integration branch must be retained;
- preservation/evidence branches may remain after functional intent is promoted when their audit value is still useful;
- branch deletion remains explicitly authorized destructive work and is never performed merely to make the repository look tidy.

C6 completed the required reconciliation for `main`, the Replit preservation branch, and inspected historical task-branch exceptions.

## D-009 — Manual Replit changes must be preserved promptly in Git
Status: SUPERSEDED by D-014 on 2026-09-05

Historical decision retained as evidence of the former Replit workflow. Current VS Code runtime work follows D-014 and the canonical development workflow.

## D-010 — Static and runtime verification are distinct
Status: ACTIVE

Decision:
- static checks cannot prove runtime/visual behavior;
- implementation reports name the exact verification performed;
- user visual feedback is authoritative for UX acceptance where automated checks cannot establish visual correctness.

## D-011 — Minimal CI replaces repeated manual baseline verification
Status: ACTIVE / IMPLEMENTED

Decision:
- GitHub Actions workflow `.github/workflows/static-verify.yml` provides the minimal repository CI baseline;
- required sequence is Node 20 → `npm ci` → `npm run typecheck` → `npm run build`;
- the workflow is runtime-verified and successfully passed after the baseline repair in PR #129;
- `npm run test` remains a targeted smoke rather than a complete test suite;
- the broader smoke suite is not a mandatory green gate until its baseline/suite semantics are reconciled.

## D-012 — Cross-project role framework is shared, project instructions extend it
Status: ACTIVE

Decision:
- universal role files contain no Captain Meow/APU branch names, secret names, deployment policy or local-machine assumptions;
- Captain Meow-specific source authority, executors and workflow boundaries live in project-specific instructions/profile;
- executor prompts receive relevant operational rules without requiring a duplicate universal framework in every repository.

## D-013 — VS Code is the default runtime/environment verification surface
Status: ACTIVE

Decision:
- VS Code replaces Replit in the default Captain Meow development workflow;
- VS Code is the local runtime environment for Shell/PowerShell, app execution, logs, browser/UI/runtime verification and environment-specific checks;
- Git/GitHub remains canonical for repository authority and history;
- static verification remains primarily owned by GitHub/Codex/ChatGPT as appropriate;
- runtime claims require actual runtime evidence from VS Code or another explicitly approved environment.

## D-014 — VS Code Agent is a low-cost runtime operator
Status: ACTIVE

Decision:
- default role is `READ / EXECUTE / OBSERVE / REPORT`;
- it is not the primary designer, architect, implementer or refactoring agent;
- use it for baseline checks, commands, dev-server control, ports/processes/logs, runtime reproduction, environment-specific checks and targeted browser/UI verification;
- prefer the lowest-cost adequate model, low reasoning effort, short context, bounded targets and explicit stop conditions;
- if runtime investigation indicates a source change, preserve evidence and return implementation to ChatGPT/Codex;
- source changes by VS Agent require explicit narrow authorization;
- if the required branch/HEAD/working-tree baseline differs, stop and report rather than modifying repository state to make the runtime test pass.

## D-015 — Replit is legacy/historical by default
Status: ACTIVE

Decision:
- Replit is no longer part of the default development workflow;
- Replit-specific docs/configuration may remain as historical, migration or compatibility evidence;
- do not infer current workflow authority from legacy Replit material;
- do not delete `.replit`, Replit host allowances, preservation branches or related artifacts solely because Replit is inactive; classify their current technical value before removal;
- use Replit only when an explicit task requires Replit-specific or historical behavior.

## Decision hygiene

When a decision is superseded:
- mark it SUPERSEDED rather than silently deleting its history;
- identify the replacing decision/document;
- update canonical project state/workflow if operational truth changes.
