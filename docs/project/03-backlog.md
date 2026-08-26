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

Completed via PR #125.

### CM-GOV-003 — Classify and reconcile stale/duplicate documentation
Status: COMPLETE

Completed via PR #126.

## Workflow hardening

### CM-WF-001 — Normalize Replit remote
Status: COMPLETE

Verified live workspace before mutation, preserved existing backup branch, changed `origin` to `https://github.com/catsystemexe/CaptainMeow`, fetched/pruned, switched to `pixel_bgr` and fast-forwarded safely to `940358eb9f35c73d9172c6962e483f8f1f6d51bb`.

`gitsafe-backup` was not modified.

### CM-WF-002 — Dirty-tree preservation gate
Status: COMPLETE / ACTIVE POLICY

The preservation gate is present in canonical workflow and `AGENTS.md`.

### CM-WF-003 — Minimal GitHub CI
Status: COMPLETE

`.github/workflows/static-verify.yml` is integrated and runtime-verified.

Required CI baseline:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

The first live validation exposed a pre-existing malformed block in `src/game/boot/createGame.ts`. PR #129 repaired the root cause and passed the complete Static Verify sequence before merge.

`npm run test` remains one targeted smoke and the broader `npm run smoke` is not a required CI gate until its baseline/suite semantics are reconciled.

### CM-WF-004 — PR/push authorization policy
Status: COMPLETE / ACTIVE POLICY

Focused task branches remain preferred. Push/hosted-PR creation follows the current implementation batch/task authorization. Merge, force-push, history rewrite, branch deletion and deployment require explicit authorization.

## Documentation / synchronization

### CM-DOC-001 — Establish `docs/project/*`
Status: COMPLETE

Integrated via PR #124.

### CM-DOC-002 — GitHub → Drive mirror
Status: COMPLETE

Dedicated one-way mirror created at `___CaptainMeow/___CANONICAL_MIRROR` from Git snapshot `bd468a98d216e941175a7ba14481efb5d2e63390`.

Contents:
- all seven canonical `docs/project/*` documents;
- `README_MIRROR` manifest recording source repository/branch/commit and the rule that Git remains canonical.

Drive `___docs` remains historical and separate.

### CM-DOC-003 — Mark/classify historical docs
Status: COMPLETE

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`, integrated via PR #126.

### CM-DOC-004 — Update README
Status: COMPLETE

Integrated via PR #126.

## Branch reconciliation

### CM-GIT-001 — Analyze five `main`-unique commits
Status: NEXT / PRESERVE

Classify each before any cleanup or branch normalization.

### CM-GIT-002 — Review preserved unfinished BGR follow-up
Status: NEXT / PRESERVE

Branch: `backup/replit-bgr-lab-preaudit-20260825`
Commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Determine whether/how to resume the unfinished change. Do not merge automatically.

### CM-GIT-003 — Branch retention policy
Status: DEFERRED UNTIL RECONCILIATION

There are many historical `codex/*`, consolidation and fix branches. Define retention/cleanup only after unique-content reconciliation.

## Technical hygiene

### CM-HYG-001 — Review `.bak`, dump and `_patch` artifacts
Status: DEFERRED

Treat existing artifacts as preservation/technical-debt evidence. Do not delete until their uniqueness/value is checked.

## Backlog rules

- `READY` means approved and sequenced, not yet implemented.
- `IN PROGRESS` means a focused change set exists but is not yet integrated/completed.
- `PENDING` means known work requiring a focused future batch or decision.
- `PRESERVE` means no destructive action until evidence is reconciled.
- `COMPLETE` means integrated/verified according to the applicable workflow.
