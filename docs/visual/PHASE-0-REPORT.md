# Phase 0 — Current-state map & baseline (CD Sportswear INC visual experience)

Source brief: `CLAUDE-VISUAL-EXPERIENCE-PROMPT.md`, plus `CLAUDE-VISUAL-EXPERIENCE-PLAN.md`, `docs/visual/UI-UX-REVIEW.md` and `docs/visual/ACCESSIBILITY-CONTRAST-AUDIT.md`.
Repo state: the zip's code snapshots are byte-identical to current `main` (`5348034`), so all three reviews still apply.
No code was changed in Phase 0.

## 1. Current-state map

### Homepage beat order (components/Experience.jsx)
| # | DOM id | Section | Plain-language label (proposed) | 3D actor (Scene.jsx) | Cluster z |
|---|---|---|---|---|---|
| 1 | `hero` | Hero — "Built to be unforgettable." | Intro | Crystal + Sparks | 0 |
| 2 | `about` | About | About | — | -18 |
| 3 | `services` | Services — 8 rows + MagnifiedBento | Services | ServiceRail | -34 |
| 4 | `approach` | Approach | How we work | ApproachCompass | -50 |
| 5 | `stories` | Stories — "Real outcomes…" reviews | Client stories | — | -66 |
| 6 | `mark` | Mark — "Scattered thoughts, …" | Brand systems | — | -82 |
| 7 | `lab` | Lab — sticky flight stage | Experiments | (FlyingCarousel, DOM/CSS-3D) | -98 |
| 8 | `motion` | Motion — eyebrow "Selected work" | Selected work | — | -114 |
| 9 | `contact` | Contact + ContactForm | Contact | — | -130 |

Global actors on every beat: Particles (count hardcoded 900), BackdropMorph, Lights, CameraRig, FocusDimmer and Effects (Bloom + Vignette, DOF in Motion).
Note: the brief's handoff list ("Stories → Work → Contact") skips Mark and Lab. On the homepage, "Work" is actually beat 8, `motion`.

### Motion architecture (what must be preserved)
- **One clock:** SmoothScroll.jsx (Lenis) driven from `gsap.ticker`.
- **Per-frame singletons:** `scrollState` (progress/velocity/focus), `pulse`, `motionScale`, `motionFlight`, `pointerState` and `beacon`.
- **Camera:** STOPS/CLUSTERS in `lib/journey.js`. Breakpoints are measured by `lib/beatProgress.js` against `lenis.limit`.
- **Beat windows:** LAB_WINDOW and MOTION_WINDOW (sticky travel), plus `sceneActivity.mjs` (beat-activity windows with overscan).
- **Existing quality ladder:** `lib/renderQuality.mjs` defines high, balanced and eco tiers:

  | Tier | maxDpr | Particles | Post-processing |
  |---|---|---|---|
  | high | 1.35 | 650 | full |
  | balanced | 1.2 | 420 | light |
  | eco | 1 | 240 | off |

  It uses reduced motion, save-data, memory, cores, DPR and compact width as signals.
- **Existing fallbacks:** CanvasFeatureBoundary (per-feature), the reduced-motion paths in Hero/Loader/responsive.css, and a skip link.

### Independent requestAnimationFrame loops (the brief says "no second RAF loop")
- `DecodeText.jsx` and `BorderGlow.jsx`: short-lived DOM tweens.
- `components/ui/*-background.jsx` (7 subpage stages): own loops, but only on inner pages; the homepage doesn't mount them.

### Tests & commands
- `pnpm test`: Node runner over `tests/*.test.mjs` and `tests/crm/*.test.mjs`, currently 556 passing.
- `pnpm test:marketing`: vitest/jsdom over `tests/marketing`, 40 passing.
- `pnpm build`: must be run with `NODE_ENV=production`. The sandbox shell exports `NODE_ENV=development`, which breaks the build on unmodified `main` too.
- No e2e/Playwright suite checked in (`tests/e2e` is planned).

## 2. Baseline (production build, `next start`, Chromium)

**Caveat:** this sandbox has no GPU, so WebGL runs in SwiftShader (software). The absolute FPS numbers are far below any real device and are useful **only as relative comparisons**. Real-device numbers (2019 MacBook Air, mid-range phone) must come from you or a preview-deployment profile.

| Mode | Idle FPS | Scroll FPS | Worst frame | Long tasks (count / max / total) | JS heap |
|---|---|---|---|---|---|
| Desktop 1280×800 | 5 | 4 | 700 ms | 9 / 4031 ms / 7986 ms | 17 MB |
| Mobile 390×844 | 12 | 9 | 500 ms | 8 / 1974 ms / 4592 ms | 17 MB |
| Desktop, reduced motion | 6 | 4 | 650 ms | 8 / 664 ms / 1408 ms | 15 MB |
| Desktop, WebGL disabled | 22 | **54** | 50 ms | 5 / 89 ms / 325 ms | 14 MB |

What the relative numbers do say: nearly all of the main-thread cost is the WebGL scene. There's a single 4-second long task on desktop load (shader compile and post-processing setup), and even reduced motion still pays for a full scene every frame.

Screenshots at progress 0 / 0.25 / 0.5 / 0.75 / 1 in all four modes (20 images) and the raw metrics JSON were captured in the Claude Code session sandbox; they are not committed (binary media stays out of the repo). Re-run the capture against a preview deployment to regenerate them.
axe-core 4.13 (homepage, all modes): 3 moderate violations, all from the nested `<main>` (see bug 2). No contrast violations were flagged at scroll 0, but axe can't sample text over a canvas.

## 3. Verified bugs found during the baseline (not just review opinions)

1. **Mobile horizontal overflow at every phone width.** The layout viewport is 339 px at 320, 399 at 375 and 413 at 390, because `.magnifier-row` (MagnifiedBento, `width: max-content`, ~1,440 px) escapes its container. The fixed nav stretches with it, so the menu button renders partly off screen.
2. **Nested `<main>` landmarks on every page.** `app/layout.jsx` renders `<main id="main-content">`, and `Experience.jsx` and `SubpageExperience.jsx` each render another `<main>` inside it. Screen readers get two main landmarks.
3. **Hydration error with reduced motion.** React #418 (server/client HTML text mismatch) fires on first load when `prefers-reduced-motion: reduce`.
4. **Scene ignores the quality ladder it already has.** `Scene.jsx` hardcodes `dpr={[1, 1.75]}` (the ladder caps at 1.35), `Particles count={900}` (the ladder says 240–650) and `<Effects />` in `'full'` mode. The ladder's `postprocessing` setting is never passed. Every device pays high-tier cost or more.
5. **WebGL failure throws an uncaught error.** With WebGL disabled, `Error creating WebGL context` is an uncaught page error. The page still renders (the CSS backdrop carries it), but nothing catches it at the Canvas level.
6. **No global `:focus-visible` rule.** There are 63 focus-visible rules, each scoped to one component, and several `outline: none` declarations (approach, contact, review-carousel). There's no global safety net.
7. **No anchor offset.** Only `.client-work-row` has `scroll-margin-top`, so section anchors can land under the fixed nav.

## 4. Top three risks per area

**UX**
1. The first viewport says "Built to be unforgettable." but not what's sold. "brands and interactive 3D experiences" is buried in the paragraph, and there's no services list.
2. There's no persistent wayfinding across nine beats. The `01/09` counter is `aria-hidden` and hidden under 900 px.
3. Mobile is broken at the edges (bug 1), and the service and hero interactions are pointer-first.

**Performance**
1. Full scene cost on every tier (bug 4), including reduced motion and mobile.
2. A multi-second long task at load. The frame loop never pauses when the hero is off screen or the tab is hidden (not verified yet; to confirm in Phase 6).
3. There's no frame-time-driven step-down and no "static" tier.

**Accessibility**
1. Text over the animated canvas: on mobile the hero body copy sits directly on the crystal's facets.
2. No global focus-visible (bug 6), plus the nested main (bug 2).
3. The reveal animations, loader and scroll lock delay content, and the hydration error (bug 3) hits exactly the reduced-motion users.

## 5. Files expected per phase

- **Phase 1:**
  - `components/sections/Hero.jsx`, `app/styles/hero.css`
  - new `components/JourneyNav.jsx` and `app/styles/journey-nav.css`
  - `components/Experience.jsx`, `components/Nav.jsx`
  - `app/styles/primitives.css` (global focus-visible, `scroll-margin-top`)
  - `app/layout.jsx` and `SubpageExperience.jsx` (single main)
  - `app/styles/services.css` (overflow containment)
  - tests in `tests/marketing/`
- **Phase 2:** Hero, `hero.css`, `Loader.jsx`, `components/three/Crystal.jsx`, `lib/pulse.js`
- **Phase 3:** `lib/journey.js`, `lib/beatProgress.js`, `CameraRig.jsx`, `SectionHandoff.jsx`, `lib/easing.js`
- **Phase 4:** `Services.jsx`, `services.css`, `WorkLibrary.jsx`, `app/work/page.jsx`, `lib/projects.js`
- **Phase 5:** `Contact.jsx`, `ContactForm.jsx`, and CRM `app/dashboard/*` (after PR #229 merges; the brief dashboard just changed)
- **Phase 6:** `Scene.jsx`, `Effects.jsx`, `renderQuality.mjs`, `useRenderQuality.js`, the `three/*` actors, and a dev-only perf HUD

## 6. Proposed sequence

1. **Phase 1a — defect fixes** (bugs 1–3, 5–7, plus the one-line Scene wiring from bug 4). This is small, low-risk and measurable.
2. **Phase 1b** — hero clarity and JourneyNav.
3. **Phases 2–6** as written in the brief, each on its own branch and PR with before/after captures.

## 7. Limits of this baseline

- No GPU, so no trustworthy FPS or draw-call numbers.
- No NVDA/VoiceOver pass.
- No 200%/400% zoom or forced-colors pass yet.
- External analytics requests are blocked by the sandbox proxy (`ERR_TUNNEL_CONNECTION_FAILED`). That's an environment artifact.
