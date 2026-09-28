# CLAUDE.md

## Identity

Three names that must not be confused:
- **Repo** (GitHub): `ethancrystal/crystalwebsolution.com`
- **Business**: CD Sportswear INC
- **Live domain**: `https://www.cdsportswearinc.com`

`crystalwebsolution.com` is the repo name **and** a retired domain (see §Environments). It is not a business name and not the current domain. `cdsportswearusa.com` is another retired domain. Neither should appear as a business identifier or a live URL anywhere in the repo.

## Goal

Continuously polish this site's animations, CRM workflows, and design for full visual coherence without ever breaking the live build or changing its current look, feel, or functionality. Keep the codebase lean by auditing for unused or orphaned files, always confirming with the owner before deleting anything. Every change stays accessible (respects reduced motion), production-ready, and gets committed to GitHub as the final step.

The overall mission of the CRM is to **accommodate incoming and current clients and collaborate efficiently with them while their project is ongoing**.

See `docs/PIXEL-POLISH-PLAN.md` for the phased execution plan tracking the remaining animation and layout-coherence work, `docs/CRM-OPERATIONS.md` for CRM portal, role, and migration guidance, and `docs/ux/` for Jobs-to-be-Done (JTBD), user journeys, and UX specifications.


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CD Sportswear INC is a Next.js 16 / React 19 application containing a dark,
cinematic, scroll-driven agency homepage and a Supabase-backed three-role CRM.
The whole viewport is a fixed WebGL stage (`components/Scene.jsx`); the DOM
scrolls over it while a virtual camera flies through one continuous 3D space
past a refracting crystal, service-signal instruments, an approach compass,
procedural particles, and a morphing backdrop. Lab and Motion add DOM/CSS-3D
card experiences over the same canvas. Marketing scene and project visuals
are procedural; tracked static files are limited to served brand/application
assets and compatibility URLs. CRM routes live under `/login`, `/dashboard`,
`/team`, and `/admin` and use Supabase Auth/Postgres/Storage/RLS.

## Environments and deployment

**`main` is the production branch.** Vercel's Production Branch setting is
`main` (verified against the Vercel API 2026-08-15): every merge into `main`
auto-deploys to the Production environment. **The production host is `https://www.cdsportswearinc.com`** (apex 308-redirects to `www`, verified 2026-09-27). `lib/seo.mjs`'s `SITE_ORIGIN` is the single record of this host. Two previous domains are retired. `cdsportswearusa.com` (production 2026-08-27 to 2026-09-03) now 301-redirects to `www.cdsportswearinc.com` (verified 2026-09-27). `crystalwebsolution.com` serves a third-party gambling-spam site from Vercel's edge (verified 2026-09-27), so another Vercel account has it attached: never link to it, redirect to it, or allow-list it. Reclaiming it is an owner action. See `docs/seo/backlinks/pbn-watch.md` for the related PBN-spam finding.

**The client portal lives on `https://app.cdsportswearinc.com`** (owner decision 2026-09-28). It is the same Vercel project and build as `www`; `lib/portalHost.mjs` defines host-conditioned redirects that `next.config.js` loads. On `www`, portal paths (`/login`, `/signup`, `/forgot-password`, `/onboarding`, `/dashboard`, `/team`, `/admin`, `/auth/*`) 308 to the same path on `app`, keeping the query string. On `app`, `/` opens `/login`, and every other non-portal page 308s to `www`. `/api/*` and static files work on both hosts. Preview deployments and localhost match neither host, so they are unaffected. When you add a portal route, add its top-level segment to `PORTAL_SEGMENTS`; `tests/portalHost.test.mjs` checks it against the middleware matcher.

**Treat the live domain as something to re-verify (`curl -I` the apex and
`www` host), not trust indefinitely** — it has now moved twice without a
code change to announce it. **Known related gaps — last confirmed 2026-09-11, owner to re-verify current status:**

- `NEXT_PUBLIC_APP_URL` in Vercel's Production environment variables
  (feeds every auth/invite/reset link and the CRM notification worker's
  in-email URLs — see `lib/supabase/admin.js`, `app/auth/actions.js`,
  `app/admin/users/actions.js`, `app/api/cron/crm-notifications/route.js`).
  Dashboard setting; `NEXT_PUBLIC_*` values are inlined at build time, so
  changing the variable alone does nothing until Production is rebuilt.
- Supabase Auth's dashboard `SITE_URL` and redirect allow-list. The repo
  allow-list in `supabase/config.toml` dropped both retired domains in v1.79;
  the dashboard list needs the same pruning, since `crystalwebsolution.com`
  now serves hostile content.
- Migration `0042` (`0042_repoint_cron_and_pinned_admin.sql`) was applied to the live database on 2026-09-15 (verified via Supabase MCP `list_migrations` on 2026-09-27). Migration `0044` (v1.63) then moved the single admin pin from `ethan@cdsportswearinc.com` to `moizj00@gmail.com`, demoting Ethan's account to `project_manager` (owner-approved 2026-09-27). Re-check live state with `select public.pinned_admin_email()` rather than trusting this line.
- Mailbox and Resend domain verification for `cdsportswearinc.com`:
  `SITE.email` and the Resend sender in `lib/email/resend.js` already
  moved in v1.35; DNS/mailbox/Resend verification is still owner-side.

Work on a feature branch and land it in `main` via a reviewed PR — merging
a PR into `main` IS deploying to production. Every push gets a Vercel
preview. The `preview` and `production` git branches are historical: never
promote through them or base work on them. Pipeline and environments:
`aidd_docs/memory/deployment.md`, `aidd_docs/memory/vcs.md`.

**CRM visibility is an env var, not a branch.** Whether the CRM is publicly
reachable is controlled by `NEXT_PUBLIC_CRM_ENABLED`
(`lib/crmFlag.js`), set in Vercel's Project Settings -> Environment
Variables for the Production environment: it gates whether the edge middleware
redirects `/admin`, `/dashboard`, `/team`, `/login*`, `/signup`,
`/forgot-password` straight home, and whether `components/Nav.jsx` /
`Menu.jsx` show the Log in / Client access links. **The CRM is launched** (publicly reachable in Production), but
last directly verified by HTTP-checking the live site on 2026-09-27
(`/login` 200, `/dashboard` 307 to `/login/client`); merges to `main` deploy
continuously, so re-verify
(`curl` the portal login routes, or check the flag's value in Vercel) rather
than trusting this line indefinitely — it documents a decision, not a
continuously-monitored state. To hide it again, set the flag to `false` and
redeploy `main` — because `NEXT_PUBLIC_*` values are inlined at build time,
editing the variable alone changes nothing until a rebuild ships.

**Never run `vercel --prod` (or `vercel deploy --prod`) from a Claude Code
session.** Vercel's CLI deploys straight to the production alias regardless
of which git branch is checked out — it bypasses PR review entirely.
Production only ships through the Git integration: a reviewed merge into
`main`.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev         # http://localhost:3000
pnpm test        # full Node test suite
pnpm test:crm    # CRM-focused contracts
pnpm test:marketing  # vitest/jsdom component tests (tests/marketing/*.test.jsx)
pnpm test:components # every vitest/jsdom test (tests/**/*.test.jsx); the CI gate
pnpm test:db     # Supabase database tests; requires the local stack
pnpm test:e2e    # planned gate; tests/e2e is not yet checked in
pnpm build       # production build
pnpm start       # serve the production build

pnpm crm:verify                  # test:crm + test:db in one gate
pnpm crm:verify:preview          # CRM_PREVIEW_ENVIRONMENT=preview scripts/verify-crm-preview-authorization.mjs
pnpm crm:provision-test-users    # seed CRM role accounts for manual/e2e testing
pnpm livecheck                   # scripts/livecheck.mjs — smoke-check a running deployment
```

**`tests/*.test.mjs` is not the whole suite.** `pnpm test` runs two globs
(`tests/*.test.mjs tests/crm/*.test.mjs`); running only the first silently
skips every CRM contract. Run `pnpm test` before claiming the suite is green.
Gate order and single-file runs: `aidd_docs/memory/coding-assertions.md`,
`aidd_docs/memory/testing.md`.

There is no lint script configured in `package.json`; do not invent one.
Run the relevant Node tests, verify application changes in a real browser,
and require `pnpm build` for routes/imports. This repository is pinned to
pnpm in `package.json`; do not switch package managers.

### Local build gotchas

- **`pnpm build` fails locally with `Cannot read properties of null (reading
  'useContext')`** while prerendering `/_global-error`, `/services`,
  `/contact` when the shell exports `NODE_ENV=development`, as Claude Code
  sessions here do. Prefix the build with `NODE_ENV=production`: that fixed
  it on Linux (2026-09-26), and with it the build passes on Windows too
  (2026-09-27, 60/60 pages).
- **`next build` and `next dev` rewrite `tsconfig.json`.** Run
  `git checkout -- tsconfig.json` before committing.
- Reproduce the CI build (`docker-ci.yml` `test` job) with its placeholders,
  otherwise client env vars throw:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
  NEXT_PUBLIC_APP_URL=https://placeholder.invalid \
  NODE_ENV=production pnpm build
  ```
  `/release-check` runs the whole gate locally.

## Architecture

The scroll pipeline, its diagrams and the reasoning behind these rules are in
`aidd_docs/memory/architecture.md`. Rules for anything touching scroll or
animation:

- **One RAF clock.** Lenis runs on `gsap.ticker` in
  `components/SmoothScroll.jsx`; hook new per-frame work into that ticker or
  ScrollTrigger, never a second rAF loop.
- **Per-frame values live in `lib/` singletons** (`scrollState`, `pulse`,
  `motionScale`, `motionFlight`), never React state or context. DOM sections
  talk to the canvas only through them or ScrollTrigger, never props.
- **No allocation inside `useFrame`**; pre-allocate at module scope (see
  `components/three/CameraRig.jsx`).
- **Damping is `1 - Math.exp(-dt * k)`**, never a fixed lerp factor.
- **Every animation `useEffect` returns a teardown.**
- **`reactStrictMode: false` is intentional** (no double WebGL context).
  Don't turn it back on.
- **Camera segments use measured DOM breakpoints** (`lib/beatProgress.js`),
  not a uniform `index / (STOPS.length - 1)` split. Adding or reordering a
  beat moves five things together: `STOPS`/`CLUSTERS` in `lib/journey.js`,
  `BEAT_IDS` in `lib/beatProgress.js`, the section's DOM `id`, its label in
  `LABELS` in `lib/journeyNav.mjs` (the homepage section nav), and its actor
  in `Scene.jsx`.
- **Measure beats with `sectionTop()`, never `getBoundingClientRect()`.**
  Rects include `SectionHandoff`'s 16px pre-reveal transform, so rect-based
  breakpoints disagree with where an anchor jump lands (v1.60/v1.61).
  SmoothScroll re-measures on the ticker frame Lenis's limit changes as well as
  from its `<body>` `ResizeObserver`: Lenis updates the limit on its own
  debounced observer, after ours has fired.

### Component layout

- `JourneyNav.jsx` (homepage only, mounted after `.page` so keyboard users
  reach the hero first) is the section nav: plain `#id` links with
  `aria-current="location"`, driven from `gsap.ticker` via
  `currentBeatIndex()`. `ScrollProgress.jsx` is only the progress bar;
  subpages mount it without JourneyNav, because the homepage ids don't resolve
  there.
- `Scene.jsx` mounts one Canvas with `CameraRig`, `Lights`, `Effects`,
  `FocusDimmer`, `Crystal`, `Sparks`, `ServiceRail`, `ApproachCompass`,
  `Particles`, and `BackdropMorph`. Lab and Motion do not mount separate scene
  actors.
- Inner marketing pages do **not** use `Scene.jsx`. They render through
  `MarketingShell` -> `SubpageExperience`, which passes a stage name (or
  `null`) down via `StageContext`; `HeroStage` inside `PageHero` mounts the
  matching `components/ui/*-background.jsx` module. Only the four variants in
  `MARKETING_STAGE_BACKGROUNDS` (about, services, process, contact) get one —
  there is deliberately no fallback, so a page with no `sceneVariant` renders
  no stage. Two gates apply: a whitelisted variant *and* a rendered
  `PageHero`.
- Those background modules are authored `position: fixed; inset: 0` for
  full-viewport use (auth pages still want that). To box one into a section,
  override it to `position: absolute` under a positioned wrapper, as
  `.mkt-hero-stage` does in `app/styles/service-pages.css`; their canvases
  size themselves from the parent's `getBoundingClientRect()`, so they follow
  automatically. `.hero-caustics` in `app/styles/hero.css` is the same idiom
  on the homepage hero.
- `FocusVeil.jsx` + `FocusDimmer.jsx` are a paired DOM/canvas mechanism: a
  `[data-quiet]` section raises `scrollState.focus` and the canvas dims to
  keep text legible.

### `lib/` conventions

- `lib/easing.js` — named GSAP easing/duration tokens; prefer these over
  inline magic numbers in new choreography.

## Conventions

- Keep new marketing scene/project visuals procedural (canvas, SVG, or Three.js
  geometry/shaders). Do not add decorative binary media when the established
  procedural path is sufficient. Existing served brand/application assets and
  compatibility URLs are intentional and must not be removed without a URL and
  runtime audit.
- No TypeScript, no Tailwind — plain JSX and global CSS with the design
  tokens defined at the top of `app/globals.css` (`--bg`, `--ink`, `--cyan`,
  `--blue`, `--violet`, etc.).
- Supabase is the live CRM boundary. Application clients live under
  `lib/supabase/` (`browser.js`, `server.js`, `admin.js`), and canonical SQL
  lives in `supabase/migrations/`, numbered sequentially from `0001` —
  always check the directory for the current head rather than trusting a
  number written here; this repo has moved through several migrations a
  week during active periods, so any hardcoded count goes stale fast.
  `.mcp.json` configures a Supabase MCP server for development-time
  queries. Two
  data-access shapes coexist deliberately:
  - **Project delivery** — the newer, contract-tested path. Reads go through
    `lib/crm/projects.js` against the `lib/crm/project-contract.mjs` shape;
    writes go through the `'use server'` actions in
    `app/actions/project-actions.js` (server client + `lib/auth/require-role.js`).
    Used by `/dashboard`, `/team/projects/[id]`, `/admin/projects`. Extend
    this path for new delivery work, and keep `tests/crm/` in step.
  - **Companies / contacts / deals / tasks / users** — client components that
    call `createClient()` from `lib/supabase/browser.js` and query tables
    directly, relying on RLS for scoping (the old `lib/crm/companies.js`,
    `contacts.js`, `deals.js`, `tasks.js` modules were removed in `aa50610`).
    Don't re-add per-table `lib/crm/` modules for these unless you're actually
    migrating them onto the contract/server-action path.

  Auth/role mutations live in `app/auth/actions.js`,
  `app/admin/users/actions.js`, and `app/auth/*/route.js`. Never infer
  database correctness from source tests alone; verify RLS and migration state
  against an isolated database or the approved read-only live boundary.

  Roles are assigned by the database, never by the client (flow in
  `aidd_docs/memory/auth.md`). `admin` is pinned to one address by
  `public.pinned_admin_email()` and a trigger (migration `0014`). Don't add a
  UI that offers `admin` as an assignable role — it can only fail at the
  database.

## Cursor project skills

Reusable agent skills live in `.cursor/skills/` (one folder per skill, each
with `SKILL.md`). Inventory: `.cursor/skills/README.md`. SEO, keyword, and
blog skills in that tree do
**not** override `docs/seo/STRATEGY.md`.

## Planning docs (not yet implemented)

`TRIONN-ADAPTATION.md` and `TRIONN-SCREENSHOT-ANNOTATIONS.md` are research/
spec documents mapping Trionn.com's layout and micro-interactions to planned
CWS components (e.g. a future `ServiceRock.jsx`, pinned-horizontal Showcase/
Motion sliders, a `ChromeSliverField.jsx` hero interaction). They describe
target structure and motion mechanics only — **never copy Trionn's actual
copy, client names, testimonials, logos, or media**; everything is rebuilt
with CWS's own brand voice and procedural marketing visuals, following the
procedural-first rule and its intentional served brand/application-asset
exception. Treat these files as a design reference when implementing the
features they describe, not as already-built.

## Release versioning (mandatory)

Every merge into `main` is a production deploy and must carry a version name
in the form `v1.01`, `v1.02`, … (zero-padded, sortable). Full rules in
`VERSIONING.md`. Non-negotiable for every PR targeting `main`:

1. Bump the `VERSION` file and add the matching entry at the top of
   `CHANGELOG.md` in the same PR.
2. Title the PR `vX.NN — <summary>`. PRs land as merge commits whose message
   body starts with that title, which is how a deploy traces back to it.
3. `package.json`'s `version` field is NOT part of this scheme — leave it.
4. Never reuse a number. Next = one above the highest `vX.NN` named in
   `git log --oneline -15 origin/main`, `VERSION`, the top of `CHANGELOG.md`,
   or an open PR's title (`gh pr list --base main`). `/version-bump` applies
   this.
5. **Check the merge log and open PRs, not just the files.** A PR can be
   *titled* `vX.NN` and deploy under that name while bumping neither file, so
   `VERSION` can lag what production is actually called. That happened with
   v1.43 (`f0290ae`), which is why v1.43 has no `CHANGELOG.md` entry and v1.44
   follows v1.42. `git fetch` first: a local `main` can be many merges behind
   `origin/main`.
6. **GitHub's "Update branch" can silently drop the bump.** When `main` has
   moved its own `VERSION`/`CHANGELOG.md`, that merge can resolve both to
   `main`'s side, and the PR then deploys under its title with no entry.
   It happened to v1.55, v1.57, v1.60, v1.63 and v1.79 (backfilled in v1.59,
   v1.61, v1.80 and v1.81).
   After any merge of `main` into a version-bump branch, check that `VERSION`
   and the top `CHANGELOG.md` heading still name this PR's version before it
   merges.

## Visual experience execution brief

For any visual redesign, interaction, animation, accessibility, or WebGL performance task, read these project-owned instructions before coding:

- `CLAUDE-VISUAL-EXPERIENCE-PLAN.md` — phased product, design, performance, accessibility, and QA plan.
- `CLAUDE-VISUAL-EXPERIENCE-PROMPT.md` — manager-style execution prompt for Claude Code. Start with Phase 0 discovery and baseline; do not begin a broad rewrite without the current-state map.
- `docs/visual/` — the UI/UX review, accessibility & contrast audit, accessibility test plan, and the Phase 0 current-state map and baseline (`PHASE-0-REPORT.md`).

These documents extend this file; they do not override repository identity, deployment, security, CRM, SEO, versioning, or production-branch rules above.

## Memory Management

Project docs, memory, specs, and plans live in `aidd_docs/`.

### Project memory

<!-- aidd_project_memory:start -->

@aidd_docs/memory/architecture.md
@aidd_docs/memory/auth.md
@aidd_docs/memory/codebase-map.md
@aidd_docs/memory/coding-assertions.md
@aidd_docs/memory/database.md
@aidd_docs/memory/deployment.md
@aidd_docs/memory/project-brief.md
@aidd_docs/memory/testing.md
@aidd_docs/memory/vcs.md

<!-- read on demand, not auto-loaded -->
- aidd_docs/memory/internal/api.md
- aidd_docs/memory/internal/backlog.md
- aidd_docs/memory/internal/decisions/memory-authority.md
- aidd_docs/memory/internal/design.md
- aidd_docs/memory/internal/ecosystem.md
- aidd_docs/memory/internal/forms.md
- aidd_docs/memory/internal/integration.md
- aidd_docs/memory/internal/navigation.md
- aidd_docs/memory/internal/realtime.md

<!-- aidd_project_memory:end -->

- If the block above is empty, run `ls -1tr aidd_docs/memory/` and read each file.
- Load `aidd_docs/memory/external/*` when the user asks.
- Load `aidd_docs/memory/internal/*` when the task needs it.
