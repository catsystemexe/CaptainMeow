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

The versioned project profile is now canonical in `docs/project/06-chatgpt-project-profile.md`; actual ChatGPT Project UI configuration must remain aligned with it.

### CM-GOV-002 — Restructure `AGENTS.md`
Status: COMPLETE

Completed via PR #125. `AGENTS.md` is now repository-local engineering/executor guidance with dynamic X/Y branch roles, snapshot/working-tree safety, runtime invariants and accurate validation semantics.

### CM-GOV-003 — Classify and reconcile stale/duplicate documentation
Status: IN PROGRESS — C3

Current C3 scope:
- refresh README stale gameplay claim;
- retire `CM_Architecture_v3.1.md` obsolete SSOT claim;
- retire stale GraphicsMode ADR;
- classify root FSM lineage, June audits and BGR audit/handoff lineage through `docs/HISTORICAL_DOCUMENTS.md`;
- preserve all historical material rather than deleting it.

## Workflow hardening

### CM-WF-001 — Normalize Replit remote
Status: PENDING

Change Replit `origin` from historical `catsystemexe/MGoD` to canonical `catsystemexe/CaptainMeow` after confirming the runtime workspace is on the intended branch with a clean/preserved working tree.

### CM-WF-002 — Add dirty-tree preservation gate
Status: DOCUMENTED / ACTIVE POLICY

The preservation gate is now present in canonical workflow and `AGENTS.md`:
- inspect status;
- preserve valuable local changes;
- commit/push as appropriate;
- verify remote preservation before risky synchronization/switching.

### CM-WF-003 — Add minimal GitHub CI
Status: PENDING DESIGN/IMPLEMENTATION

Candidate required checks:
- `npm run typecheck` with its actual scope documented;
- `npm run build`;
- selected stable smoke/test set.

Do not require the full smoke runner as green until known baseline failures are repaired/classified.

### CM-WF-004 — PR/push authorization policy
Status: DOCUMENTED / ACTIVE POLICY

Focused task branches remain preferred. Push/hosted-PR creation follows the current implementation batch/task authorization. Merge, force-push, history rewrite, branch deletion and deployment require explicit authorization.

## Documentation / synchronization

### CM-DOC-001 — Establish `docs/project/*`
Status: COMPLETE

Canonical project state, architecture, roadmap, backlog, decisions, development workflow and ChatGPT project profile were integrated via PR #124.

### CM-DOC-002 — GitHub → Drive mirror
Status: PENDING

Define one-way synchronization for canonical project docs. Drive mirror must not become a competing edit authority.

### CM-DOC-003 — Mark/classify historical docs
Status: IN PROGRESS — C3

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`.

Large historical documents are intentionally preserved without noisy full-file rewrites where a central authoritative classification is sufficient.

### CM-DOC-004 — Update README
Status: IN PROGRESS — C3

Replace obsolete “no gameplay implemented” framing with a concise current entry point linking to canonical docs and historical classification.

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
