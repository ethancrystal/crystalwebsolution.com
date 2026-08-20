# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if it exists — it doesn't yet. `/domain-modeling` creates it lazily the first time a term or decision actually gets resolved.
- **Root-level `ADR-NNN-name.md` files** — this repo's existing convention, e.g. `ADR-001-auth-flow.md`, `ADR-002-contact-form-rate-limiting.md`. Read the ones that touch the area you're about to work in. This repo does NOT use `docs/adr/` — keep new ADRs in the same root-level `ADR-NNN-name.md` style rather than starting a second location.
- **`CONTEXT-MAP.md`** at the repo root, if it exists — not applicable here (this is a single-context repo; `pnpm-workspace.yaml` has no `packages:` field and `package.json` has no `workspaces` field).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

## File structure

Single-context repo (this repo):

```
/
├── CONTEXT.md                 ← not yet created; lazy via /domain-modeling
├── ADR-001-auth-flow.md       ← existing convention: root-level, numbered
├── ADR-002-contact-form-rate-limiting.md
└── app/, components/, lib/, ...
```

If this repo ever becomes a genuine monorepo (a `packages:` field appears in `pnpm-workspace.yaml`, or `package.json` gains a `workspaces` field), re-run `/setup-matt-pocock-skills` to switch to the multi-context layout (`CONTEXT-MAP.md` + per-package `CONTEXT.md`/ADRs).

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md` once it exists. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding — e.g.:

> _Contradicts ADR-001 (auth flow) — but worth reopening because…_

Note: ADR-001 itself already documents a partial supersession (role/middleware details superseded 2026-07-30) — read its "Historical boundary" note before relying on it.
