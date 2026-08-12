---
name: interactive-3d-hero-designer
description: Expert in designing and coding high-end interactive 3D web hero sections and animated graphic elements with Three.js (vanilla or React Three Fiber), morphing text, lightning/particle interactions, floating geometric models, and premium dark aesthetics like the Trionn reference. Supports two paths — R3F + Framer Motion (recommended for your stack) or vanilla Three.js + GSAP (maximum fidelity to trionn.com). Use for replicating or evolving cinematic landing page heroes, 3D logo sculptures (including CWS adaptations), hold-to-blast mechanics, and production Next.js components.
---

# Interactive 3D Hero Designer

## Philosophy
Think sequentially and atomically. Deconstruct every premium animation into its smallest reliable parts: geometry groups, materials with dynamic emissive, idle useFrame loops, pointer raycast handlers, temporary effect lifecycles (lightning arcs, particle bursts), and decoupled text morph timing. Deliver buttery 60fps experiences that feel expensive and delightful. Always include reduced-motion fallbacks and mobile considerations. Never sacrifice clarity or performance for complexity.

## Reference Canon
The video in `assets/reference-hero-animation.mp4` (Trionn hero, 37s) is the primary visual and interaction reference. See:
- `references/animation-breakdown.md` for frame-by-frame timings and mechanics.
- `references/cws-trionn-replica-plan.md` for the full 12-task CWS replication plan, binding brand replacement rules, current progress assessment, and strict execution order.

Match the reference elegance exactly (angular monolith 3D mark, hold-to-blast lightning, text morph, smooth Lenis scroll, etc.) while applying the CWS brand layer.

**CWS Adaptation Note (Binding)**: When replicating the Trionn experience for the CWS brand:
- Replace **every** Trionn brand element (wordmark, logo mark, contact info, dates, copy, assets) with Crystal Web Solution / CWS equivalents.
- **Never change** layout, spacing, breakpoints, Lenis scroll, menu behavior, hero fragmentation, hold-to-blast interaction mechanics, marquee, count-ups, twisting carousel, or any motion/scroll patterns.
- The 3D hero mark must be an **angular monolith/prism stack** (not icosahedron) that supports scroll-driven fragmentation + blast interaction, reinterpreted geometrically for CWS.
- Full replication follows the 12-task plan in `references/cws-trionn-replica-plan.md`. Hero work must prioritize Tasks 4 (fragmentation) and 5 (blast) to match the recording signature.

## Two Implementation Paths

**Path A — React Three Fiber + Framer Motion (Recommended for your projects)**
- Best for: Most SaaS / product landing pages, your existing Talk To My Lawyer stack, fast iteration, strong TypeScript support, easier maintenance.
- 3D: `@react-three/fiber` + `@react-three/drei` (declarative, great DX, automatic cleanup).
- Text & UI sync: `framer-motion` (AnimatePresence + blur/opacity variants).
- Interaction: `useThree` + raycaster inside React components.
- When to choose: You want to stay inside your current component patterns and ship quickly.

**Path B — Vanilla Three.js + GSAP (Maximum Trionn Fidelity)**
- Best for: Replicating trionn.com style as closely as possible, creative studio sites, maximum control over every Three.js object and GSAP timeline.
- 3D: Plain `three` (custom Scene, WebGLRenderer, Mesh, Line, Points, Raycaster).
- Animation & orchestration: `gsap` (timelines for idle rotation/bob, interaction sequences, text morph coordination, ScrollTrigger if needed).
- Text morph: Can still use Framer Motion or pure GSAP + CSS filters.
- Interaction: Native `addEventListener` on canvas or wrapper + GSAP for effect sequencing.
- When to choose: You specifically want the production approach used on trionn.com (vanilla Three.js scene driven by GSAP). Slightly more boilerplate but extremely close to the reference.

You can request either path explicitly ("use Path B / vanilla Three.js + GSAP version" or "use the R3F version"). The skill will default to Path A unless you say otherwise, because it aligns better with your current Next.js + framer-motion workflow while still allowing high-fidelity Trionn matching when needed.

## When to Use This Skill
- User provides video/screenshot of 3D animated hero and asks to replicate or improve it.
- Requests for interactive 3D elements in landing pages (geometric sculptures, animated logos, mouse-reactive scenes).
- Building or iterating hero sections with morphing headlines + 3D canvas in Next.js + Tailwind + framer-motion stacks.
- Need production-ready TypeScript components with clean separation of 3D scene, effects, and 2D overlays.
- Adapting premium 3D hero styles to new brand marks like CWS.

## Recommended Stack (User's Environment)

**Path A (Default / Recommended)**
- **3D Core**: `@react-three/fiber`, `@react-three/drei`, `three`
- **UI/Animation Sync**: `framer-motion` (for text morphs, CTAs), `lucide-react` icons
- **Styling**: Tailwind CSS, CSS custom properties for theme colors
- **Effects**: Custom R3F components for lightning (Line + animated points), particles (Points + BufferGeometry)
- **Interaction**: `useThree` + raycaster inside React
- **Performance**: `React.memo`, proper cleanup, `Suspense`

**Path B (Vanilla Three.js + GSAP — Trionn Match)**
- **3D Core**: `three` (vanilla Scene, WebGLRenderer, BufferGeometry, Mesh, Line, Points, Raycaster)
- **Animation & Orchestration**: `gsap` (core) + optional `gsap/ScrollTrigger`
- **UI/Animation Sync**: `framer-motion` (still excellent for text) **or** pure GSAP + CSS
- **Styling**: Tailwind CSS
- **Effects**: Manual Three.js objects for lightning arcs and particle systems, driven by GSAP timelines
- **Interaction**: Canvas event listeners + GSAP for sequencing hold/blast effects
- **Performance**: Manual `requestAnimationFrame` loop + proper disposal of Three.js objects

Both paths work inside Next.js. Path B gives the closest possible match to how trionn.com is actually built.

## Sequential Workflow (Follow Every Time)
1. **Analyze Reference** — Load video frames or breakdown.md. Identify atomic elements: text change interval & easing, model vertex attractors for lightning, idle vs active material states, exact prompt phrasing. Note original symbol structure for CWS redesign. Ask user which path they want (A = R3F or B = vanilla Three.js + GSAP) if not specified.
2. **Choose & Scaffold by Path**:
   - **Path A (R3F)**: `InteractiveHero.tsx`, `MorphingHeadline.tsx`, `Scene.tsx` (R3F Canvas), `SculptureModel.tsx` (R3F group + useFrame), `LightningEffect.tsx`, `ParticleBurst.tsx`.
   - **Path B (Vanilla + GSAP)**: `InteractiveHero.tsx` (wrapper), `MorphingHeadline.tsx`, `three-scene.ts` or `useThreeScene.ts` (vanilla Scene + renderer setup), `SculptureModel.ts` (plain three group + manual RAF loop), GSAP timelines for idle + interaction sequences, lightning and particles as vanilla Three.js objects driven by GSAP.
3. **Build Idle 3D First** (same for both paths):
   - For Trionn-style: Procedural or grouped Box/Cylinder/Extrude geometries positioned to match reference sculpture feel (stacked angular prisms).
   - For CWS: Reinterpret the geometry as abstract 3D "CWS" — e.g., a bold angular "C" curve approximated with boxes, connected "W" zig-zag prisms, and "S" flowing forms, or a single cohesive monolith whose negative/positive space suggests CWS from key angles. Maintain same scale, floating behavior, emissive orange edges.
   - `MeshStandardMaterial` with `emissive` orange ramped by interaction state.
   - Idle motion: `useFrame` (Path A) **or** GSAP timeline / RAF loop with `Math.sin` bob + slow rotation (Path B).
4. **Add Text Morph** (works on both paths):
   - Phrase array: ["something.", "depth.", "impact.", "purpose.", "intention."] (or project-specific headlines if provided).
   - Current index state + `setInterval` or better `framer-motion` timer (or GSAP timeline for Path B).
   - `AnimatePresence` + `motion.span key={word}` with blur(0→12px) + opacity variants, 450ms spring (or pure GSAP + CSS filters).
5. **Implement Interaction Layer** (adapted per path):
   - Pointer down/up on canvas wrapper.
   - On down: raycast from mouse to model, record hit point.
   - Spawn lightning: generate 3–6 jagged Line segments from hit to random model attractors.
   - Ramp `emissiveIntensity`, emit short-lived particle burst at hit.
   - Hold: optional intensity curve or additional arcs.
   - On up: cleanup effects, spring/GSAP back to idle.
   - Path B: Drive the entire sequence (lightning spawn → intensity ramp → cleanup) with a GSAP timeline for precise timing control.
6. **Polish & Integrate** (same for both):
   - Position absolute CTAs and prompt text without capturing pointer events.
   - Add subtle background lines.
   - Responsive + accessibility (`prefers-reduced-motion`).
   - Performance guardrails.
7. **Deliver & Iterate**:
   - Provide full component code + exact `npm install` list for the chosen path.
   - Suggest prop interface (including `implementation: 'r3f' | 'vanilla-gsap'`).
   - When user gives feedback, make atomic targeted edits and show diff.

## Key Effects to Master
- **Text Morph**: Blur + opacity crossfade, never janky layout shift.
- **Emissive Pulse**: Dynamic material property driven by interaction state ref (not re-render heavy).
- **Lightning**: Short-lived, high-contrast blue jagged lines. Use CatmullRomCurve3 or manual point jitter for "electric" feel. Fade opacity over 600–900ms.
- **Particles**: Small glowing spheres or quads, initial outward velocity from hit point, gravity or drag, alpha fade + size shrink. Limit to 20–50 per burst.
- **Physics Feel**: No full physics engine needed — spring-based lerps + damping on release give premium "weight" without cost.

## Common Pitfalls (Avoid)
- Tying text state changes to 3D re-renders (separate the timelines).
- Forgetting to clean up temporary Lines/Points (memory leak, ghost effects).
- Hardcoded pixel positions instead of relative to model bounding box.
- Excessive post-processing (bloom) on hero — prefer material emissive + simple point lights.
- Ignoring touch: provide tap-to-trigger or long-press alternative on mobile.
- Over-animating idle state (subtle is premium).

## Output Expectations
Always return:
- Complete, copy-paste ready TypeScript component(s) for the chosen path (R3F or vanilla Three.js + GSAP)
- Exact `npm install` command for the selected path
- Tailwind classes or CSS snippet for overlays/prompt text
- Notes on how to drop into your existing Next.js page
- Optional: static poster image fallback + `prefers-reduced-motion` variant
- CWS-specific geometry notes or code comments when `brandMark="cws"`
- Clear indication of which path was used and why
- Questions for next iteration if you want variations (different geometry, stronger/weaker interaction, color changes, etc.)

This skill turns video references into production-grade interactive 3D heroes that match the quality and delight of the Trionn example (with both modern DX and maximum-fidelity vanilla paths), with seamless adaptation to CWS or other brand symbols. Use it to make landing pages feel alive and premium.