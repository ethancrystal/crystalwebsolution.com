# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.07 — 2026-08-29

- Expand the Motion section's decorative `WorkMarquee` from 9 to all 31
  supplied Awwwards showcase screenshots (`lib/clientTileImages.mjs`), so
  each tile in the rail shows a distinct image before repeating.
- Correct comments in `lib/clientTileImages.mjs`, `components/ui/work-marquee.jsx`,
  and `components/sections/Motion.jsx` that mischaracterized these
  third-party screenshots as "real CD Sportswear USA client deployments" —
  they are unrelated Awwwards sites used only as decorative visual texture
  in an `aria-hidden` rail. The real, named client record is
  `lib/projects.js`, rendered as the accessible project list beside the
  marquee. Add `public/projects/clients/SOURCES.md` with full per-image
  attribution for audit.

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
