# Trionn.com — Screenshot-Level Annotations

Companion to `TRIONN-ADAPTATION.md`. That doc covers structure/tokens; this one is
frame-by-frame observation notes — layout regions, exact triggers, and inferred
component boundaries — written so an implementing agent can build against specific
observed behavior instead of a general description. Viewport captured: 1280×720,
live browser pass, 2026-07-11. Frames below are numbered in capture order.
Never copy Trionn's literal assets/copy — these notes describe *mechanics* to
reimplement with CWS's own crystal/shard visuals and copy.

## Frame 1 — Hero, idle state (post-loader, ~1s settled)

**Layout regions (1280×720 viewport):**
- `0,0 → 1280,80`: header bar. Logo lockup top-left (`32,45`). Right cluster at
  `x≈1024-1248`: circular sound-toggle button (`~36px` diameter) → solid pill
  "LET'S TALK" → outlined pill "MENU ≡". All three vertically centered at `y≈45`.
- `0,90 → 500,230`: H1, two text lines, left-aligned, ~72-80px type size, tight
  line-height (lines nearly touch — matches the "~0.9 line-height" token).
- `440,150 → 900,560`: the 3D wireframe mark. Occupies a roughly diamond/chevron
  silhouette, centered around `x≈650, y≈360`. Rendered as **outlined faces only**
  (edges visible, faces near-transparent/very dark fill) — confirms procedural
  wireframe material, not a solid-shaded mesh.
- `1025,535 → 1235,670`: bottom-right info card. Circular globe-glyph icon top,
  `EST. 2012` label, `14+ YEARS SHAPING DIGITAL DIRECTION.` (two-line, right-
  aligned mono/label type), one-line body copy below in muted gray.
- `450,588 → 815,618`: cookie bar, horizontally centered-ish (not full width),
  inline pill/bar with copy left, `DECLINE`/`ACCEPT` right, thin 1px border.
- `545,645 → 720,675`: two centered lines of interaction hint copy, mono/caps,
  with inline emoji (💥 for blast, ⚡ for touch) — this is UI copy, not decorative.
- `40,668`: small circular scroll-down affordance, bottom-left, isolated.

**Colors:** background near-black but not pure black (`~#0C0C0C`); H1 text mid-gray
(`~#8A8A8A`–`#A0A0A0`, NOT full white — deliberately muted so it doesn't compete
with the 3D mark); wireframe edges very faint blue-gray (`~#3A4550`); hint copy and
card text lower-contrast gray (`~#6B6B6B`).

**Inferred component boundaries:** Header = one fixed component. Hero = a section
with 3 independent overlapping layers: (a) DOM text/copy layer, (b) WebGL canvas
(wireframe mark) sitting behind text via z-index, (c) a **second, higher z-index
2D canvas** for the interactive line field (near-invisible at idle — see Frame 2).

## Frame 2 — Hero, click/"blast" interaction (mid-animation, ~200-400ms after click)

Same layout, but the 2D line-field layer is now visibly populated: 6-8 elongated
bar/sliver shapes scattered across `x:180-900, y:80-620`, each a **gradient fill**
running dark-metallic → bright orange (`~#FF6A2A` hot end), oriented at varying
diagonal angles (not uniform), several converging toward the click origin near
`680,340`. One sliver top-left (`460-580, 85-280`) shows the gradient reversed
(orange at top, fading to dark at bottom) — i.e. gradient direction is **radial
from impact point**, not a fixed direction per shape.

**Inferred mechanic:** click/hold writes an impact point + timestamp into a
singleton (matches this project's `lib/pulse.js` idiom exactly); the 2D canvas
reads it each frame and drives per-sliver: (1) an emissive-color lerp from neutral
metallic to orange keyed by distance-decay from impact point, (2) a positional
"scatter" impulse (the slivers pictured are NOT in their idle positions — compare
to Frame 1/3 where slivers are essentially invisible/at rest). Decays back to
idle over roughly 1-2s based on the settled state seen one screenshot later.
**CWS mapping:** this is exactly the "roar" pulse mechanic the current CWS hero
already implements for the crystal (scale pulse / spark ejection) — the sliver
field should read the *same* `lib/pulse.js` timestamp rather than inventing a
parallel signal, so click-anywhere triggers both the crystal reaction and the
sliver burst in one gesture.

## Frame 3 — Hero, headline word-swap mid-transition

H1 now reads two lines: "Designed to" / "mean **intention.**" — but captured
**mid blur-in**: characters "D", "e", "s" etc. in "intention" render at sharply
different blur radii within the SAME word — e.g. "in" crisp, "te" heavily
blurred (~4-6px gaussian), "nti" crisp again, "on." blurred. This is not a
uniform fade — it's a **per-character blur-in stagger with randomized/alternating
timing**, consistent with SplitType chars + GSAP stagger with a blur filter
tween rather than opacity alone.

**Inferred mechanic:** on a timer (looks ~3-4s dwell per word based on typical
award-site pacing), the second word splits to chars via SplitType, swaps text,
and staggers each char in from `filter: blur(Npx); opacity:0` to
`blur(0); opacity:1`, stagger offset small (~30-50ms/char) so multiple chars are
mid-transition simultaneously — matches what's visible here.
**CWS mapping:** directly reuses the existing `DecodeText.jsx` pattern already in
this codebase (per README: "decode headline resolves") — this is very close to
what CWS's hero already does; the main net-new part is the recurring *word-swap
cycle* (not just decode-once-on-load) — needs a small timer singleton
(`lib/heroWordCycle.js`: current index + last-swap timestamp) driving repeat
SplitType passes on an interval, teardown on unmount per architecture rules.

## Frame 4 — Hero, settled/idle after interaction decay

Wireframe mark rotated to a new resting angle vs Frame 1 (confirms continuous
slow auto-rotation independent of interaction) and the H1 shows only "Designed
to / mean" (second word mid-swap-out, blank/transitioning) — this is the moment
BETWEEN words in the swap cycle, evidence the word doesn't hard-cut but empties
before the next one blurs in. Two faint diagonal lines are visible crossing the
whole viewport corner-to-corner behind the mark — likely a low-opacity
"orbit"/constellation line connecting off-screen sliver anchor points, always
present at very low opacity (not just during blasts).

## Frame 5 — Selected Work, pinned horizontal slide (mid-scroll-through)

**Layout:** background is the light gradient (`#FFFFFF`→`#D2D2D2`, lighter at
top of this frame). Header pill colors invert to dark-on-light here (`LET'S
TALK` now solid black pill, `MENU` outlined dark). A thin horizontal progress
rule sits just under the header (`x:0-73px filled of full width` at capture
time) — this is the **pin-progress indicator** for the horizontal scroll,
confirms the pinned section tracks progress with a visible scrub bar, not just
an invisible scrollytelling trick.

Two project blocks visible mid-transition: left one partially scrolled off
(only "…ECT →" and an arrow visible at the left edge, `x:0-70`), then "Pulse
Studio" fully in frame (`200,505 → 445,575`: title + 2-line description +
"EXPLORE PROJECT" mono link with arrow, all left-aligned in a column around
`x:200-660`), then "Loftloom" already entering from the right (`833,585→960,655`)
— confirms **3+ cards visible/transitioning simultaneously**, true horizontal
carousel not a one-at-a-time swap. Cookie bar still present/unchanged in this
same fixed position — confirms it's a persistent overlay independent of section
scroll (position fixed relative to viewport, not to page scroll).

**Inferred mechanic:** GSAP ScrollTrigger `pin: true` + a horizontal `xPercent`
tween on a flex/row track, `scrub` tied directly to scroll progress (this is why
a thin progress rule can render trivially — same 0-1 progress value drives both
the track transform and the rule width).
**CWS mapping:** confirms the `lib/pinnedSlider.js` shared-primitive
recommendation in TRIONN-ADAPTATION.md — build once, scrub-driven, expose a
progress value both the track transform and an optional progress-rule consume.

## Frame 6 — Services, section entry (dark, smoke)

Background near-black (`~#040508`), heavy soft smoke/fog texture filling the
whole frame at low contrast (looks like layered noise, animating slowly —
can't confirm video vs shader from a still, but the grain is fine and irregular
enough to be more consistent with a noise shader than a compressed video).
Centered top: a roughly fist-sized rough/cratered rock render (`568,0→695,95`,
cut off at top of viewport — implies it's actually taller and scrolls up into
frame, anchored above the "OUR SERVICES" label at `590,98→675,110`). Bottom bar
(persistent across this whole section based on later frame too): tagline
`✦ DIFFERENT DISCIPLINES. ONE STANDARD OF CRAFT.` bottom-left, `VIEW SERVICES →`
bottom-right, cookie bar still mid-screen at same position as hero (confirms
truly fixed/global, not per-section).

## Frame 7 — Services, card grid revealed (scrolled further into pinned section)

Same rock + smoke + bottom bar persist (static anchor while content scrolls
under/around it — the rock does NOT scroll away, confirms it's pinned/fixed
for the section duration while service cards scroll past). Two service cards
visible: **"AI & Intelligent Automation"** (`90,207→330,340`: title 2-line,
small icon of ~9 vertical bars of varying height at `447,220→528,300` acting as
a mini glyph/visualization to the right of the title, description paragraph
below at `90,349→332,392`) and **"Website & Mobile Design"** (`753,375→990,470`,
concentric-arc icon glyph at `1108,373→1190,463`, description below). Cards sit
in a loose 2-column staggered grid (not perfectly aligned rows — second card is
offset lower and further right than a strict grid would produce), each in its
own bordered/subtle-contrast box (very faint border visible around first card,
`60,190→558,440`).

**Inferred mechanic:** likely 6 total service cards (per copy: AI & Automation,
Web Development, Product Design, Website & Mobile Design, WordPress
Development, Branding) laid out in a staggered 2-col grid, scrolling normally
(not horizontally) while the rock+smoke+tagline bar stay pinned as a fixed
backdrop — i.e. THIS section is "pin the background, scroll the foreground
content," a different pinning pattern than Selected Work's "pin everything,
scroll horizontally."
**CWS mapping:** `components/three/ServiceRock.jsx` (pinned via its own
ScrollTrigger targeting only the rock+label+tagline group) + a normal-flow
`components/sections/Services.jsx` grid scrolling independently on top. Each
card's icon glyph should be a small inline SVG or tiny canvas sprite generated
per service (procedural, matches the no-binary-assets rule) — bar-cluster and
concentric-arc styles seen here are good starting motifs to riff on with CWS's
own iconography.

## Sections not re-captured this pass

About, Key facts, Client stories, Design in Motion, and Footer were not
re-screenshotted in this session (site's continuous-scroll pinning made
targeted re-navigation to those anchors unreliable via automated scroll this
pass). Rely on the verified prose in `TRIONN-ADAPTATION.md` / the sibling
repo's `TRIONN-FINDINGS.md` for those — flagged here so an implementing agent
knows which sections have frame-level evidence vs description-level evidence
and can prioritize a follow-up capture pass for those five before final polish.
