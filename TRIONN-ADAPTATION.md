# Trionn.com Layout Breakdown → Crystal Web Solution Adaptation

Verified live (browser pass, 2026-07-11) against prior TRIONN-SPEC.md / TRIONN-FINDINGS.md
research found in the `crystalwebsolution` sibling repo. One correction noted below (Services).
Rule unchanged: match structure, motion, and 3D craft — never reuse Trionn's copy, client
names, testimonials, logos, or video/asset files. Everything here is rebuilt with CWS's own
brand voice, generated procedurally (no binary assets), per the project's existing rule.

## Global design system

| Token | Trionn | CWS adaptation |
|---|---|---|
| Dark bg | `#0C0C0C` (hero), `#040508` (services/footer) | reuse as-is |
| Light bg | `linear-gradient(0deg,#FFFFFF 0%,#D2D2D2 100%)` (facts), reverse `#C3C3C3→#FFF` (stories) | reuse as-is |
| Display ink (dark) | `#D8D8D8` | reuse |
| Display font | Familjen Grotesk, ~0.9 line-height | Familjen Grotesk (Google Fonts, exact match) |
| Body font | Neue Haas Display Roman (commercial) | Inter or Archivo |
| Mono/label font | Martian Mono Light | Martian Mono (Google Fonts, exact match) |
| Serif accent | PP Editorial New Ultralight (commercial) | Fraunces or Instrument Serif |
| Accent color | orange edge-glow `~#FF5A1F` | reuse as CWS's accent, or swap for existing crystal-refraction hue |
| CTA shape | pill buttons; mono links with letter-spread + arrow → | reuse pattern |

## Section-by-section

### 1. Header (fixed, inverts light/dark per section)
Top strip: `INSPIRE · INNOVATE · IMPACT` → CWS: `CLARITY · DEPTH · MOTION`.
Logo left (glyph + wordmark). Right: sound-toggle circle, solid `LET'S TALK` pill, outlined
`MENU ≡` pill. **CWS mapping:** rework `components/Nav.jsx`; pill invert driven by
`lib/scrollState.js` section-background reads (singleton, no React state).

### 2. Hero (dark, min-h-dvh)
H1 "Designed to / mean **{word}**." — second word blur-swaps on a timer (SplitType + GSAP).
Behind it: large wireframe/outlined 3D logo mark, slow rotate, faint orange edge-glow —
**procedural geometry, not a loaded model**. Overlaid: a 2D canvas of scattered metallic
"chrome sliver" line segments drifting across the hero, interactive — drag/hold to "blast"
them apart, hint copy "DARE ⚡ TO TOUCH THE LINES" / "HOLD TO 💥 BLAST". Bottom-right glass
card: `EST. 2012 | 14+ YEARS…` + one-liner. Scroll-down circle bottom-left. Cookie banner is
an inline centered pill (`DECLINE` / `ACCEPT`, letter-spread), not a corner toast.
**CWS mapping:** new `components/three/HeroMark.jsx` (procedural wireframe crystal/shard,
reuse existing Crystal.jsx refraction shader wireframed down); new 2D canvas layer
`components/ChromeSliverField.jsx` — own singleton (`lib/sliverField.js`) for per-frame
state, pointer-events on for the drag interaction only within the hero viewport, teardown
on unmount. Copy: `EST. 2024 | CRAFTING THE IMMERSIVE WEB.`

### 3. About (dark)
Big H2 statement + mission paragraph + `MORE ABOUT US` (letter-spread hover). Followed by a
scrolling marquee band repeating the top-strip words.
**CWS mapping:** existing `Marquee.jsx` + `Reveal.jsx` already cover this — mostly a copy/
layout pass on `components/sections/About.jsx`.

### 4. Key facts (light gradient)
"Key facts" H2 + "A snapshot of our experience and impact." Stat cards
(FEATURED & AWARDS, PROJECTS COMPLETED, TEAM STRENGTH) with **perspective-skewed 3D tilt +
parallax on scroll** — these are imagery cards that tilt as you scroll past, not flat stat
tiles. Partner-logo strip below.
**CWS mapping:** rework `components/sections/Facts.jsx`; tilt via CSS 3D transform driven by
scroll progress (GSAP ScrollTrigger `scrub`, no React state) rather than R3F — cheaper and
keeps the effect purely in DOM layer. Partner strip → tech-stack wordmarks (Next.js,
Three.js, GSAP, Lenis, Vercel).

### 5. Selected work (light, GSAP-pinned horizontal slide)
Section pins; project cards slide horizontally: index, name, one-liner, big visual,
`EXPLORE PROJECT →` (letter-spread). Ends "Discover our complete collection… VIEW ALL
PROJECTS →". Dark wipe transition into Services.
**CWS mapping:** rework `components/sections/Showcase.jsx` from vertical-drift glass slabs to
a pinned horizontal `ScrollTrigger` (this is the biggest structural departure from the
current camera-fly-through approach — needs its own pin/scrub timeline, independent of the
`journey.js` camera STOPS).

### 6. Services (dark, smoke/fog)
Floating **textured procedural rock** (displaced icosahedron, not a loaded asset) tumbles in
real smoke — live site confirms a fog/video-style haze behind it. **Correction to older
notes:** it is NOT giant stacked cream words — it's a 2-column grid of service cards, each
with a title, 2-line description, and a small procedural icon glyph (e.g. vertical bar
cluster for AI & Automation, concentric arcs for Website & Mobile Design). Tagline
`✦ DIFFERENT DISCIPLINES. ONE STANDARD OF CRAFT.` + `VIEW SERVICES →`.
**CWS mapping:** new `components/three/ServiceRock.jsx` (displaced icosahedron + noise
shader, reuse the noise/shader utilities already in `Crystal.jsx`/`BackdropMorph.jsx`);
smoke via a shader plane, no video asset. Rework `components/sections/Services.jsx` into the
card grid with per-service SVG/canvas icon glyphs (procedural, matches "no binary assets"
rule). CWS services: Immersive Web Design, WebGL & 3D, Motion & Interaction, Brand &
Identity, Engineering, Art Direction.

### 7. Client stories (light gradient, reversed)
"Client stories" H2 + intro line. Left: client wordmark tabs that switch a big quote on the
right; author avatar + role; `▷ LISTEN` audio chip; prev/next arrows; `BECOME A CLIENT →`.
**CWS mapping:** rework `components/sections/Stories.jsx` into a tabbed layout — tab state as
a small singleton (`lib/storiesState.js`, active index + timestamp), not React state, so it
stays consistent with the rest of the architecture. Avatars: generated abstract avatars
(procedural, no stock photos of real people since testimonials are original/placeholder).

### 8. Design in motion (light, pinned)
Horizontal sliding row of Dribbble-style shot cards. "Concepts, explorations…" bottom-left,
`VIEW ON DRIBBBLE →` bottom-right (CWS: `VIEW THE LAB`).
**CWS mapping:** new `components/sections/Motion.jsx` treatment — same pinned-horizontal
pattern as Selected Work, reusable as a shared hook/util (`lib/pinnedSlider.js`) rather than
duplicating the ScrollTrigger setup twice.

### 9. Footer (dark, min-h-dvh)
Top label `LET'S BUILD WORK THAT INSPIRES.`, local time top-right. Huge "Ready to build
something bold?" + `START A COLLABORATION →`. The "SOUND ON 🎵 HOVER THE LINES." field is a
**dense grid of short horizontal line segments** (waveform look) that pluck/sound on hover.
Columns: BUSINESS ENQUIRY + SOCIAL.
**CWS mapping:** rework `components/sections/Contact.jsx`; waveform field is another 2D
canvas singleton (`lib/waveformField.js`), same idiom as the hero chrome-sliver field —
could share the same underlying "line particle grid" primitive as the hero effect, just
tuned differently (denser, horizontal-only, audio-reactive via Web Audio on hover).

## Canvas inventory (what's WebGL vs 2D, so we don't over-build)
- Hero rotating logo mark → **WebGL (R3F)**, one Canvas.
- Mid-page distortion piece (services↔stories) → WebGL2, likely a lightweight full-bleed
  shader plane, not critical to replicate 1:1 first pass.
- Hero chrome-sliver field + footer waveform → **2D canvas**, `pointer-events: none` except
  where interaction is explicit (hero drag zone), stacked above the WebGL canvas.

## Recommended build order (phased, so each phase ships independently)
1. **Foundation** — fonts (Familjen Grotesk + Martian Mono), color tokens, light/dark section
   rhythm infra, Nav pills + top strip, cookie banner.
2. **Hero** — highest visual impact: wireframe mark + chrome-sliver field + copy.
3. **Services** — rock + smoke + service card grid (reuses existing shader utilities).
4. **Selected Work + Design in Motion** — shared pinned-horizontal-slider primitive.
5. **Key facts + Client stories** — DOM-driven tilt cards + tabbed testimonials.
6. **Footer** — waveform field, reusing the hero's line-particle primitive.

Existing sibling repo `moizj00/crystalwebsolution` already has a first pass at several of
these (About/KeyFacts/Work/Services/ClientStories/DesignInMotion/Footer section files) — worth
harvesting for a head start rather than writing every section from zero.
