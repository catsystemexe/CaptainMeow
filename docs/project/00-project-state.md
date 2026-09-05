# Captain Meow — Project State

Status: CANONICAL CURRENT-STATE SUMMARY
Last updated: 2026-09-06

This document summarizes the currently verified project state. It does not override actual code for implemented behavior or explicit active decisions for intended future behavior.

## Repository

Canonical repository: `catsystemexe/CaptainMeow`.

Current active integration line:
- branch: `pixel_bgr`.

Current HEAD must be resolved from GitHub before implementation. Do not rely on a historical pinned SHA as a self-updating source of truth.

The active integration branch is a resolved project-state fact, not a permanent hard-coded branch name. Historical lines such as `work` or `main` must not be assumed current.

## Preserved legacy evidence

Historical preservation branches/configuration may remain after their functional intent has been promoted. They are evidence only and must not be treated as current workflow authority or merged automatically.

Do not delete legacy configuration solely because it is inactive; classify it first.

## Current implementation shape

Captain Meow is a TypeScript/Vite browser game with a deterministic fixed-step gameplay core and development/authoring tooling.

Verified implementation families include:
- engine loop, EventBus and entity infrastructure;
- gameplay world/session systems;
- player, enemies, FSM/behavior systems and group/spawn tooling;
- weapons, projectiles, collisions, damage, scoring and pickups;
- data-driven gameplay/content definitions;
- WebGL rendering and presentation layers;
- background/BGR scene systems;
- Pixel/Scene BGR authoring tools, timeline and gameplay seek support;
- developer UI/labs and smoke checks.

Multitrack Pixel BGR Engine V2 is the current focused product-development workstream.

Current active BGR work plan:
- `docs/bgr/PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md`.

## Runtime environment

Local VS Code is the primary runtime/environment verification surface.

VS Code is used for:
- running the app/dev server;
- Shell/PowerShell execution;
- browser/UI and visual verification;
- runtime logs/errors;
- process/port inspection;
- environment-specific dependency/configuration checks.

VS Code Agent is the default low-cost runtime operator with role:
`READ / EXECUTE / OBSERVE / REPORT`.

It is not the default designer, architect, implementer or refactoring agent. If runtime investigation indicates a source change, preserve evidence and return implementation to ChatGPT/Codex on a focused branch.

Runtime environments provide evidence, not repository authority.

## Static verification / CI

Minimal GitHub CI is active at `.github/workflows/static-verify.yml`.

Baseline:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

This CI does not imply full test coverage. Task-specific smokes/tests remain explicit evidence and known unrelated baseline failures must be reported separately.

## Documentation state

Canonical maintained project documentation is established under `docs/project/`.

Repository-local executor/engineering authority is `AGENTS.md`.

Historical/stale material is preserved and classified through `docs/HISTORICAL_DOCUMENTS.md`; historical documents and handoffs are evidence, not active authority.

## Drive canonical mirror

Dedicated mirror location:
- `___CaptainMeow/___CANONICAL_MIRROR`.

Git remains canonical. Drive copies are one-way mirror/backup only and must not become an independent edit authority.

## Current approved operating model

1. Git repository = canonical implementation and versioned project documentation.
2. GitHub = branches, PR integration, history and static CI.
3. ChatGPT = design, audit, authority resolution, GitHub inspection and implementation orchestration.
4. Codex = primary implementation agent for non-trivial source changes and execution-backed static verification.
5. VS Code = primary local runtime environment.
6. VS Code Agent = deliberately low-cost runtime operator, not primary designer/implementer.
7. Drive = synchronized mirror/backup plus audit workspace.
8. Static and runtime verification remain distinct.
9. Active integration branch is dynamically resolved; do not assume historical branch names.

## Current next work

Current product priority is the structural Pixel BGR DEV Workspace v1 migration described in `docs/bgr/PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md`.

Implementation proceeds incrementally from a verified `pixel_bgr` baseline, beginning with the dual GAME/DEV shell foundation and preserving verified BGR V2 runtime/editing contracts.
