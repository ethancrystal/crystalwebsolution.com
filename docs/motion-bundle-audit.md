# Crystal Web Solution — Motion / Bundle Systems Audit

## 1. What I reviewed

I walked the hot path end-to-end before writing a single recommendation:
`app/layout.jsx` → `app/page.jsx` → `components/Experience.jsx` → `components/Scene.jsx` →
`components/SmoothScroll.jsx` → `components/three/CameraRig.jsx` → `lib/journey.js` /
`lib/beatProgress.js` → `components/sections/Motion.jsx` → `components/three/FlyingCarousel.jsx` →
`components/sections/About.jsx` → `components/DecodeText.jsx` / `SectionReveal.jsx` /
`Reveal.jsx` → `app/globals.css`.

## 2. Current-state findings

### Canvas/3D vs DOM split
- **Good.** One fixed background `<Canvas>` sits under the scrolling DOM (`app/globals.css`
  `.scene-canvas { z-index: 0 }`, `.page { z-index: 2 }`). DOM owns text layout and
  accessibility; canvas owns atmosphere. This is the right division.
- **Waste.** Every 3D mascot in `Scene.jsx` — `Crystal`, `ServiceRail`, `ApproachCompass`,
  `RecognitionRing`, `CanvasFeatureBoundary > FlyingCarousel`, `Particles`,
  `BackdropMorph` — is mounted unconditionally. Only `FlyingCarousel` has any mount guard.
- **Opportunity.** `ServiceRail.jsx` sees the camera recede from z≈-42 to z≈-66 on the
  services → approach flight. The 8-merged geometry with 8 materials still responds to hover
  via `lib/beacon.js` even when the rail is off-screen. Same applies to other mascots.

### Lazy boundaries
- **Partial.** `FlyingCarousel` uses an `IntersectionObserver` with `{ rootMargin: '150% 0px' }`
  to prewarm, then mounts only after a successful frame fires `setMotionReady(true)`.
  This is a solid pattern.
- **Missing elsewhere.** No equivalent lazy boundary exists for `Crystal`, `ServiceRail`,
  `ApproachCompass`, `RecognitionRing`, `BackdropMorph`, or `Particles`. All are allocated
  and ticked from the first paint.
- **Positive hygiene.** `lib/useExperienceFeatures.js` exposes a reactive feature switch
  already wired into `Scene.jsx` and `Motion.jsx`; this is exactly the shape a future
  per-mascot lazy boundary should reuse.

### Reduced motion
- **Excellent state coverage.** `SmoothScroll.jsx` switches Lenis → native scroll when
  `prefers-reduced-motion: reduce` is true. `SectionReveal`, `Reveal`, `DecodeText`, and
  `Loader` all resolve immediately. `useExperienceFeatures` and `lib/renderQuality.mjs` both
  downgrade to `eco` tier on reduced motion, save-data, ≤4 GB RAM, or ≤4 cores.
- **Camera side respects it too.** `CameraRig.jsx` multiplies velocity-based roll and FOV
  surge by `lib/motionScale.js` value, and `sceneActivity.mjs`/`focusDimmer` keep the scene
  from going dead-flat.
- **Residual risk.** About.jsx’s pointer-move blast is throttled to 90 ms but there is no
  reduced-motion shortcut that skips the DOM setAttribute path entirely. It won’t crash but
  will still thrash the composed SVG during reduced-motion sessions.

### GSAP cleanup
- **Strong discipline.** Almost every `useEffect` that registers ScrollTriggers, listeners,
  or observers returns a teardown that kills everything (`SmoothScroll`, `FocusVeil`,
  `Loader`, `SectionReveal`, `Reveal`, `DecodeText`).
- **Watch list.** `gsap.registerPlugin(ScrollTrigger)` is invoked at module top-level in
  `SmoothScroll.jsx`, `FocusVeil.jsx`, `SectionReveal.jsx`, `Reveal.jsx`, `DecodeText.jsx`,
  `Motion.jsx`, and `About.jsx`. Re-registering is harmless but signals the plugin is
  treated like a global singleton that can leak across lazy-chunk boundaries.

### CSS structure
- **Monolithic.** `app/globals.css` is currently ~1,700 lines with token block, base reset,
  stage layers, nav, menu, loader, progress, hero, sections, services, stories, marquee,
  motion, contact, footer, media queries, cursor, animations, and `@font-face` fallbacks all
  mixed in one file. This scales linearly with new sections.
- **No layered model.** Tokens are defined in `:root` but there is no tokens layer, base
  layer, components layer, utilities layer, and overrides layer. Naming is by semantic
  class, which is good; organization is the weakness.
- **Transition smell.** Buttons hover through `transition: ... 0.35s` only. There is no
  global motion primitive or centralized transition scale.

### Transition architecture
- **Mixed paradigms intentionally.** DOM entrance uses CSS + GSAP fromTo with
  `ScrollTrigger`; About uses SMIL `<animate>`, `<animateTransform>`, `<animateMotion>`
  plus GSAP; Motion section runs both a full SMIL 6-card orbital SVG and an optional
  Three.js `FlyingCarousel`. This is coherent only while the toggle stays cheap.
- **The heavy path is the expensive one.** `Motion.jsx` keeps all six `MOTION_STUDIES`
  visible in SMIL simultaneously while `FlyingCarousel.jsx` generates card textures,
  backdrop canvas textures, frame geometry, face geometry, and per-card face materials
  inside `useMemo`. Combined texture work can spike main-thread time on cold open.

### Bundle / load footprint
- `gsap`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`,
  `split-type`, `lenis` are all treated as eager dependencies of `Experience` because
  `Scene` is an immediate client import of the dynamic wrapper — and `Scene` itself imports
  every mascot on every render.
- Server-side workload is small, but the client hydration bundle carries the full 3D stack
  even on pages that never visit the motion section.

## 3. Upgrade plan — constraints

- No binary/video/image assets. Procedural only.
- Maintainable as one-person codebase: avoid cargo-cult tech, prefer surgical layers.
- Chief constraint: keep the single camera flythrough coherent across section lengths
  measured by `lib/beatProgress.js`.

## 4. Recommended paths

### Recommended — Conservative path first
Lead with maintainable architecture, then savings follow from less duplication.

**A. CSS architecture**
Split `app/globals.css` into an ordered layered model:
1. `global-tokens.css` — colors, fonts, gradients, motion curve tokens, reduced-motion flag
2. `base.css` — reset, body, selection, `html[data-cws-intro-seen]`, focus-visible
3. `stage.css` — canvas, page, focus-veil, scroll-progress, loader
4. `components.css` — nav, menu, buttons, cursor, marquee, forms
5. `sections.css` — hero, services, stories, motion, contact, footer
6. `utilities.css` — small shared helpers
Add motion type-ramp tokens: `--ease-out-expo`, `--dur-reveal`,
`--dur-stagger`, and use them in `SectionReveal`, `Reveal`, hover transitions,
and the nav logo swap. This is strictly a cut-and-paste rename task with zero runtime risk.

**B. Shared reduced-motion abstraction**
Extract a tiny `useReducedMotion()` hook used by `SmoothScroll`, `Loader`,
`SectionReveal`, `Reveal`, `DecodeText`, `Motion`, and `About.jsx`. Replace the
7 local `window.matchMedia('(prefers-reduced-motion: reduce)')` calls with one hook
subscription per component. Quietly remove the About.jsx pointer-blast cost when
reduced motion is active.

**C. Scene lazy boundaries by beat window**
Use `lib/sceneActivity.mjs`’s `isBeatProgressActive` to gate visibility and
`useFrame` work in `ServiceRail`, `ApproachCompass`, `RecognitionRing`,
`Crystal`, `BackdropMorph`. The pattern is already proven in `ServiceRail`’s width guard.
Add this as a shared HOC/hook on each mascot so the mounting policy lives in one place.
This keeps the single-canvas architecture while eliminating background ticks.

**D. GSAP registration hygiene**
Move `gsap.registerPlugin(ScrollTrigger)` into `SmoothScroll.jsx` only; export a
singleton `scrollTriggers` array from a tiny `lib/gsapBus.js` and let feature
components append their triggers to it. Reduce top-level side effects and make
future code-splitting predictable.

**E. Motion.jsx fallback decoupling**
Untangle the SMIL scrub from the Three.js upgrade path into one state machine that
drives both from the same progress value. Right now `seekSmilTimeline` and
`motionFlight.progress` share intent but are written separately on every ScrollTrigger
update. A single `applyMotionProgress(progress)` function reduces duplicated scrub work.

**Expected outcome of conservative path.** Cleaner file ownership, lower idle-main-thread
usage on scroll, reduced-motion coverage that matches the intent already present in the
camera rig, and predictable code-splitting later without rewriting the scene graph.

### Recommended — Bold path second
Only attempt once the conservative steps are merged and profiles have proven the frame budget.

**1. Hybrid HTML-over-3D beats for non-motion sections**
For reading-heavy sections (`About`, `Facts`, `Stories`, `Recognition`, `Contact`),
render the DOM text as an HTML plane rendered by `CSS2DRenderer` / `CSS3DRenderer`
inside the same camera viewport, behind the heavy interactive beats. The text would
then share the camera choreography without z-fighting the focus veil.
**Risk:** accessibility gets harder (screen readers see renderer DOM), and the existing
FocusVeil/FocusDimmer contract breaks. Do not do this until `data-quiet` is fully
abstracted into a reusable contrast contract.

**2. Replace SMIL About/Motion with a shared progress-driven declarative timeline**
Migrate About’s blast/row-reveal and Motion’s orbital SVG into a single
declarative timeline driven by `motionFlight.progress` / a per-section progress value.
One timeline object, one cleanup, no `setAttribute('dur', ...)` per pointer event.

**3. Procedural texture worker**
Move `FlyingCarousel.jsx`’s `createStudyTexture` and `createBackdropTexture` off the
main thread into a Web Worker that owns an `OffscreenCanvas`. The main thread would
receive `ImageBitmap` transfers only. This is a genuine generative upgrade: no asset
downloads, but work happens off the interaction-critical path.

**4. Scroll scrub frame budget hard cap**
Introduce one read-only `performance.now()` delta inside the existing gsap ticker.
If the frame exceeds a configurable threshold (e.g. 22 ms), auto-degrade to
`RENDER_QUALITY.eco` for the next N frames. Right now quality is set once on load;
a runtime escape hatch is missing.

## 5. Risks flagged

- **Motion section is the bottleneck.** `MOTION_STUDIES.length === 6`, each card has
  three concurrent SMIL animations, and `FlyingCarousel` builds 6 `CanvasTexture`
  objects plus backdrop. Cold-load time and first meaningful paint are both sensitive
  here.
- **900 dust particles always tick.** `Particles.jsx` uses `count={900}` with a custom
  shader every frame regardless of whether the user ever scrolls to a visible particle.
- **MeshTransmissionMaterial in Crystal is GPU-heavy on low-end.** Currently no
  progressive fallback other than full eco downgrade.
- **Mono-file CSS will regress** the moment another section ships unless the layer split
  above happens first.
- **`reactStrictMode: false` is load-bearing.** Any future attempt to re-enable strict
  mode will double-create WebGL unless the dynamic-import wrapper is moved into a
  module-scoped singleton.
- **`useId` is used in Stories.jsx** but the file has no `'use client'` directive in the
  top-level audit list I worked from; if the component was ever tree-shaken into a
  server boundary this would break at build time.

## 6. The one-sentence summary

The architecture is closer to “production-ready film” than “demo,” but the canvas has
unlazy mascots, the CSS is a monolithic scroll, and Motion.jsx’s dual SMIL/WebGL path
is a cold-load tax; split CSS first, lazy-mask the mascots next, and only then attempt
the cinematic HTML-over-3D or worker-texture upgrade.
