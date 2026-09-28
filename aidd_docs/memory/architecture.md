# Architecture

## Stack

- Next.js App Router with React, plain JSX. No TypeScript, no Tailwind: global CSS with design tokens.
- React Three Fiber and drei for the WebGL stage, GSAP with ScrollTrigger for choreography, Lenis for smooth scroll, SplitType for text effects.
- Supabase for Auth, Postgres, Storage, Realtime and RLS. It is the whole CRM backend.
- Sentry for errors; pnpm only.

## How it fits together

```mermaid
flowchart LR
  Lenis["SmoothScroll: Lenis on gsap.ticker"] --> Singletons["lib singletons: scrollState, pulse, motionScale"]
  Sections["DOM beats: components/sections"] --> Singletons
  Singletons --> Canvas["Scene: CameraRig + actors in useFrame"]
  Marketing["Inner pages: MarketingShell"] --> Stage["HeroStage backgrounds"]
  CRM["CRM routes: admin, dashboard, team"] --> Supabase[("Supabase: Auth, Postgres RLS, Storage, Realtime")]
  CRM --> Actions["Server actions: app/actions"] --> Supabase
  Contact["/api/contact"] --> Supabase
  Cron["/api/cron/crm-notifications"] --> Supabase
```

## Scroll pipeline

```mermaid
---
title: DOM to canvas scroll pipeline
---
flowchart LR
  subgraph Clock["One RAF clock"]
    Ticker["gsap.ticker"]
    Lenis["Lenis in SmoothScroll"]
  end
  subgraph Dom["DOM"]
    Sections["Beat sections with ids"]
    Quiet["data-quiet sections"]
    Veil["FocusVeil"]
    Observer["ResizeObserver on body"]
  end
  subgraph State["lib singletons"]
    ScrollState["scrollState"]
    Breakpoints["beat breakpoints"]
    MotionScale["motionScale"]
    Measure["measureBeats"]
    Stops["journey STOPS"]
  end
  subgraph Canvas["R3F canvas"]
    CameraRig["CameraRig"]
    Dimmer["FocusDimmer"]
    Rail["ServiceRail"]
  end
  Ticker --> Lenis
  Lenis -- "progress, velocity" --> ScrollState
  Lenis -- "limit" --> Measure
  Observer --> Measure
  Sections -- "section ids" --> Measure
  Measure --> Breakpoints
  Quiet --> Veil
  Veil -- "focus" --> ScrollState
  ScrollState -- "useFrame read" --> CameraRig
  Breakpoints -- "segment lookup" --> CameraRig
  Stops --> CameraRig
  ScrollState -- "focus" --> Dimmer
  MotionScale -.-> CameraRig
  MotionScale -.-> Rail
```

## Key decisions

- There is one RAF clock. Lenis is driven by `gsap.ticker` in `components/SmoothScroll.jsx`, and new per-frame work hooks into that ticker.
- Per-frame values live in module-level singletons (`lib/scrollState.js`, `lib/pulse.js`, `lib/motionScale.js`, `lib/motionFlight.mjs`), never in React state or context.
- DOM sections talk to the canvas only through those singletons or ScrollTrigger, never through props.
- Camera segments use measured DOM breakpoints (`lib/beatProgress.js`), not uniform splits.
- Adding or reordering a beat moves four things together: `STOPS`/`CLUSTERS` in `lib/journey.js`, `BEAT_IDS` in `lib/beatProgress.js`, the section's DOM `id`, and its actor in `components/Scene.jsx`.
- Marketing visuals are procedural (canvas, SVG, shaders). Do not add decorative binary media.
- `reactStrictMode: false` is intentional, so the WebGL context is never double-created.

## Gotchas

- `useFrame` must not allocate. Pre-allocate vectors outside the component.
- Damping is `1 - Math.exp(-dt * k)`, never a fixed lerp factor.
- Every animation `useEffect` returns a teardown.
- A `try/catch` around `redirect()` must re-throw errors whose `digest` starts with `NEXT_REDIRECT`.
