# Project memory authority

- Date: 2026-09-27
- Status: Accepted

## Context

Agents read two memory layers: the root `MEMORY.md`, a consolidated history from earlier sessions, and `aidd_docs/memory/`, which `CLAUDE.md` and `AGENTS.md` import every session. While the bank was being built, several `MEMORY.md` claims turned out to be stale: the CRM flag state, the migration head and the canonical checkout path.

## Decision

`aidd_docs/memory/` holds the current state and wins on any conflict. Root `MEMORY.md` is history: useful for why something happened, never for what is true now.

## Alternatives

- Keep `MEMORY.md` as the source of truth. It lost because it is dated and is not imported per session.
- Delete `MEMORY.md`. It lost because it still carries history the bank deliberately drops.

## Consequences

- A fact changes in `aidd_docs/memory/`, not in `MEMORY.md`.
- Before relying on a `MEMORY.md` claim, check it against the code or the bank.
- `CLAUDE.md` and `AGENTS.md` stay the instruction layer. The bank records facts, not rules.
