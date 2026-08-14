# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

Crystal Web Solution is a Next.js 15 / React 19 application containing a dark, cinematic, scroll-driven agency homepage and a Supabase-backed three-role CRM.

1. **The Agency Experience**: The whole viewport is a fixed WebGL stage (`components/Scene.jsx`); the DOM scrolls over it while a virtual camera flies through one continuous 3D space past a refracting crystal, service-signal instruments, an approach compass, procedural particles, and a morphing backdrop. Lab and Motion add DOM/CSS-3D card experiences over the same canvas. Marketing scene and project visuals are code-generated; `public/` serves standard brand assets.
2. **The Client Collaboration CRM**: A secure portal system (`/login`, `/dashboard`, `/team`, and `/admin`) designed to **accommodate incoming and current clients and collaborate efficiently with them while their project is ongoing**.

Stack: Next.js 15 (App Router, React 19, JSX, no TypeScript), React Three Fiber + drei, `@react-three/postprocessing`, GSAP + ScrollTrigger, Lenis (smooth scroll), SplitType, and Supabase. Plain global CSS with design tokens in `app/globals.css` — no Tailwind.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev         # http://localhost:3000
pnpm test        # full Node test suite
pnpm test:crm    # CRM-focused contracts
pnpm build       # production build (standalone output)
pnpm start       # serve the production build
```

There is no lint script configured in `package.json`; do not invent one.
Run the relevant Node tests, verify application changes in a real browser,
and require `pnpm build` for routes/imports. This repository is pinned to
pnpm in `package.json`; do not switch package managers.

Docker: `Dockerfile` builds against `next.config.js`'s `output: 'standalone'`
(deps → build → slim alpine runner). `.github/workflows/docker-publish.yml`
builds and pushes to `ghcr.io` on push to `main`, on `v*.*.*` tags, and on a
daily schedule.

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

- `components/*.jsx` — page-level chrome and orchestration: `Experience.jsx`
  (assembles the whole page and dynamic-imports `Scene` with `ssr: false`
  since it touches `window`/WebGL), `SmoothScroll.jsx`, `Scene.jsx`,
  `Loader.jsx`, `Nav.jsx`, `Menu.jsx`, `FocusVeil.jsx`,
  `ScrollProgress.jsx`, and small reusable primitives (`Magnetic.jsx`,
  `Reveal.jsx`/`SectionReveal.jsx`, `DecodeText.jsx`, `Marquee.jsx`).
- `components/sections/*.jsx` — one file per scroll beat's DOM content
  (Hero, About, Services, Approach, Stories, Mark, Lab, Motion, Contact),
  rendered in that order by `Experience.jsx`.
- `components/three/*.jsx` — the R3F scene graph rendered inside
  `Scene.jsx`'s single `<Canvas>`: `CameraRig`, `Lights`, `Effects`
  (postprocessing), `FocusDimmer`, `Crystal`, `Sparks`, `ServiceRail`,
  `ApproachCompass`, `Particles`, and `BackdropMorph`. Lab and Motion are DOM
  beats and do not mount separate scene actors.
- Sections communicate with their 3D counterpart only through the
  singletons above (or GSAP ScrollTrigger), never via props/context across
  the DOM/canvas boundary.
- `FocusVeil.jsx` + `FocusDimmer.jsx` are a paired DOM/canvas mechanism: a
  `[data-quiet]` DOM section (see markup in `components/sections/`) fades in
  a gradient veil and raises `scrollState.focus`, which the in-canvas
  `FocusDimmer` reads to step down scene exposure — keeping text legible
  without a flat full-viewport wash.

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
- `lib/journey.js`, `lib/beatProgress.js` — camera choreography (see above).
- `lib/scrollState.js`, `lib/pulse.js`, `lib/motionScale.js`, and
  `lib/motionFlight.mjs` — per-frame
  DOM→canvas singletons (see above).
- `lib/easing.js` — named GSAP easing/duration tokens; prefer these over
  inline magic numbers in new choreography.

## Conventions

- Marketing and project visuals remain procedural (canvas, SVG, or Three.js
  geometry/shaders). The intentionally served brand/application compatibility
  assets in `public/` are part of the runtime surface and must be preserved.
  Keep new marketing visuals consistent with the procedural rule.
- No TypeScript, no Tailwind — plain JSX and global CSS with the design
  tokens defined at the top of `app/globals.css` (`--bg`, `--ink`, `--cyan`,
  `--blue`, `--violet`, etc.).
- Supabase is the live CRM boundary. Application clients live under `lib/supabase/` (`browser.js`, `server.js`, `admin.js`), and canonical SQL lives in `supabase/migrations/0001` through `0023`. `.mcp.json` configures a Supabase MCP server for queries.
- Data-access paths coexist: Project delivery reads go through `lib/crm/projects.js` against the `lib/crm/project-contract.mjs` contract shape (Centralized `TASK_PRIORITIES`, `TASK_STATUSES`, etc.); writes use `'use server'` actions in `app/actions/project-actions.js`. Other tables (companies/contacts/deals/tasks/users) query tables directly via browser client, scoped by RLS.
- Roles are database-enforced; `handle_new_user()` defaults accounts to `client`; `requested_staff_access` is resolved by admins; `admin` role is pinned by database trigger to prevent unauthorized signup/invite modification.
- Project attachments use reservation/finalization hooks (`reserve_project_attachment` / `finalize_project_attachment`) linking to Supabase storage. See `docs/CRM-OPERATIONS.md` and `docs/ux/` for CRM details.

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
