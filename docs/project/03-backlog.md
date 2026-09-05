# Captain Meow — Backlog

Status: CANONICAL GOVERNANCE / ENGINEERING BACKLOG
Last updated: 2026-09-06

This backlog records current workflow-hardening and engineering maintenance items. Active product work is tracked in narrower subsystem work plans where appropriate.

## Governance

### CM-GOV-001 — Align ChatGPT Project Instructions
Status: COMPLETE / ACTIVE POLICY

Current operating model:
- Git-first source authority;
- `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]` roles;
- Code mode overlay;
- GitHub/Codex/VS Code capability ownership;
- preservation rules;
- static/runtime distinction;
- cost/model policy.

Versioned project profile: `docs/project/06-chatgpt-project-profile.md`.

### CM-GOV-002 — Repository-local engineering authority
Status: COMPLETE

`AGENTS.md` contains repository-local engineering/executor invariants and dynamic X/Y branch safety.

### CM-GOV-003 — Historical/duplicate documentation classification
Status: COMPLETE

Canonical classification index: `docs/HISTORICAL_DOCUMENTS.md`.

## Workflow hardening

### CM-WF-001 — VS Code runtime operator workflow
Status: COMPLETE / ACTIVE POLICY

Local VS Code is the primary runtime/environment surface. VS Code Agent is a deliberately low-cost runtime operator with default role `READ / EXECUTE / OBSERVE / REPORT`.

Runtime operators do not redesign/refactor source merely to make a runtime check pass. Source defects return to ChatGPT/Codex on focused branches.

### CM-WF-002 — Dirty-tree preservation gate
Status: COMPLETE / ACTIVE POLICY

Before repository-state changes, verify expected repo/branch/HEAD/worktree and preserve unknown/user-owned changes.

### CM-WF-003 — Minimal GitHub CI
Status: COMPLETE

`.github/workflows/static-verify.yml` provides the baseline:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

Task-specific smokes/tests and known unrelated baseline failures remain separately reported evidence.

### CM-WF-004 — PR/push authorization policy
Status: COMPLETE / ACTIVE POLICY

Focused task branches remain preferred. Normal approved flow is Codex branch implementation/push followed by ChatGPT remote review and PR integration when authorized. Merge, force-push, history rewrite, branch deletion and deployment remain explicitly controlled actions.

## Documentation / synchronization

### CM-DOC-001 — Canonical `docs/project/*`
Status: COMPLETE

The maintained project-level canonical set is established.

### CM-DOC-002 — GitHub → Drive mirror
Status: COMPLETE / CONTINUOUS POLICY

Dedicated one-way mirror exists at `___CaptainMeow/___CANONICAL_MIRROR`. Git remains canonical; Drive mirror updates follow changes to canonical docs.

### CM-DOC-003 — Historical docs classification
Status: COMPLETE

Historical evidence remains preserved but non-authoritative unless explicitly promoted.

## Active product implementation

### CM-BGR-DEV-001 — Pixel BGR Dev Workspace v1
Status: IN PROGRESS

Active plan:
- `docs/bgr/PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md`.

Approved implementation order:
1. dual GAME/DEV shell foundation;
2. DEV grid composition;
3. full-width V2 timeline migration;
4. selection-driven right inspector;
5. basic left navigation/environment access;
6. structural responsive/cursor-stability polish.

Do not redesign BGR data/runtime architecture or resume micro-polish of the obsolete floating-overlay model as part of Phase 1.

## Technical hygiene / maintenance

### CM-HYG-001 — Review `.bak`, dump and `_patch` artifacts
Status: DEFERRED / NON-BLOCKING

Treat existing artifacts as preservation/technical-debt evidence. Do not delete until uniqueness/value is checked.

### CM-HYG-002 — Historical branch cleanup
Status: OPTIONAL / NON-BLOCKING

Delete already-classified historical branches only after fresh safety verification and explicit authorization.

### CM-HYG-003 — Dependency/security triage
Status: PENDING / NON-BLOCKING

Triage dependency findings deliberately; do not apply blind automated upgrades as unrelated work.

### CM-HYG-004 — GitHub Actions runtime maintenance
Status: PENDING / NON-BLOCKING

Review action-runtime warnings and update action versions when justified.

### CM-HYG-005 — Broader smoke-suite baseline
Status: PENDING / NON-BLOCKING

Reconcile current smoke-runner semantics and known baseline failures before promoting the broader suite to a mandatory green gate.

## Backlog rules

- `READY` means approved and sequenced, not yet implemented.
- `IN PROGRESS` means focused work has started but is not fully integrated/runtime-accepted.
- `PENDING` means known work requiring a focused future batch or decision.
- `PRESERVE` means no destructive action until evidence is reconciled.
- `COMPLETE` means integrated/verified according to the applicable workflow.
