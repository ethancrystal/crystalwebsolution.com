# Layout, Composition & Aesthetics — Reference

Deep reference for the `website-designer` skill. Once color, type, and spacing tokens exist, this is how you arrange them into pages that feel composed, premium, and effortless to scan.

## 1. Grid & containers
- **12-column grid** is the workhorse: it divides into halves, thirds, quarters, and sixths cleanly. Use a fixed gutter from the spacing scale (commonly `24px` desktop, `16px` mobile).
- **Container max-width** by purpose:
  - Reading / blog: `640–720px` (keeps measure ≤75ch).
  - Marketing / app shells: `1120–1280px`.
  - Wide dashboards: `1440px+` with fluid inner panels.
- **Wrap content, not the page.** Let backgrounds/section colors run full-bleed; constrain the *content* with a centered container + responsive gutters: `padding-inline: var(--gutter)`.
- **CSS modern layout:** `grid-template-columns: repeat(12, 1fr)` for page grids; `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` for card grids that reflow without media queries. Use `gap`, never margins, for grid/flex spacing.

## 2. Vertical rhythm & section spacing
- **Sections breathe.** Vertical section padding should be large and consistent — e.g. `clamp(4rem, 10vw, 8rem)` top & bottom for marketing sections; tighter (`2–3rem`) for app views.
- **Rhythm = one spacing scale, used consistently.** Space between related items is small; between groups is large. The *jump* between tiers (e.g. `8px` within a card, `48px` between sections) is what signals structure.
- **The 8-point grid:** snap most spacing to multiples of 8 (with 4 for fine-tuning). It keeps everything optically aligned without thinking.
- **Space binds upward:** the gap *above* a heading > gap *below* it, so a heading visually belongs to the content it introduces, not the block above.

## 3. Composition — focal point & flow
- **One focal point per view.** Decide what the eye hits first (usually the H1 + primary CTA in a hero), then rank everything else below it. Achieve dominance with size, weight, color, isolation (whitespace), or position — not decoration.
- **Reading path:** Western eyes scan top-left → right, then down (Z-pattern for sparse layouts, F-pattern for text-dense). Put the value prop and CTA on that path.
- **Whitespace is active.** Negative space isolates the focal point and reads as confidence/premium. When in doubt, remove an element or add space rather than add decoration.
- **Proximity & grouping (Gestalt):** related items close, unrelated items apart. Most "messy" layouts are a proximity problem, not a styling problem.

## 4. Alignment & balance
- **Pick an alignment and commit.** Left-align body and most UI; reserve center alignment for short hero copy, empty states, and isolated CTAs — never multi-line paragraphs.
- **Establish edges.** Strong invisible vertical lines (a shared left edge for label + input + helper text) make a layout feel engineered. Optically align, not just mathematically (e.g. nudge a circular icon, account for punctuation overhang).
- **Balance:** symmetric = formal/stable (corporate, luxury); asymmetric = dynamic/modern (editorial, startup). Asymmetry still needs balance — counterweight a large element with whitespace or a cluster of small ones.
- **Consistency of spacing units within a component** matters more than the exact value. Equal padding all around, or a deliberate optical adjustment — never random.

## 5. Responsive strategy
- **Mobile-first, content-out.** Define the single-column mobile stack first; add columns at breakpoints only where they aid scanning.
- **Reflow, don't shrink.** Multi-column → stacked; horizontal nav → menu; side-by-side → tabs/accordion. Don't just scale a desktop layout down.
- **Fluid over fixed:** `clamp()` for type and section padding, `minmax()` grids, `%`/`fr` widths. Fewer hard breakpoints = fewer awkward in-between states.
- **Touch targets ≥44×44px**; increase spacing and tap area on mobile. Test the actual smallest realistic width (~360px) and the awkward tablet mid-range.

## 6. "Premium / modern" — taste recipes
Restraint and craft, not more effects. Each of these is a *small* touch.

- **Shadows — soft, layered, tinted.** Real shadows are diffuse and tinted toward the surface's hue, never pure black. Stack two layers (a tight contact shadow + a soft ambient one). Example:
  ```css
  box-shadow: 0 1px 2px rgba(15,23,42,.06),    /* contact */
              0 8px 24px rgba(15,23,42,.10);   /* ambient */
  ```
  In dark mode, lean on surface lightness for elevation; soften or drop shadows.

- **Gradients — subtle & analogous.** Stay within ~30–60° of hue, low contrast. Great for hero backgrounds, button sheen, or text accents. Avoid rainbow ramps and high-contrast clashes.
  ```css
  background: linear-gradient(135deg, var(--indigo-500), var(--indigo-700));
  /* barely-there surface tint: */
  background: radial-gradient(120% 120% at 50% 0%, var(--n-100), var(--n-50));
  ```

- **Borders & hairlines.** A 1px low-contrast border (`var(--color-border)`) often structures a layout more cleanly than a shadow. Pair a hairline with a tiny shadow for cards; use border alone for inputs and dividers.

- **Glass / blur** (use sparingly): `backdrop-filter: blur(12px)` + a translucent surface (`rgba(255,255,255,.7)`) for sticky headers/overlays. Always provide a fallback solid background and re-check text contrast over it.

- **Texture & depth:** a faint noise/grain overlay, a soft mesh gradient, or a single tasteful background blob can lift a flat page — at very low opacity. One signature element, not three.

- **Imagery discipline:** coherent photography *or* coherent illustration, one consistent treatment (duotone, rounded corners, consistent crop). Never mix random stock + clip-art. Constrain with `object-fit: cover` and a fixed aspect-ratio box.

## 7. Micro-interactions
Small, fast, purposeful. They confirm action and add polish; they are not entertainment.
- **Durations:** `120ms` for tiny state changes (hover/focus), `200–250ms` for entrances/expands, `300ms+` only for large transitions. `ease-out` for things entering, `ease-in` for things leaving.
- **Hover:** subtle lift (`translateY(-2px)` + slightly stronger shadow), background/border shift, or color deepen. Keep it tiny.
- **Focus-visible:** a clear, high-contrast ring (`outline: 2px solid var(--color-ring); outline-offset: 2px`). Never remove focus styles — only swap `:focus` for `:focus-visible`.
- **Press:** quick `scale(.98)` or color deepen for tactile feedback.
- **Entrances:** a short fade + small `translateY` on scroll-in; stagger lists by ~40–60ms. Don't animate everything.
- **Respect `prefers-reduced-motion: reduce`** — drop or shorten non-essential motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
  }
  ```

## 8. Section/page archetypes (marketing)
A reliable skeleton — adapt, don't paste:
1. **Hero:** eyebrow + H1 (value prop) + 1-line subhead + primary CTA (+ optional secondary) + supporting visual. One focal point. Generous top space.
2. **Social proof:** logo strip / stat band / short testimonial — low-key, builds trust early.
3. **Features:** 3-up or alternating image+text rows. Consistent card structure, real copy lengths.
4. **How it works / detail:** stepped or tabbed; keep within measure.
5. **Secondary proof / pricing:** clear comparison, one recommended tier highlighted (single accent).
6. **Final CTA:** restate value, one strong action.
7. **Footer:** organized columns, muted, complete.

## 10. Component primitives (token-driven, all states)
Style every primitive from semantic tokens, and always cover default + hover + focus-visible + active + disabled. Example button:
```css
.btn {
  display:inline-flex; align-items:center; gap:var(--space-2);
  padding:var(--space-3) var(--space-5);
  font:600 var(--fs-base)/1 var(--font-sans);
  border-radius:var(--radius-md); border:1px solid transparent;
  background:var(--color-primary); color:var(--color-primary-fg);
  cursor:pointer; transition:background var(--dur-fast) var(--ease-out),
                              transform var(--dur-fast) var(--ease-out),
                              box-shadow var(--dur-fast) var(--ease-out);
}
.btn:hover   { background:var(--color-primary-hover); transform:translateY(-1px); box-shadow:var(--shadow-sm); }
.btn:active  { transform:translateY(0); }
.btn:focus-visible { outline:2px solid var(--color-ring); outline-offset:2px; }
.btn:disabled{ background:var(--color-border-strong); color:var(--color-text-subtle);
               cursor:not-allowed; transform:none; box-shadow:none; }
.btn--ghost  { background:transparent; color:var(--color-primary); border-color:var(--color-border); }
.btn--ghost:hover { background:var(--color-surface-2); }

.card {
  background:var(--color-surface); border:1px solid var(--color-border);
  border-radius:var(--radius-lg); padding:var(--space-5); box-shadow:var(--shadow-sm);
}
.input {
  width:100%; padding:var(--space-3) var(--space-4);
  font:400 var(--fs-base)/1.4 var(--font-sans);
  color:var(--color-text); background:var(--color-surface);
  border:1px solid var(--color-border-strong); border-radius:var(--radius-md);
}
.input::placeholder { color:var(--color-text-subtle); }
.input:focus-visible { outline:2px solid var(--color-ring); outline-offset:1px; border-color:var(--color-primary); }
.input[aria-invalid="true"] { border-color:var(--color-danger); }
```
Rule: a primitive with no `:focus-visible`, no `:disabled`, or hard-coded color/px is not done.

## 11. Layout & aesthetic anti-patterns
- Cramped sections (no vertical breathing room) or, conversely, uniform spacing with no tier contrast.
- Centered multi-line paragraphs; full-bleed text with no measure constraint.
- Decoration (gradients/shadows/borders) that doesn't aid hierarchy — noise, not signal.
- Harsh pure-black `0 0 10px black` shadows; high-contrast clashing gradients.
- Inconsistent radii/shadows/spacing across components (mix of `8/12/13px` corners).
- Shrinking a desktop layout instead of reflowing for mobile; ignoring the ~360px and tablet widths.
- Removing focus outlines; motion that ignores `prefers-reduced-motion`.
- Mixing illustration styles or random stock photography with no unifying treatment.
- More than one "signature" effect competing for attention.
