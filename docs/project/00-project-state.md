# Captain Meow — Project State

Status: CANONICAL CURRENT-STATE SUMMARY
Last audited: 2026-09-05

This document summarizes currently verified project state plus active approved workflow decisions. It does not override actual code for implemented behavior.

## Repository

Canonical repository: `catsystemexe/CaptainMeow`.

Current active integration line:
- branch: `pixel_bgr`
- GitHub default branch: `pixel_bgr`

Current GitHub HEAD at the 2026-09-05 workflow-update checkpoint:
- commit: `c5dd88bb7c404b59ee568f69e4c5616e8ce98cb5`

The active integration branch is a resolved project-state fact, not a permanent hard-coded branch name. Current work must verify repo, approved branch, HEAD and working tree before implementation or runtime work.

`work` is an older ancestor and must not be assumed current. Historical `main` content was reconciled during C6 and did not require promotion.

## Preserved Replit evidence

A Replit-only BGR Lab state was preserved before consolidation:
- branch: `backup/replit-bgr-lab-preaudit-20260825`
- commit: `4b4fb32988ce92a2a16e8fcc309ac9584bedaca3`

Its functional `createGame.ts` seek-wiring intent was subsequently promoted to canonical integration through PR #129 and passed Static Verify. The branch remains preservation/history evidence only; it must not be treated as current runtime authority or merged automatically.

Historical live Replit checkpoint:
- branch: `pixel_bgr`;
- HEAD: `940358eb9f35c73d9172c6962e483f8f1f6d51bb`;
- working tree was clean;
- `origin` had been normalized to `https://github.com/catsystemexe/CaptainMeow`.

This checkpoint remains historical evidence of the former runtime environment.

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

The BGR implementation continues on `pixel_bgr`; detailed current workstream state belongs in `docs/bgr/MULTITRACK_BGR_V2_ROADMAP.md`.

## Runtime environment

Active workflow decision effective 2026-09-05:

**VS Code is the default local runtime/environment verification surface.**

VS Code owns:
- Shell / PowerShell runtime operations;
- application/dev-server execution;
- runtime logs;
- process/port checks;
- environment-specific dependency behavior;
- browser/UI/runtime verification where supported.

VS Code Agent is deliberately constrained to a low-cost runtime-operator role:
`READ / EXECUTE / OBSERVE / REPORT`.

It is not the primary designer, architect or implementation agent. Use it for deterministic/bounded runtime operations and diagnostics. Source changes require explicit narrow authorization; otherwise runtime evidence returns to ChatGPT/Codex for implementation.

No new VS Code runtime checkpoint is claimed by this documentation update. Runtime state must be verified against the actual local repo/branch/HEAD when a runtime task begins.

Replit is no longer part of the default development workflow. Replit-specific configuration, preservation branches and documentation may remain as historical/migration/compatibility evidence until separately classified.

## Static verification / CI

Minimal GitHub CI is active at `.github/workflows/static-verify.yml`.

Validated baseline:
- Node 20;
- `npm ci`;
- `npm run typecheck`;
- `npm run build`.

A pre-existing malformed authoring-seek wiring block in `src/game/boot/createGame.ts` was detected by CI and repaired through PR #129. The repair passed the full Static Verify sequence before merge.

This CI does not imply full test coverage. `npm run test` remains a targeted smoke and the broader smoke suite is not a required green gate until its semantics/baseline are reconciled.

## Documentation state

Canonical maintained project documentation is established under `docs/project/`.

Repository-local executor/engineering authority is `AGENTS.md`.

Historical/stale material is preserved and classified through `docs/HISTORICAL_DOCUMENTS.md`.

Key classifications include:
- root FSM audit/proposal/final/session documents as historical lineage rather than current global authority;
- June repository audit documents as historical snapshots;
- `docs/architecture/CM_Architecture_v3.1.md` as superseded global authority;
- `docs/decisions/ADR_0001_ModeLockedInit.md` as historical/not currently implemented;
- BGR handoffs as implementation/session evidence;
- historical Drive `___docs` material;
- Replit-era workflow records as historical where they describe completed past work.

## Drive canonical mirror

Dedicated mirror location:
- `___CaptainMeow/___CANONICAL_MIRROR`
- contents: all seven canonical `docs/project/*` documents plus `README_MIRROR` manifest.

Git remains canonical. Drive copies are one-way mirror/backup only and must not become an independent edit authority.

The 2026-09-05 VS Code workflow update requires resynchronization of affected mirror documents after Git integration; `README_MIRROR` provenance must then be refreshed to the integrated Git checkpoint.

## Audit and consolidation status

The original audit/consolidation program P0–F4 and C1–C7 is COMPLETE.

The 2026-09-05 VS Code migration is a later operating-model change and does **not** reopen the completed audit program. It requires focused instruction/workflow/documentation alignment only.

Current operating model:
1. Git repository = canonical implementation and versioned project documentation.
2. Drive = synchronized mirror/backup plus audit workspace.
3. ChatGPT = architecture, UX/product design, reasoning, audit, authority resolution, planning, evaluation and orchestration.
4. Codex = primary implementation agent for non-trivial source changes and execution-backed static verification.
5. VS Code = default local runtime/environment verification surface.
6. VS Code Agent = low-cost runtime operator, not primary designer/implementer.
7. Replit = legacy/historical by default; explicit Replit-specific use only.
8. Cross-project roles = `[DESIGNER]`, `[INSTRUCTIONS]`, `[IMPLEMENTATION]`; Code mode is a process/safety overlay.
9. Active integration branch is dynamically resolved; fixed `work/main` authority is retired.
10. Branch cleanup follows unique-content reconciliation and explicit authorization.

## Current next work

Current documentation/workflow maintenance:
- integrate the focused VS Code workflow documentation update;
- resynchronize affected canonical docs to Drive after integration;
- classify retained `.replit` / Replit-specific Vite host compatibility separately before any removal;
- continue ordinary BGR product-development work according to its dedicated roadmap;
- retain remaining dependency/security, Actions, smoke-baseline and preservation-artifact items as non-blocking hygiene unless explicitly promoted.
