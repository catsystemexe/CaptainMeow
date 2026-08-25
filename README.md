# Captain Meow (CM)

Captain Meow is a TypeScript/Vite browser game with a deterministic fixed-step gameplay core, data-driven enemy/FSM systems, WebGL rendering, background/scene authoring, and developer tooling.

## Current project documentation

Canonical maintained project documentation lives in `docs/project/`:

- `docs/project/00-project-state.md` — verified current project state
- `docs/project/01-architecture.md` — current architecture summary
- `docs/project/02-roadmap.md` — consolidation/development roadmap
- `docs/project/03-backlog.md` — governance/workflow backlog
- `docs/project/04-decisions.md` — active project decisions
- `docs/project/05-development-workflow.md` — current development workflow
- `docs/project/06-chatgpt-project-profile.md` — project-specific ChatGPT profile

Repository-local engineering/executor rules are in `AGENTS.md`.

## Historical documentation

Older architecture proposals, audits, implementation-session plans and handoffs remain preserved as evidence. They are not automatically current authority. See `docs/HISTORICAL_DOCUMENTS.md` for classification guidance.

## Runtime / development

Common scripts are defined in `package.json`, including Vite development/build, TypeScript checking, targeted tests and smoke checks. Exact validation semantics and known limitations are documented in `AGENTS.md` and `docs/project/05-development-workflow.md`.
