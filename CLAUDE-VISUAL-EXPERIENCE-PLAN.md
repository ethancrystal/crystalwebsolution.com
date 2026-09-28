# Claude Visual Experience Plan

## Project identity

- **Repository:** `ethancrystal/crystalwebsolution.com`
- **Business:** CD Sportswear INC
- **Production domain:** `https://www.cdsportswearinc.com`
- **Framework:** Next.js 16 App Router, React 19, JSX
- **Visual stack:** React Three Fiber, Three.js, drei, postprocessing, GSAP/ScrollTrigger, Lenis, SplitType
- **Styling:** Plain global CSS with tokens; no Tailwind; no TypeScript
- **Core architecture:** One fixed WebGL stage behind DOM sections, one RAF clock through GSAP/Lenis, module-level singletons for per-frame cross-boundary state

## North-star experience

> Make the site feel like a living digital instrument: immediately clear about what CD Sportswear INC does, visually unforgettable without being confusing, tactile without being gimmicky, and fast enough that the spectacle never becomes friction.

The target is not “add more effects.” The target is a choreographed experience where every transition communicates hierarchy, continuity, personality, or feedback. The visual language should feel authored from one system: a crystal/refraction metaphor, precise typography, procedural geometry, controlled cyan/blue/violet light, and a clear movement from **awe → understanding → proof → action**.

## Experience principles

1. **Clarity before spectacle.** The visitor must understand the offer, audience, proof, and next action in the first viewport.
2. **One visual story.** The hero crystal, service signals, approach compass, work visuals, and contact close should feel like chapters of one instrument, not separate demos.
3. **Motion has meaning.** Use motion to establish hierarchy, show relationships, carry continuity between sections, and provide feedback.
4. **Interaction is optional, not required.** Hover, pointer, WebGL, and scroll choreography enhance the story but never hide core content or navigation.
5. **Touch is first-class.** Every pointer/hover interaction must have a touch and keyboard equivalent.
6. **Performance is part of the design.** A 60fps target on a 2019 MacBook Air is the minimum ambition; mobile and low-power fallback states are designed, not patched in later.
7. **Reduced motion is a designed mode.** It should still feel intentional and branded, not like a broken version.
8. **Procedural visuals remain the rule.** Do not import stock assets, unrelated template effects, or copied competitor media.
9. **Do not copy Trionn or any reference site.** Use the repository’s research only for structural inspiration; preserve CD Sportswear’s own copy, identity, and assets.
10. **The CRM is a product, not an afterthought.** Its visual system should share the brand’s precision while optimizing clarity, status, action-required states, and collaboration.

## Current experience diagnosis

### Strengths to preserve

- Distinctive fixed WebGL stage and camera journey.
- Declarative journey data in `lib/journey.js` and measured beat progress in `lib/beatProgress.js`.
- One shared RAF clock and singleton-based per-frame state.
- Strong procedural-visual rule.
- Reduced-motion gates already present in multiple animation components.
- Intentional focus management in the fullscreen menu.
- Marketing pages and CRM routes have separate composition boundaries.

### Main problems to solve

1. **The hero is memorable before it is explicit.** Add a direct service descriptor and clear proof without flattening the brand voice.
2. **The long homepage lacks persistent wayfinding.** Add accessible section navigation with plain-language labels and active state.
3. **Hover/pointer behavior is not enough for touch.** Replace hidden interaction states with explicit, keyboard/touch-safe controls.
4. **The section vocabulary is sometimes abstract.** Pair poetic headlines with useful labels such as `How we work`, `Brand systems`, and `Client stories`.
5. **The page can be visually dense at decision moments.** Use quiet zones around Services, Work, Reviews, and Contact.
6. **Dynamic contrast is not guaranteed.** Make critical text plates deterministic over bright canvas states.
7. **WebGL cost needs an explicit quality ladder.** Cull or simplify off-screen-depth actors, effects, caustics, and postprocessing without changing the story.
8. **The CRM needs action-first hierarchy.** Show project health, milestone progress, action required, and who has the ball immediately.

# Phased execution plan

## Phase 0 — Baseline and instrumentation

**Goal:** Establish a measurable baseline before changing visuals.

### Tasks

- Confirm current route/section map and all IDs.
- Capture the homepage at scroll progress 0, 0.25, 0.5, 0.75, and 1.
- Record FPS, frame time, GPU time where available, JS long tasks, memory, and WebGL draw calls.
- Test desktop, mobile, reduced motion, no WebGL, and slow CPU modes.
- Add a dev-only performance HUD behind an environment flag; never ship it enabled in production.
- Capture current Lighthouse and axe results.
- Confirm the existing marketing test suite is green before visual changes.

### Acceptance criteria

- Baseline evidence exists for every major beat.
- No current regressions are accidentally attributed to the redesign.
- A performance budget is documented before new effects are added.

## Phase 1 — Information architecture and visual hierarchy

**Goal:** Make the experience immediately understandable without removing its cinematic identity.

### Tasks

- Clarify hero copy:
  - Headline remains expressive.
  - Add direct descriptor: websites, brand systems, motion, and AI automation.
  - Add proof line: services, projects shipped, experience.
  - Add primary `Start a project` and secondary `See selected work`.
- Add `JourneyNav` with plain-language labels and `aria-current="location"`.
- Pair abstract section names with useful labels:
  - `Approach` → `How we work`
  - `Mark` → `Brand systems`
  - `Lab` → `Experiments`
  - `Motion` → `Motion design`
  - `Stories` → `Client stories`
- Establish a 7-beat mental model: Intro, Services, How we work, Work, Stories, About, Contact.
- Add a “quiet mode” for decision sections with lower background intensity.

### Acceptance criteria

- A new visitor can state what the business does after the first viewport.
- Every primary journey destination is reachable without opening the fullscreen menu.
- The visual page still feels premium with WebGL disabled.
- Headings and labels are coherent to a screen reader.

## Phase 2 — Hero as signature interaction

**Animation brief:** The hero should feel like a camera pulling focus through a refracting object: the headline resolves first, the direct offer settles second, the crystal reacts subtly to pointer/scroll energy, and the CTA lands with a measured spring. The hero should invite exploration without requiring a gesture to understand the offer.

### Tasks

- Keep one hero focal point; avoid putting the brightest effect behind critical text.
- Add a procedural wireframe/edge-light treatment only if it improves focus, not simply density.
- Make the pointer “blast” effect localized and throttled.
- Add a touch-safe hero interaction: tap the crystal area or use an explicit `Explore` control; do not bind large decorative sections to surprising click behavior.
- Add a no-WebGL hero fallback using CSS gradients/procedural SVG only.
- Add forced-colors and high-contrast fallback for gradient text.
- Add visible “See selected work” secondary CTA.
- Keep intro loader under 1 second and provide a skip path.

### Acceptance criteria

- Hero understands in 5 seconds with no scroll and no interaction.
- The hero is visually striking but text remains readable throughout the animation sweep.
- No accidental blast occurs when activating controls.
- Mobile hero is not merely a hidden-desktop-effects fallback.

## Phase 3 — Scroll choreography and section handoffs

**Animation brief:** The page should move as one continuous shot. Each section hands visual energy to the next: crystal light becomes service signals, service signals become the approach compass, the compass resolves into proof, and proof quiets into the contact decision.

### Tasks

- Use `lib/journey.js` as the source of truth for camera stops/clusters.
- Use measured beat boundaries, never uniform section fractions.
- Define a handoff motif for each adjacent pair:
  - Hero → About: refracted glow dims into readable typography.
  - About → Services: one line/particle signal becomes service rail.
  - Services → Approach: signal rail resolves into compass direction.
  - Approach → Stories: compass settles while proof cards become dominant.
  - Stories → Work: quote/proof shifts into visual case-study evidence.
  - Work → Contact: visual noise reduces and CTA becomes the focal point.
- Avoid independent RAF loops; reuse the GSAP ticker.
- Animate only transform/opacity on DOM; use GPU/canvas for shader motion.
- Keep all durations/easings in `lib/easing.js`.

### Acceptance criteria

- No section feels like a separate template.
- Scroll direction and speed do not create camera jumps or disorientation.
- Backward scrolling is as coherent as forward scrolling.
- Reduced-motion mode preserves section order and hierarchy.

## Phase 4 — Service and work interaction design

**Goal:** Move visitors from browsing to confident choice.

### Tasks

- Add problem-first service entry points:
  - Need a new website
  - Need a clearer brand
  - Need to automate manual work
  - Need motion/interactive work
  - Not sure yet
- Make service rows native keyboard/touch controls when they expand content.
- Add selected state, `aria-expanded`, and `aria-controls`.
- Keep “More info” links visible, not only revealed by hover.
- Add case-study metadata: problem, service, outcome.
- Add filters or segmented browsing to Work without making the library feel like a dashboard.
- Use one shared card interaction system across Services and Work.

### Acceptance criteria

- No visitor needs hover to discover essential service information.
- A user can match themselves to a relevant case study quickly.
- Service/work cards remain legible at 320px and 400% zoom.

## Phase 5 — Contact conversion and CRM coherence

### Public contact

- Add “What happens next” beside the form.
- Keep email fallback visible.
- Use progressive disclosure if the brief form feels long.
- Preserve labels, errors, hCaptcha fallback, and status announcements.
- Add a clear response expectation only if it can be kept accurate.

### CRM portal

- Make first viewport action-first:
  - Project health
  - Milestone progress
  - Needs your action
  - Waiting on CD Sportswear / Waiting on you
  - Team contact
  - Latest update
- Use status text plus icon plus color.
- Keep real-time updates in `aria-live="polite"` regions.
- Use progressive disclosure for files, approvals, and timeline history.

### Acceptance criteria

- A client can answer “What changed?” and “What do I need to do?” immediately.
- Approval and upload states are unmistakable.
- The CRM feels related to the marketing brand but calmer and more operational.

## Phase 6 — Performance, accessibility, and visual QA

### Performance budget

- 60fps target on a 2019 MacBook Air during normal hero interaction.
- 30fps minimum on a mid-range mobile device; degrade quality before stalling.
- No more than one shared RAF/ticker.
- No allocations inside `useFrame`.
- No unbounded particle growth.
- Limit postprocessing passes and disable expensive passes at lower quality.
- Cap device pixel ratio to an explicit ceiling.
- Cull off-screen-depth clusters with hysteresis.
- Replace large blurred CSS surfaces with cheaper alternatives when possible.
- Do not keep heavy actors and effects at full fidelity when their beat is not active.

### Accessibility gates

- WCAG AA contrast in resting and animated states.
- Visible focus for every interactive element.
- Full keyboard operation.
- NVDA/VoiceOver smoke passes.
- Reduced motion and forced colors.
- WebGL failure and JavaScript-delay fallback.
- No information conveyed by color or motion alone.

### Visual QA gates

- Full-page captures at progress 0/0.25/0.5/0.75/1.
- Compare adjacent section rhythm, text scale, contrast, and camera focal points.
- Check 320px, 390px, 768px, 1280px, and 1440px.
- Test forward/backward scroll and anchor navigation.
- Review on a bright room/mobile screen, not only a dark calibrated monitor.

## Recommended WebGL optimization strategy

### 1. Add a quality ladder

Create a single quality state consumed by Scene, effects, and actors:

```text
high: DPR 1.5–2, full particles, full postprocessing, caustics on
medium: DPR 1–1.25, half particles, reduced bloom/DOF, caustics simplified
low: DPR 1, low particles, no expensive postprocessing, CSS caustic fallback
static: no continuous scene animation, only DOM/CSS layout and essential visual
```

Use device memory, hardware concurrency, coarse pointer, reduced motion, and measured frame time as signals. Do not create separate animation loops for each signal.

### 2. Optimize caustics

- Prefer one lightweight shader/gradient layer over three large blurred DOM blobs if profiling shows paint cost.
- If keeping CSS caustics, animate only transform/opacity and avoid animating blur, width, height, or layout properties.
- Reduce blur radius on mobile and low quality.
- Pause caustics when the hero is outside the viewport.
- Pause or simplify caustics when the tab is hidden.
- Do not combine multiple `mix-blend-mode: screen` layers on low-power devices.
- Use a static gradient frame for reduced motion.

### 3. Optimize heavy 3D actors

- Gate actors by measured beat proximity with hysteresis.
- Use lower segment counts and simpler materials for distant/off-screen clusters.
- Avoid dynamic shadows unless they materially contribute to the story.
- Reuse geometries and materials; do not recreate them per render.
- Preallocate vectors/quaternions/colors outside `useFrame`.
- Disable raycasting on decorative meshes.
- Dispose resources when optional scene modules unmount.
- Keep postprocessing to the smallest number of passes that creates the intended look.

### 4. Optimize render scheduling

- Keep Lenis + GSAP as the single clock.
- Update per-frame mutable state in singletons.
- Avoid React state updates in `useFrame` or high-frequency pointer handlers.
- Throttle pointer input and update a singleton target.
- Use frame-time monitoring to step quality down; restore quality slowly to avoid oscillation.
- Stop rendering or reduce animation when the document is hidden.

### 5. Protect the DOM layer

- Do not animate layout properties.
- Avoid expensive `backdrop-filter` on large surfaces.
- Keep blur and blend effects localized.
- Use `content-visibility` only where it does not interfere with scroll measurement/ScrollTrigger.
- Keep text plates deterministic for contrast.

## File-level work map

| Area | Primary files |
|---|---|
| Hero copy/interactions | `components/sections/Hero.jsx`, `app/styles/hero.css` |
| Homepage orchestration | `components/Experience.jsx` |
| Persistent wayfinding | `components/JourneyNav.jsx`, `app/styles/journey-nav.css` |
| Camera journey | `lib/journey.js`, `lib/beatProgress.js`, `components/three/CameraRig.jsx` |
| Scene quality | `components/Scene.jsx`, `components/three/Effects.jsx`, `lib/useRenderQuality.js`, `lib/useExperienceFeatures.js` |
| 3D actors | `components/three/*` |
| Cross-boundary animation state | `lib/scrollState.js`, `lib/motionScale.js`, `lib/pulse.js`, `lib/beacon.js` |
| Services | `components/sections/Services.jsx`, `app/styles/services.css` |
| Work | `components/sections/Stories.jsx`, `components/marketing/WorkLibrary.jsx`, `app/work/page.jsx` |
| Contact | `components/sections/Contact.jsx`, `components/marketing/ContactForm.jsx` |
| Accessibility | `app/styles/primitives.css`, `app/styles/stage.css`, `app/styles/responsive.css` |
| Tests | `tests/marketing/*.test.jsx`, planned browser/e2e coverage |

## Delivery protocol for Claude

1. Work on a feature branch; never deploy directly to production.
2. Make one coherent phase change at a time.
3. Before editing, inspect the current implementation and related tests.
4. Propose the animation brief and performance budget before coding.
5. Keep diffs small and reversible.
6. Never delete files without owner confirmation and runtime/URL audit.
7. Run the relevant tests after each phase.
8. Run `pnpm build` before claiming route/import completion.
9. Verify in a real browser, not only jsdom.
10. Capture visual evidence for changed sections.
11. Check `git status`; do not commit generated `tsconfig` rewrites or temporary artifacts.
12. Before a PR to `main`, follow the repository versioning rules in `VERSIONING.md`.

## Definition of done

The app is ready when it is:

- Immediately understandable.
- Visually distinctive without visual overload.
- Interactive with mouse, touch, keyboard, and screen reader.
- Coherent across homepage, marketing subpages, work, contact, and CRM.
- Stable at desktop and mobile widths.
- Performant with an explicit quality ladder and fallback.
- Respectful of reduced motion, forced colors, and WebGL failure.
- Validated by tests, browser QA, contrast review, and visual captures.
