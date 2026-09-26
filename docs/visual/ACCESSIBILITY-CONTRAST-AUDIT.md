# Accessibility & Contrast Audit — crystalwebsolution.com

**Scope:** Static audit of the attached Next.js codebase, focused on WCAG 2.2 AA, keyboard access, screen-reader structure, motion, and color contrast.  
**Important limitation:** The attached mount did not allow a reliable dependency install or rendered-browser run, so dynamic contrast, browser zoom, focus visibility, WebGL fallback behavior, and real-device testing remain verification items rather than confirmed pass/fail results.

## Executive assessment

The codebase has a better-than-average accessibility foundation: semantic headings and landmarks are present, the root layout provides a skip link, the fullscreen menu manages focus and Escape, reduced-motion handling is implemented, form fields have labels and error descriptions, and form status messages use live-region semantics.

The most important unresolved risks are:

1. **Dynamic visual content can reduce legibility:** text is composited over animated WebGL, caustics, gradients, and translucent plates. Token contrast alone does not prove contrast at the brightest frame.
2. **Focus indication is not clearly guaranteed globally:** the reset removes browser defaults conceptually, while the inspected primitive stylesheet does not define a visible `:focus-visible` treatment for all links and controls.
3. **Animation can delay or obscure access to content:** `Reveal`, `SectionReveal`, `DecodeText`, the intro loader, and scroll locking create a dependency on JavaScript/timing before the page feels available.
4. **The progress indicator is intentionally `aria-hidden`:** that avoids noisy announcements, but it leaves the long homepage without an accessible equivalent for location and navigation.
5. **Some controls are visually driven rather than structurally exposed:** hover/pointer states in the hero and services need equivalent tap, keyboard, and screen-reader states.

## Contrast calculations from the current tokens

Calculated using the WCAG relative-luminance formula against the exact hex tokens in `app/styles/tokens.css`.

| Foreground | Background | Ratio | WCAG AA interpretation |
|---|---:|---:|---|
| `--ink` `#eaf2ff` | `--bg` `#04060c` | **17.99:1** | Passes normal and large text |
| `--muted` `#8b98b8` | `--bg` `#04060c` | **7.02:1** | Passes normal and large text |
| `--cyan` `#59f3ff` | `--bg` `#04060c` | **15.14:1** | Passes normal and large text |
| `--blue` `#3c6cff` | `--bg` `#04060c` | **4.61:1** | Passes normal text narrowly; verify at small sizes/anti-aliasing |
| `--violet` `#c084fc` | `--bg` `#04060c` | **7.67:1** | Passes normal and large text |
| `--ink` `#eaf2ff` | light surface `#e6e5e1` | **1.12:1** | Fails; do not use unchanged on light sections |
| `--cyan` `#59f3ff` | light surface `#e6e5e1` | **1.06:1** | Fails; current light-surface overrides must be applied consistently |
| `--blue` `#3c6cff` | light surface `#e6e5e1` | **3.48:1** | Fails normal text; only potentially suitable for large text |
| `#151612` | light surface `#e6e5e1` | **14.42:1** | Passes |
| `--bg` `#04060c` | `--cyan` `#59f3ff` button fill | **15.14:1** | Passes |
| `--bg` `#04060c` | `--blue` `#3c6cff` button fill | **4.61:1** | Passes normal text narrowly |

### Contrast conclusion

The dark token system is generally strong. The major risk is not the base dark palette; it is **foreground/background composition over animation** and **light-surface states**. `nav.css` correctly changes the nav to dark text on light surfaces, but the same treatment must be audited for every light section and interactive child.

The hero accent uses a gradient with transparent text in `app/styles/hero.css:38-45`. A gradient is not a single color, so its lightest and darkest points must be sampled against the actual animated background. Treat the gradient headline as decorative unless a non-gradient accessible text equivalent is retained.

## Detailed findings

### A11Y-01 — Critical: Dynamic background contrast is not guaranteed

**WCAG:** 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast  
**Evidence:** `components/Scene.jsx`, `app/styles/stage.css:17-55`, `app/styles/hero.css:48-83`, `app/styles/tokens.css:24-37`.

The text is layered over a fixed WebGL canvas, animated caustics, a focus veil, and local radial plates. The plates improve readability, but they are translucent and blurred. Contrast can therefore vary substantially during camera movement or the caustic animation.

**Fix:** Use a deterministic local scrim behind decision-critical copy. Keep the atmospheric plate for decoration, but add a solid/semi-opaque fallback that guarantees contrast:

```css
.hero .text-plate::before {
  background: linear-gradient(
    90deg,
    rgba(4, 6, 12, 0.94) 0%,
    rgba(4, 6, 12, 0.78) 66%,
    rgba(4, 6, 12, 0.42) 100%
  );
}

@media (prefers-reduced-transparency: reduce) {
  .hero .text-plate::before,
  .text-plate::before {
    background: rgba(4, 6, 12, 0.96);
    filter: none;
  }
}
```

Then verify the actual rendered brightest/darkest frames with axe DevTools and manual sampling.

### A11Y-02 — High: Global focus visibility is under-specified

**WCAG:** 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured  
**Evidence:** `app/styles/reset.css:16-17` resets links/buttons; `app/styles/primitives.css:51-99` styles hover states; `components/Menu.jsx:42-61` manages focus, but the inspected global CSS does not define a universal `:focus-visible` ring.

Hover treatments are not a keyboard-accessible focus treatment. The fullscreen menu correctly moves focus, but links and buttons outside the menu need a reliable visible indicator, especially over a dynamic stage.

**Fix:** Add a global focus-visible rule and ensure the fixed nav does not cover the focused target:

```css
:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
  border-radius: 4px;
}

:where(a, button, input, select, textarea, summary):focus:not(:focus-visible) {
  outline: none;
}

/* Fixed chrome must not hide keyboard targets. */
[id] {
  scroll-margin-top: 6rem;
}
```

Do not replace this with a color-only border; the outline must remain visible against both dark and light surfaces.

### A11Y-03 — High: The long homepage lacks accessible location/navigation semantics

**WCAG:** 2.4.5 Multiple Ways, 2.4.8 Location, 2.4.11 Focus Not Obscured  
**Evidence:** `components/ScrollProgress.jsx:41-45` marks the progress bar and count `aria-hidden`; `components/Experience.jsx:31-41` renders nine beats; `app/styles/nav.css:228-232` hides the count below 900px.

The decision to avoid noisy `aria-live` announcements is correct, but there is no equivalent accessible section index. A screen-reader or keyboard user has to traverse the document or open the fullscreen menu to move between in-page sections.

**Fix:** Add the persistent `JourneyNav` snippet below. It supplies real anchor links, a visible active state, and `aria-current="location"` without announcing every scroll frame.

### A11Y-04 — High: Reveal animations can hide content until JavaScript runs

**WCAG:** 1.3.1 Info and Relationships, 2.2.2 Pause/Stop/Hide, 4.1.2 Name/Role/Value  
**Evidence:** `components/Reveal.jsx:49` writes `style={{ opacity: 0 }}`; `components/SectionReveal.jsx:74-78` starts with `opacity: 0` and a clipping mask; JavaScript later reveals the content.

This is acceptable only if the script always runs and the initial hidden state does not trap users. It can fail with JS errors, delayed hydration, strict content blockers, or browser/assistive technology combinations that render the DOM before effects complete.

**Fix:** Prefer CSS-driven progressive enhancement: render content visible by default, then add a `.js` class to `<html>` before hydration and only hide/reveal when that class is present. At minimum, add a no-JS fallback and a short timeout recovery. Also test screen-reader virtual cursor navigation while the reveal is in progress.

A simpler safe fallback is:

```css
/* Default is readable. JS may opt into animation explicitly. */
.reveal,
.section-reveal {
  opacity: 1;
  clip-path: none;
  transform: none;
}

html[data-motion-ready="true"] .reveal,
html[data-motion-ready="true"] .section-reveal {
  /* component code may set animation-start styles here */
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .section-reveal {
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }
}
```

### A11Y-05 — Medium: Intro loader and scroll lock create an access delay

**WCAG:** 2.2.1 Timing Adjustable, 2.2.2 Pause/Stop/Hide  
**Evidence:** `components/Loader.jsx:38-67` locks scroll for the intro animation; `app/layout.jsx:165-169` unlocks based on session/reduced motion before hydration.

The loader is short and reduced motion bypasses it, which is good. However, a user who relies on keyboard scrolling, has a slow device, or experiences a script delay can encounter a page that appears unavailable. The loader is a `role="status"`, but its visible percentage does not update for assistive technology because the counter is `aria-hidden`.

**Fix:** Keep it under one second, provide a visible “Skip intro” button, and never block keyboard focus on the page. If keeping the loader, make the status text meaningful rather than exposing percentage churn:

```jsx
<div className="loader" role="status" aria-live="polite">
  <span className="sr-only">Preparing the site. You can skip the intro.</span>
  <button type="button" className="loader-skip" onClick={skipIntro}>
    Skip intro
  </button>
  <div aria-hidden="true">{/* decorative cube/counter */}</div>
</div>
```

### A11Y-06 — Medium: The gradient headline needs a robust text equivalent

**WCAG:** 1.4.3 Contrast (Minimum), 1.4.5 Images of Text  
**Evidence:** `app/styles/hero.css:38-45`; `components/DecodeText.jsx:29-52` splits characters and makes accent text transparent.

`DecodeText` preserves text nodes and handles reduced motion, which is positive. The accent line uses `color: transparent` with background clipping, so the visible text's contrast depends on the gradient. Keep an unstyled accessible equivalent or ensure a high-contrast mode overrides the gradient.

**Fix:** Add:

```css
@media (forced-colors: active), (prefers-contrast: more) {
  .hero-line-accent {
    background: none;
    color: CanvasText;
    filter: none;
  }
}
```

If testing reveals failures, use a visually hidden static heading equivalent and mark the animated duplicate `aria-hidden="true"`.

### A11Y-07 — Medium: Pointer-driven interactions need equivalent keyboard/touch states

**WCAG:** 2.1.1 Keyboard, 2.5.1 Pointer Gestures, 4.1.2 Name/Role/Value  
**Evidence:** `Hero.jsx:63-65` uses a click on the entire hero; `Services.jsx:155-183` uses pointer/focus handlers and data attributes to activate rows.

The hero click is decorative and does not need to be interactive, but a click handler on a large section can create unexpected behavior for some users. Service activation needs to be a real control if it reveals meaningful content.

**Fix:** Keep decorative hero pulses on the canvas only, and use explicit buttons/links for service expansion. Ensure the same action works with Enter and Space and expose `aria-expanded`/`aria-controls`.

### A11Y-08 — Medium: Light-surface navigation override is not enough to prove whole-page contrast

**WCAG:** 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast  
**Evidence:** `app/styles/nav.css:31-39` and `79-89` correctly switch nav colors when `[data-nav-tone="light"]` is intersecting.

This is a good pattern, but `--cyan`, `--ink`, and some gradient colors fail against the light surface. Any shared link, eyebrow, focus ring, or button that enters the light section must have a light-tone variant.

**Fix:** Define scoped light-surface tokens:

```css
[data-nav-tone="light"] {
  --surface-text: #151612;
  --surface-muted: #3f443d;
  --surface-accent: #075f6a;
  --surface-line: rgba(21, 22, 18, 0.28);
}

[data-nav-tone="light"] :where(p, li, a, button) {
  color: var(--surface-text);
}

[data-nav-tone="light"] .eyebrow,
[data-nav-tone="light"] .link-underline {
  color: var(--surface-accent);
}
```

Validate every interactive state, not only the resting state.

### A11Y-09 — Low/medium: Scroll progress is visually useful but non-semantic

**WCAG:** 1.3.1, 4.1.2  
**Evidence:** `components/ScrollProgress.jsx:45` uses `aria-hidden="true"` for the entire progress component.

The decision avoids repetitive announcements, but a progress bar can have a semantic representation without live updates. Consider `role="progressbar"` only if the value can be exposed accurately and does not misrepresent section progress. The preferred solution is the anchor-based `JourneyNav` below.

## Existing strengths to preserve

- `app/layout.jsx:187-194` provides a skip link and a focusable main landmark.
- `components/Menu.jsx:21-79` uses inert state, body scroll locking, Escape, Tab wrapping, and focus return.
- `components/marketing/ContactForm.jsx:160-318` has explicit labels, autocomplete, `aria-invalid`, field descriptions, errors, and status/alert messaging.
- `components/Reveal.jsx:27-30`, `components/SectionReveal.jsx:38-41`, and `app/styles/responsive.css:63-86` respect reduced motion.
- `components/Loader.jsx:29-35` bypasses the intro for reduced-motion users.
- The page uses real headings (`h1`, `h2`, `h3`) rather than styling arbitrary elements as headings.

## Implementation snippet 1: clarified hero copy

### Replace the current hero copy in `components/sections/Hero.jsx`

This keeps the animated headline, adds a direct service descriptor, makes the secondary path explicit, and preserves a normal text reading order for assistive technology.

```jsx
<div className="text-plate">
  <p className="eyebrow hero-kicker">
    <span>Web · brand · motion · automation</span>
  </p>

  <h1 className="hero-title">
    <DecodeText
      as="span"
      text="Built to be"
      speed={0.045}
      delay={introDelay + 0.1}
      className="hero-line"
    />{' '}
    <DecodeText
      as="span"
      text="unforgettable."
      speed={0.045}
      delay={introDelay + 0.5}
      className="hero-line hero-line-accent"
    />
  </h1>

  <Reveal className="hero-offer" delay={introDelay + 0.85}>
    <p>
      Websites, brand systems, motion, and AI automation for businesses ready
      to stand apart.
    </p>
  </Reveal>

  <Reveal className="hero-sub" delay={introDelay + 1}>
    <p>
      We turn the real problem into a clear digital experience — designed with
      intent, built to ship, and made to move people to action.
    </p>
  </Reveal>

  <Reveal className="hero-cta" delay={introDelay + 1.3}>
    <Magnetic>
      <a
        href="/#contact"
        className="btn btn-solid"
        onClick={(e) => e.stopPropagation()}
      >
        Start a project <span className="btn-arrow" aria-hidden="true">→</span>
      </a>
    </Magnetic>
    <a href="/#work" className="hero-secondary-link">
      See selected work <span aria-hidden="true">→</span>
    </a>
  </Reveal>

  <Reveal className="hero-stat" delay={introDelay + 1.5}>
    <p>
      <span className="hero-stat-figure">8 services</span>
      <span className="hero-stat-sep" aria-hidden="true"> · </span>
      <span>60+ projects shipped</span>
      <span className="hero-stat-sep" aria-hidden="true"> · </span>
      <span>10+ years of practice</span>
    </p>
  </Reveal>
</div>
```

Add a stable `id="work"` to the work/showcase section if the homepage currently does not expose one.

### Hero CSS additions

```css
.hero-kicker {
  margin-bottom: 1.1rem;
}

.hero-offer {
  max-width: 42rem;
  margin: 1.35rem auto 0;
  color: var(--ink);
  font-size: clamp(1.08rem, 2vw, 1.45rem);
  line-height: 1.45;
  font-weight: 500;
  text-wrap: balance;
}

.hero-sub {
  max-width: 42rem;
}

.hero-secondary-link {
  color: var(--ink);
  border-bottom: 1px solid currentColor;
  padding-block: 0.35rem;
  text-underline-offset: 0.35rem;
}

.hero-secondary-link:hover,
.hero-secondary-link:focus-visible {
  color: var(--cyan);
}

@media (min-width: 900px) {
  .hero-offer,
  .hero-sub {
    margin-left: 0;
    margin-right: 0;
  }

  .hero-cta {
    flex-direction: row;
  }
}

@media (prefers-contrast: more), (forced-colors: active) {
  .hero-line-accent {
    background: none;
    color: CanvasText;
    filter: none;
  }
}
```

## Implementation snippet 2: persistent journey navigation

### New file: `components/JourneyNav.jsx`

This uses existing homepage IDs, does not announce every scroll update, and exposes the active section to assistive technology via `aria-current="location"`.

```jsx
'use client';

import { useEffect, useState } from 'react';

const JOURNEY = [
  { id: 'hero', label: 'Intro' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'approach', label: 'How we work' },
  { id: 'stories', label: 'Client stories' },
  { id: 'work', label: 'Selected work' },
  { id: 'contact', label: 'Contact' },
];

export default function JourneyNav() {
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const sections = JOURNEY
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: '-20% 0px -62% 0px',
        threshold: [0, 0.25, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="journey-nav" aria-label="Page sections">
      <ol className="journey-nav-list">
        {JOURNEY.map(({ id, label }, index) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={activeId === id ? 'is-active' : ''}
              aria-current={activeId === id ? 'location' : undefined}
            >
              <span className="journey-nav-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Integrate it in `components/Experience.jsx`

```jsx
import JourneyNav from './JourneyNav';

export default function Experience() {
  return (
    <SmoothScroll>
      <Loader />
      <Scene />
      <FocusVeil />
      <Nav />
      <JourneyNav />
      <ScrollProgress sections />
      <main className="page">
        {/* existing sections */}
      </main>
    </SmoothScroll>
  );
}
```

### Add `app/styles/journey-nav.css` and import it in `app/globals.css`

Place the import after `nav.css` so it can intentionally extend the fixed chrome styles:

```css
/* app/globals.css */
@import './styles/journey-nav.css';
```

```css
/* app/styles/journey-nav.css */
.journey-nav {
  position: fixed;
  z-index: 450;
  left: 2vw;
  top: 50%;
  transform: translateY(-50%);
  max-width: 12rem;
}

.journey-nav-list {
  display: grid;
  gap: 0.55rem;
  list-style: none;
}

.journey-nav a {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.3rem 0.4rem;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-left: 2px solid transparent;
  transition: color 0.25s ease, border-color 0.25s ease;
}

.journey-nav a:hover,
.journey-nav a:focus-visible,
.journey-nav a.is-active {
  color: var(--ink);
  border-left-color: var(--cyan);
}

.journey-nav-index {
  color: var(--cyan);
  opacity: 0.72;
}

.journey-nav a:focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
  border-radius: 4px;
}

@media (max-width: 900px) {
  .journey-nav {
    left: 0;
    right: 0;
    top: auto;
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    transform: none;
    max-width: none;
    padding-inline: 0.75rem;
    pointer-events: none;
  }

  .journey-nav-list {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    padding: 0.55rem;
    background: rgba(4, 6, 12, 0.9);
    border: 1px solid rgba(89, 243, 255, 0.2);
    border-radius: 999px;
    backdrop-filter: blur(16px);
    scrollbar-width: none;
    pointer-events: auto;
  }

  .journey-nav-list::-webkit-scrollbar {
    display: none;
  }

  .journey-nav a {
    flex: 0 0 auto;
    border-left: 0;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    padding: 0.45rem 0.6rem;
  }

  .journey-nav a:hover,
  .journey-nav a:focus-visible,
  .journey-nav a.is-active {
    border-bottom-color: var(--cyan);
  }
}

@media (prefers-reduced-motion: reduce) {
  .journey-nav a {
    transition: none;
  }
}
```

### Required ID alignment

The current homepage already has most of these IDs through `Experience.jsx` and the section components. Confirm the following before shipping:

- `hero`
- `about`
- `services`
- `approach`
- `stories`
- `work` — add this if the homepage showcase does not already expose it
- `contact`

Add a global anchor offset so fixed chrome does not obscure the target:

```css
[id] {
  scroll-margin-top: 6rem;
}
```

## Test plan before release

### Keyboard

- Tab from the top of the page: focus is visible on every interactive element.
- Skip link becomes visible and lands on `#main-content`.
- Open menu, focus moves to first link, Tab wraps, Escape closes, focus returns to burger.
- Journey links are reachable without opening the fullscreen menu.
- Service rows and form controls work with Enter/Space and do not require hover.
- Focused anchors are not hidden behind the fixed header or mobile journey bar.

### Screen reader

- One meaningful `h1` is announced.
- Hero copy is announced in a useful order: offer → explanation → CTA.
- Decorative canvas, caustics, progress bar, and arrows are hidden from the accessibility tree.
- Journey nav exposes the current section with `aria-current="location"`.
- Form errors identify the field and the live status announces success/failure once.
- No repeated announcements occur on every scroll tick.

### Contrast and display

- Test dark hero against the brightest caustic/scene states.
- Test every light section with body copy, links, eyebrows, buttons, and focus rings.
- Test at 200% zoom and 400% zoom without loss of content or horizontal scrolling.
- Test forced-colors mode and `prefers-contrast: more`.
- Test WebGL disabled, canvas failure, JavaScript disabled, and slow network.
- Test with reduced motion and reduced transparency.

### Automated tools

Run, when dependencies are available:

```bash
pnpm build
pnpm test:marketing
npx playwright install chromium
npx playwright test
```

Then run axe DevTools or `@axe-core/playwright` against at least:

- Homepage at desktop and mobile widths
- `/services`
- `/work`
- `/contact`
- `/login`

## Priority order

1. Add guaranteed focus-visible styles.
2. Add accessible persistent journey navigation.
3. Validate and harden dynamic background contrast with deterministic text scrims.
4. Remove dependency on hidden-by-default reveal styles or provide a no-JS fallback.
5. Add keyboard/touch equivalents for service interaction.
6. Add loader skip/failure behavior and test WebGL fallback.
7. Validate light-surface theme states, forced colors, zoom, and real devices.
