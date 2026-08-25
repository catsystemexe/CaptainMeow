# Captain Meow — Historical Documentation Index

Status: CANONICAL CLASSIFICATION INDEX
Last updated: 2026-08-26

This file classifies preserved non-canonical documentation so that historical detail remains available without competing with current project authority.

Current maintained project documentation lives in `docs/project/*`. For implemented behavior, current code/runtime contracts remain primary evidence.

## Root FSM lineage

### `FSM_audit.md`
**Classification: HISTORICAL AUDIT SNAPSHOT**

Audit of an earlier FSM/repository state. Useful for provenance, original findings and design rationale. File paths, branch names, test state, implementation gaps and conclusions must not be assumed current without verification.

### `FSM_architecture_proposal.md`
**Classification: HISTORICAL DESIGN PROPOSAL**

A detailed target-design proposal produced from the earlier FSM audit. It contains valuable design alternatives and rationale but is not current project architecture authority.

### `FSM_architecture_final.md`
**Classification: HISTORICAL DESIGN DECISION LINEAGE / PARTIALLY SUPERSEDED BY IMPLEMENTATION**

This was the revised design outcome for the FSM workstream at that time. Many ideas may be reflected in current implementation, but the document references an older repository baseline and must be verified against current code and `docs/project/01-architecture.md` before use as a current contract.

### `FSM_implementation_sessions_S1-S11.md`
**Classification: HISTORICAL IMPLEMENTATION ROADMAP / HANDOFF CONTRACT**

This file instructed a past implementation sequence. It includes obsolete branch/workflow assumptions and should not be used as the current Codex workflow. Current executor rules are in `AGENTS.md` and `docs/project/05-development-workflow.md`.

## Repository audit material

### `docs/audit/*`
**Classification: HISTORICAL AUDIT SNAPSHOTS**

These files describe repository state at specific June 2026 branches/commits. They remain useful for forensic comparison and rationale, not current-state claims.

## BGR lineage

### `docs/bgr/fable-audit/*`
**Classification: HISTORICAL AUDIT / DESIGN BASELINE**

Preserves the BGR investigation/design baseline from an older integration snapshot.

### `docs/bgr/handoffs/*`
**Classification: IMPLEMENTATION LINEAGE / SESSION EVIDENCE**

Handoffs are valuable evidence connecting intended work, commits and validation. Session-local metadata such as starting HEAD, branch status, next-session instructions and temporary limitations is historical. A handoff does not become canonical authority merely because it is recent.

## Legacy architecture and decisions

### `docs/architecture/CM_Architecture_v3.1.md`
**Classification: HISTORICAL / SUPERSEDED AS GLOBAL AUTHORITY**

Its deterministic-engine principles remain useful context. Its former “Single Source of Truth” claim is retired. Current architecture authority is `docs/project/01-architecture.md` plus actual implementation/runtime contracts.

### `docs/decisions/ADR_0001_ModeLockedInit.md`
**Classification: HISTORICAL / NOT CURRENTLY IMPLEMENTED**

The Classic/Deluxe boot-time graphics-mode decision is not present as a confirmed active runtime contract in the audited current implementation.

## Preservation artifacts

Repository `.bak*`, `_patch/`, dump files and similar artifacts are **PRESERVATION / TECHNICAL-DEBT EVIDENCE**, not normal implementation or documentation authority. Do not delete them until uniqueness/value is explicitly reviewed.

## External Drive documentation

The Google Drive `___docs` area is **HISTORICAL / POTENTIALLY STALE** by project policy. It may be consulted for provenance, but current truth must be resolved against Git and active project decisions.

## Classification rule

Historical does not mean “wrong” or “useless”. It means:
- preserve the evidence;
- do not silently delete it;
- do not treat it as current authority;
- promote still-valid contracts into canonical `docs/project/*` when they need to remain normative.
