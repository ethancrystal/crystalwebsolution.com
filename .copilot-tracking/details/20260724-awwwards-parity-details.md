<!-- markdownlint-disable-file -->

# Task Details: Awwwards Site of the Month readiness

## Research Reference

**Source Research**: #file:../research/20260724-awwwards-parity-research.md

## Phase 1: Visual QA close-out on already-shipped work

### Task 1.1: Live-browser QA pass over remaining PR #34 changes

The Motion-rail and Reviews-page passes this session used a repeatable method: start the dev
server (`npm run dev`, note the actual bound port — 3000 is often occupied by another parallel
job's server, Next.js will fall back to 3001+), then use `claude-in-chrome`'s
`tabs_context_mcp` → `navigate` → `browser_batch` (scroll/hover/screenshot/zoom) to inspect each
section against its source. Apply the same method to:

- `components/sections/Services.jsx` — hover state on `.service-row`, the `.service-title-inner`
  translateX nudge, and the `services-list:has(.service-row:hover)` opacity-dim-siblings rule.
- `components/sections/Approach.jsx` — the connector-line pseudo-elements
  (`.approach-row-inner::before/::after`) and the lockstep `numRefs` border-color tween as the
  user scrolls through the steps.
- `components/Marquee.jsx` — the `.marquee-mask` edge fade at both the loop wrap and at rest.
- `components/sections/Contact.jsx` footer — the `.footer-col` grid, `.footer-email` hover color,
  and the responsive collapse at the `max-width: 900px` breakpoint (resize the browser tab or use
  `resize_window` if available).
- **Files**:
  - `app/globals.css` — all CSS from the four rounds referenced in the research doc's "current
    state" section is candidate surface here; only touch what Task 1.1 actually finds broken.
- **Success**:
  - Each hover/scroll interaction listed above screenshots as intended with no clipping, z-index
    collision, or illegible contrast.
- **Dependencies**:
  - Dev server running; `claude-in-chrome` connected (confirmed working this session).

### Task 1.2: Fix anything found

- **Files**: `app/globals.css`, plus the specific `.jsx` file only if the bug is structural (wrong
  element/class), not purely visual.
- **Success**: `npm run build` stays green after every fix; re-screenshot to confirm the specific
  fix before moving to the next finding.
- **Dependencies**: Task 1.1 findings.

## Phase 2: Performance & accessibility baseline

### Task 2.1: Reduced-motion audit

Research confirmed `prefers-reduced-motion` is already checked in: `Marquee.jsx`, `Approach.jsx`,
`Lab.jsx`, `About.jsx`, `SectionReveal.jsx`, `Menu.jsx`, `SmoothScroll.jsx`, `RevealPop.jsx`,
`Reveal.jsx`, `Magnetic.jsx`, `Loader.jsx`, `DecodeText.jsx`. Not yet confirmed:
`BorderGlow.jsx` (mouse-tracking glow — likely fine to leave animated since it's pointer-driven,
not autoplaying, but confirm it doesn't run its `animated` sweep-on-mount path under reduced
motion), `components/sections/Motion.jsx`, `components/ProjectVisual.jsx`, all of `components/
three/*` (the WebGL layer — `CameraRig.jsx` in particular, since the whole camera journey is
motion), `ScrollProgress.jsx`, `FocusVeil.jsx`, `Nav.jsx`.

- **Files**: read each unconfirmed file above; add a `window.matchMedia('(prefers-reduced-motion:
  reduce)')` guard (matching the existing pattern in `Magnetic.jsx` or `About.jsx`) wherever an
  animation currently runs unconditionally.
- **Success**: every `useEffect` that starts a GSAP tween, rAF loop, or CSS animation either checks
  reduced-motion or has a documented reason not to (e.g., something already gated by a parent that
  does check).
- **Dependencies**: none; pure code read + edit.

### Task 2.2: Focus-state audit

`Cursor` functionality lives inline (not a separate `Cursor.jsx` — confirm actual filename/location
first, a prior grep in this session found no `components/Cursor.jsx`; the cursor DOM/logic is
elsewhere, locate it via `grep -r "cursor-ring" components/`). For every element carrying
`data-cursor` or wrapped in `Magnetic`, confirm a `:focus-visible` style exists that doesn't depend
on the custom cursor being visible (keyboard users never see the custom cursor).

- **Files**: `app/globals.css` (search for existing `:focus-visible` rules — `.motion-link`,
  `.lab-link`, `.motion-card` already have them per the research read; audit `.service-row`,
  `.approach-row`, nav items, and any `Magnetic`-wrapped CTA for the same).
- **Success**: tabbing through the whole page (via the connected browser, `key: "Tab"` repeated)
  never loses a visible focus indicator.
- **Dependencies**: none.

### Task 2.3: noindex on product routes

- **Files**: `app/admin/**`, `app/dashboard/**`, `app/login/page.jsx`, `app/signup/page.jsx` (exact
  paths need confirming — these routes appeared in `npm run build` output this session but were
  not part of this engagement's prior reads; locate their `page.jsx`/`layout.jsx` files first).
  Add `export const metadata = { robots: { index: false, follow: false } }` (or merge into an
  existing metadata export) to each.
- **Success**: `next build` output confirms the routes still prerender; a fetch of each route's
  rendered `<head>` shows `<meta name="robots" content="noindex">`.
- **Dependencies**: none.

### Task 2.4: Core Web Vitals baseline

- Use the connected `claude-in-chrome` tools (or Chrome DevTools if exposed) to capture a
  Lighthouse-style pass against `localhost:PORT/` for both a mobile and desktop viewport. No prior
  baseline exists in this engagement — this task is about creating the first one, not comparing
  against history.
- **Success**: a recorded LCP/CLS/INP (or at least a qualitative "canvas paints within Ns, no
  visible layout shift on section reveals") baseline exists to compare future changes against.
- **Dependencies**: Phase 1 complete (don't measure against known-broken CSS).

## Phase 3: Carry the 3D/motion language into subpages

### Task 3.1: Extend beyond `.subpage`

- **Files**: `app/work/page.jsx`, `app/work/[slug]/page.jsx`, `app/reviews/page.jsx` all currently
  render a plain `<div className="subpage">` with a static `.nav` header and no `<Scene>` /
  `<Canvas>` at all — confirmed by direct read this session. `components/Scene.jsx` and
  `components/Experience.jsx` currently only mount on `/` (via `app/page.jsx`).
- **Approach options to evaluate before implementing** (this is a design decision, not a
  mechanical port): (a) mount a lightweight, non-scroll-driven version of the existing crystal/
  particle canvas as a fixed backdrop on subpages, reusing `components/three/Crystal.jsx` /
  `Particles.jsx` directly without the full `CameraRig`/`journey.js` scroll-choreography, since
  subpages don't have the homepage's beat structure; (b) a CSS-only "same world" treatment (shared
  gradient/caustic backdrop from `Hero.jsx`'s `.hero-caustics` class, no WebGL) as a lower-risk,
  lower-cost first step.
- **Success**: subpages no longer read as a template swap — some visual continuity (WebGL or CSS)
  ties them back to the homepage's world.
- **Dependencies**: Phase 1/2 (don't add a new WebGL surface before the existing one is verified
  performant).

## Phase 4: Signature interaction moment

### Task 4.1: Propose, don't implement yet

- Candidates to evaluate (write up in this file, not in code, until reviewed): sound design (a
  single subtle audio cue on the hero's existing pulse/blast interaction — check `lib/pulse.js`),
  a distinctive transition when navigating into a `/work/[slug]` case study that carries the
  clicked card's position/color into the new page (a shared-element-style transition), or an
  Easter egg tied to the "crystal" brand concept (e.g., a hidden facet that responds to a specific
  scroll/click pattern).
- **Success**: one concept is written up with a concrete technical approach and risk assessment,
  ready for a go/no-go decision, before any code is touched.
- **Dependencies**: none — this can happen in parallel with other phases, but implementation waits
  for approval per this plan's stated risk level.

## Phase 5: Deepen real content

### Task 5.1: Reviews-content decision

- Blocked on your answer to the "Open decision needed" item in the plan file. No file work until
  resolved.

### Task 5.2: Case-study restructure

- **Files**: `app/work/[slug]/page.jsx` currently renders `project.body` as an undifferentiated
  list of `<p>` paragraphs. `lib/projects.js`'s existing `body` arrays already follow an implicit
  problem → approach → detail → outcome shape (confirmed by reading all six entries this session)
  — this task is presentation-only: add subheadings or visual separation between paragraphs that
  matches that implicit structure, without adding or inventing any new content.
- **Success**: case studies visually read as a narrative arc, not a wall of text, using only
  existing copy.
- **Dependencies**: Task 5.1 (do the reviews decision first since it may inform tone/placement of
  testimonial content reused on case-study pages, if any).

## Phase 6: Submission readiness

### Task 6.1: Final audit

- **Files**: check `public/` for the actual favicon/app-icon files in use, `app/layout.jsx` for any
  missing `icons` metadata field, `public/robots.txt`/`app/sitemap.xml` (route-based per
  `CLAUDE.md`) for the Phase 2 noindex additions, `package.json` to drop the unused `shadcn`
  devDependency.
- **Success**: no dev-only debris ships; metadata reflects Phase 2's indexing decisions; build
  stays green.
- **Dependencies**: Phase 2 complete.

## Dependencies

- Dev server + connected browser tooling for every visually-verified phase (1, 2, 3, 4-review).
- Your decision on the reviews-content question (blocks Phase 5).
- Your review/prioritization of this plan (per your instruction — implementation has not started).

## Success Criteria

- See the plan file's Success Criteria — this details file exists to make each checklist item
  independently actionable without re-deriving context.
