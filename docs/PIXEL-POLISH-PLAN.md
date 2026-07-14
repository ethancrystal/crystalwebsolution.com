# Pixel-Polish Execution Plan — Every Corner, Every Transition

Companion to `docs/HIVE-AUDIT.md`. That doc is the diagnosis + judged priority
order; this is the execution plan — phased, file-level, with acceptance
criteria and a coherence pass woven through every phase rather than bolted on
at the end. Target: finish all 8 remaining ⬜ items from the Judge's list,
verify the 1 uncertain "done" item, and leave the whole site (all 11 sections)
visually and choreographically coherent.

Base: `main` @ `dd98288` (PR #7 hive-audit merged) + `1386598` (PR #10
cursor cleanup merged). PR #8 (`feature/trionn-visual-parity-v2`) is a
separate, deliberately-isolated foundation branch (`lib/v2`, no components,
does not import `CameraRig`/`CLUSTERS`) — left parked, not part of this plan.

## Ground rules for every phase (not a separate cleanup step)

- Every new tween/duration reads a token from `lib/easing.js`
  (`EASE_OVERSHOOT`/`EASE_SETTLE`/`EASE_SNAP`, `DURATION_FAST/NORMAL/SLOW/CINEMATIC`)
  — no inline magic numbers, so timing stays visually consistent site-wide.
- Every new cross-boundary per-frame value is a plain singleton object
  (matches `pulse.js`/`beacon.js`/`focusBeacon.js`/`chime.js`), never React
  state, and every new 3D read multiplies/gates by `motionScale.value` so
  `prefers-reduced-motion` is respected automatically.
- No allocation inside `useFrame` — pre-allocate vectors, mutate in place.
- Every animation `useEffect` returns a teardown (kill ScrollTriggers, remove
  listeners).
- After each phase: `next build` clean, then a Playwright full-page capture
  of the touched section(s) at progress 0/0.25/0.5/0.75/1, eyeballed next to
  the adjacent sections for tone/weight/spacing parity before moving on.

---

## Phase 1 — Unblock: Motion↔Recognition camera gap (Judge item 4)

**Why first:** everything in Phase 4 (Motion's package) sits on top of
whatever the camera is doing here; fixing it after would mean re-tuning
Motion's entrance twice.

- Read current `lib/journey.js`: `STOPS[recognition].pos.z = -122` looks at
  `CLUSTERS.recognition = -130`; `STOPS[motion].pos.z = -138` looks at
  `CLUSTERS.motion = -146`. The camera's flight path between those two stops
  passes directly through `z = -130` — exactly where `RecognitionRing` lives.
- Inspect `components/three/RecognitionRing.jsx` for its actual radius/scale
  and the torus-knot mascot in the motion cluster, to confirm whether the
  ring is large/bright enough to visibly swim through frame during that
  scroll segment (the original hive-audit symptom) or whether it's already
  masked by fog/DOF at that depth.
- Fix (pick based on what's found): either (a) widen the `recognition` →
  `motion` cluster gap slightly in `journey.js` (keep every other spacing
  uniform), or (b) fade/cull `RecognitionRing`'s opacity via
  `beatProgress`/`scrollState.progress` as the camera exits the recognition
  segment, so it's fully dimmed before the camera crosses its depth.
- **Acceptance:** scrub progress continuously from recognition → motion stop
  in dev; the ring never crosses into frame once the motion headline is the
  active pinned content.

## Phase 2 — Quick win: Contact closing roar (Judge item 6)

- `components/sections/Contact.jsx`: on hover/focus of the magnetic email CTA,
  call the existing `blast()` from `lib/pulse.js` (same signal the hero
  click already drives) so the final crystal reacts with the same
  scale-pulse/spark-ejection language as the hero — full-circle callback,
  zero new systems.
- **Acceptance:** hovering the email CTA visibly pulses/sparks the contact
  crystal using the identical motion signature as the hero's click reaction.

## Phase 3 — New choreography, independent of Phase 1/4

### 3a. Approach process arc
- `components/sections/Approach.jsx` + `components/three/ApproachCompass.jsx`:
  add a dash-drawn ellipse/arc connecting the compass markers, scrubbed by
  scroll progress through the section (`stroke-dashoffset` tween or SVG
  `pathLength`), eased with `EASE_SETTLE`. Reuses the compass's existing
  spring physics for the markers themselves — only the connecting arc is new.
- **Acceptance:** arc draws in sync with marker arrival, never fully drawn
  before the last marker settles.

### 3b. Stories package
- `components/sections/Stories.jsx`: masked quote-swap transition (clip-path
  wipe or blur-cross-fade, `DURATION_NORMAL`/`EASE_SETTLE`) instead of a hard
  cut; a sliding "ink bar" under the active client-tab wordmark
  (`transform: translateX`, damped); 3 client "motes" (small dots/marks) that
  light up on tab hover — new singleton `lib/storiesBeacon.js` mirroring
  `beacon.js`'s shape (`{ index: -1 }`, `light()`/`dim()`), read by whatever
  3D/2D layer renders the motes.
- **Acceptance:** switching tabs never hard-cuts the quote; ink bar tracks the
  active tab with a spring, not a snap; motes respond only to the tab that's
  actually hovered/focused.

### 3c. Facts count-up
- `components/sections/Facts.jsx`: stat numerals count up using a
  scramble-cipher effect through `DecodeText.jsx` (same primitive already
  proven in Hero/Mark) rather than a plain linear count, triggered once on
  scroll-into-view.
- **Acceptance:** each stat resolves through 3-5 scramble passes before
  settling on the final digit, `DURATION_SLOW`, no re-trigger on repeated
  scroll in/out.

## Phase 4 — Motion 3-part package (Judge item 10, depends on Phase 1)

- `components/sections/Motion.jsx`: per-character shear-wave on the headline
  (skewX oscillation traveling char-to-char, not uniform).
- Ghost-stroke duplicate: a second, offset/blurred copy of the headline text
  behind the primary layer for a motion-trail look.
- `components/three/` mascot: torus-knot rotation speed driven by
  `scrollState.velocity` (damped, frame-rate-independent per
  `1 - Math.exp(-dt*k)`) so it visibly reacts to how fast the user scrolls,
  not just position.
- **Acceptance:** scrolling fast visibly speeds the torus's spin vs. a slow
  scroll; shear wave and ghost-stroke both respect `motionScale.value`.

## Phase 5 — Cosmetic, anytime, low risk (Judge item 11)

- `components/three/ShowcaseBoxes.jsx` / `components/ProjectVisual.jsx`:
  per-project-slug generative SVG line-work accents, **intensity-capped**
  per the Judge's ruling (subtle accent, not a competing focal element).
- **Acceptance:** line-work reads as texture/accent at a glance, not as a
  second subject competing with the project title/visual.

## Phase 6 — Cross-cutting, last (Judge item 12)

- Beat-proximity render culling: cull/reduce fidelity of off-screen-depth 3D
  clusters based on proximity to the current beat, **hysteresis version
  only** (enter/exit thresholds separated) to avoid pop-in flicker at the
  boundary — this touches every section's mascot simultaneously, so it goes
  last, once every mascot from Phases 1-5 is finalized and won't need
  re-tuning against the culling thresholds.
- **Acceptance:** no visible pop/flicker of any mascot when scrolling slowly
  back and forth across a section boundary; frame time improves or holds
  steady vs. pre-culling baseline.

---

## Final coherence sweep (once Phase 6 lands)

1. `next build` clean.
2. Playwright full-page capture of all 11 sections at progress 0/0.25/0.5/
   0.75/1 (same evidence method as the original hive audit).
3. Side-by-side pass checking: heading scale/weight parity across sections,
   consistent use of `--plate`/`--plate-centered` legibility treatment where
   text sits over the 3D layer, consistent easing character (nothing feels
   like it's on a different physics system from its neighbors).
4. Spot-check every new singleton against `motionScale.value` gating and
   confirm no console warnings/errors introduced.
5. Commit + push to `main` as the final step, per standing convention.
