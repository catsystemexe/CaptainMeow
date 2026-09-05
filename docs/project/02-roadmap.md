# Captain Meow — Roadmap

Status: CANONICAL DEVELOPMENT / CONSOLIDATION ROADMAP
Last updated: 2026-09-05

This roadmap tracks repository/workflow/documentation consolidation and near-term engineering governance. It is not a substitute for a product/gameplay feature roadmap.

## Active product workstream

Multitrack Pixel BGR Engine V2 is the current focused product-development workstream.

Canonical workstream roadmap:
- `docs/bgr/MULTITRACK_BGR_V2_ROADMAP.md`

Detailed BGR architecture, milestone scope, acceptance criteria, and STATIC/RUNTIME verification gates are maintained there rather than duplicated here.

## Completed audit sequence

The original audit/consolidation program is complete. Historical phase names retain the environment that was actually audited at that time.

- P0 Source/access/authority inventory — COMPLETE
- P1 Audit workspace/bootstrap — COMPLETE
- F0 Preservation baseline — COMPLETE
- F1 Implementation × documentation audit — COMPLETE
- F2 GPT/GitHub/Replit workflow audit — COMPLETE / HISTORICAL SCOPE
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
Historical outcomes:
- minimal GitHub `Static Verify` CI integrated through PR #127;
- CI runtime verified through actual Actions execution;
- pre-existing `createGame.ts` syntax failure detected and repaired through PR #129;
- repair passed `npm ci` → `npm run typecheck` → `npm run build`;
- Replit `origin` was normalized to `catsystemexe/CaptainMeow` and its workspace preserved/synchronized.

These Replit steps describe completed historical migration work; they are not current workflow instructions.

### C5 Drive synchronization — COMPLETE
- dedicated Drive mirror folder `___CaptainMeow/___CANONICAL_MIRROR` created;
- all seven canonical `docs/project/*` documents mirrored;
- Drive `___docs` remains historical and separate.

### C6 Branch reconciliation — COMPLETE
- `main` divergence classified as historical merge topology only;
- Replit preservation branch functional intent confirmed as already promoted;
- historical task branches/PRs classified and cleaned up according to explicit authorization;
- retained preservation/reference branches remain evidence, not current workflow authority.

### C7 Final consistency audit — COMPLETE
Verified code vs canonical docs, Project Instructions/profile/workflow, AGENTS scope, GitHub/Drive mirror, CI semantics and preserved runtime history.

Audit evidence: `___CaptainMeow/___AUDIT/07_FINAL_CONSISTENCY_AUDIT`.

## 2026-09-05 workflow platform migration — ACTIVE DECISION / DOC ALIGNMENT

New operating decision:
- VS Code replaces Replit as the default local runtime/environment verification surface;
- VS Code Agent is deliberately constrained to a low-cost runtime-operator role;
- default VS Agent behavior is `READ / EXECUTE / OBSERVE / REPORT`;
- ChatGPT retains architecture/design/audit/orchestration ownership;
- Codex remains the primary implementation agent;
- Git/GitHub remains canonical for implementation/history/versioned docs;
- Replit is legacy/historical unless an explicit Replit-specific task requires it.

Required documentation alignment:
- `docs/project/00-project-state.md` — update runtime environment/current operating model;
- `docs/project/03-backlog.md` — update capability ownership and workflow policy;
- `docs/project/04-decisions.md` — supersede Replit runtime decision; add VS Code/VS Agent decisions;
- `docs/project/05-development-workflow.md` — replace runtime routing and preservation gate;
- `docs/project/06-chatgpt-project-profile.md` — align versioned Project Instructions profile;
- Drive canonical mirror — resynchronize after Git integration;
- Drive historical audit roadmap/audits — preserve historical findings, add supersession/current-workflow note where needed.

## Current normative operating model

GitHub:
- canonical implementation/history/versioned documentation;
- static CI.

ChatGPT:
- architecture, UX/product design, reasoning, audit, planning, evaluation and orchestration.

Codex:
- primary implementation agent;
- focused source changes and execution-backed static verification.

VS Code:
- local runtime environment;
- Shell/PowerShell;
- app execution/logs/processes;
- browser/UI/runtime and environment-specific verification.

VS Code Agent:
- low-cost runtime operator;
- not primary designer/architect/implementer;
- source changes only under explicit narrow authorization.

Google Drive:
- synchronized mirror/backup;
- audit working material;
- human-readable reference.

Replit:
- legacy/historical/migration evidence by default;
- use only for explicit Replit-specific needs.

## Post-audit maintenance / hygiene

Non-blocking items:
- long-term retention decision for `backup/replit-bgr-lab-preaudit-20260825`;
- classify `.replit` and Replit-specific Vite host allowances as KEEP LEGACY COMPATIBILITY vs REMOVE in a separate implementation-safe cleanup decision;
- explicit resolution/port-or-retire decisions for retained reference branches;
- review `.bak`, dump and `_patch` artifacts before deletion;
- dependency/security triage from CI findings;
- GitHub Actions runtime maintenance warning review;
- broader smoke-suite baseline and semantics reconciliation.

## Ordering rule

Destructive cleanup remains evidence-driven and explicitly authorized. Historical Replit material does not become current authority merely because it is retained. Runtime-platform migration does not justify deleting compatibility/configuration artifacts without separate technical classification.
