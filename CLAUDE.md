# CLAUDE.md

## Goal

Continuously polish this site's animations, CRM workflows, and design for full visual coherence without ever breaking the live build or changing its current look, feel, or functionality. Keep the codebase lean by auditing for unused or orphaned files, always confirming with the owner before deleting anything. Every change stays accessible (respects reduced motion), production-ready, and gets committed to GitHub as the final step.

The overall mission of the CRM is to **accommodate incoming and current clients and collaborate efficiently with them while their project is ongoing**.

See `docs/PIXEL-POLISH-PLAN.md` for the phased execution plan tracking the remaining animation and layout-coherence work, `docs/CRM-OPERATIONS.md` for CRM portal, role, and migration guidance, and `docs/ux/` for Jobs-to-be-Done (JTBD), user journeys, and UX specifications.


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CD Sportswear USA is a Next.js 15 / React 19 application containing a dark,
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
auto-deploys to the Production environment and is aliased to
crystalwebsolution.com. Work on a feature branch and land it in `main` via a
reviewed PR — merging a PR into `main` IS deploying to production.

- **Feature branches** — every push gets its own Vercel preview deployment
  (behind Vercel Authentication), so anything can be verified on a real
  deployment before it merges.
- **`preview` and `production` (git branches)** — historical. The repo
  previously ran a two-branch model (`preview` = integration, `production` =
  live) that Vercel's actual configuration never matched. Both branches
  still exist but neither controls what's deployed; don't promote through
  them or base new work on them.

**CRM visibility is an env var, not a branch.** The CRM is hidden on the
live site via `NEXT_PUBLIC_CRM_ENABLED=false` set in Vercel's Project
Settings -> Environment Variables for the Production environment only
(`lib/crmFlag.js`): `middleware.js` redirects `/admin`, `/dashboard`,
`/team`, `/login*`, `/signup`, `/forgot-password` straight home, and
`components/Nav.jsx` / `Menu.jsx` hide the Log in / Client access links.
To launch (or hide) the CRM, flip that one env var — and because
`NEXT_PUBLIC_*` values are inlined at build time, a redeploy of `main` is
required after changing it; editing the variable alone changes nothing.

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
pnpm test:db     # Supabase database tests; requires the local stack
pnpm test:e2e    # planned gate; tests/e2e is not yet checked in
pnpm build       # production build
pnpm start       # serve the production build

pnpm crm:verify                  # test:crm + test:db in one gate
pnpm crm:verify:preview          # CRM_PREVIEW_ENVIRONMENT=preview scripts/verify-crm-preview-authorization.mjs
pnpm crm:provision-test-users    # seed CRM role accounts for manual/e2e testing
pnpm livecheck                   # scripts/livecheck.mjs — smoke-check a running deployment
```

Run a single test file directly with Node's runner, e.g.
`node --test tests/contactForm.test.mjs` or `node --test tests/crm/<file>.test.mjs`
(glob a subset with `node --test tests/crm/*.test.mjs`, matching `test:crm`'s pattern).

There is no lint script configured in `package.json`; do not invent one.
Run the relevant Node tests, verify application changes in a real browser,
and require `pnpm build` for routes/imports. This repository is pinned to
pnpm in `package.json`; do not switch package managers.

## Architecture

### The core idiom: one RAF clock, per-frame state lives outside React

This is the single most important thing to understand before editing
anything that touches scroll or animation:

- **One RAF clock.** `components/SmoothScroll.jsx` creates the single Lenis
  instance and drives it from `gsap.ticker` (not its own rAF loop). Any new
  per-frame animation should hook into this same ticker/ScrollTrigger setup
  rather than starting an independent loop.
- **Per-frame data lives in module-level singleton objects, never React
  state.** `lib/scrollState.js` (`{ progress, velocity, focus }`),
  `lib/pulse.js` (hero click "blast"), `lib/motionScale.js`, and
  `lib/motionFlight.mjs` are plain mutable objects: DOM code writes to them, R3F
  components read them inside `useFrame`. This avoids re-render storms for
  values that change dozens of times a second. When adding a new
  cross-boundary per-frame value, follow this same singleton pattern instead
  of lifting it into React state or context.
- **No allocation inside `useFrame`.** Pre-allocate `THREE.Vector3`/etc.
  outside the component (see `components/three/CameraRig.jsx`) and mutate in
  place.
- **Damping** uses frame-rate-independent exponential decay:
  `1 - Math.exp(-dt * k)`, not fixed lerp factors.
- **Every animation-related `useEffect` returns a teardown** (kill
  ScrollTriggers, remove listeners, disconnect observers) — see
  `FocusVeil.jsx` and `SmoothScroll.jsx` for the pattern.
- `next.config.js` has `reactStrictMode: false` intentionally, so the WebGL
  context isn't double-created in dev. Don't turn it back on.

### The camera journey is declarative data

`lib/journey.js` defines `STOPS` (one per DOM section: position + look
target) and `CLUSTERS` (named z-depths where the matching 3D object cluster
is authored). `components/three/CameraRig.jsx` reads `scrollState.progress`
each frame, finds which segment of `STOPS` it falls in, and lerps/damps the
camera toward it, adding pointer parallax and velocity-based roll.

Segment boundaries are **not** a uniform `index / (STOPS.length - 1)` split —
sections vary hugely in scroll length (Lab's sticky flight stage is much taller
than a standard beat).
`lib/beatProgress.js` measures each section's real DOM position
(`measureBeats`, called from `SmoothScroll.jsx` via a `ResizeObserver` on
`<body>`, always against `lenis.limit` so the fractions share
`scrollState.progress`'s exact baseline) and `CameraRig` looks up segments
against those measured breakpoints instead.

When adding or reordering a scroll section, `STOPS`/`CLUSTERS` in
`lib/journey.js`, `BEAT_IDS` in `lib/beatProgress.js`, the section's DOM `id`
(read by `measureBeats`), and any matching 3D actor in `Scene.jsx` all have to
move together.

### Component layout

- `Experience.jsx` renders the current beats in this order: Hero, About,
  Services, Approach, Stories, Mark, Lab, Motion, Contact.
- `Scene.jsx` mounts one Canvas with `CameraRig`, `Lights`, `Effects`,
  `FocusDimmer`, `Crystal`, `Sparks`, `ServiceRail`, `ApproachCompass`,
  `Particles`, and `BackdropMorph`. Lab and Motion do not mount separate scene
  actors.
- Sections communicate with their 3D counterpart only through the
  singletons above (or GSAP ScrollTrigger), never via props/context across
  the DOM/canvas boundary.
- `FocusVeil.jsx` + `FocusDimmer.jsx` are a paired DOM/canvas mechanism: a
  `[data-quiet]` DOM section (see markup in `components/sections/`) fades in
  a gradient veil and raises `scrollState.focus`, which the in-canvas
  `FocusDimmer` reads to step down scene exposure — keeping text legible
  without a flat full-viewport wash.

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
  lives in `supabase/migrations/` (0001 through 0035 as of 2026-08-20 — check
  the directory for the current head before assuming a number). `.mcp.json`
  configures a Supabase MCP server for development-time queries. Two
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

  Roles are assigned by the database, never by the client. `handle_new_user()`
  hardcodes every new account to `client`; the `account_type` chosen on
  `/signup` only raises `profiles.requested_staff_access`, which an admin
  clears through `admin_resolve_staff_request()` to grant `project_manager`.
  The `admin` role is pinned to a single address by
  `public.pinned_admin_email()` plus a partial unique index and a
  `BEFORE INSERT OR UPDATE OF role` trigger (migration `0014`), so it is not
  reachable from signup, invite, or role-change paths. Don't add a UI that
  offers `admin` as an assignable role — it can only fail at the database.

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
2. Title the PR (and its merge/squash commit) `vX.NN — <summary>` so the
   deploy is identifiable in Vercel's deploy list.
3. `package.json`'s `version` field is NOT part of this scheme — leave it.
4. Never skip or reuse numbers; next = top of `CHANGELOG.md` + 0.01.
