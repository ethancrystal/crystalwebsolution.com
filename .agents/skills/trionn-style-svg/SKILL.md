---
name: trionn-style-svg
description: Create premium studio-grade SVG icons, glyphs, logo marks, and micro-animations in the Trionn.com visual language — technical blueprint minimalism with hairline strokes, crosshair registration ticks, spread arrows, draw-on animations, and currentColor theming for dark/light section inversion. Use when building SVGs for awwwards-style agency/portfolio sites, the Crystal Web Solution project, or any request for "Trionn-style", "studio-grade", "blueprint", or "technical minimal" SVG icons, scroll indicators, menu/sound toggles, preloader marks, or CTA arrow glyphs.
---

# Trionn-Style SVG Creation

Author SVGs the way a top-tier digital studio does: thin geometric linework, grid-snapped
coordinates, `currentColor` theming, and animation hooks built into the markup. Grounded in
the actual inline SVGs shipped on trionn.com (extracted and dissected 2026-07).

## The design language (non-negotiable rules)

1. **Hairline strokes, no fills by default.** `fill="none"`, `stroke-width` of `1`–`1.5`.
   Filled paths are reserved for tiny glyphs (arrows ~10px) and logo marks. Never both a
   heavy fill and a stroke on the same shape.
2. **`currentColor` everywhere** so one icon inverts automatically across dark
   (`#0C0C0C`/`#040508`) and light (`#FFF→#D2D2D2` gradient) sections. Hardcode a color
   only for fixed-context marks: ink-on-dark `#D8D8D8`, muted structure `#555`/`#434343`/`#aaa`.
3. **Orange accent `#FF5A1F` is a glow/edge accent only** — never the whole icon.
4. **Snap strokes to the half-pixel grid.** A 1px stroke on a 13×13 crosshair sits at
   `x1="6.5"` so it renders crisp, not blurred across two pixels. Even-size viewBoxes get
   integer coords with the stroke centered (`stroke-width` 1 on coordinate `.5` offsets).
5. **Author at final optical size.** Small exact viewBoxes (13, 18, 40), scaled up/down via
   CSS classes — no `vector-effect="non-scaling-stroke"` crutches.
6. **Geometry over decoration.** Lines, circles, precise polygonal paths. No rounded-blob
   icon-pack shapes, no drop shadows, no gradients inside icons (gradients belong to
   canvas/WebGL layers, not SVG).
7. **All states in one SVG.** Toggles (menu→X, sound on→muted) ship every stroke in the
   markup with hidden layers at `opacity:0`, flipped by class/GSAP — never swap SVG files
   and never morph path `d` data.
8. **Namespace every `id`.** Icons repeat on a page (`clipPath`, `mask` ids collide and
   silently break rendering). Suffix ids per instance: `circleClip-nav`, `path-mask_mobile`.
9. **`overflow-visible`** on any SVG whose animation travels outside the viewBox.

## Workflow

1. **Classify the ask**: structural tick / glyph / state toggle / animated indicator /
   logo-scale mark. Then open [references/anatomy.md](references/anatomy.md) and read the
   matching recipe — it has annotated real markup for all eight core patterns plus the
   GSAP/CSS wiring.
2. **Start from an asset when one fits.** `assets/` holds ready originals in the style
   (see table below) — copy, recolor via `currentColor`, and adapt rather than drawing
   from scratch.
3. **Draw on paper coordinates first.** Decide viewBox, place every endpoint as an exact
   number (prefer `.5` offsets for 1px strokes), then write the markup by hand. Trionn-style
   SVGs are small enough that hand-authored coordinates beat exported vector-tool soup.
4. **Add the animation hooks in the markup**, not in JS: `pathLength="1"` for draw-ons,
   `clipPath` for masked travel loops, `opacity:0` layers for toggles, and stable class
   names (`.pl-t-path`, `.menu-x`) for GSAP to target.
5. **Verify crispness**: render at 1× (screenshot or browser) and check strokes are 1
   device pixel, not gray smears. If a stroke blurs, the coordinate is off-grid.

## Core recipes (summary — full markup in references/anatomy.md)

| Pattern | Essence |
|---|---|
| Crosshair tick `+` | Two hairlines crossing at `.5` coords; 13×13 small, 40×40 rule-scale. THE signature mark — place at section-rule intersections and card corners. |
| Spread arrow `→` | ~10×9 filled chevron+shaft path; pairs with letter-spaced mono CTAs (`EXPLORE PROJECT →`). |
| Scroll-down circle | `<circle r="8.5">` stroke + arrow inside a circular `clipPath`, arrow loops downward through the mask (CSS/GSAP `translateY`, `transform-box:fill-box`). |
| Menu toggle | Two H-lines (`stroke-linecap="round"`) + two X-diagonals at `opacity:0` (`linecap="butt"`); GSAP crossfades/rotates between layers. |
| Sound toggle | Speaker `<g opacity="0.4">` + separate diagonal slash `<line>` with `stroke-opacity="0.6"`; slash opacity = mute state. |
| Draw-on border | `<rect pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">` animated to `0` — normalized draw regardless of size. Works on any path. |
| Logo-mark reveal | Outline `<path stroke>` drawn first (dashoffset), then fill revealed through a `clipPath` of the same path — the preloader pattern. |
| Meridian globe | Concentric arcs + even-odd `mask` for a line-built globe glyph (footer/info-card scale). |

## Animation grammar

- **Draw-on**: `pathLength="1"` normalizes every path to length 1 → animate
  `stroke-dashoffset` 1→0. Duration ~0.8–1.2s, ease `power2.inOut`.
- **Looping indicators**: mask with `clipPath`, translate the child through it, jump back
  invisibly. Always set `transform-box: fill-box; transform-origin: center;
  will-change: transform, opacity` on the moving node.
- **State toggles**: stagger the two layers ~0.15s apart (lines out, X in) so the flip
  reads as a morph without path interpolation.
- **Hover accent**: stroke color transitions to `#FF5A1F` or opacity `0.4→1`; 0.3s ease-out.

## Bundled assets (`assets/` — original, ready to copy)

`crosshair-tick.svg` (13×13) · `crosshair-large.svg` (40×40) · `spread-arrow.svg` ·
`scroll-circle.svg` (self-animating, embedded CSS) · `menu-toggle.svg` (X layers hidden) ·
`sound-toggle.svg` (slash layer) · `draw-on-border.svg` (pathLength demo) ·
`diamond-spark.svg` (✦ accent).

All assets use `currentColor` — drop them inline (JSX/HTML) and set CSS `color` on a parent.
Inline them (don't `<img>`) whenever they animate or must inherit color.

## Legal boundary

The *techniques and aesthetic* are fair game; **Trionn's actual brand paths are not**.
Never reproduce the TRIONN chevron logo path, their globe glyph path data, or any client
wordmark. Draw original geometry that follows the same rules. (The bundled assets are
original for this reason.)

## Integration notes (React/Next.js)

- Make each icon a small JSX component returning inline SVG; pass `className` through.
- Toggles take a boolean prop and flip layer opacity via CSS classes or a GSAP timeline in
  `useEffect`/`useGSAP` — the SVG markup never changes.
- When the same icon renders twice (desktop + mobile nav), suffix internal ids with an
  `idSuffix` prop to satisfy rule 8.
