# Captain Meow — Backlog

Status: CANONICAL CONSOLIDATION / GOVERNANCE BACKLOG
Last updated: 2026-08-26

This backlog records approved consolidation and workflow-hardening work. Product/gameplay feature backlog items may later be maintained separately if needed.

## Active / next

### CM-GOV-001 — Apply Captain Meow Project Instructions revision
Status: READY

Replace the current expanding instruction block with the approved project-specific profile:
- source authority;
- role framework reference;
- GitHub/Codex/Replit capability ownership;
- preservation rules;
- static/runtime distinction;
- Code mode overlay;
- cost/model policy.

### CM-GOV-002 — Restructure `AGENTS.md`
Status: READY AFTER CANONICAL BOOTSTRAP

Keep repository-local engineering invariants and executor safety. Remove/supersede stale project-wide workflow constitution content, especially fixed branch authority.

### CM-GOV-003 — Classify and reconcile stale/duplicate documentation
Status: READY AFTER CM-GOV-002

Includes:
- README stale gameplay claim;
- `CM_Architecture_v3.1.md` obsolete SSOT claim;
- root FSM lineage;
- June audit snapshots;
- BGR handoffs/audits;
- historical Drive `___docs`.

Do not delete historical material before classification.

## Workflow hardening

### CM-WF-001 — Normalize Replit remote
Status: PENDING

Change Replit `origin` from historical `catsystemexe/MGoD` to canonical `catsystemexe/CaptainMeow` after confirming the runtime workspace is on the intended branch with a clean/preserved working tree.

### CM-WF-002 — Add dirty-tree preservation gate
Status: APPROVED / DOCUMENT IN WORKFLOW

Before runtime branch switching/synchronization/reset-like operations:
- inspect status;
- preserve valuable local changes;
- commit/push as appropriate;
- verify remote preservation.

### CM-WF-003 — Add minimal GitHub CI
Status: PENDING DESIGN/IMPLEMENTATION

Candidate required checks:
- `npm run typecheck` with its actual scope documented;
- `npm run build`;
- selected stable smoke/test set.

Do not require the full smoke runner as green until known baseline failures are repaired/classified.

### CM-WF-004 — Define PR/push authorization policy
Status: PENDING FINALIZATION

Keep focused task branches and reviewable changes. Make remote actions explicit per implementation batch rather than relying on stale universal assumptions.

## Documentation / synchronization

### CM-DOC-001 — Establish `docs/project/*`
Status: IN PROGRESS

Bootstrap canonical state, architecture, roadmap, backlog, decisions, development workflow and ChatGPT project profile.

### CM-DOC-002 — GitHub → Drive mirror
Status: PENDING

Define one-way synchronization for canonical project docs. Drive mirror must not become a competing edit authority.

### CM-DOC-003 — Mark historical docs
Status: PENDING

Add explicit status markers/indexing to historical/stale documentation after canonical replacements exist.

### CM-DOC-004 — Update README
Status: PENDING

Replace obsolete “no gameplay implemented”/early-project framing with a concise current entry point that links to canonical docs.

## Branch reconciliation

### CM-GIT-001 — Analyze five `main`-unique commits
Status: PENDING / PRESERVE

`main` diverges from `pixel_bgr` and contains five unique commits relative to merge base `7d1e4857c1dceb828a3421f4450033c02c3f8b06`.

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
- `PENDING` means known work requiring a focused future batch or decision.
- `PRESERVE` means no destructive action until evidence is reconciled.
- Close items only after the corresponding state is implemented and verified.