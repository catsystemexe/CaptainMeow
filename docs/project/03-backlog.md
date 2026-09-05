# Captain Meow — Backlog

Status: CANONICAL CONSOLIDATION / GOVERNANCE BACKLOG
Last updated: 2026-09-05

This backlog records approved consolidation and workflow-hardening work. Product/gameplay feature backlog items may be maintained separately where needed.

## Governance

### CM-GOV-001 — Align ChatGPT Project Instructions
Status: COMPLETE / ACTIVE POLICY

The active Project Instructions and versioned profile are aligned around:
- Git-first source authority;
- ChatGPT design/audit/orchestration ownership;
- Codex as primary implementation agent;
- VS Code as local runtime environment;
- VS Code Agent as low-cost runtime operator;
- preservation rules;
- static/runtime distinction;
- cost/model policy.

The versioned project profile is canonical in `docs/project/06-chatgpt-project-profile.md`.

### CM-GOV-002 — Restructure `AGENTS.md`
Status: COMPLETE

Completed via PR #125. `AGENTS.md` remains repository-local engineering/executor guidance and does not need a VS Code-specific rewrite unless future runtime rules become repository invariants.

### CM-GOV-003 — Classify and reconcile stale/duplicate documentation
Status: COMPLETE

Completed via PR #126.

## Workflow hardening

### CM-WF-001 — Normalize Replit remote
Status: COMPLETE / HISTORICAL

Historical migration task. The former Replit workspace was normalized and preserved during C4. This item no longer defines the current runtime workflow.

### CM-WF-002 — Dirty-tree preservation gate
Status: COMPLETE / ACTIVE POLICY

The preservation gate is present in canonical workflow and `AGENTS.md`. It applies to any local execution environment, including VS Code.

### CM-WF-003 — Minimal GitHub CI
Status: COMPLETE

`.github/workflows/static-verify.yml` is integrated and runtime-verified.

Required CI baseline:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

`npm run test` remains one targeted smoke and the broader `npm run smoke` is not a required CI gate until its baseline/suite semantics are reconciled.

### CM-WF-004 — PR/push authorization policy
Status: COMPLETE / ACTIVE POLICY

Focused task branches remain preferred. Push/hosted-PR creation follows current task authorization. Merge, force-push, history rewrite, branch deletion and deployment require explicit authorization.

### CM-WF-005 — Adopt VS Code as default runtime environment
Status: COMPLETE / ACTIVE POLICY

Decision effective 2026-09-05:
- VS Code replaces Replit in the default runtime workflow;
- use VS Code for Shell/PowerShell, app execution, logs, browser/UI/runtime verification and environment-specific checks;
- Git/GitHub remains canonical for repository authority;
- runtime claims require actual runtime evidence.

### CM-WF-006 — Constrain VS Code Agent to low-cost runtime-operator role
Status: COMPLETE / ACTIVE POLICY

Default role:
`READ / EXECUTE / OBSERVE / REPORT`

Use for baseline checks, explicit commands, dev-server/process/port operations, runtime logs/reproduction, environment-specific checks and targeted browser/UI verification.

Do not use by default for design, architecture, broad planning, autonomous implementation, substantial refactoring or documentation authority decisions.

Source changes require explicit narrow authorization. If the required repo/branch/HEAD/working-tree baseline differs, stop and report rather than modifying repository state to make a runtime test pass.

### CM-WF-007 — Classify retained Replit runtime configuration
Status: PENDING / NON-BLOCKING

Repository still contains Replit-specific compatibility/configuration evidence, including `.replit`-related assumptions and Vite host allowances.

Classify separately as:
- KEEP LEGACY COMPATIBILITY,
- HISTORICAL / PRESERVE,
- or REMOVE after technical verification.

Do not remove runtime compatibility merely because Replit is no longer the default environment.

## Documentation / synchronization

### CM-DOC-001 — Establish `docs/project/*`
Status: COMPLETE

Integrated via PR #124.

### CM-DOC-002 — GitHub → Drive mirror
Status: COMPLETE / RESYNC REQUIRED AFTER 2026-09-05 WORKFLOW UPDATE

Dedicated one-way mirror exists at `___CaptainMeow/___CANONICAL_MIRROR` with all seven canonical `docs/project/*` documents plus `README_MIRROR`.

After the VS Code workflow documentation change is integrated, affected canonical files and mirror provenance must be resynchronized Git → Drive.

Drive `___docs` remains historical and separate.

### CM-DOC-003 — Mark/classify historical docs
Status: COMPLETE

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`, integrated via PR #126.

Historical Replit references remain valid historical evidence and should not be mass-rewritten.

### CM-DOC-004 — Update README
Status: COMPLETE

Integrated via PR #126. No current Replit workflow authority was found in README during the 2026-09-05 targeted audit.

### CM-DOC-005 — Align active workflow/instruction documents from Replit to VS Code
Status: IN PROGRESS

Scope:
- canonical `00-project-state.md`;
- `02-roadmap.md`;
- `03-backlog.md`;
- `04-decisions.md`;
- `05-development-workflow.md`;
- `06-chatgpt-project-profile.md`;
- current Drive audit-roadmap/profile copies where they still prescribe Replit;
- Drive canonical mirror after Git integration.

Historical handoffs/audits remain untouched except for optional supersession notes.

## Branch reconciliation

### CM-GIT-001 — Analyze five `main`-unique commits
Status: COMPLETE

C6 found no net unique file-state content requiring promotion.

### CM-GIT-002 — Review preserved unfinished BGR follow-up
Status: COMPLETE / PRESERVATION RETENTION OPTIONAL

Branch: `backup/replit-bgr-lab-preaudit-20260825`
Commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Its functional seek-wiring intent was promoted through PR #129 and CI verified. The branch remains historical/preservation evidence only; no merge is required.

### CM-GIT-003 — Branch retention policy
Status: COMPLETE

Policy:
- keep current approved integration branch;
- preserve evidence until unique content is classified;
- remove branches only after evidence-based reconciliation and explicit authorization.

## Final audit

### CM-AUDIT-001 — Final consistency audit
Status: COMPLETE / HISTORICAL CHECKPOINT

C7 found no architecture/runtime conflict at its 2026-08-26 checkpoint. The 2026-09-05 VS Code migration is a later active workflow decision and requires focused documentation alignment, not reopening the original audit program.

Audit evidence: `___CaptainMeow/___AUDIT/07_FINAL_CONSISTENCY_AUDIT`.

## Technical hygiene / maintenance

### CM-HYG-001 — Review `.bak`, dump and `_patch` artifacts
Status: DEFERRED / NON-BLOCKING

Treat existing artifacts as preservation/technical-debt evidence. Do not delete until uniqueness/value is checked.

### CM-HYG-002 — Historical branch physical cleanup
Status: OPTIONAL / NON-BLOCKING

Delete classified historical task branches only after fresh safety checks and explicit authorization.

### CM-HYG-003 — Dependency/security triage
Status: PENDING / NON-BLOCKING

Triage deliberately; do not apply blind automated upgrades as part of documentation consolidation.

### CM-HYG-004 — GitHub Actions runtime maintenance
Status: PENDING / NON-BLOCKING

Review runtime/action-version warnings when justified.

### CM-HYG-005 — Broader smoke-suite baseline
Status: PENDING / NON-BLOCKING

Reconcile smoke-runner semantics and baseline failures before promoting the broader suite to a required CI gate.

## Backlog rules

- `READY` = approved and sequenced, not yet implemented.
- `IN PROGRESS` = focused change set exists but is not yet integrated/completed.
- `PENDING` = known work requiring a future batch or decision.
- `PRESERVE` = no destructive action until evidence is reconciled.
- `COMPLETE` = integrated/verified according to applicable workflow.
