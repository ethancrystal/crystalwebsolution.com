# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.11 — 2026-08-29

- Fix `updateProjectTask`'s revalidation bug: it passed the RPC-returned task
  id to `revalidateAllProjectPaths` instead of the project id, so a task
  update would never revalidate the right `/dashboard`, `/team`, or
  `/admin/projects` pages. No UI calls this server action yet, so this was a
  latent bug; fixed now, before any task-edit UI ships, matching every
  sibling action's established form-supplied-`projectId` pattern. Added a
  regression test.
- The vitest wiring fix originally paired with this bug fix (scoping
  `vitest.config.js`'s `include` glob off the `node:test`-based `.test.mjs`
  files) turned out to already be live on `main` via the separate
  `test:marketing` script, added independently while this branch was open —
  same fix, different script name. Dropped the redundant `test:unit` script
  this PR would have added and documented the existing `test:marketing`
  command in `AGENTS.md`/`CLAUDE.md` instead, rather than ship two
  differently-named commands that do the same thing.

## v1.09 — 2026-08-29

- Phase 3 of the architecture-cleanup refactor plan: JSDoc-based type safety,
  stacked on top of v1.08's component cleanup. No runtime TypeScript — this
  repo stays plain JSX + JS per its own convention; `tsconfig.json` exists
  purely to drive `tsc --noEmit` as a dev-time check.
- `jsconfig.json` → `tsconfig.json` (`allowJs`, `noEmit`, path alias
  preserved). `typescript`, `@types/react`, `@types/react-dom` added as
  devDependencies.
- Added `@typedef` blocks to `lib/projects.js`, `lib/services.mjs`,
  `lib/site.js`, `lib/reviews.js`, and `lib/crm/project-contract.mjs`
  (`ProjectCategoryValue`, `ProjectStatus`, `TaskStatus`, etc., plus
  `value is X` type-guard returns on the `is*` predicate functions).
- Added JSDoc `@param`/`@returns` to every exported component in
  `components/ui/*.jsx` (10 files).
- Added `types/index.d.ts` re-exporting the shapes above by reference
  (`import('../lib/projects.js').Project`, etc.) rather than duplicating
  them, so the type can't drift from the data it describes.
- **Deviated from the plan's literal `checkJs: true`**: global `checkJs`
  surfaced 277 pre-existing false-positive errors across untouched files (a
  known JSDoc-less-JSX prop-inference artifact, not real bugs — e.g. optional
  props with defaults getting inferred as required). Set `checkJs: false`
  project-wide and opted in per-file with `// @ts-check` on exactly the 15
  files this phase typed, which is the standard incremental-adoption pattern
  for JSDoc typing in an existing JS codebase. `tsc --noEmit` is clean.
- **Found and fixed a real build regression during this phase**:
  `typescript@7.0.2` (the brand-new native/Go-rewrite major version, pulled
  in by `pnpm add -D typescript` with no version pin) broke Next.js
  15.5.23's route-handler resolution — `app/api/contact/route.js` and
  `app/api/cron/crm-notifications/route.js` failed to resolve their `@/lib/*`
  imports (`Module not found`) specifically because a `tsconfig.json` was
  now present; every other `@/`-aliased import in the app (60+ call sites)
  kept resolving fine. Isolated by bisecting tsconfig options down to the
  bare minimum jsconfig-equivalent (still failed) and finally by testing the
  TypeScript version in isolation. Pinned `typescript` to `^5.9.3` — build,
  `tsc --noEmit`, `pnpm test` (448/448), and `pnpm test:marketing` (20/20)
  are all clean on that pin.

## v1.08 — 2026-08-28

- Phase 2 of the architecture-cleanup refactor plan: component-level
  de-duplication, stacked on top of v1.07's CSS split.
- Added `components/shared/SectionHeader.jsx` and used it in `Services.jsx`,
  `Approach.jsx`, and `Stories.jsx` — the three sections that shared
  byte-identical eyebrow + `<h2>` markup, only the copy differed. Verified
  against the built page's HTML that the rendered output (classes, reveal
  wrapper, inline styles) is unchanged. `Mark.jsx` (imperative split-line
  headline) and `Motion.jsx` (plain-text eyebrow, no heading) were left
  alone — genuinely different markup, not a duplicate to collapse.
- Added `lib/interactionGuards.mjs` (`skipsPointerAnimation()`) and used it
  in `Services.jsx` to replace two identical inline
  `matchMedia('(pointer: coarse)') || matchMedia('(prefers-reduced-motion:
  reduce)')` checks. Kept as a plain function, not a hook: both call sites
  check once at effect-mount time and don't need to react live to the query
  changing, so a hook would add reactivity that didn't exist before.
- Investigated and closed out the rest of the plan's Phase 2 list without
  code changes, because the premise didn't hold up:
  - `Contact.jsx` already delegates fully to `ContactForm`; nothing to do.
  - The "redundant" comment in `app/signup/page.jsx` is a deliberate
    visually-hidden-but-focusable radio pattern for keyboard/screen-reader
    navigation, not dead CSS.
  - No duplicated `ScrollTrigger` setup exists across `Mark.jsx`/`Hero.jsx`
    (one unique inline config each) and `Lab.jsx` doesn't use ScrollTrigger
    at all — nothing to extract into a shared hook.
  - `ProjectHandoffLink.jsx` is a single-purpose stripe-wipe transition, not
    a generic pattern — nothing to rename or extract.
  - `components/three/` has no duplicated geometry/material setup; every
    `new THREE.*Geometry`/`*Material` call is a distinct shape serving a
    distinct visual purpose.
  - `components/three/CanvasFeatureBoundary.jsx` already implements the
    error-boundary task, and with better scoping (per-feature, not
    whole-Canvas) than the plan proposed.
- Flagged, but did not act on: 31 `data-cursor="..."` attributes across the
  codebase have no reader anywhere (no JS, no CSS) — likely dead, possibly
  reserved for an unbuilt custom-cursor feature. Left alone pending
  confirmation, per this repo's "confirm before deleting" rule.

## v1.07 — 2026-08-28

- Split the 4,324-line `app/globals.css` into 27 ordered stylesheets under
  `app/styles/`, reducing `globals.css` to an import-only manifest. The
  imports are listed in the original source order, so the resolved stylesheet
  is **byte-identical** to the pre-split file (verified by checksum) — the
  cascade, every specificity tie, and therefore every pixel are unchanged.
- Kept the class names global rather than moving to CSS Modules: `Menu.jsx`,
  `Services.jsx` and `WorkLibrary.jsx` reach for `.menu-link`, `.menu-meta`,
  `.service-row` and `.work-row` through `querySelectorAll`, and GSAP animates
  those same names. Hashed module class names would have broken those
  animations silently, with no build error to catch it.

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
