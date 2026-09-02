# Architecture

A dependency map of the codebase, written for someone who already knows
*what* the site does (see `README.md`) and needs to know *where things
live* and *what depends on what* before making a change. See `CLAUDE.md`
for the narrative version of the same rules.

## Marketing surface: sections → components → lib

`components/Experience.jsx` renders the nine scroll beats in a fixed order
(Hero → About → Services → Approach → Stories → Mark → Lab → Motion →
Contact), each a file under `components/sections/`. This order must match
three other places kept in lockstep whenever a beat is added, removed, or
reordered:

- `STOPS` / `CLUSTERS` in `lib/journey.js` — camera position + look target,
  and the z-depth where the matching 3D actor cluster lives.
- `BEAT_IDS` in `lib/beatProgress.js` — the DOM section `id`s that
  `measureBeats` reads to compute real (non-uniform) scroll-length
  fractions.
- The section's DOM `id` and, if it needs one, its 3D actor registered in
  `components/Scene.jsx`.

Sections never talk to the canvas through props or React context — only
through the module-level singletons in `lib/` (see "Per-frame state" below)
or GSAP ScrollTrigger.

```
components/Experience.jsx
├─ components/SmoothScroll.jsx      (the one RAF clock: Lenis driven by gsap.ticker)
├─ components/Nav.jsx, Menu.jsx     (navigation, reads lib/scrollState.js)
├─ components/Loader.jsx, FocusVeil.jsx
└─ components/sections/*.jsx        (one file per beat, rendered in STOPS order)
   ├─ Hero.jsx      → components/DecodeText.jsx, Reveal.jsx, Magnetic.jsx
   │                 → lib/pulse.js, lib/site.js
   ├─ About.jsx     → lib/smilTimeline.mjs, lib/easing.js
   │                 → components/ui/section-skeleton.jsx
   ├─ Services.jsx  → components/Marquee.jsx, MagnifiedBento.jsx
   │                 → components/shared/SectionHeader.jsx
   │                 → lib/beacon.js, lib/scrollState.js, lib/beatProgress.js,
   │                   lib/sceneActivity.mjs, lib/services.mjs,
   │                   lib/servicePages.mjs, lib/interactionGuards.mjs
   ├─ Approach.jsx  → components/CardHoverReveal.jsx, lib/beacon.js
   ├─ Stories.jsx   → components/ui/review-carousel.jsx, lib/reviews.js
   ├─ Mark.jsx      → split-type (SplitType), components/SectionReveal.jsx
   ├─ Lab.jsx       → lib/inMotionCards.mjs, lib/motionLayout.mjs,
   │                   lib/journey.js (LAB_WINDOW), lib/scrollState.js,
   │                   lib/useExperienceFeatures.js
   ├─ Motion.jsx    → components/ui/work-marquee.jsx,
   │                   components/ProjectHandoffLink.jsx,
   │                   lib/projects.js, lib/clientTileImages.mjs
   └─ Contact.jsx   → components/marketing/ContactForm.jsx, lib/site.js

components/Scene.jsx                (one Canvas, mounted once, ssr:false)
├─ components/three/CameraRig.jsx   (reads lib/scrollState.js each frame)
├─ Lights, Effects, FocusDimmer
├─ Crystal, Sparks                  (at CLUSTERS.crystal)
├─ ServiceRail                      (at CLUSTERS.services — mirrors Services beat)
├─ ApproachCompass                  (at CLUSTERS.approach — mirrors Approach beat)
├─ Particles, BackdropMorph
└─ lib/useRenderQuality.js          (device-tier quality gate)
```

Lab and Motion are DOM/CSS-3D card experiences layered over the same fixed
canvas — neither mounts its own actor in `Scene.jsx`.

### Per-frame state (no React state in the hot path)

`lib/scrollState.js` (`{ progress, velocity, focus }`), `lib/pulse.js`
(hero click "blast"), `lib/motionScale.js`, and `lib/motionFlight.mjs` are
plain mutable singleton objects, not React state or context: DOM code
writes to them on scroll/pointer events, R3F components read them inside
`useFrame`. This is why sections and their matching 3D actors "just work"
in sync without prop drilling across the DOM/canvas boundary — they're
reading the same object, not passing data down a tree.

### Hooks

There is no `hooks/` directory. The two real hooks live directly in `lib/`
alongside the data they wrap: `lib/useExperienceFeatures.js` and
`lib/useRenderQuality.js`. A third candidate (a shared reduced-motion/
pointer-coarse check) was extracted instead as a plain function,
`skipsPointerAnimation()` in `lib/interactionGuards.mjs` — not a hook,
because the two `matchMedia` checks it replaced were always read together
outside of React's render cycle (inside GSAP callbacks), so hook rules
(top-level-only, re-render on change) didn't apply and would have added
an unneeded re-render source.

### Inner marketing pages (`/about`, `/services`, `/work`, ...)

Route files under `app/**/page.jsx` compose `components/marketing/*`
(layout shells, `FaqSchema`/`BreadcrumbSchema` structured data, case-study
rails, `ServiceEmblem`) rather than `components/sections/*` — the inner
pages are static/SSR content, not scroll-beat choreography. `IdleScene.jsx`
and `ServiceEmblem3D.jsx` are the only R3F mounted outside `Scene.jsx`,
both via `dynamic(..., { ssr: false })` (see `components/marketing/
SubpageExperience.jsx` and `ServiceEmblem.jsx`) — confirmed excluded from
the CRM/shared bundle in `docs/reports/
phase-1-dead-code-performance-audit-2026-09-01.md`.

## CRM: two data-access shapes, by design

`/dashboard`, `/team`, and `/admin` are Supabase-backed and intentionally
use **two different data-access patterns** for different entities — this
is not drift to be unified, it's a deliberate split recorded here so a new
change picks the right one:

### 1. Project delivery — contract-tested path

Reads go through `lib/crm/projects.js`, validated against the shape in
`lib/crm/project-contract.mjs`. Writes go through `'use server'` actions in
`app/actions/project-actions.js`, which call a server-side Supabase client
(`lib/supabase/server.js`) gated by `lib/auth/require-role.js`. Same
pattern for blog content: `lib/crm/blog.js` / `lib/crm/blog-contract.mjs` /
`app/actions/blog-actions.js`.

**Used by**: `/dashboard`, `/team/projects/[id]`, `/admin/projects`,
`/blog`.

**Extend this path** for new delivery work — it's the newer, preferred
shape, and `tests/crm/` has contract tests to keep it honest.

### 2. Companies / contacts / deals / tasks / users — direct RLS path

Client components call `createClient()` from `lib/supabase/browser.js` and
query tables directly, relying on Postgres Row-Level Security policies
(`supabase/migrations/`) for scoping instead of an application-level
contract layer. The older per-table `lib/crm/companies.js`, `contacts.js`,
`deals.js`, `tasks.js` modules that used to wrap these were removed in
`aa50610` — don't re-add them unless you're actually migrating that entity
onto the contract path above.

**Used by**: `/admin/companies`, `/admin/contacts`, `/admin/deals`,
`/admin/tasks`, `/admin/users`.

Auth/role mutations (a separate concern from either data-access shape)
live in `app/auth/actions.js`, `app/admin/users/actions.js`, and
`app/auth/*/route.js`. Roles are assigned by the database
(`handle_new_user()`, `admin_resolve_staff_request()`), never by the
client — see `CLAUDE.md` for the full role-assignment rules and why
`admin` can never appear as a client-assignable role.

## Styling

See `README.md`'s "Styling" section for the `app/styles/*.css` global
split vs. the one `ImageBlock.module.css` CSS Modules exception, and
"Component directory conventions" for what belongs in `components/`,
`components/sections/`, `components/marketing/`, `components/ui/`,
`components/three/`, and `components/crm/`.
