# Captain Meow — Backlog

Status: CANONICAL CONSOLIDATION / GOVERNANCE BACKLOG
Last updated: 2026-08-26

This backlog records approved consolidation and workflow-hardening work. Product/gameplay feature backlog items may later be maintained separately if needed.

## Active / next

### CM-GOV-001 — Align ChatGPT Project Instructions
Status: READY / MANUAL CONFIG ALIGNMENT

Use the approved project-specific profile and shared cross-project framework:
- source authority;
- `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]` roles;
- Code mode overlay;
- GitHub/Codex/Replit capability ownership;
- preservation rules;
- static/runtime distinction;
- cost/model policy.

The versioned project profile is canonical in `docs/project/06-chatgpt-project-profile.md`; actual ChatGPT Project UI configuration must remain aligned with it.

### CM-GOV-002 — Restructure `AGENTS.md`
Status: COMPLETE

Completed via PR #125. `AGENTS.md` is now repository-local engineering/executor guidance with dynamic X/Y branch roles, snapshot/working-tree safety, runtime invariants and accurate validation semantics.

### CM-GOV-003 — Classify and reconcile stale/duplicate documentation
Status: COMPLETE

Completed via PR #126:
- README current-state framing fixed;
- obsolete architecture global-SSOT claim retired;
- stale GraphicsMode ADR classified historical/not implemented;
- `docs/HISTORICAL_DOCUMENTS.md` now classifies preserved FSM/audit/handoff lineages without destructive rewriting.

## Workflow hardening

### CM-WF-001 — Normalize Replit remote
Status: NEXT / RUNTIME WORKSPACE ACTION

Change Replit `origin` from historical `catsystemexe/MGoD` to canonical `catsystemexe/CaptainMeow` only after confirming the live runtime workspace has the intended branch/HEAD and a clean or safely preserved working tree.

This is not a repository-file change and must not be inferred from GitHub state alone.

### CM-WF-002 — Dirty-tree preservation gate
Status: COMPLETE / ACTIVE POLICY

The preservation gate is present in canonical workflow and `AGENTS.md`:
- inspect status;
- preserve valuable local changes;
- commit/push as appropriate;
- verify remote preservation before risky synchronization/switching.

### CM-WF-003 — Minimal GitHub CI
Status: IN PROGRESS — C4

C4 adds `.github/workflows/static-verify.yml` with conservative gates:
- PR + manual trigger;
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

`npm run test` remains one targeted smoke, and the broader `npm run smoke` is not a CI gate until its baseline failures/suite semantics are reconciled.

### CM-WF-004 — PR/push authorization policy
Status: COMPLETE / ACTIVE POLICY

Focused task branches remain preferred. Push/hosted-PR creation follows the current implementation batch/task authorization. Merge, force-push, history rewrite, branch deletion and deployment require explicit authorization.

## Documentation / synchronization

### CM-DOC-001 — Establish `docs/project/*`
Status: COMPLETE

Canonical project state, architecture, roadmap, backlog, decisions, development workflow and ChatGPT project profile were integrated via PR #124.

### CM-DOC-002 — GitHub → Drive mirror
Status: PENDING

Define one-way synchronization for canonical project docs. Drive mirror must not become a competing edit authority.

### CM-DOC-003 — Mark/classify historical docs
Status: COMPLETE

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`, integrated via PR #126.

Large historical documents remain preserved where a central authoritative classification is sufficient.

### CM-DOC-004 — Update README
Status: COMPLETE

Current entry-point README integrated via PR #126.

## Branch reconciliation

### CM-GIT-001 — Analyze five `main`-unique commits
Status: PENDING / PRESERVE

`main` diverged from the active integration line and contained five unique commits relative to the audited merge base `7d1e4857c1dceb828a3421f4450033c02c3f8b06`.

Classify each before any cleanup or branch normalization.

### CM-GIT-002 — Review preserved unfinished BGR follow-up
Status: PENDING / PRESERVE

Branch: `backup/replit-bgr-lab-preaudit-20260825`
Commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Determine whether/how to resume the unfinished change. Do not merge automatically.

### CM-GIT-003 — Codex branch retention policy
Status: DEFERRED

There are many historical `codex/*` branches. Define retention/cleanup only after authority and unique-content reconciliation.

## Technical hygiene

### CM-HYG-001 — Review `.bak`, dump and `_patch` artifacts
Status: DEFERRED

Treat existing artifacts as preservation/technical-debt evidence. Do not delete until their uniqueness/value is checked.

## Backlog rules

- `READY` means approved and sequenced, not yet implemented.
- `IN PROGRESS` means a focused change set exists but is not yet integrated.
- `PENDING` means known work requiring a focused future batch or decision.
- `PRESERVE` means no destructive action until evidence is reconciled.
- `COMPLETE` means integrated/verified according to the applicable workflow.
