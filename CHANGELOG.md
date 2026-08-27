# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.04 — 2026-08-27

- Fix `updateProjectTask`'s revalidation bug: it passed the RPC-returned task
  id to `revalidateAllProjectPaths` instead of the project id, so a task
  update would never revalidate the right `/dashboard`, `/team`, or
  `/admin/projects` pages. No UI calls this server action yet, so this was a
  latent bug (tracked in `docs/DESIGN-CRITIQUE.md` K7); fixed now, before any
  task-edit UI ships, matching the sibling actions' established
  form-supplied-`projectId` pattern. Added a regression test.
- Fix `vitest.config.js`'s test `include` glob, which matched every
  `*.test.mjs` file and crashed on their `node:test` imports — vitest was
  never wired into any `pnpm` script, so this had gone unnoticed. Scoped
  `include` to `*.test.jsx` (the 8 real component tests it's meant to run,
  all passing) and added a `pnpm test:unit` script so the suite is
  discoverable and runnable.

## v1.03 — 2026-08-27

- Remove `flake.nix`, `shell.nix`, and `.envrc` — the Nix dev-environment
  shims were unreferenced by docs, CI, or tooling and added no value over
  the existing pnpm/Node workflow.

## v1.02 — 2026-08-26

- Add `council.yaml` and `council/prompts/` — configures the Agent Council
  (5-deliberator quality gate) for this repo's prose docs (`docs/`,
  `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `VERSIONING.md`).
  Scoped to docs, not source code — the council reviews text artifacts, not
  application code. `runtime.type: claude_cli` shells out to a separate,
  metered `claude` CLI process; `validate-config`/`health` are free,
  `review`/`sweep` are not.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
