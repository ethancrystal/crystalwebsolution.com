# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

Crystal Web Solution is a dark, cinematic, scroll-driven agency homepage. The
whole viewport is a fixed WebGL stage (`components/Scene.jsx`); the DOM
scrolls over it while a virtual camera flies through one continuous 3D space
past a refracting crystal, glass showcase slabs, an assembling brand mark,
and drifting particles. Every visual is code-generated — there are no image
or video assets anywhere in the repo.

Stack: Next.js 14 (App Router, JSX, no TypeScript), React Three Fiber + drei,
`@react-three/postprocessing`, GSAP + ScrollTrigger, Lenis (smooth scroll),
SplitType. Plain global CSS with design tokens in `app/globals.css` — no
Tailwind.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (standalone output)
npm run start    # serve the production build
```

There is no lint or test script configured in `package.json` — don't invent
`npm run lint`/`npm test` invocations. Verify changes by running the app in a
browser (`npm run dev`) and checking `npm run build` completes, since a
Next.js build is the main signal that routes/imports are correct.

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
  `lib/pulse.js` (hero click "blast"), and `lib/chime.js` (Recognition medal
  hover) are all plain mutable objects: DOM code writes to them, R3F
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
sections vary hugely in scroll length (Showcase's project grid dwarfs Hero).
`lib/beatProgress.js` measures each section's real DOM position
(`measureBeats`, called from `SmoothScroll.jsx` via a `ResizeObserver` on
`<body>`, always against `lenis.limit` so the fractions share
`scrollState.progress`'s exact baseline) and `CameraRig` looks up segments
against those measured breakpoints instead.

When adding or reordering a scroll section, `STOPS`/`CLUSTERS` in
`lib/journey.js`, `BEAT_IDS` in `lib/beatProgress.js`, the section's DOM `id`
(read by `measureBeats`), and the section's 3D counterpart in `Scene.jsx`
all have to move together.

### Component layout

- `components/*.jsx` — page-level chrome and orchestration: `Experience.jsx`
  (assembles the whole page and dynamic-imports `Scene` with `ssr: false`
  since it touches `window`/WebGL), `SmoothScroll.jsx`, `Scene.jsx`,
  `Cursor.jsx`, `Loader.jsx`, `Nav.jsx`, `Menu.jsx`, `FocusVeil.jsx`,
  `ScrollProgress.jsx`, and small reusable primitives (`Magnetic.jsx`,
  `Reveal.jsx`/`RevealPop.jsx`, `DecodeText.jsx`, `Marquee.jsx`).
- `components/sections/*.jsx` — one file per scroll beat's DOM content
  (Hero, Services, Approach, Showcase, Stories, Mark, About, Facts,
  Recognition, Motion, Contact), rendered in order by `Experience.jsx`.
- `components/three/*.jsx` — the R3F scene graph rendered inside
  `Scene.jsx`'s single `<Canvas>`: `CameraRig`, `Lights`, `Effects`
  (postprocessing), `Crystal`, `Particles`, `BackdropMorph`, and per-beat
  mascots (`ShowcaseBoxes`, `ApproachCompass`,
  `RecognitionRing`, `Sparks`, `FocusDimmer`).
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
- `lib/scrollState.js`, `lib/pulse.js`, `lib/chime.js` — per-frame
  DOM→canvas singletons (see above).
- `lib/easing.js` — named GSAP easing/duration tokens; prefer these over
  inline magic numbers in new choreography.

## Conventions

- No binary/image/video assets. Every visual — icons, avatars, textures — is
  generated procedurally (canvas, SVG, or Three.js geometry/shaders). Keep
  new visuals consistent with this rule.
- No TypeScript, no Tailwind — plain JSX and global CSS with the design
  tokens defined at the top of `app/globals.css` (`--bg`, `--ink`, `--cyan`,
  `--blue`, `--violet`, etc.).
- `.mcp.json` configures a Supabase MCP server, but no application code uses
  Supabase currently — there's no database/backend in this project today.

## Planning docs (not yet implemented)

`TRIONN-ADAPTATION.md` and `TRIONN-SCREENSHOT-ANNOTATIONS.md` are research/
spec documents mapping Trionn.com's layout and micro-interactions to planned
CWS components (e.g. a future `ServiceRock.jsx`, pinned-horizontal Showcase/
Motion sliders, a `ChromeSliverField.jsx` hero interaction). They describe
target structure and motion mechanics only — **never copy Trionn's actual
copy, client names, testimonials, logos, or media**; everything is rebuilt
with CWS's own brand voice and procedural visuals, per the project's
no-binary-assets rule. Treat these files as a design reference when
implementing the features they describe, not as already-built.
