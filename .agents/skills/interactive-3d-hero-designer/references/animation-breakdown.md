# Reference Animation Breakdown: Trionn Hero Section

**Source Video**: `assets/reference-hero-animation.mp4` (37s screen recording of tronn.com-style premium hero, recorded 2026-06-29)

## Overall Aesthetic & Structure
- **Theme**: Ultra-premium dark mode — pure #000000 background, crisp white typography, subtle orange (#ff5500-ish) emissive accents on 3D model.
- **Layout**: Full-bleed hero. Top-left logo "TRIONN", top-right "LET'S TALK" pill + MENU. Central large headline + 3D sculpture. Bottom-center call-to-action text. Right-side info card (EST. 2012, "1+4 YEARS SHAPING DIGITAL DIRECTION", short description).
- **Typography**: Bold, modern sans-serif. Large headline (~ hero h1 size). Smooth weight and tracking.
- **3D Scene**: Centered abstract geometric sculpture floating in dark void with thin white construction lines suggesting depth and connections. Very high production value, cinematic lighting.

## Text Morphing Headline ("Designed to mean ...")
The headline animates in a sophisticated loop with blur + crossfade transitions (appears ~every 1.0–1.2 seconds):

1. "Designed to mean something."
2. "Designed to mean depth."
3. "Designed to mean impact."
4. "Designed to mean purpose."
5. "Designed to mean intention."
6. Back toward "something." (and repeats variations)

**Implementation notes for replication**:
- Split into static prefix "Designed to mean " + dynamic suffix word.
- Use Framer Motion `AnimatePresence` + `motion.span` with `key` change on word.
- Exit/enter variants: `opacity: 0, filter: 'blur(12px)'` → `opacity: 1, filter: 'blur(0px)'` with short spring or easeOut duration ~400-600ms.
- Avoid re-rendering the entire 3D canvas during text changes.

## 3D Geometric Sculpture (The Star Element)
- **Form**: Abstract, architectural stack of black rectangular prisms/boxes with sharp edges. Resembles a stylized "A" or modern monolith structure that feels both digital and physical. Multiple connected elements at different angles and depths.
- **Materials & Lighting**:
  - Base: Dark matte black (#0a0a0a or #111) with slight metalness.
  - Emissive: Bright orange-red glow along edges and select faces (intensity ramps on interaction).
  - Subtle rim lighting and self-illumination to make it pop against black.
- **Idle Animation** (looping, seamless):
  - Very slow continuous rotation (Y-axis primarily, slight X tilt).
  - Gentle floating/bobbing on Y axis using sine wave (amplitude ~0.05–0.1 units, frequency low).
  - Occasional micro-tilts or breathing scale for life.
- **Interaction ("HOLD TO ⚡ BLAST")**:
  - Prompt text at bottom: "HOLD TO ⚡ BLAST DARE TO TOUCH THE LINES."
  - On pointer down (anywhere on canvas or targeted to model via raycast):
    - Immediate bright **blue-white lightning arcs** (jagged, electric) spawn from click/intersection point and connect to other vertices or edges of the sculpture.
    - Emissive intensity spikes dramatically (orange glow intensifies, almost white-hot in places).
    - Particle-like energy bursts or glowing fragments emit outward (short lifespan, velocity away from impact).
    - Model may receive slight "impact" push or scale pulse with spring return.
  - Hold sustains the effect or increases intensity (more arcs, brighter).
  - On pointer up: Smooth return to idle state with damping on all effects. Lightning fades quickly, glow normalizes.
- **Technical clues from frames**:
  - Lightning is not static — appears as bright blue jagged lines that "crackle" or connect dynamically (likely custom Line segments or Tube with animated positions).
  - Model has internal structure — lightning seems to travel along or between its geometric parts.
  - Background thin lines also exist and may subtly react or provide parallax.

## Timeline Highlights (approximate from 1fps frame grabs)
- 0.00s: Clean load state, full headline visible, model in neutral pose.
- 1–8s: Early morphs (something → depth), model slowly rotating, idle glow.
- 9–15s: Impact/purpose phases, model orientation changes, still idle.
- 16–22s: Intention phase, model more dynamic angle.
- 23s+: Mouse interaction begins — lightning visible in frames 25–28, model reacts, text continues morphing independently.
- 29–37s: Transition to "ABOUT" section with large overlaid text "Trionn is an independent digital studio crafting meaningful brand experiences through strategy, design, and technology." 3D model continues animating in background or as hero element fades/repositions.

## Interaction Design Principles Demonstrated
- **Delight through micro-interaction**: Not just hover, but "hold to blast" creates anticipation and power feeling.
- **Feedback is visceral but not overwhelming**: Lightning + glow spike feels premium and responsive without lag.
- **Text and 3D are decoupled**: Headline morphs on its own timer; 3D reacts only to pointer.
- **Clear affordance**: The prompt text teaches the user exactly what to do.

## Production Notes for This Skill
When replicating or evolving this style:
- Target 60fps on mid-range devices.
- Use React Three Fiber + drei for declarative code.
- Keep lightning/particle logic in a dedicated effect component that mounts/unmounts cleanly.
- Expose props for customization: ` phrases`, `primaryColor`, `interactionIntensity`, `rotationSpeed`.
- Always provide a static image fallback + `prefers-reduced-motion` CSS/JS path that disables complex 3D or simplifies to CSS animations.
- Test raycasting accuracy and pointer events on touch devices (may need different trigger like tap-to-cycle or long-press).

This breakdown + the source video in `assets/reference-hero-animation.mp4` is the definitive reference for all work produced with this skill. Match its elegance, timing, and interaction quality.