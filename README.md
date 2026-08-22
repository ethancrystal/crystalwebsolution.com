# Crystal Web Solution

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
Styling is plain global CSS with design tokens on the marketing site. No TypeScript
anywhere; the CRM/admin surfaces additionally use a scoped Tailwind v4 setup
(utilities only, prefixed `tw:`, no global reset) — see `CLAUDE.md` for the exact
rules.
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

## Canonical checkout

Use `C:\Users\moizjmj\Crystal Web Solution` on `main` as the authoritative
local checkout. Do not assume a linked worktree is current. The audited
worktree inventory, cleanup status, and recovery instructions live in
[`docs/WORKTREE-STATE.md`](docs/WORKTREE-STATE.md).
The August 2026 lean-repository audit and exact keep/remove decisions are in
[`docs/REPOSITORY-CLEANUP-2026-08-02.md`](docs/REPOSITORY-CLEANUP-2026-08-02.md).

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
