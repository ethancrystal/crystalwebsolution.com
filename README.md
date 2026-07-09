# Crystal Web Solution

A dark, cinematic, scroll-driven agency homepage. The whole viewport is a fixed
WebGL stage; the DOM scrolls over it while a virtual camera flies through one
continuous 3D space — past a refracting crystal, glass showcase slabs, an
assembling brand mark, and drifting particles.

Interaction patterns are inspired by award-site conventions (intro loader,
custom cursor, magnetic buttons, velocity-reactive marquees, decode headlines,
a mascot that reacts on click) — all copy, visuals and code here are original.

## Stack

Next.js 14 (App Router, JSX), React Three Fiber + drei, @react-three/postprocessing,
GSAP + ScrollTrigger, Lenis, SplitType. Plain global CSS with design tokens —
no Tailwind, no TypeScript, no binary assets (all visuals are code-generated).

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

## What to look for at each scroll beat

1. **Hero** — decode headline resolves; click anywhere and the crystal "roars"
   (scale pulse, spin burst, spark ejection).
2. **Services** — camera banks toward a second crystal; numbered service rows
   slide in; the marquee speeds up with your scroll velocity.
3. **Showcase** — glass slabs (one per project) drift at this depth; cards link
   to generated-art case studies.
4. **Client Stories** — testimonial tabs swap the featured quote; a quiet,
   centered beat (no off-axis text-plate) between Showcase and Mark.
5. **Mark** — 26 scattered shards assemble into a diamond ring as you scroll
   through the section (MARK_WINDOW in `lib/journey.js`).
6. **About / Facts** — statement typography, stat cards, second marquee.
7. **Design in Motion** — a pinned typographic beat: two headline lines shear
   apart and settle as the section scrubs, between Facts and Contact.
8. **Contact** — camera settles on a final crystal; magnetic email CTA; footer.

## Architecture rules (read before editing)

- Per-frame state lives in module singletons (`lib/scrollState.js`, `lib/pulse.js`),
  never React state.
- One RAF clock: Lenis is driven by `gsap.ticker` in `components/SmoothScroll.jsx`.
- The canvas is fixed and `pointer-events: none`; the DOM stays clickable.
- No allocation inside `useFrame`; damp with `1 - Math.exp(-dt * k)`.
- Camera path is data: `STOPS` + `CLUSTERS` in `lib/journey.js` — edit together,
  one stop per section.
- Every animation `useEffect` returns a teardown.
