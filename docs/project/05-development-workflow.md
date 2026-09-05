# Captain Meow — Development Workflow

Status: CANONICAL TARGET WORKFLOW
Last updated: 2026-09-05

## Operating model

ChatGPT Project
→ inspect / reason / design / orchestrate
→ resolve active integration branch X
→ focused task branch Y / Codex implementation when code execution is needed
→ static verification
→ integration according to explicit authorization
→ VS Code runtime/environment verification when required
→ preserve all valuable changes in Git
→ update canonical docs when project truth changes
→ synchronize canonical docs GitHub → Drive.

## Role framework

Use:
- `[DESIGNER]` for what/why;
- `[INSTRUCTIONS]` for batching/scope/acceptance criteria/executor routing;
- `[IMPLEMENTATION]` for execution.

Code mode is a process/safety overlay for implementation-oriented work.

Operational ownership:
- ChatGPT = architecture, UX/product design, audit, reasoning, planning, decomposition, evaluation and orchestration;
- Codex = primary implementation agent for non-trivial source changes and execution-backed static verification;
- VS Code = local runtime environment;
- VS Code Agent = low-cost runtime operator, not primary designer or implementer.

## Branch model

- X = currently approved active integration branch.
- Y = focused task branch created from verified X.
- Do not assume `main`, `work` or even the GitHub default branch is X without verification.
- At the 2026-09-05 workflow-update checkpoint, `pixel_bgr` is the current integration line.

Ordinary non-trivial implementation should use a focused task branch where practical.

Do not merge, reset, rewrite history, force-push, delete branches or deploy without explicit authorization.

Push/hosted-PR creation follows the current implementation batch/task authorization.

## Pre-change safety

Before substantial repository work:
- verify repository identity and target baseline;
- inspect `AGENTS.md` and relevant canonical docs;
- inspect relevant source/contracts;
- inspect branch, HEAD and working-tree state when the execution environment exposes them;
- preserve unknown/user-owned work before operations that could overwrite/hide it.

If the required baseline cannot be established safely, stop repository modification and report the ambiguity.

## VS Code runtime preservation gate

Before branch switching, pulls, reset-like operations or runtime verification in VS Code:
1. verify repository, branch and HEAD;
2. inspect working-tree state;
3. preserve valuable local work before any operation that could hide or overwrite it;
4. verify the intended runtime baseline;
5. only then start or restart the runtime.

The VS Code Agent must not modify repository state merely to make a runtime test pass.

If the baseline differs from the task requirement, stop and report the discrepancy instead of improvising branch synchronization or source changes.

## Static verification

Static verification may include:
- source/diff review;
- `npm run typecheck`;
- targeted tests/smokes;
- `npm run build`;
- schema/contracts checks.

Current command semantics:
- `npm run typecheck` = `tsc --noEmit`; do not overstate repository coverage;
- `npm run test` = one targeted EnemySpriteSelection smoke, not a complete test suite;
- `npm run smoke` = broader smoke runner and may include known baseline failures;
- `npm run build` = Vite build.

Reports must name exactly which checks ran and distinguish pre-existing failures.

### GitHub CI baseline

Repository CI is intentionally minimal and conservative:
- workflow: `.github/workflows/static-verify.yml`;
- trigger: pull requests and manual `workflow_dispatch`;
- runtime: Node 20;
- install: `npm ci` using the committed lockfile;
- gates: `npm run typecheck` and `npm run build`.

The CI job is named `Typecheck + build` under workflow `Static Verify`.

This workflow does **not** imply full test coverage. `npm run test` is currently a single targeted smoke, while the broader `npm run smoke` is not promoted to a CI gate until its known baseline failures and suite semantics are reconciled.

Do not hard-code a permanent integration branch into the CI trigger merely to mirror today's branch name. The pull-request trigger validates proposed changes independently of which approved branch currently acts as X.

## Runtime verification

Primary runtime environment: VS Code.

Use runtime verification where evidence adds value:
- live game behavior;
- browser/runtime errors;
- environment-specific behavior;
- authoring UI interaction;
- visual/UX verification;
- process, port or dependency behavior.

Never claim runtime/visual verification from static checks alone.

### VS Code Agent — default scope

Default role:
`READ / EXECUTE / OBSERVE / REPORT`

Use primarily to:
- verify repo, branch, HEAD and working tree;
- start/stop/restart app and dev server;
- execute explicit Shell / PowerShell commands;
- inspect ports, processes and runtime logs;
- reproduce runtime errors;
- inspect environment-specific failures;
- check runtime dependencies / DB behavior;
- run targeted tests/build/typecheck when requested;
- perform browser/UI verification where supported;
- report exact observed behavior and reproduction steps.

Do not use by default for:
- architecture, UX or product decisions;
- broad repository analysis or planning;
- autonomous implementation;
- substantial source generation/refactoring;
- speculative bug fixing;
- documentation/source-authority decisions.

If runtime evidence points to a source defect:
1. identify probable root cause;
2. preserve runtime evidence;
3. report file/location/error;
4. return implementation to ChatGPT/Codex.

VS Agent source changes require explicit narrow authorization.

### VS Code Agent cost policy

Treat the VS Agent as deliberately low-cost:
- use the lowest-cost adequate model;
- prefer low reasoning effort;
- keep context short and task-specific;
- use exact commands and bounded verification targets;
- define stop conditions;
- do not duplicate reasoning or implementation already handled by ChatGPT/Codex.

## Capability ownership

### ChatGPT
Use directly for:
- GitHub inspection/history/diff;
- architecture/design/audit;
- implementation planning;
- reviewing Codex results;
- documentation orchestration;
- Drive audit/mirror operations.

Do not ask the user to copy/paste information that connected tools can inspect directly.

### Codex
Prefer for non-trivial code changes requiring execution-backed static verification and focused implementation commits.

### GitHub
Canonical source for implementation history, branches, diffs/PRs and versioned docs. Static CI belongs here.

### VS Code
Primary local runtime environment for Shell/PowerShell, app execution, logs, browser/UI checks and environment-specific verification.

### VS Code Agent
Low-cost runtime operator. Not the default architecture/design/implementation agent.

### Replit
Legacy/historical environment only. Use only for explicitly Replit-specific or historical tasks. Replit configuration may remain as compatibility/preservation evidence until separately classified for cleanup.

### Google Drive
Audit working space and one-way mirror/backup of canonical docs. Drive copies do not become canonical edit authority.

## Documentation in implementation work

If an implementation changes project truth, update affected canonical documentation in the same workstream unless explicitly deferred.

Implementation handoffs remain evidence/session records. They do not become permanent canonical authority merely because they are newer.

## Validation and completion reporting

Every implementation completion report should separate:
- Completed changes;
- Static verification;
- Runtime/visual verification, if performed;
- Deviations;
- Documentation/tracking changes;
- Remote actions actually performed;
- unresolved issues.

Do not report planned but unperformed actions as completed.
