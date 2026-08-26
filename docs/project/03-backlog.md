# Captain Meow — Backlog

Status: CANONICAL CONSOLIDATION / GOVERNANCE BACKLOG
Last updated: 2026-08-26

This backlog records approved consolidation and workflow-hardening work. Product/gameplay feature backlog items may later be maintained separately if needed.

## Governance

### CM-GOV-001 — Align ChatGPT Project Instructions
Status: COMPLETE / MINOR WORDING NORMALIZATION OPTIONAL

The active ChatGPT Project Instructions substantively match the approved project-specific profile and shared cross-project framework:
- Git-first source authority;
- `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]` roles;
- Code mode overlay;
- GitHub/Codex/Replit capability ownership;
- preservation rules;
- static/runtime distinction;
- cost/model policy.

The versioned project profile is canonical in `docs/project/06-chatgpt-project-profile.md`. C7 found only minor non-material wording drift in how `AGENTS.md` appears in the top-level source-priority wording.

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
Status: COMPLETE / FINAL RESYNC PENDING CLOSEOUT MERGE

Dedicated one-way mirror exists at `___CaptainMeow/___CANONICAL_MIRROR` with all seven canonical `docs/project/*` documents plus `README_MIRROR`.

C7 found that mirror content tracks the pre-C6 Git documentation state, but the manifest still names the earlier initial source snapshot. After the final canonical documentation closeout is merged, resynchronize affected files and update manifest provenance to that resulting Git checkpoint.

Drive `___docs` remains historical and separate.

### CM-DOC-003 — Mark/classify historical docs
Status: COMPLETE

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`, integrated via PR #126.

### CM-DOC-004 — Update README
Status: COMPLETE

Integrated via PR #126.

## Branch reconciliation

### CM-GIT-001 — Analyze five `main`-unique commits
Status: COMPLETE

C6 finding: unique commit topology exists, but the final `main` tree is identical to the relevant merge-base tree. No content promotion is required. Retain/delete is now only a historical-retention choice.

### CM-GIT-002 — Review preserved unfinished BGR follow-up
Status: COMPLETE / PRESERVATION RETENTION OPTIONAL

Branch: `backup/replit-bgr-lab-preaudit-20260825`
Commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Its functional seek-wiring intent was promoted through PR #129 and CI verified. The branch remains preservation/history evidence only; no merge is required.

### CM-GIT-003 — Branch retention policy
Status: COMPLETE / PHYSICAL CLEANUP PARTIAL

Policy:
- keep the current approved integration branch;
- preserve evidence until unique content is classified;
- merged/reachable task branches are cleanup candidates after fresh verification;
- superseded branches may be removed once their replacement is proven;
- branch deletion remains explicitly authorized/destructive work.

C6 classified historical exceptions and closed obsolete open PRs #1, #2, #4, #5, #11 and #22 without merge. Physical branch deletion remains optional hygiene because the current connected GitHub capability does not expose branch-ref deletion.

## Final audit

### CM-AUDIT-001 — Final consistency audit
Status: COMPLETE

C7 found no new architecture/runtime conflict. Required closeout is limited to canonical tracking updates plus final Drive mirror/provenance synchronization.

Audit evidence: `___CaptainMeow/___AUDIT/07_FINAL_CONSISTENCY_AUDIT`.

## Technical hygiene / maintenance

### CM-HYG-001 — Review `.bak`, dump and `_patch` artifacts
Status: DEFERRED / NON-BLOCKING

Treat existing artifacts as preservation/technical-debt evidence. Do not delete until their uniqueness/value is checked.

### CM-HYG-002 — Historical branch physical cleanup
Status: OPTIONAL / NON-BLOCKING

Delete already-classified historical task branches only through an execution path that supports real branch-ref deletion and after the usual fresh safety check.

### CM-HYG-003 — Dependency/security triage
Status: PENDING / NON-BLOCKING

A CI `npm ci` run reported dependency audit findings. Triage deliberately; do not apply blind automated upgrade/fix changes as part of documentation consolidation.

### CM-HYG-004 — GitHub Actions runtime maintenance
Status: PENDING / NON-BLOCKING

Review the GitHub Actions warning observed during CI about older action runtime targeting and update action versions when justified.

### CM-HYG-005 — Broader smoke-suite baseline
Status: PENDING / NON-BLOCKING

Reconcile current smoke-runner semantics and known baseline failures before promoting the broader suite to a required CI gate.

## Backlog rules

- `READY` means approved and sequenced, not yet implemented.
- `IN PROGRESS` means a focused change set exists but is not yet integrated/completed.
- `PENDING` means known work requiring a focused future batch or decision.
- `PRESERVE` means no destructive action until evidence is reconciled.
- `COMPLETE` means integrated/verified according to the applicable workflow.
