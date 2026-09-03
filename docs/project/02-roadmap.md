# Captain Meow — Roadmap

Status: CANONICAL DEVELOPMENT / CONSOLIDATION ROADMAP
Last updated: 2026-09-03

This roadmap tracks repository/workflow/documentation consolidation and near-term engineering governance. It is not a substitute for a product/gameplay feature roadmap.

## Active product workstream

Multitrack Pixel BGR Engine V2 is the current focused product-development workstream.

Canonical workstream roadmap:
- `docs/bgr/MULTITRACK_BGR_V2_ROADMAP.md`

Detailed BGR architecture, milestone scope, acceptance criteria, and STATIC/RUNTIME verification gates are maintained there rather than duplicated in this project-level roadmap.

## Completed audit sequence

- P0 Source/access/authority inventory — COMPLETE
- P1 Audit workspace/bootstrap — COMPLETE
- F0 Preservation baseline — COMPLETE
- F1 Implementation × documentation audit — COMPLETE
- F2 GPT/GitHub/Replit workflow audit — COMPLETE
- F3 Instruction authority audit — COMPLETE
- F4 Consolidation proposal — COMPLETE / APPROVED

## Completed post-gate consolidation

### C1 Canonical docs bootstrap — COMPLETE

Seven canonical `docs/project/*` documents established and integrated through PR #124.

### C2 Instruction consolidation — COMPLETE

Project/repository instruction authority aligned. `AGENTS.md` reduced to repository-local engineering/executor rules and dynamic X/Y branch model. Integrated through PR #125.

### C3 Documentation migration — COMPLETE

README/current entry point corrected, historical documentation centrally classified, obsolete global authority claims retired. Integrated through PR #126.

### C4 Workflow normalization / CI — COMPLETE

Completed outcomes:
- minimal GitHub `Static Verify` CI integrated through PR #127;
- CI runtime verified through actual Actions execution;
- pre-existing `createGame.ts` syntax failure detected and repaired through PR #129;
- repair passed `npm ci` → `npm run typecheck` → `npm run build`;
- Replit `origin` normalized from historical `catsystemexe/MGoD` to `catsystemexe/CaptainMeow`;
- Replit workspace fast-forwarded safely to `pixel_bgr@940358eb9f35c73d9172c6962e483f8f1f6d51bb` with preservation branch intact.

### C5 Drive synchronization — COMPLETE

Completed outcomes:
- canonical status refreshed before mirroring through PRs #130 and #131;
- dedicated Drive mirror folder `___CaptainMeow/___CANONICAL_MIRROR` created;
- all seven canonical `docs/project/*` documents mirrored;
- Drive `___docs` remains historical and separate.

### C6 Branch reconciliation — COMPLETE

Completed outcomes:
- `main` five-commit divergence classified as historical merge topology only; no net unique file-state content requires promotion;
- preservation branch functional seek-wiring intent confirmed as already promoted through PR #129;
- 111 historical `codex/*` branches inventoried at audit time;
- six historical open PRs (#1, #2, #4, #5, #11, #22) individually classified and then closed without merge after explicit authorization;
- merged/reachable and superseded task branches classified as cleanup candidates;
- physical branch deletion left as optional hygiene because the connected GitHub capability does not expose branch-ref deletion.

### C7 Final consistency audit — COMPLETE

C7 verified:
- code vs canonical docs;
- Project Instructions vs versioned profile/workflow;
- AGENTS vs current repository model;
- GitHub vs Drive mirror;
- Replit implementation checkpoint vs Git history;
- CI semantics;
- branch/preservation state.

Result:
- no new architecture or runtime conflict;
- all commits after implementation checkpoint `940358eb...` through the C7 audit checkpoint were documentation-only;
- operating model is internally consistent;
- final canonical tracking closeout and Drive mirror provenance synchronization were completed.

Audit evidence: `___CaptainMeow/___AUDIT/07_FINAL_CONSISTENCY_AUDIT`.

## Consolidation program status — COMPLETE

- canonical implementation/documentation authority is established in Git;
- canonical tracking reflects completed C1–C7 work;
- affected Drive mirror documents were synchronized after the C7 closeout;
- `README_MIRROR` records the exact synchronized Git checkpoint;
- Replit is normalized to the canonical repository and retained as runtime/verification environment;
- branch unique-content reconciliation is complete;
- remaining work has moved to ordinary maintenance/hygiene or product development.

## Post-audit maintenance / hygiene

Non-blocking items:
- optional deletion of already-classified historical task branches;
- long-term retention decision for `main`;
- long-term retention decision for `backup/replit-bgr-lab-preaudit-20260825`;
- review `.bak`, dump and `_patch` artifacts before deletion;
- dependency/security triage from CI `npm audit` findings;
- GitHub Actions action-runtime maintenance warning review;
- broader smoke-suite baseline and semantics reconciliation.

## Ordering rule

Destructive cleanup remains evidence-driven and explicitly authorized. Historical material does not become current authority merely because it is retained.
