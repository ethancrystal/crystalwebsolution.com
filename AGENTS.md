# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

**Identity:** Repo = `ethancrystal/crystalwebsolution.com`, Business = CD Sportswear INC, Live domain = `https://www.cdsportswearinc.com`. `crystalwebsolution.com` is the repo name and a retired domain — not a business name or current URL.

## SEO work

Read `docs/seo/STRATEGY.md` first. Any task that touches SEO, keywords,
blog posts, service pages, backlinks or `docs/seo/` is governed by the
one-page strategy in `docs/seo/STRATEGY.md` (then
`docs/seo/OPERATIONS-MANUAL.md` for mechanics). It applies to every
agent. Never merge a PR, send a message, or buy anything — those are MJ's.

## Project overview

CD Sportswear INC is a Next.js 16 / React 19 application containing a dark, cinematic, scroll-driven agency homepage and a Supabase-backed three-role CRM.

1. **The Agency Experience**: The whole viewport is a fixed WebGL stage (`components/Scene.jsx`); the DOM scrolls over it while a virtual camera flies through one continuous 3D space past a refracting crystal, service-signal instruments, an approach compass, procedural particles, and a morphing backdrop. Lab and Motion add DOM/CSS-3D card experiences over the same canvas. Marketing scene and project visuals are code-generated; `public/` serves standard brand assets.
2. **The Client Collaboration CRM**: A secure portal system (`/login`, `/dashboard`, `/team`, and `/admin`) designed to **accommodate incoming and current clients and collaborate efficiently with them while their project is ongoing**.

Stack: Next.js 16 (App Router, React 19, JSX, no TypeScript), React Three Fiber + drei, `@react-three/postprocessing`, GSAP + ScrollTrigger, Lenis (smooth scroll), SplitType, and Supabase. Plain global CSS with design tokens in `app/globals.css` — no Tailwind.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev         # http://localhost:3000
pnpm test        # full Node test suite
pnpm test:crm    # CRM-focused contracts
pnpm test:marketing  # vitest/jsdom component tests (tests/marketing/*.test.jsx)
pnpm test:components # every vitest/jsdom test (tests/**/*.test.jsx); the CI gate
pnpm test:db     # Supabase database tests; requires the local stack
pnpm build       # production build (standalone output)
pnpm start       # serve the production build
pnpm crm:verify                  # test:crm + test:db in one gate
pnpm crm:provision-test-users    # seed CRM role accounts for manual/e2e testing
pnpm livecheck                   # scripts/livecheck.mjs — smoke-check a running deployment
```

There is no lint script configured in `package.json`; do not invent one.
Run the relevant Node tests, verify application changes in a real browser,
and require `pnpm build` for routes/imports. This repository is pinned to
pnpm in `package.json`; do not switch package managers.
`pnpm test:e2e` exists in `package.json` (`playwright test tests/e2e`) but
`tests/e2e/` is not checked in — it's a planned gate, not a working suite.

Docker: `Dockerfile` builds against `next.config.js`'s `output: 'standalone'`
(deps → build → slim alpine runner). `.github/workflows/docker-ci.yml`
builds and pushes to `ghcr.io` on push to `main`, on `v*.*.*` tags, and on a
daily schedule.

## Architecture

The scroll pipeline, its diagrams and the reasoning behind these rules are in
`aidd_docs/memory/architecture.md`; read it before editing scroll or
animation code. Rules:

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

- `components/*.jsx` — page-level chrome and orchestration: `Experience.jsx`
  (assembles the whole page and dynamic-imports `Scene` with `ssr: false`
  since it touches `window`/WebGL), `SmoothScroll.jsx`, `Scene.jsx`,
  `Loader.jsx`, `Nav.jsx`, `Menu.jsx`, `FocusVeil.jsx`,
  `ScrollProgress.jsx` (progress bar only), `JourneyNav.jsx` (homepage section
  nav), and small reusable primitives (`Magnetic.jsx`,
  `Reveal.jsx`/`SectionReveal.jsx`, `DecodeText.jsx`, `Marquee.jsx`).
- `components/sections/*.jsx` — one file per scroll beat's DOM content
  (Hero, About, Services, Approach, Stories, Mark, Lab, Motion, Contact),
  rendered in that order by `Experience.jsx`.
- `components/three/*.jsx` — the R3F scene graph rendered inside
  `Scene.jsx`'s single `<Canvas>`: `CameraRig`, `Lights`, `Effects`
  (postprocessing), `FocusDimmer`, `Crystal`, `Sparks`, `ServiceRail`,
  `ApproachCompass`, `Particles`, and `BackdropMorph`. Lab and Motion are DOM
  beats and do not mount separate scene actors.
- `FocusVeil.jsx` + `FocusDimmer.jsx` are a paired DOM/canvas mechanism: a
  `[data-quiet]` section raises `scrollState.focus` and the canvas dims to
  keep text legible.

### Routing (App Router)

- `app/layout.jsx` — root layout, loads fonts (Space Grotesk / Inter / Space
  Mono via `next/font/google`), sets metadata from `lib/site.js`.
- `app/page.jsx` — renders `<Experience />` (the whole one-page scroll site).
- `app/work/page.jsx` — work index.
- `app/work/[slug]/page.jsx` — case study page; `generateStaticParams` comes
  from `lib/projects.js`'s `PROJECTS` array, visuals via
  `components/ProjectVisual.jsx` (procedurally generated from each project's
  `palette`, no imagery).

### `lib/` data and singletons

- `lib/site.js` — single source of truth for brand/contact info, read by
  Nav/footer/contact.
- `lib/projects.js` — case study content (`PROJECTS`, `getProject`).
- `lib/easing.js` — named GSAP easing/duration tokens; prefer these over
  inline magic numbers in new choreography.
- `lib/seo.mjs` — **canonical source of truth for every URL in the app**.
  Exports `SITE_ORIGIN` (`https://www.cdsportswearinc.com`), `SITE_HOST`,
  `SOCIAL_IMAGE_PATH`, and `absoluteUrl()`. Every canonical URL, sitemap
  loc, robots sitemap line, JSON-LD `@id`, and `og:url` is built from this
  one constant so the host can never drift. No other mechanism sets canonical
  origins; importing `lib/seo.mjs` is the single source.

## Conventions

- Marketing and project visuals remain procedural (canvas, SVG, or Three.js
  geometry/shaders). The intentionally served brand/application compatibility
  assets in `public/` are part of the runtime surface and must be preserved.
  Keep new marketing visuals consistent with the procedural rule.
- No TypeScript, no Tailwind — plain JSX and global CSS with the design
  tokens defined at the top of `app/globals.css` (`--bg`, `--ink`, `--cyan`,
  `--blue`, `--violet`, etc.).
- Supabase is the live CRM boundary. Application clients live under `lib/supabase/` (`browser.js`, `server.js`, `admin.js`), and canonical SQL lives in `supabase/migrations/`, numbered from `0001` (check the directory for the head). `.mcp.json` configures a Supabase MCP server for queries.
- The production host is `https://www.cdsportswearinc.com` (apex 308-redirects to `www`).
- The client portal is served on `https://app.cdsportswearinc.com` by host-conditioned redirects in `lib/portalHost.mjs` (loaded by `next.config.js`): `www` portal paths 308 to `app`, and non-portal pages on `app` 308 to `www`. Add new portal route segments to `PORTAL_SEGMENTS`.
  All URLs must use the `www` host; never emit bare apex URLs in canonicals,
  sitemaps, or OG tags.
- Data-access paths coexist: Project delivery reads go through `lib/crm/projects.js` against the `lib/crm/project-contract.mjs` contract shape (Centralized `TASK_PRIORITIES`, `TASK_STATUSES`, etc.); writes use `'use server'` actions in `app/actions/project-actions.js`. Other tables (companies/contacts/deals/tasks/users) query tables directly via browser client, scoped by RLS.
- Roles are database-enforced (flow in `aidd_docs/memory/auth.md`). `admin` is pinned by a database trigger; never offer it as an assignable role in UI.
- Project attachments use reservation/finalization hooks (`reserve_project_attachment` / `finalize_project_attachment`) linking to Supabase storage. See `docs/CRM-OPERATIONS.md` and `docs/ux/` for CRM details.

## Cursor project skills

Reusable agent skills live in `.cursor/skills/` (one folder per skill, each with `SKILL.md`). Inventory: `.cursor/skills/README.md`. SEO, keyword, and blog skills in that tree do **not** override `docs/seo/STRATEGY.md`.

## SEO agent (Hermes)

The repository has an SEO agent role (`cds-seo-operator` skill) for
continuous organic-growth work. Key files:
- `lib/seo.mjs` — canonical origin source; all URLs derive from it
- `app/sitemap.js`, `app/robots.js`, `app/layout.jsx` — all import
  `SITE_ORIGIN` from `lib/seo.mjs`; never hardcode another host
- `docs/seo/` — SEO operations manual, keyword registry, run logs

## Planning docs (not yet implemented)

`TRIONN-ADAPTATION.md` and `TRIONN-SCREENSHOT-ANNOTATIONS.md` are research/
spec documents mapping Trionn.com's layout and micro-interactions to planned
CWS components (e.g. a future `ServiceRock.jsx`, pinned-horizontal Showcase/
Motion sliders, a `ChromeSliverField.jsx` hero interaction). They describe
target structure and motion mechanics only — **never copy Trionn's actual
copy, client names, testimonials, logos, or media**; everything is rebuilt
with CWS's own brand voice and procedural marketing visuals, per the
project's procedural-visual rule. Treat these files as a design reference when
implementing the features they describe, not as already-built.

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
   `git log --oneline -15 origin/main` (fetch first), `VERSION`, the top of
   `CHANGELOG.md`, or an open PR's title (`gh pr list --base main`). A PR can
   deploy under a `vX.NN` title while bumping neither file, so the files alone
   can lag production. The `release-policy` check (`scripts/release-policy.mjs`)
   enforces this on every PR into main.
5. After merging `main` into a version-bump branch (including GitHub's
   "Update branch"), check that `VERSION` and the top `CHANGELOG.md` heading
   still name this PR's version. That merge dropped the bump for v1.55, v1.57,
   v1.60, v1.63, v1.79 and v1.81.

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
