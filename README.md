# CD Sportswear USA

A dark, cinematic, scroll-driven agency homepage. The whole viewport is a fixed
WebGL stage; the DOM scrolls over it while a virtual camera flies through one
continuous 3D space — past a refracting crystal, service-signal instruments,
an approach compass, procedural particles, and a morphing backdrop. Lab and
Motion add DOM/CSS-3D card experiences over the same canvas.

Interaction patterns are inspired by award-site conventions (intro loader,
magnetic buttons, velocity-reactive marquees, decode headlines, a mascot that
reacts on click) — all copy, visuals and code here are original.

## Stack

Next.js 15 (App Router, JSX) and React 19 power both the public experience and
the authenticated CRM. The marketing surface uses React Three Fiber + drei,
@react-three/postprocessing, GSAP + ScrollTrigger, Lenis, and SplitType. The
CRM uses Supabase Auth/Postgres/Storage/RLS through bounded server actions.
Styling is plain global CSS with design tokens — no Tailwind and no TypeScript.
Marketing scene and project visuals are procedural; tracked static files are
limited to served brand/application assets and compatibility URLs.

## Run

```bash
pnpm install --frozen-lockfile
pnpm dev        # http://localhost:3000
pnpm test       # full Node test suite
pnpm test:crm   # CRM-focused contracts
pnpm test:db    # Supabase database tests; requires the local stack
pnpm test:e2e   # planned Playwright gate; tests/e2e is not yet checked in
pnpm build      # production build
```

## Docker

Self-host or run a production-parity build locally without touching the
Vercel deployment - Vercel builds straight from source and never reads the
Dockerfile, so these are independent, parallel ways to run the same code.

Copy `.env.example` to `.env.local` and fill in your Supabase project
keys first (see that file for which vars are required vs. optional).

```bash
docker compose --env-file .env.local up --build   # http://localhost:3000
```

This builds the multi-stage `Dockerfile` (deps to builder to runner) with
`NEXT_PUBLIC_*` values baked in at build time, and reads
`SUPABASE_SERVICE_ROLE_KEY` / `RESEND_API_KEY` etc. at container runtime
from `.env.local`. The container exposes a dependency-free health check at
`/api/health`.

Every push to `main` also builds and publishes an image via
`.github/workflows/docker-ci.yml` to
`ghcr.io/ethancrystal/crystalwebsolution.com`, so a prebuilt image is
available without building locally:

```bash
docker run -p 3000:3000 --env-file .env.local ghcr.io/ethancrystal/crystalwebsolution.com:latest
```

## Canonical checkout

Use `C:\Users\moizjmj\CD Sportswear USA` on `main` as the authoritative
local checkout. Do not assume a linked worktree is current. The audited
worktree inventory, cleanup status, and recovery instructions live in
[`docs/archive/WORKTREE-STATE.md`](docs/archive/WORKTREE-STATE.md).
The August 2026 lean-repository audit and exact keep/remove decisions are in
[`docs/archive/REPOSITORY-CLEANUP-2026-08-02.md`](docs/archive/REPOSITORY-CLEANUP-2026-08-02.md).

## Application surfaces

- `/` and `/work/*` — public cinematic marketing experience and case studies.
- `/login/*` — role-specific client, employee, and admin entry points.
- `/dashboard`, `/team`, and `/admin` — Supabase-backed CRM portals.
- `supabase/migrations/0001` through `0011` — canonical checked-in database
  history; migration changes require database-aware verification.

## What to look for at each scroll beat

1. **Hero** — decode headline resolves; click anywhere and the crystal "roars"
   (scale pulse, spin burst, spark ejection).
2. **About** — the procedural word field reveals row by row and responds to the
   same contained pointer-blast language as the hero.
3. **Services** — eight DOM service rows, the migrating numeral, capability
   bento, and eight canvas `ServiceRail` signal instruments move as one beat.
4. **Approach** — a four-step discovery-to-deployment path is paired with the
   canvas compass.
5. **Client Stories** — accessible testimonial tabs swap the featured review.
6. **Mark** — scattered headline characters settle into the studio statement.
7. **Lab / CWS in Motion** — eight real capability cards orbit in DOM/CSS 3D,
   then settle into a clickable grid with static/reduced-motion fallbacks.
8. **Motion / Selected Work** — the named-client rail links to the six current
   procedural case studies.
9. **Contact** — the project-brief form, direct email fallback, and footer close
   the journey without replaying the hero crystal.

## Architecture rules (read before editing)

- Per-frame state lives in module singletons (`lib/scrollState.js`, `lib/pulse.js`),
  never React state.
- One RAF clock: Lenis is driven by `gsap.ticker` in `components/SmoothScroll.jsx`.
- The canvas is fixed and `pointer-events: none`; the DOM stays clickable.
- No allocation inside `useFrame`; damp with `1 - Math.exp(-dt * k)`.
- Camera path is data: `STOPS` + `CLUSTERS` in `lib/journey.js` — edit together,
  one stop per section.
- Every animation `useEffect` returns a teardown.
