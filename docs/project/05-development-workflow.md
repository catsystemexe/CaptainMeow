# Captain Meow — Development Workflow

Status: CANONICAL TARGET WORKFLOW
Last updated: 2026-09-06

## Operating model

ChatGPT Project
→ inspect / reason / design / orchestrate
→ resolve active integration branch X
→ Codex implements on focused task branch Y
→ Codex performs static verification
→ Codex commits and pushes Y to origin
→ ChatGPT reviews the remote branch/diff and verification evidence
→ ChatGPT creates PR Y → X and merges when integration is authorized
→ VS Code / VS Code Agent performs runtime/environment verification when required
→ if runtime fails, preserve evidence and return source repair to ChatGPT/Codex on a new focused branch
→ update canonical docs when project truth changes
→ synchronize canonical docs GitHub → Drive.

Git is canonical. Runtime environments provide evidence, not source authority.

## Role framework

Use:
- `[DESIGNER]` for what/why;
- `[INSTRUCTIONS]` for batching/scope/acceptance criteria/executor routing;
- `[IMPLEMENTATION]` for execution.

Code mode is a process/safety overlay for implementation-oriented work.

## Branch model

- X = currently approved active integration branch.
- Y = focused task branch created from verified X.
- Do not assume `main`, `work` or the GitHub default branch is X without verification.
- At the current checkpoint, `pixel_bgr` is the active Captain Meow integration branch; re-verify before each new implementation batch.
- Ordinary non-trivial implementation should use a focused Y branch.

Before substantial work verify repository identity, branch, HEAD and working tree; inspect `AGENTS.md`, relevant canonical docs and affected source/contracts.

Do not reset, rewrite history, force-push, delete branches or deploy without explicit authorization.

## Default implementation handoff

### Codex
Codex is the primary implementation agent.

Expected end state for an approved implementation task:
1. implement only the approved scope on Y;
2. run task-appropriate static verification;
3. commit the focused change;
4. push Y to `origin`;
5. confirm the remote branch exists;
6. stop without creating or merging a PR unless explicitly instructed otherwise.

A normal Codex completion report should include:
- branch;
- commit SHA;
- pushed: YES/NO;
- remote branch confirmed: YES/NO;
- exact static checks run and their results;
- known unrelated failures kept separate;
- runtime verification performed/not performed.

Captain Meow Codex Cloud is configured for authenticated GitHub push. If push fails, report `PUSH BLOCKED`; do not invent remote state.

### ChatGPT integration gate

After a good Codex result, ChatGPT should inspect the remote branch/commit/diff and static evidence directly through GitHub where available.

When the batch or user authorization permits integration, ChatGPT may:
1. create a PR from Y to verified X;
2. verify base/head and expected head SHA;
3. merge the PR;
4. report the merge commit.

Do not merge when scope, baseline, diff or verification evidence is materially uncertain. Return the issue to Codex or stop for a user decision.

## Static verification

STATIC VERIFY covers repository/source evidence and environment-independent executable checks, including as appropriate:
- source/diff/history review;
- `npm run typecheck`;
- targeted tests/smokes;
- `npm run build`;
- schema/contracts checks;
- GitHub CI status.

Current command semantics must not be overstated. Reports must name exactly which checks ran and distinguish pre-existing failures from task regressions.

### GitHub CI baseline

Repository CI is intentionally minimal and conservative:
- workflow: `.github/workflows/static-verify.yml`;
- trigger: pull requests and manual `workflow_dispatch`;
- runtime: Node 20;
- install: `npm ci`;
- gates: `npm run typecheck` and `npm run build`.

This does not imply full test coverage. Broader or task-specific smokes remain explicit evidence outside the minimal CI gate unless later promoted.

## Runtime verification

RUNTIME VERIFY is performed in the local VS Code environment when runtime evidence adds value:
- live game/application behavior;
- browser/UI interaction;
- visual/UX verification;
- runtime logs/errors;
- process/port behavior;
- environment variables and environment-specific dependencies;
- runtime DB behavior where applicable.

Never claim runtime or visual verification from static checks alone.

### VS Code Agent — runtime operator

Default role:
`READ / EXECUTE / OBSERVE / REPORT`

Use primarily to:
- verify repo, branch, HEAD and clean/expected working tree;
- start/stop/restart app and dev server;
- run explicit Shell/PowerShell commands;
- inspect ports, processes and logs;
- reproduce runtime errors;
- perform browser/UI verification where supported;
- report exact behavior, errors and reproduction steps.

Do not use by default for design, architecture, broad repository analysis, autonomous implementation, refactoring or documentation design.

If runtime evidence indicates a source change:
1. preserve evidence;
2. identify the probable root cause/file/location where possible;
3. stop source modification;
4. return implementation to ChatGPT/Codex.

VS Code Agent may modify source only when explicitly authorized with narrow scope.

If the expected branch/HEAD/worktree differs, stop and report instead of improvising repository changes.

## Capability ownership

### ChatGPT
Architecture, UX/product design, authority resolution, audits, implementation planning, GitHub inspection, Codex review, PR creation/merge when authorized, documentation orchestration and Drive mirror/audit operations.

### Codex
Primary source-code implementation, focused refactors, repository investigation, execution-backed static verification, commit and push of focused task branches.

### GitHub
Canonical implementation/history/docs surface, branches, PRs, merge history and static CI.

### VS Code
Primary local runtime environment for app execution, Shell/PowerShell, logs, browser/UI and environment-specific checks.

### VS Code Agent
Low-cost runtime operator, not primary designer or implementer.

### Google Drive
Audit working space and synchronized mirror/backup of canonical docs. Drive copies do not become independent edit authority.

## Documentation in implementation work

If implementation changes documented truth, update affected canonical Git documentation in the same workstream unless explicitly deferred.

Git documentation is canonical; Drive is synchronized afterward as mirror/backup/audit material.

Implementation handoffs are evidence/session records and do not become canonical authority merely because they are newer.

## Validation and completion reporting

Every implementation completion report should separate:
- completed changes;
- static verification;
- runtime/visual verification, if performed;
- deviations and known unrelated failures;
- documentation/tracking changes;
- remote actions actually performed;
- unresolved issues.

A source change that requires runtime evidence is not fully runtime-verified merely because it was merged.

Do not report planned but unperformed actions as completed.
