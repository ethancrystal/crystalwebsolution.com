# Anatomy of Trionn-style SVGs

Dissected from the inline SVGs shipped on trionn.com (captured 2026-07). Markup below is
rewritten/original where the source geometry is brand-owned; the structural patterns are
verbatim technique.

## Contents

1. [Crosshair registration ticks](#1-crosshair-registration-ticks)
2. [Spread arrow glyph](#2-spread-arrow-glyph)
3. [Scroll-down circle (clip-masked loop)](#3-scroll-down-circle)
4. [Menu toggle (layered states)](#4-menu-toggle)
5. [Sound toggle (slash layer)](#5-sound-toggle)
6. [Normalized draw-on (`pathLength`)](#6-normalized-draw-on)
7. [Logo-mark reveal (stroke → clip fill)](#7-logo-mark-reveal)
8. [Meridian globe (mask-built glyph)](#8-meridian-globe)
9. [GSAP wiring patterns](#9-gsap-wiring-patterns)
10. [React component template](#10-react-component-template)

---

## 1. Crosshair registration ticks

The signature blueprint mark. Two hairlines crossing — placed at intersections of section
rules, card corners, and between footer columns. Trionn ships it at two scales.

Small (13×13) — note the `.5` snap on both lines:

```html
<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="6.5" y1="0" x2="6.5" y2="13" stroke="currentColor"/>
  <line x1="0"  y1="6.5" x2="13" y2="6.5" stroke="currentColor"/>
</svg>
```

Rule-scale (40×40) — same idea, wider gutter margins applied via CSS (`mx-10 lg:mx-16`):

```html
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="20.5" y1="0" x2="20.5" y2="40" stroke="currentColor"/>
  <line x1="0" y1="20.5" x2="40" y2="20.5" stroke="currentColor"/>
</svg>
```

Usage notes:
- On dark sections Trionn hardcodes `#D8D8D8` (structural, always-on-dark) or `#555`
  (muted). Prefer `currentColor` unless the mark never leaves one background.
- Place with CSS grid (`col-span-12 mx-auto`) so ticks self-center on the rule they annotate.
- A row of these between columns reads as a technical drawing's registration marks — the
  core of the aesthetic.

## 2. Spread arrow glyph

The `→` that terminates letter-spaced mono CTAs (`START A PROJECT →`). A single filled
path, ~10×9, exception to the stroke-only rule because at 10px strokes fall apart.

```html
<svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.5 8.6V6.6L8.3 3.8V4.9L5.5 2.1V0L9.3 3.8V4.8L5.5 8.6ZM0 5.1V3.5H8.6V5.1H0Z"
        fill="currentColor"/>
</svg>
```

Anatomy: the chevron head is two mirrored wedges (the V-shapes above/below the midline)
and the shaft is a plain rectangle (`M0 5.1V3.5H8.6V5.1Z`). Squared, technical — not a
rounded UI arrow.

On hover the arrow typically translates +4px x (with the CTA's letter-spread) and back,
`0.3s power2.out`.

## 3. Scroll-down circle

A circle with an arrow that continuously travels downward *through* it — the arrow exits
the bottom and re-enters the top, masked by a circular `clipPath`.

```html
<svg width="18" height="18" viewBox="0 0 18 18" fill="none"
     xmlns="http://www.w3.org/2000/svg" class="overflow-visible">
  <defs>
    <clipPath id="circleClip-hero">
      <circle cx="9" cy="9" r="8.5"/>
    </clipPath>
  </defs>
  <circle cx="9" cy="9" r="8.5" stroke="currentColor"/>
  <g clip-path="url(#circleClip-hero)">
    <path class="scroll-arrow"
          style="transform-box:fill-box;transform-origin:center center;will-change:transform,opacity"
          d="M8.65 12.35a.5.5 0 0 0 .7 0l3.18-3.18a.5.5 0 1 0-.7-.7L9 11.29 6.17 8.46a.5.5 0 1 0-.7.71l3.18 3.18ZM8.5 5v7h1V5h-1Z"
          fill="currentColor"/>
  </g>
</svg>
```

Key details (all present in the shipped original):
- `r="8.5"` on an 18-box: the 1px circle stroke sits on the half-pixel ring.
- The arrow is a down-chevron + shaft drawn as ONE filled path.
- `transform-box:fill-box; transform-origin:center` — without these, SVG transforms
  rotate/translate about the SVG origin, not the arrow's own box.
- Loop (CSS or GSAP): `translateY(0) → translateY(14px)` fading out, jump to
  `translateY(-14px)`, fade in to 0. ~1.6s, `power1.inOut`, `repeat: -1`.

## 4. Menu toggle

Hamburger ⇄ X without path morphing. All four strokes live in the markup; the X diagonals
ship at `opacity:0`.

```html
<svg viewBox="0 0 40 40" width="24" height="28">
  <path class="menu-line menu-line-1" d="M0 16 H40" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  <path class="menu-line menu-line-2" d="M0 25 H40" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  <path class="menu-x menu-x-1" d="M6.5 6.5 L33.5 33.5" stroke="currentColor" stroke-width="1.25" style="opacity:0" stroke-linecap="butt"/>
  <path class="menu-x menu-x-2" d="M33.5 6.5 L6.5 33.5" stroke="currentColor" stroke-width="1.25" style="opacity:0" stroke-linecap="butt"/>
</svg>
```

Details worth copying exactly:
- Hamburger lines use `linecap="round"`; the X uses `linecap="butt"` (sharper, reads as a
  precise ×).
- X strokes are slightly heavier (1.25 vs 1) — diagonals render optically thinner than
  orthogonal lines at the same width.
- The two H-lines are asymmetric (y=16, y=25 in a 40-box) — off-center pairing is part of
  the look; don't center-balance them.

Toggle timeline (GSAP): scale the H-lines' `scaleX` to 0 (staggered 0.06s, origin right),
then fade/draw the X in (staggered). Reverse for close.

## 5. Sound toggle

A speaker glyph in a dimmed group, with the mute slash as an independent sibling line.
Mute state = slash visible; playing state = slash hidden (and optionally group opacity 1).

```html
<svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="speaker" opacity="0.4">
    <!-- speaker body: horn + two arc waves, filled, currentColor -->
    <path d="M9.4.06a.6.6 0 0 0-.62.07L4.4 3.45v3.54a.38.38 0 1 1-.77 0V3.62H1.05C.47 3.62 0 4.1 0 4.68v4.64c0 .58.47 1.06 1.05 1.06h3.33l2.9 2.3v-2.63a.38.38 0 1 1 .77 0v3.24l.74.58a.6.6 0 0 0 .96-.47V.59a.6.6 0 0 0-.33-.53Z" fill="currentColor"/>
    <path d="M12.17 4.03a.37.37 0 0 0-.53.53 3.42 3.42 0 0 1 0 4.87.37.37 0 1 0 .53.53 4.17 4.17 0 0 0 0-5.93Z" fill="currentColor"/>
    <path d="M13.72 1.46a.37.37 0 0 0-.52.53 7.06 7.06 0 0 1 0 10.03.37.37 0 1 0 .52.53 7.8 7.8 0 0 0 0-11.09Z" fill="currentColor"/>
  </g>
  <line class="mute-slash" x1="15" y1="0.7" x2="1.7" y2="14"
        stroke="currentColor" stroke-opacity="0.6" stroke-linecap="round"/>
</svg>
```

Details:
- `opacity="0.4"` on the group keeps the speaker recessive in the nav; the slash at
  `stroke-opacity="0.6"` reads above it.
- Note the tiny vertical shaft lines *inside* the speaker body path (the `.38` radius
  stubs) — Trionn cuts thin slots into the filled horn so even the filled glyph keeps a
  linework feel.
- Animate the slash with a draw-on (add `pathLength="1"`) when muting: drawing the slash
  is the mute gesture.

## 6. Normalized draw-on

The preloader border trick, applicable to ANY path/rect/circle:

```html
<rect x="0.75" y="0.75" width="100" height="40" rx="2"
      fill="none" stroke="#434343" stroke-width="1.5"
      pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
```

`pathLength="1"` redefines the path's length as 1 unit, so:
- `stroke-dasharray="1"` = one dash exactly as long as the path;
- `stroke-dashoffset: 1` = fully hidden, `0` = fully drawn.

Animate dashoffset 1→0. No `getTotalLength()`, no per-shape measurement, resize-proof.
Trionn ships the rect with `width="1" height="1"` and resizes it with JS to wrap the
loading label — the normalized length means the animation code never changes.

## 7. Logo-mark reveal

Preloader pattern for a logo-scale mark (Trionn's chevron; draw an ORIGINAL mark — never
reuse their path data). Structure:

```html
<svg class="pl-t-path" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="pl-clip-1">
      <path fill-rule="evenodd" clip-rule="evenodd" d="[YOUR MARK PATH]"/>
    </clipPath>
  </defs>
  <!-- pass 1: the outline, stroke-drawn -->
  <path d="[YOUR MARK PATH]" fill="none" stroke="#aaa" stroke-width="1.5"
        pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
  <!-- pass 2: fill layers revealed inside the mark's own silhouette -->
  <g clip-path="url(#pl-clip-1)"><!-- gradient rect / sweep element animates in here --></g>
</svg>
```

Sequence: (1) stroke draws on via dashoffset; (2) a fill element (solid rect, gradient
band, or image) sweeps through the `clipPath` of the same path, so the mark "fills up"
inside its own silhouette; (3) optional scale/fade out into the page.

Design rule for the mark itself: sharp polygonal geometry with `fill-rule="evenodd"`
cutouts (counter-shapes punched out of the silhouette), small corner-radius curves
(~2–4 units) at vertices so joints render clean at stroke weight 1.5.

## 8. Meridian globe

Line-built globe for info cards / footer (EST. badge). Build from primitives — an ellipse
grid — rather than one mega-path:

```html
<svg width="43" height="27" viewBox="0 0 43 27" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="1.6" fill="none">
    <ellipse cx="21.5" cy="13.5" rx="20.5" ry="12.5"/>          <!-- outer -->
    <ellipse cx="21.5" cy="13.5" rx="10.5" ry="12.5"/>          <!-- inner meridian -->
    <line x1="1" y1="13.5" x2="42" y2="13.5"/>                  <!-- equator -->
  </g>
</svg>
```

Trionn's shipped version is one filled path with a white-filled `mask` (vector-tool
export of the same idea: rings + equator, wide-oblate 43×27 proportions). The oblate
squash (wider than tall) is the distinctive part — a perfect-circle globe reads generic.

## 9. GSAP wiring patterns

```js
// Draw-on (any element with pathLength="1")
gsap.fromTo('.pl-t-path path', { strokeDashoffset: 1 },
  { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' });

// Scroll-circle loop
gsap.timeline({ repeat: -1 })
  .to('.scroll-arrow', { y: 14, opacity: 0, duration: 0.8, ease: 'power1.in' })
  .set('.scroll-arrow', { y: -14 })
  .to('.scroll-arrow', { y: 0, opacity: 1, duration: 0.8, ease: 'power1.out' });

// Menu toggle
const tl = gsap.timeline({ paused: true })
  .to('.menu-line', { scaleX: 0, transformOrigin: 'right center', stagger: 0.06, duration: 0.25 })
  .to('.menu-x', { opacity: 1, stagger: 0.08, duration: 0.25 }, '-=0.1');
// open: tl.play(); close: tl.reverse();

// Hover accent (CTA arrow)
el.addEventListener('mouseenter', () => gsap.to(arrow, { x: 4, duration: 0.3, ease: 'power2.out' }));
el.addEventListener('mouseleave', () => gsap.to(arrow, { x: 0, duration: 0.3, ease: 'power2.out' }));
```

CSS-only fallback for the scroll loop:

```css
.scroll-arrow { animation: scroll-travel 1.6s ease-in-out infinite; }
@keyframes scroll-travel {
  0%   { transform: translateY(0);     opacity: 1; }
  45%  { transform: translateY(14px);  opacity: 0; }
  55%  { transform: translateY(-14px); opacity: 0; }
  100% { transform: translateY(0);     opacity: 1; }
}
```

## 10. React component template

```jsx
export function ScrollCircle({ className = '', idSuffix = '' }) {
  const clipId = `circleClip${idSuffix}`;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
         className={`overflow-visible ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id={clipId}><circle cx="9" cy="9" r="8.5" /></clipPath></defs>
      <circle cx="9" cy="9" r="8.5" stroke="currentColor" />
      <g clipPath={`url(#${clipId})`}>
        <path className="scroll-arrow"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', willChange: 'transform, opacity' }}
              d="M8.65 12.35a.5.5 0 0 0 .7 0l3.18-3.18a.5.5 0 1 0-.7-.7L9 11.29 6.17 8.46a.5.5 0 1 0-.7.71l3.18 3.18ZM8.5 5v7h1V5h-1Z"
              fill="currentColor" />
      </g>
    </svg>
  );
}
```

- `idSuffix` prevents duplicate-id clipPath collisions when the icon renders twice.
- Color comes from CSS `color` on any ancestor (`text-[#D8D8D8]` on dark, `text-[#0C0C0C]`
  on light) — never bake theme colors into the component.
