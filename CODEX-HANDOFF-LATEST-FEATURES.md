# Codex handoff: latest WebGL features

## Open this project in the new Windows-side chat

- Windows path: `C:\Users\moizjmj\Crystal Web Solution`
- WSL access path: `/mnt/c/Users/moizjmj/Crystal Web Solution`
- Branch: `codex/latest-features`
- Remote: `https://github.com/ethancrystal/crystalwebsolution.com.git`

Run `git status --short --branch --ignore-submodules=all` first. Do not clean or reset unrelated files.

## Non-negotiable user contract

The electric CWS mascot and R3F flying carousel are additions and possible replacements only after successful validation.

- Do not delete `components/three/Crystal.jsx`.
- Do not delete `components/three/Sparks.jsx`.
- Do not delete the existing SVG/SMIL implementation in `components/sections/Motion.jsx`.
- Do not replace or remove the Contact-section Crystal.
- Keep permanent legacy/fallback switches for WebGL failure, mobile, and reduced motion.

## Source blueprints already read in full

1. `C:\Users\moizjmj\OneDrive\Desktop\Integration Blueprint Upgrading Crystal Web Solution.md`
2. `C:\Users\moizjmj\OneDrive\Desktop\Universal Dependency Guide 3D & WebGL Animation.md`
3. `C:\Users\moizjmj\OneDrive\Desktop\CWS 3D Icon Creation Plan From 2D Logo to Electric Hero Mascot.md`
4. `C:\Users\moizjmj\OneDrive\Desktop\Claude Implementation Prompts High-End WebGL & Motion.md`
5. `C:\Users\moizjmj\OneDrive\Desktop\Replication Plan 3D Hero Icon with Electric Effects.md`

## Work completed and committed on this branch

- `lib/experienceFeatures.mjs`: feature selection and legacy-query fallbacks.
- `lib/flyingCarouselLayout.mjs`: deterministic six-card scatter/grid layout and weighted transform sampling.
- `lib/motionFlight.mjs`: DOM-to-Canvas progress/readiness singleton.
- `lib/motionStudies.mjs`: the six existing Motion studies shared without importing a DOM section into the Canvas bundle.
- `lib/pointerState.js`: pointer singleton for the non-interactive Canvas.
- `tests/latestFeatures.test.mjs`: feature, fallback, deterministic-layout, and shared-state coverage.

No legacy visual component was deleted. `HeroMascot.jsx` and `FlyingCarousel.jsx` are not implemented yet.

## Verified baseline

Fresh branch-worktree verification on July 19, 2026:

```text
node --test tests/*.test.mjs
13 tests passed, 0 failed

npm run build
Next.js 14.2.35 compiled successfully and generated all static routes
```

The required Three.js/R3F stack is already installed: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `gsap`, and `lenis`. Do not add `lamina` merely because the generic guide mentions it.

## Repo-grounded integration constraints

- Reuse the one fixed Canvas in `components/Scene.jsx`; do not add another Canvas, camera, RAF loop, composer, or competing Motion ScrollTrigger.
- `CLUSTERS.motion` and the Motion camera stop already exist in `lib/journey.js`; do not add a duplicate depth.
- Keep `Motion.jsx` as the sole owner of its pinned GSAP timeline and write its progress into `motionFlight`.
- Register Motion's `+=400%` pin in `lib/pinnedRanges.js`, matching the Showcase pattern.
- The current `.motion` background is opaque `#d7d6d2` and hides the fixed Canvas. Add a readiness-gated dark/transparent 3D variant while retaining the current light SVG fallback.
- Hold `CameraRig` at the Motion stop while the Motion pin is active so the fixed carousel remains framed.
- The Canvas uses `pointer-events: none`; have CameraRig write its existing window-pointer input to `pointerState` rather than adding another listener.
- Keep deterministic scatter transforms and avoid allocations inside `useFrame`.
- The existing global Bloom can serve the electric overlay. Add any Depth of Field only conditionally during the Motion beat so it does not blur every section.

## Next implementation sequence

1. Wire `experienceFeatures`, `motionFlight`, `motionStudies`, and `pointerState` into `Scene.jsx`, `Motion.jsx`, and `CameraRig.jsx` without changing legacy-default behavior until the new render reports ready.
2. Add `components/three/FlyingCarousel.jsx` with six procedural 3:4 card meshes and progress-driven reversible transforms.
3. Add a bounded, Motion-only Depth of Field treatment and verify GPU cost.
4. Add `components/three/HeroMascot.jsx`: procedural beveled CWS fallback plus optional `useGLTF` adapter for a future optimized model, chrome-obsidian base, electric GLSL overlay, pulse response, pointer damping, and responsive scale.
5. Add runtime error/Suspense fallback to the original hero Crystal.
6. Verify desktop, 767/768 breakpoint, mobile, reduced motion, reverse scroll, rapid hero clicks, console output, and frame timing before activating replacements by default.

## Git caution

The separate WSL `main` checkout at `/home/moizjmj/crystalwebsolution.com-main-2` contains local commit `03877a0`, which mixed these scaffold files with unrelated `ScrollFloat`/`ScrollReveal` files during recovery. Do not rewrite or discard that commit. The Windows checkout and its `codex/latest-features` branch contain the clean isolated commit with only the files listed above plus this handoff note.
