# Motion & Bundle Performance Audit
## Crystal Web Solution — Frontend Systems Review

**Date:** 2026-07-21
**Scope:** immersive homepage + scene graph, from a systems/bundle/motion perspective.

---

## 1. Current Architecture Summary

- **Next.js 14 / React 18**, JSX, no TS, no Tailwind — global CSS in `app/globals.css`.
- **R3F** renders one fixed `<Canvas>` behind the page (`Scene.jsx`). The DOM scrolls
  over it; a virtual camera follows measured scroll progress through declarative stops
  (`lib/journey.js`, `lib/beatProgress.js`).
- **Lenis** drives smooth scrolling from **GSAP's ticker**; ScrollTrigger is
  registered at module load in most animated components.
- **Per-frame mutable singletons** (`scrollState`, `pulse`, `chime`, `motionScale`,
  `motionFlight`) are favored over React state to keep values changing at RAF rates
  outside render cycles — this is the strongest part of the design.
- **Render quality is runtime-gated** (`lib/renderQuality.mjs`) by reduced-motion,
  viewport width, memory/cores, DPR, and save-data. It already switches particle counts,
  postprocessing intensity, DPR clamp, and carousel texture sizes.
- **Reduced motion is honored at multiple levels**: DOM falls back to native scroll in
  `SmoothScroll.jsx`; DOM animations skip; R3F consumer math binds velocity/FOV effects
  to `motionScale.value`.

---

## 2. Canvas / 3D vs DOM Split — Assessment

### What's working well
- Fixed full-viewport canvas with pointer-events none is a sane lower-power default —
  the R3F graph only consumes GPU when elements/effects are alive.
- `fog` and measured beat breakpoints give depth discipline; camera math is frame-rate
  independent with pre-allocated `THREE` temp vectors.
- `FocusVeil` / `FocusDimmer` decouple text legibility from backdrop blur cost — avoid
  live canvas blur, good.

### Risk: capability/quality coupling
`Scene.jsx` mounts the full graph unconditionally, gating only `FlyingCarousel` and
postprocessing modes. On low-end devices this still initializes
`Crystal`, `ApproachCompass`, `RecognitionRing`, `Particles` etc. — many draw calls,
textures, and shader pipelines before render quality downgrades take effect.

### Risk: SVG/WebGL overlap in Motion
`Motion.jsx` holds a complete animated SVG SMIL stage plus an R3F carousel with
fallbacks. In WebGL mode the DOM SVG is hidden via attribute selectors, but both
still exist in the tree and both animation systems are subscribed per scroll position.
This is understandable for accessibility, yet doubles the per-frame surface area in the
most visually dense section.

---

## 3. Lazy Boundaries

Existing lazy/judicious loading:
- `Scene` is dynamically imported with `{ ssr: false }` from `Experience.jsx`.
- `FlyingCarousel` is conditionally mounted via `useCarouselMount` using an
  IntersectionObserver (`motionFlight.prewarm`).

Opportunities:
- **Section-level partition.** Many sections are plain DOM content with no proximity
  requirements to the 3D scene. They can be moved into separate client components and
  lazy-loaded with `next/dynamic` and reasonable `loading` skeletons. Given this site
  is a single-page scroll experience, the value is primarily **bundle parsing/code**
  freed from the initial frame rather than network; code-splitting keeps startup parsing
  lean.
- **Three.js effect pass bundling.** `@react-three/postprocessing` does a deep import
  of Three composer internals. Splitting postprocessing into a lazily mounted subtree
  behind a feature gate reduces initial module surface for browsers that land on
  `Eco`/`Balanced` quality.
- **SplitType/char-level parsing.** `DecodeText.jsx` likely parses text nodes into
  spans; doing this eagerly for every headline on initial paint is expensive in layout
  work. Consider `loading="lazy"`-style mounting only when elements enter/near the
  viewport.

---

## 4. Reduced Motion

Strengths:
- DOM half already uses matchMedia guards in Reveal/RevealPop/DecodeText/Marquee/Loader.
- `SmoothScroll.jsx` cleanly replaces Lenis with native scroll + updates ScrollTrigger.
- `lib/motionScale.js` gives the canvas a live-updating 0/1 gate without forcing
  re-queries in hot `useFrame` paths.

Gaps:
- Multiple components independently re-query `window.matchMedia('prefers-reduced-motion: reduce')`.
  Centralize to a tiny singleton or a `useReducedMotion()` hook backed by the existing
  `motionScale` pattern to reduce duplicated matchMedia listener registrations.
- `ScrollTrigger.create` still runs under reduced motion in some section effects; while
  GSAP doesn't animate, pin/scrub logic still runs. On reduced-motion, convert pins to
  static layout and remove scrub where not essential.
- `Cursor.jsx` is hidden only by media `(pointer: coarse)`, not by reduced-motion. If
  you ever expose cursor customization, gate it on motion preference too.

---

## 5. GSAP Cleanup

Observed patterns:
- Every animated component imports **and registers** `gsap`/`ScrollTrigger` itself.
- Component unmount returns kill tweens/listeners; this is correct.
- `gsap.ticker` is the sole RAF clock driving Lenis — aligned with the project's
  instruction. Good.

Concerns:
- **Multiple `gsap.registerPlugin(ScrollTrigger)` calls.** GSAP is tolerant after the
  first registration, but in module systems this still means initializing the ScrollTrigger
  module many times. Not a runtime cost, but a maintenance hazard. Add a single
  registration in `SmoothScroll` or a central `lib/gsapInit.mjs`.
- **ScrollTrigger refresh timing.** After `configureScroll` switches between Lenis and
  native scroll, `ScrollTrigger.refresh()` fires while the ticker/Lenis raf may be
  mid-frame. Consider wrapping config/reconfigure in a `requestAnimationFrame` to
  ensure calcs use a consistent scroll baseline.
- **Pinned ranges shared by reference.** `lib/pinnedRanges` is mutated by `Motion.jsx`
  by `splice`. This is a hidden global side-effect surface and a source of potential
  memory leaks if `stopAnimatedLayout` is skipped by an error. Wrap in an `AbortSignal`
  style ownership boundary or a `PinnedRangeRegistry` class with dispose semantics.

---

## 6. CSS Structure

Strengths:
- Token-first with CSS custom properties at `:root`; sections map clearly to their
  tokens.
- `prefers-reduced-motion` overrides already exist in `globals.css` near the end.
- Layout uses `svh` where it matters (full-viewport sections) and sensible `clamp()`s.

Issues:
- `will-change` is used broadly (`.focus-veil`, `.decode .char`, `.marquee-track`,
  `.about-smil`). Over-use forces compositor memory up. The reduced-motion block disables
  some, but not all of these conditions. Add a global reduced-motion policy that sets
  `will-change: auto !important` for heavy particle/hero layers to avoid wasted VRAM on
  devices where motion is suppressed.
- Animations (`@keyframes causticDrift1/2/3`, `storyReveal`, `scrollPulse`) run
  unconditionally. Wrap their animation properties in a media query for reduced motion,
  or rely on a wrapper class `.motion-enabled` that the JS initial provider adds to
  `<html>` once and only after confirming the preference and feature support.
- CSS file is ~1700 lines. Plan a domain split: `tokens.css`, `base.css`,
  `layout/sections/*.css`, `motion/loader.css`. This is a hygiene improvement, not
  a perf change.

---

## 7. Transition Architecture

Strengths:
- A single `gsap.ticker` drives Lenis, ScrollTrigger refreshes, and raf consumers;
  the site already follows the “one RAF clock” rule.
- Camera transitions are smoothstepped beat-to-beat damping, not stiff lerps.

Gaps:
- **Section entry/exit transitions** are per-element GSAP `ScrollTrigger.create` with
  `once: true`. For a dense multi-section page this means many triggers firing near each
  other, each scheduling its own tweens. Batch work is fine here, but consider grouping
  by section and using `gsap.context()` to scope cleanups with per-section batch timing.
- **FocusVeil/FocusDimmer cross-boundary state** is a clean singleton pattern, but the
  JS/DOM selector loop on resize depends on `ResizeObserver` + `lenis.limit`. On a
  Windows low-RAM setup this is acceptable; otherwise, prefer a single observer on a
  sentinel container rather than `document.body` to reduce layout thrash.
- **Motion section pin duration** is pinned for `+=400%`. This is aggressive on snapshot
  scroll. Validate on low-end hardware with Lenis disabled (reduced-motion falls back to
  native scroll) — the pin can feel brittle if the browser asscalar is slower than GSAP's
  scrub expectation. Consider capping pin scrub reactivity and providing a fallback static
  timeline visible by default.

---

## 8. Risk Register

| Risk | Severity | Area | Mitigation |
|---|---|---|---|
| Unconditional Scene mount on low-memory devices | High | Canvas | Add a lifecycle gate; lazily mount heavy mascots when their beat is near. |
| Duplicate `registerPlugin` + matchMedia listeners | Low | GSAP/DOM | Centralize singleton init and motion preference hooks. |
| Over-broad `will-change` | Medium | CSS | Audit and blanket-disable in `prefers-reduced-motion`. |
| Motion section doubled animation surface area | Medium | SVG+WebGL | Keep fallback but ensure R3F mount/unmount is clean; measure frame drops. |
| Pinned range global array mutated across components | Medium | ScrollTrigger | Own pinned ranges inside Motion with a dispose registry. |
| Large chunks on first load | Medium | Bundle | Split per-section via `next/dynamic`; reduce gsap import duplication. |

---

## 9. Recommended Implementation Paths

### A) Conservative — “No wrong turns” upgrade

Goal: improve baseline without restructuring runtime behavior.

1. **Bundle hygiene first**
   - Add `next/dynamic` lazy imports for top-level section components below the fold
     (`Facts`, `Approach`, `Stories`, `Mark`, `Recognition`, `Motion`, `Contact`).
     Keep `Hero`, `Nav`, `SmoothScroll`, and `Loader` eager.
   - Wrap `@react-three/postprocessing` `Effects` in a dynamic subtree or only mount
     it when `quality.postprocessing !== 'off'`.

2. **Centralize motion/gating setup**
   - Add `lib/gsapInit.mjs` that calls `gsap.registerPlugin(ScrollTrigger)` once and
     exports a `useMotionPreference` hook.
   - Replace per-component matchMedia calls with a single listener pattern updating
     `motionScale`/a `reducedMotion` import.

3. **Reduce CSS churn**
   - Introduce `@media (prefers-reduced-motion: reduce)` blanket rules that disable
     all nonessential `@keyframes` and set `will-change: auto` on `.hero-caustics`,
     `.text-plate`, particles, etc.
   - Split CSS semantically into `app/styles/` files.

4. **Observe + measure**
   - In dev, log:
     - `js heap used` before/after section lazy imports,
     - average frame time in `CameraRig`/`Effects` with `performance.now()` sampling,
     - build chunk sizes in `.next/static/chunks/` after dynamic imports.
   - Keep `npm run build` green; do not add test scripts.

Outcome: reduced startup JS, lower heap on low-end machines, cleaner architecture,
measured improvement with no change in runtime behavior or visual fidelity.

---

### B) Bold — Folder-based scene lesson

Goal: make the WebGL/MMO-quality cine rig feel like a production 3D pipeline on the
web while keeping bundle realistic.

1. **Scene driven by a section manifest**
   - Replace `Scene.jsx`'s hardcoded `<Cluster>` imports with `lib/journey.mascots.js`
     declaring sections' optional 3D mascots, prewarm hints, and render-quality
     constraints.
   - Use an async `Suspense` boundary per beat: mount `Crystal` only in Hero, unload
     non-near mascots to off-screen pool, and dispose textures when leaving their pin.

2. **Render quality as first-class scheduler**
   - Use `useRenderQuality` transitions to change DPR and postprocessing in-flight,
     not just at mount. Add a “livability” mode that keeps bloom/vignette but drops
     motion scale and particles near zero when the foreground section is text-dense.
   - Tie particle counts to section distance and scroll velocity, not just global tier
     (some sections can afford extra particles cost-free).

3. **Motion section as a composable stage**
   - Introduce `MotionStage` component that exposes `{ state, subscribe }` and owns SVG,
     SMIL timeline, and R3F carousel. From outside: query only `state`. This avoids
     duplicated state plumbing and makes the section unit-testable.
   - Replace direct DOM `dataset` attribute toggles with a requestAnimationFrame batched
     update loop outside React state, like the existing `scrollState` approach.

4. **Mountless scroll anchors**
   - Skip `ScrollTrigger.create` for pure CSS transitions where `IntersectionObserver`
     suffices (`.showcase-static-grid`, `.stories-quote`). For pinned sections,
     replace `scrub` pin with a CSS sticky + JS pointer where possible to reduce
     ScrollTrigger scope.

5. **Bundle + asset**
   - Auto-generate tiny canvas textures in Node via `canvas` at build-time and import
     as data URIs only when needed; keep three.js texture URLs cache-bustable.
   - Evaluate replacing static imports in `ProjectVisual.jsx` and `Mascot`s with
     `next/font`-style lazy-load primitives.

Outcome: frame-budget predictability, lower peak memory on handheld, easier onboarding
for new team members because motion, canvas, section logic speak the same manifest
language.

---

## 10. Final Notes

- The site already respects the most important guardrails: one RAF clock, mutable
  singletons for hot paths, meaningful reduced-motion fallbacks, and clean teardowns.
- The main system risk is **unconditional initialization depth** — the R3F graph and post
  stack mount by default even when the user never reaches or benefits from them.
- The conservative upgrade gives 80% of the win with minimal risk; the bold path is
  worth it once the conservative path is validated and you have profiling data
  confirming frame drops in target hardware.

---

*Report produced by systems audit; no source files were modified in this review.*
