# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.05 — 2026-08-27

- Fix `cleanup_stale_project_attachments`: it was deleting rows directly
  from `storage.objects`, which Supabase blocks — this had been failing on
  nearly every `crm-notifications` cron run since 2026-08-17. Migration
  `0038` changes the RPC to only claim/delete the metadata row and return
  each `storage_path`; the cron route now removes the actual object via the
  Storage API (`supabase.storage.from('project-files').remove(...)`).
- Launch the CRM: it is now intentionally publicly reachable in Production
  (previously gated pre-launch). `CLAUDE.md` updated to reflect launched
  state and the production domain change (crystalwebsolution.com →
  cdsportswearusa.com).
- UI polish pass (8 fixes, all mechanical/no design changes): import
  existing `lib/easing.js` tokens instead of duplicating raw GSAP ease
  strings (Reveal.jsx, Menu.jsx, About.jsx); add missing `:focus-visible`
  states to the nav login/burger controls and three marketing anchor types;
  add missing hover/focus states to the CRM approval buttons and workspace
  sidebar toggle; wire the unused `SkeletonDetail`/`SkeletonTable`
  components into 11 CRM pages that previously showed bare "Loading..."
  text; remove dead `.crm-loading` CSS left behind in 5 pages that already
  migrated to `SkeletonTable`; fix `app/admin/projects` showing "no results
  match filters" even with zero filters applied; strip inert Tailwind
  utility classes from `MagnifiedBento.jsx` (this project has no Tailwind
  build).

## v1.04 — 2026-08-27

- Add a CI test gate: `docker-ci.yml` now runs `pnpm test` and `pnpm build`
  before the Docker image build, and the image build depends on that job
  succeeding — previously nothing blocked a failing test suite from merging
  to `main`.
- Consolidate `docker-ci.yml` and `docker-publish.yml` into one workflow
  (kept cosign image signing) and fix the missing `NEXT_PUBLIC_*` build args
  on the published `ghcr.io` image, so `docker run` per `README.md` produces
  a working image once the corresponding repo Variables are set.
- Add Upstash Redis-backed rate limiting (`lib/rateLimit.mjs`) to
  `POST /api/contact` and the `signUp`/`resendConfirmationEmail`/
  `requestPasswordReset` auth actions, implementing ADR-002 as Option C.
  Fails open until `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are
  configured.
- Reconcile the migration ledger against the live database read-only via the
  Supabase MCP connection: of the previously-undifferentiated `0025`-`0034`
  range, only `0031` and `0032` are genuinely unapplied (see
  `docs/reports/migration-ledger-reconciliation-2026-08-27.md`); no `db push`
  was run.

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
