# Captain Meow — Development Workflow

Status: CANONICAL TARGET WORKFLOW
Last updated: 2026-08-26

## Operating model

ChatGPT Project
→ inspect / reason / design / orchestrate
→ resolve active integration branch X
→ focused task branch Y / Codex implementation when code execution is needed
→ static verification
→ integration according to explicit authorization
→ Replit runtime/visual verification when required
→ preserve all valuable changes in Git
→ update canonical docs when project truth changes
→ synchronize canonical docs GitHub → Drive.

## Role framework

Use:
- `[DESIGNER]` for what/why;
- `[INSTRUCTIONS]` for batching/scope/acceptance criteria/executor routing;
- `[IMPLEMENTATION]` for execution.

Code mode is a process/safety overlay for implementation-oriented work.

## Branch model

- X = currently approved active integration branch.
- Y = focused task branch created from verified X.
- Do not assume `main`, `work` or even the GitHub default branch is X without verification.
- At the 2026-08-26 consolidation checkpoint, `pixel_bgr` is the saved current integration baseline.

Ordinary non-trivial implementation should use a focused task branch where practical.

Do not merge, reset, rewrite history, force-push, delete branches or deploy without explicit authorization.

Push/hosted-PR creation follows the current implementation batch/task authorization.

## Pre-change safety

Before substantial repository work:
- verify repository identity and target baseline;
- inspect `AGENTS.md` and relevant canonical docs;
- inspect relevant source/contracts;
- inspect working-tree state when the execution environment exposes it;
- preserve unknown/user-owned work before operations that could overwrite/hide it.

If the required baseline cannot be established safely, stop repository modification and report the ambiguity.

## Replit synchronization / preservation gate

Before branch switching, pulls, reset-like operations or major runtime migration in Replit:
1. run/inspect Git status;
2. if valuable local work exists, move it to a preservation/task branch;
3. commit it;
4. push when appropriate/authorized;
5. verify remote preservation;
6. only then synchronize/switch to the intended integration branch.

Replit should not contain long-lived valuable uncommitted source changes.

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

## Runtime verification

Use Replit only when runtime evidence adds value:
- live game behavior;
- browser/runtime errors;
- environment-specific behavior;
- authoring UI interaction;
- visual/UX verification.

Never claim runtime/visual verification from static checks alone.

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
Canonical source for implementation history, branches, diffs/PRs and versioned docs. Future CI belongs here.

### Replit
Runtime/Shell/Preview/environment-specific verification. Replit Agent is not required.

### Google Drive
Audit working space and one-way mirror/backup of canonical docs. Drive copies do not become canonical edit authority.

## Documentation in implementation work

If an implementation changes project truth, update the affected canonical documentation in the same workstream unless explicitly deferred.

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