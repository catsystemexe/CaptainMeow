# ADR 0001 – Mode Locked Init

## Status

HISTORICAL / NOT CURRENTLY IMPLEMENTED

This ADR records an early decision for a `GraphicsMode (Classic / Deluxe)` boot-time mode. The current repository audit did not find this mode contract in the active implementation. Therefore this ADR must not be treated as an active runtime requirement.

If a future graphics-mode feature revives this concept, create or update an active decision in `docs/project/04-decisions.md` based on the then-current implementation and product requirements rather than silently reactivating this ADR.

## Historical decision

GraphicsMode (Classic / Deluxe) is selected at boot and immutable.

## Historical rationale

- Prevents runtime asset swaps
- Eliminates pipeline complexity
- Guarantees determinism
