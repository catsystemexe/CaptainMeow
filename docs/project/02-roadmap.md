# Captain Meow — Roadmap

Status: CANONICAL DEVELOPMENT / CONSOLIDATION ROADMAP
Last updated: 2026-09-06

This roadmap tracks repository/workflow/documentation consolidation and near-term engineering governance. Detailed product workstream plans may live in narrower subsystem documents.

## Active product workstream

Multitrack Pixel BGR Engine V2 is the current focused product-development workstream.

Current active structural UX work plan:
- `docs/bgr/PIXEL_BGR_DEV_WORKSPACE_V1_WORK_PLAN.md`.

The approved next implementation sequence is:
1. dual GAME/DEV shell foundation;
2. DEV grid composition;
3. full-width V2 timeline migration;
4. selection-driven right inspector;
5. basic left navigation/environment access;
6. structural responsive/cursor-stability polish.

Preserve verified BGR V2 editing/runtime contracts while migrating the shell. Do not resume button-by-button polishing of the old floating overlay by default.

## Completed audit / consolidation sequence

The source/access, preservation, implementation/documentation, workflow, instruction-authority and consolidation audits are complete.

Completed consolidation outcomes include:
- canonical `docs/project/*` set;
- repository-local `AGENTS.md` authority cleanup;
- historical documentation classification;
- GitHub static-verification CI;
- GitHub → Drive canonical mirror;
- branch unique-content reconciliation and authorized historical cleanup;
- final consistency audit.

Historical audit records remain evidence only and do not define the current runtime workflow.

## Current operating model

- Git repository: canonical implementation and versioned documentation.
- GitHub: branches, PRs, history and static CI.
- ChatGPT: design, analysis, authority resolution, implementation orchestration and integration review.
- Codex: primary focused implementation and execution-backed static verification.
- VS Code: primary local runtime/environment/browser verification surface.
- VS Code Agent: low-cost `READ / EXECUTE / OBSERVE / REPORT` runtime operator.
- Google Drive: synchronized mirror/backup plus audit workspace.

## Post-audit maintenance / hygiene

Non-blocking items:
- explicit resolution/port-or-retire decisions for retained reference branches where still relevant;
- review `.bak`, dump and `_patch` artifacts before deletion;
- dependency/security triage from CI findings;
- GitHub Actions runtime-maintenance warning review;
- broader smoke-suite baseline and semantics reconciliation.

## Ordering rule

Product implementation must follow the currently approved focused work plan and verified integration baseline. Destructive cleanup remains evidence-driven and explicitly authorized. Historical material does not become current authority merely because it is retained.
