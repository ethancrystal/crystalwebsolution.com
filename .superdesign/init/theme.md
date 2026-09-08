# Theme

## Compact token summary

| Token | Value |
|---|---|
| --bg | #04060c |
| --ink | #eaf2ff |
| --muted | #8b98b8 |
| --cyan | #59f3ff |
| --blue | #3c6cff |
| --violet | #c084fc |
| --line | rgba(139, 152, 184, 0.18) |
| --font-display | Space Grotesk |
| --font-body | Inter |
| --font-mono | Space Mono |

Type: service H1 is Space Grotesk, clamp from page-title, max-width 16ch, text-wrap balance.
No Tailwind. CSS lives in app/styles/*.css imported by app/globals.css.

## Raw source


### `app/styles/tokens.css`

```css
/* ---------- design tokens ---------- */
:root {
  --bg: #04060c;
  --ink: #eaf2ff;
  --muted: #8b98b8;
  --cyan: #59f3ff;
  --blue: #3c6cff;
  --violet: #c084fc;
  --line: rgba(139, 152, 184, 0.18);
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Space Mono', monospace;

  /* Physics spring for micro-interactions: overshoots ~8% then settles,
     matching the mass-spring-damper feel of the 3D emblem springs
     (ServiceRail/ApproachCompass). Baseline-widely-available linear();
     unsupported browsers fall back to the plain easing declared before it. */
  --spring: linear(
    0, 0.062 2.3%, 0.24 4.9%, 0.508 7.9%, 0.914 12.2%, 1.056 14.7%,
    1.095 16.3%, 1.098 17.9%, 1.073 20.4%, 0.99 25.7%, 0.963 29%,
    0.968 32.6%, 1.005 41.7%, 1.011 46.9%, 0.998 61.4%, 1
  );

  /* --- foreground prominence upgrade --- */
  --text-lift: 0 1px 2px rgba(2, 4, 8, 0.7), 0 14px 44px rgba(2, 4, 8, 0.5);
  --plate: radial-gradient(
    120% 110% at 28% 50%,
    rgba(4, 7, 13, 0.72) 0%,
    rgba(4, 7, 13, 0.34) 52%,
    rgba(4, 7, 13, 0) 72%
  );
  --plate-centered: radial-gradient(
    90% 130% at 50% 50%,
    rgba(4, 7, 13, 0.7) 0%,
    rgba(4, 7, 13, 0.32) 55%,
    rgba(4, 7, 13, 0) 75%
  );
}
```


### `app/globals.css`

```css
/* ----------------------------------------------------------------------
   globals.css — import manifest only.

   Every rule lives in app/styles/*.css. The import order below IS the
   cascade order and reproduces the original single-file order exactly, so
   the resolved stylesheet is byte-identical to the pre-split file. Adding
   a stylesheet means inserting its import where it should cascade.

   Class names stay global on purpose: Menu.jsx, Services.jsx and
   WorkLibrary.jsx select nodes via querySelectorAll('.menu-link'),
   '.service-row' and '.work-row', and GSAP animates those same names.
   CSS Modules would hash them and silently break the animations.
   ---------------------------------------------------------------------- */

@import './styles/tokens.css';
@import './styles/skip-link.css';
@import './styles/reset.css';
@import './styles/stage.css';
@import './styles/primitives.css';
@import './styles/loader.css';
@import './styles/section-skeleton.css';
@import './styles/nav.css';
@import './styles/hero.css';
@import './styles/services.css';
@import './styles/showcase.css';
@import './styles/stories.css';
@import './styles/motion.css';
@import './styles/lab.css';
@import './styles/about.css';
@import './styles/contact.css';
@import './styles/subpages.css';
@import './styles/responsive.css';
@import './styles/approach.css';
@import './styles/review-cards.css';
@import './styles/service-pages.css';
@import './styles/border-glow.css';
@import './styles/refraction.css';
@import './styles/case-study.css';
@import './styles/consent.css';
@import './styles/review-carousel.css';
@import './styles/marquee-corridor.css';
@import './styles/auth.css';
```


### `app/styles/service-pages.css`

```css
/* ---------- recognition ---------- */
.recognition-list { border-top: 1px solid var(--line); margin-bottom: 4rem; }
.recognition-row-inner {
  width: 100%;
  display: grid;
  grid-template-columns: 5rem 1fr 1fr;
  gap: 2rem;
  align-items: baseline;
  padding: 1.8rem 0;
  border-bottom: 1px solid var(--line);
  text-align: left;
  background: linear-gradient(90deg, rgba(192, 132, 252, 0), rgba(192, 132, 252, 0));
  transition: background 0.4s, border-color 0.4s;
}
.recognition-row-inner:hover,
.recognition-row-inner:focus-visible {
  background: linear-gradient(90deg, rgba(192, 132, 252, 0.1), transparent 72%);
  border-color: rgba(192, 132, 252, 0.62);
}
.recognition-row-inner:focus-visible { outline: 1px solid var(--violet); outline-offset: 5px; }
.recognition-year-wrap { display: inline-block; font-size: 0.75rem; height: 1.15em; overflow: hidden; vertical-align: top; }
.recognition-year-stack {
  display: flex;
  flex-direction: column;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.recognition-row-inner:hover .recognition-year-stack,
.recognition-row-inner:focus-visible .recognition-year-stack { transform: translateY(-1.15em); }
.recognition-year { font-family: var(--font-mono); font-size: 0.75rem; color: var(--cyan); line-height: 1.15em; }
.recognition-year-dup { color: var(--violet); }
.recognition-name {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 2.2vw, 1.5rem);
  transition: color 0.3s;
}
.recognition-row-inner:hover .recognition-name,
.recognition-row-inner:focus-visible .recognition-name { color: var(--violet); }
.recognition-body { color: var(--muted); font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.06em; }
.recognition-marquee { margin-top: 1rem; }

@media (max-width: 900px) {
  .recognition-row-inner { grid-template-columns: 3rem 1fr; gap: 1.25rem; }
  .recognition-body { grid-column: 2; }
}

@media (prefers-reduced-motion: reduce) {
  .recognition-year-stack { transition: none; }
}

/* ============================================================
   Marketing inner-page system (scoped under .mkt-* — does not
   touch CRM routes, homepage WebGL, or auth surfaces)
   ============================================================ */
.mkt-shell {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.mkt-main { flex: 1 0 auto; }

/* --- header / footer --- */
.mkt-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem clamp(1.25rem, 5vw, 4rem);
  background: rgba(4, 7, 13, 0.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.mkt-logo { display: inline-flex; align-items: center; gap: 0.5rem; }
.mkt-logo .nav-logo-art { width: clamp(4.75rem, 9vw, 7rem); height: clamp(3.25rem, 6vw, 4.75rem); }
.mkt-logo-monogram {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--cyan);
  letter-spacing: 0.04em;
}
.mkt-logo-name { font-family: var(--font-display); font-size: 0.95rem; color: var(--ink); }
.mkt-header-nav { display: flex; align-items: center; gap: clamp(0.75rem, 2vw, 1.6rem); }
.mkt-header-nav a { color: var(--muted); font-size: 0.92rem; transition: color 0.2s; }
.mkt-header-nav a:hover, .mkt-header-nav a:focus-visible { color: var(--ink); }
.mkt-header-login { color: var(--cyan) !important; }

.mkt-footer {
  margin-top: auto;
  padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4rem) 2rem;
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(4,7,13,0) 0%, rgba(4,7,13,0.6) 100%);
}
.mkt-footer-top { display: flex; flex-wrap: wrap; gap: 2.5rem; justify-content: space-between; }
.mkt-footer-logo { display: inline-block; margin-bottom: 0.9rem; }
.mkt-footer-logo .nav-logo-art { width: clamp(5.5rem, 10vw, 8rem); height: clamp(3.75rem, 6.9vw, 5.4rem); }
.mkt-footer-tagline { color: var(--cyan); font-size: 0.9rem; margin-bottom: 0.5rem; }
.mkt-footer-statement { color: var(--muted); max-width: 32ch; font-size: 0.9rem; }
.mkt-footer-label { color: var(--muted); font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.6rem; }
.mkt-footer-nav, .mkt-footer-contact { display: flex; flex-direction: column; gap: 0.45rem; }
.mkt-footer-nav a, .mkt-footer-contact a { color: var(--ink); font-size: 0.92rem; }
.mkt-footer-nav a:hover, .mkt-footer-contact a:hover { color: var(--cyan); }
.mkt-footer-city { color: var(--muted); font-size: 0.85rem; }
.mkt-footer-bottom { margin-top: 2.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; color: var(--muted); font-size: 0.8rem; }
.mkt-footer-legal { display: flex; gap: 1.25rem; }
.mkt-footer-legal a { color: var(--muted); font-size: 0.8rem; }
.mkt-footer-legal a:hover { color: var(--cyan); }

/* --- hero / sections --- */
.mkt-hero, .mkt-section { padding: clamp(2.5rem, 7vw, 6rem) clamp(1.25rem, 5vw, 4rem); }
.mkt-section--alt { background: linear-gradient(180deg, rgba(60,108,255,0.05), rgba(192,132,252,0.04)); }
.mkt-section-inner { max-width: 78rem; margin: 0 auto; }
/* Longer SEO H1s stay in the primary reading zone: cap width, kill the
   work-page 4.5rem title gap, and keep the 3D instrument beside the copy
   on desktop (the CSS comment on .mkt-service-hero-emblem already asked
   for this; the markup had stacked it under the lede). */
.mkt-hero-title {
  margin-top: 0.4rem;
  margin-bottom: 0.2em;
  max-width: 16ch;
  text-wrap: balance;
}
.mkt-hero-lede { color: var(--muted); font-size: clamp(1rem, 2vw, 1.25rem); max-width: 52ch; margin-top: 1rem; }
.mkt-service-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: end;
}
@media (min-width: 860px) {
  .mkt-service-hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding-right: clamp(1.25rem, 5vw, 4rem);
  }
  .mkt-service-hero .mkt-hero { padding-right: 0; }
  .mkt-service-hero-instrument { padding: clamp(2.5rem, 7vw, 6rem) 0; }
}
.mkt-service-hero-instrument { justify-self: start; }
.mkt-section-title { margin-top: 0.5rem; font-family: var(--font-display); font-size: clamp(1.5rem, 3.5vw, 2.4rem); }
.mkt-prose { color: var(--ink); font-size: 1.05rem; line-height: 1.7; max-width: 64ch; }
.mkt-prose + .mkt-prose { margin-top: 1rem; }
/* Inline links inherit color+no-underline from the global `a` reset, making
   them indistinguishable from surrounding text. Give body-copy links a
   visible treatment, matching the existing .mkt-contact-alt a color. */
.mkt-prose a, .case-body a { color: var(--cyan); text-decoration: underline; text-underline-offset: 0.2em; }
.mkt-prose a:hover, .case-body a:hover { color: var(--ink); }

.mkt-breadcrumb { display: flex; gap: 0.5rem; align-items: center; padding: 1rem clamp(1.25rem, 5vw, 4rem) 0; color: var(--muted); font-size: 0.82rem; }
.mkt-breadcrumb a:hover { color: var(--cyan); }
.mkt-breadcrumb [aria-current="page"] { color: var(--ink); }

.mkt-inner { max-width: 78rem; margin: 0 auto; }

/* --- lists --- */
.mkt-list { list-style: none; display: grid; gap: 0.75rem; margin-top: 1.25rem; }
.mkt-list li { position: relative; padding-left: 1.6rem; color: var(--ink); }
.mkt-list li::before { content: '✦'; position: absolute; left: 0; color: var(--cyan); }
.mkt-list-detail { color: var(--muted); }
.mkt-list-note { margin-top: 1rem; color: var(--muted); font-size: 0.85rem; font-style: italic; }
.mkt-steps { list-style: none; display: grid; gap: 1rem; margin-top: 1.25rem; counter-reset: step; }
.mkt-step { display: flex; gap: 1rem; align-items: baseline; padding: 1rem 0; border-top: 1px solid var(--line); }
.mkt-step-index { font-family: var(--font-mono); color: var(--cyan); font-size: 0.95rem; }
.mkt-step-title { font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.25rem; }
.mkt-step-text { color: var(--muted); }
.mkt-steps--wide .mkt-step-body { max-width: 60ch; }
.mkt-step-title { color: var(--ink); }
.mkt-step-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-top: 0.5rem; font-size: 0.78rem; letter-spacing: 0.04em; }
.mkt-step-duration { color: var(--cyan); }
.mkt-step-deliverable { color: var(--muted); }

/* --- faq --- */
.mkt-faq { display: grid; gap: 1rem; margin-top: 1.25rem; }
.mkt-faq-item { padding: 1.25rem; border: 1px solid var(--line); border-radius: 14px; background: rgba(255,255,255,0.02); }
.mkt-faq-item dt { color: var(--ink); font-family: var(--font-display); font-size: 1.05rem; margin-bottom: 0.5rem; }
.mkt-faq-item dd { color: var(--muted); line-height: 1.6; }

/* --- service index grid --- */
.mkt-service-grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
.mkt-service-card { border: 1px solid var(--line); border-radius: 16px; background: rgba(255,255,255,0.02); transition: transform 0.25s; }
.mkt-service-card:hover { transform: translateY(-3px); }
@media (prefers-reduced-motion: reduce) {
  .mkt-service-card { transition: none; }
  .mkt-service-card:hover { transform: none; }
}
.mkt-service-card-link { position: relative; z-index: 2; display: block; padding: 1.5rem; color: var(--ink); }
.mkt-service-card-n { font-family: var(--font-mono); color: var(--cyan); font-size: 0.85rem; }
.mkt-service-card-title { font-family: var(--font-display); font-size: 1.4rem; margin: 0.4rem 0 0.6rem; }
.mkt-service-card-desc { color: var(--muted); font-size: 0.92rem; line-height: 1.55; }
.mkt-service-card-cta { display: inline-block; margin-top: 1rem; color: var(--cyan); font-size: 0.9rem; }

/* --- related + principles --- */
.mkt-related { list-style: none; display: grid; gap: 0.75rem; margin-top: 1.25rem; }
.mkt-related-link { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border: 1px solid var(--line); border-radius: 12px; color: var(--ink); transition: border-color 0.2s; }
.mkt-related-link:hover { border-color: rgba(89,243,255,0.4); }
.mkt-related-n { font-family: var(--font-mono); color: var(--cyan); }
.mkt-related-title { font-family: var(--font-display); font-size: 1.1rem; flex: 1; }
.mkt-related-arrow { color: var(--cyan); }

.mkt-principles-wrap { display: flex; gap: 2rem; align-items: flex-start; margin-top: 1.5rem; }
.mkt-principles { list-style: none; display: grid; gap: 1.5rem; margin-top: 0; flex: 1; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.mkt-principle-title { font-family: var(--font-display); font-size: 1.2rem; color: var(--ink); margin-bottom: 0.5rem; }
.mkt-principle-body { color: var(--muted); line-height: 1.6; }

/* ===================================================================
   FoundingRail — About page only (components/marketing/FoundingRail.jsx)
   Small vertical "founded -> Today" rail shown beside .mkt-principles.
   Do not extend for other pages; keep this block self-contained.
   =================================================================== */
.founding-rail {
  position: relative;
  flex-shrink: 0;
  width: 2.5rem;
  min-height: 11rem;
  display: none;
}
@media (min-width: 720px) {
  .founding-rail { display: block; }
}
.founding-rail-line {
  position: absolute;
  left: 50%;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 1px;
  margin-left: -0.5px;
  background: var(--line);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
.founding-rail.is-visible .founding-rail-line {
  transform: scaleY(1);
}
.founding-rail-tick {
  position: absolute;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  opacity: 0;
  transition: opacity 0.5s ease 0.5s;
}
.founding-rail.is-visible .founding-rail-tick {
  opacity: 1;
}
.founding-rail-tick-start { top: 0; transform: translateX(-50%); }
.founding-rail-tick-end { bottom: 0; transform: translateX(-50%); }
.founding-rail-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 8px rgba(89, 243, 255, 0.5);
}
.founding-rail-tick-end .founding-rail-dot {
  background: var(--violet, #c084fc);
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.5);
}
.founding-rail-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .founding-rail-line {
    transition: none;
    transform: scaleY(1);
  }
  .founding-rail-tick {
    transition: none;
    opacity: 1;
  }
}
/* --- end FoundingRail --- */

/* ===================================================================
   ServiceThreadArc — Services page only (components/marketing/ServiceThreadArc.jsx)
   Dashed arc + node motif above the "Pick a thread" header, evoking the
   eight connected services listed in ServiceGrid. Draws in once on
   scroll-into-view via stroke-dashoffset. Do not extend for other pages.
   =================================================================== */
.service-thread-arc {
  width: 100%;
  max-width: 26rem;
  margin: 0 0 0.75rem;
}
.service-thread-arc svg {
  display: block;
  width: 100%;
  height: auto;
}
.service-thread-arc-path {
  stroke: var(--cyan);
  stroke-width: 1;
  stroke-dasharray: 0.02 0.02;
  stroke-dashoffset: 1;
  opacity: 0.55;
  transition: stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1);
}
.service-thread-arc.is-visible .service-thread-arc-path {
  stroke-dashoffset: 0;
}
.service-thread-arc-node {
  fill: var(--line);
  opacity: 0;
  transition: opacity 0.4s ease 0.6s, fill 0.4s ease 0.6s;
}
.service-thread-arc.is-visible .service-thread-arc-node {
  opacity: 1;
  fill: var(--cyan);
}
@media (prefers-reduced-motion: reduce) {
  .service-thread-arc-path {
    transition: none;
    stroke-dashoffset: 0;
  }
  .service-thread-arc-node {
    transition: none;
    opacity: 1;
    fill: var(--cyan);
  }
}
/* --- end ServiceThreadArc --- */

/* --- contact --- */
.mkt-contact-wrap { margin-top: 1.5rem; max-width: 52rem; }
.mkt-contact-alt { margin-top: 1.25rem; color: var(--muted); }
.mkt-contact-alt a { color: var(--cyan); }
.mkt-contact-direct { list-style: none; display: grid; gap: 0.75rem; margin-top: 1rem; }
.mkt-contact-direct li { display: flex; gap: 1rem; align-items: baseline; }
.mkt-contact-label { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; min-width: 5rem; }
.mkt-contact-city { display: flex; flex-direction: column; gap: 0.3rem; }
.mkt-contact-direct a { color: var(--ink); }
.mkt-contact-direct a:hover { color: var(--cyan); }

/* --- responsive --- */
@media (max-width: 720px) {
  .mkt-header-nav { gap: 0.75rem; }
  .mkt-header-nav a:not(.btn) { display: none; }
  .mkt-footer-top { flex-direction: column; gap: 1.75rem; }
}

/* Scope the existing contact-form styles to the marketing variant so the
   extracted form keeps its look without leaking onto CRM surfaces. */
.mkt-contact-wrap .contact-form { width: 100%; }

/* --- service emblem (shared mark tying inner pages to the homepage rail) --- */
.mkt-emblem { display: inline-flex; align-items: center; gap: 0.5rem; }
.mkt-emblem svg { display: block; width: 100%; height: 100%; overflow: visible; }
.mkt-emblem--3d { position: relative; display: block; }
.mkt-emblem--placeholder { display: block; width: 100%; height: 100%; min-height: 120px; border-radius: 14px; background: rgba(60,108,255,0.06); }

/* The per-signal SVG strokes reuse the brand palette so the mark reads as a
   child of the homepage system, not a foreign icon set. */
.em-stroke { fill: none; stroke: var(--cyan); stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
.em-faint { stroke: var(--muted); stroke-width: 1.6; }
.em-accent { stroke: var(--iris, #c084fc); stroke-width: 2.4; }
.em-dot { fill: var(--cyan); stroke: none; }

/* The numeral is the homepage card identity carried onto the inner page. */
.mkt-emblem-n {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--cyan);
  letter-spacing: 0.04em;
}

/* Hero placement: one large 3D emblem beside the page title. */
.mkt-service-hero-emblem { width: clamp(140px, 22vw, 220px); height: clamp(140px, 22vw, 220px); margin-top: 1.25rem; }
@media (min-width: 860px) {
  .mkt-service-hero-emblem { margin-top: 0; }
}
.mkt-emblem3d { width: 100%; height: 100%; min-height: 120px; position: relative; }

/* Click-to-reveal blurb on the 3D service emblem (hero). */
.mkt-em-tooltip-toggle {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid var(--rail-accent, #3c6cff);
  background: rgba(4, 7, 13, 0.72);
  color: var(--ink);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
}
.mkt-em-tooltip-toggle:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}
.mkt-em-tooltip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.5rem;
  margin: 0 auto;
  max-width: 22rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(12, 20, 48, 0.92);
  color: #eaf2ff;
  font-size: 0.85rem;
  line-height: 1.4;
  box-shadow: 0 12px 30px rgba(8, 14, 38, 0.35);
}
.mkt-em-tooltip__text { margin: 0; }

/* Grid card emblem: small static SVG mark above the title. */
.mkt-service-card-emblem { width: 44px; height: 44px; margin-bottom: 0.75rem; }
```


### `lib/easing.js`

```js
// Named easing/duration tokens — the Approach/Recognition choreography reads
// off these instead of inline magic numbers, so timing stays intentional.
export const EASE_OVERSHOOT = 'back.out(1.7)';
export const EASE_SETTLE = 'power3.out';
export const EASE_SNAP = 'power4.out';
export const EASE_MASK = 'power4.out';

export const DURATION_FAST = 0.2;
export const DURATION_NORMAL = 0.5;
export const DURATION_SLOW = 0.9;
export const DURATION_CINEMATIC = 1.3;

export const STAGGER_TIGHT = 0.035;
export const STAGGER_ROW = 0.065;
```

