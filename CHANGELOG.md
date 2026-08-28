# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.11 — 2026-08-27

- **Retroactive entry.** PR #129 (merged 2026-08-27) applied newly supplied
  brand artwork site-wide: replaced the canonical logo and favicon,
  rewired the new logo's dimensions across marketing, auth, and CRM
  surfaces (`app/layout.jsx`, `/login`, `/signup`, `BrandLogo.jsx`,
  `PortalLoginForm.jsx`, `WorkspaceShell.jsx`), removed the unused legacy
  `cws-header-logo.png`, and added the logo to transactional email
  headers with an accessible text fallback. Also adds a homepage feature:
  a new `lib/clientTileImages.mjs` "Named Client tile registry" wiring 9
  authorized client project images (Direct Design Agency, Peregrine,
  Grounded, Tomoro Sugawara Design, Momento Legal, Infinity Signal, Shaky
  Love, Rezonbio, Oimachi) into `components/sections/Motion.jsx`.

## v1.10 — 2026-08-27

- **Retroactive entry.** PR #126 (merged 2026-08-27) replaced the
  conflicting PR #119 security slice with a clean integration: adds
  shared IP + normalized-email rate limiting to the unauthenticated auth
  actions (`signUp`, `resendConfirmationEmail`, `requestPasswordReset`),
  normalizes the CRM feature flag (`lib/crmFlag.js`), adds auth-callback
  middleware coverage, and adds focused security tests plus operational
  documentation (`docs/CRM-OPERATIONS.md`).

## v1.09 — 2026-08-27

- **Retroactive entry.** PR #116 (merged 2026-08-27, actually deployed
  before v1.06 below — see note above v1.07) swapped the site's wordmark
  and favicon for new brand artwork: `public/cd-sportswear-usa-logo.png`
  (nav, `/login`, `/signup`, CRM workspace shell) resized from its
  2304×1536 source to 912×608, and `app/icon.png` resized from 4096×4096
  to 500×500. Corrected `width`/`height` attributes on every
  `SITE.logoPath` consumer for the new 1.5:1 aspect ratio (vs. the old
  logo's 1.795:1) to prevent visible stretching on the three consumers
  with no CSS governing render size.

## v1.08 — 2026-08-27

- **Retroactive entry.** PR #122 (merged 2026-08-27, actually deployed
  before v1.06 below — see note above v1.07) fixed a logo left stretched
  on every CRM page (`/dashboard`, `/team`, `/admin`): PR #114 had cropped
  the shared logo asset to 456×254 and updated `BrandLogo.jsx`'s
  `width`/`height` to match, but missed the second consumer,
  `components/crm/WorkspaceShell.jsx`, which still hardcoded the old
  500×500 — with no CSS overriding intrinsic sizing, the browser's default
  `object-fit: fill` silently distorted the image.

## v1.07 — 2026-08-27

- **Retroactive entry** — PR #125 (this is the first of three entries
  added out of chronological order: #125, #122, and #116 below all merged
  and deployed *before* v1.06, but are logged here as v1.07–v1.09 since
  those numbers were already taken by the time this reconciliation ran.
  Dates reflect actual merge time, not this entry's position in the file.
  Fix `cleanup_stale_project_attachments`: it was deleting rows directly
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

## v1.06 — 2026-08-27

- Set the canonical contact email to `sales@cdsportswearusa.com` and the
  transactional sender domain to `cdsportswearusa.com`, closing the gap left
  when the site rebranded to CD Sportswear USA but `lib/site.js` and
  `lib/email/resend.js` still pointed at `crystalwebsolution.com`.
- Fix `/login/client`, `/login/employee`, and `/login/admin`: the brand-mark
  `Link` and its child `img`, plus the footer text links, were unstyled
  because styled-jsx never scopes classes onto `next/link`'s rendered `<a>`
  — the logo rendered at its raw 2304px intrinsic width, blowing out the
  page at every viewport, not just mobile. Wrapped the affected selectors in
  `:global()`, matching the same fix already applied to `app/login/page.jsx`.
- Raise the dimmed sibling-row description opacity in the Services section
  from 0.6 to 0.82 — the lower value read as illegible "shadowed" text
  against the animated 3D backdrop.

## v1.05 — 2026-08-27

- Fix `useUserRole()` reading `user.app_metadata.role`, a claim this app
  never sets — `isAdmin`/`isPm` were always `false`, silently redirecting
  real admins off `/admin/users` and hiding admin-only controls on the
  companies/contacts/deals pages. It now reads `role` from the `profiles`
  table, matching `middleware.js`.
- Add a `requireRole()` backstop to the three portal layouts
  (`app/admin`, `app/dashboard`, `app/team`), which were bare
  pass-throughs relying entirely on middleware. Allowed roles mirror
  `lib/auth/roles.mjs`'s existing portal mapping exactly.
- Wire the 8 existing `tests/marketing/*.test.jsx` vitest tests into a
  new `pnpm test:marketing` script and the `docker-ci.yml` test job —
  they had a working `vitest.config.js` but nothing ever ran them.
- Fix `docker-ci.yml`'s CI test gate itself: it pinned Node 20, but
  `pnpm@11.21.0` (this repo's pinned package manager) requires Node
  >=22.13 and crashes immediately on Node 20 with
  `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` — the gate v1.04 just added
  has been failing on every PR since it merged, for this reason alone,
  regardless of the PR's actual content. Bumped to Node 24, matching
  local dev.

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
