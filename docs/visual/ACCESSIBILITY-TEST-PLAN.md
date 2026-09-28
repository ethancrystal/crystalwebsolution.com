# Accessibility Verification Test Plan

## Scope

This plan verifies three areas of `crystalwebsolution.com`:

1. **WebGL contrast and visual legibility** over animated backgrounds.
2. **Screen-reader compatibility** for headings, landmarks, dynamic content, forms, navigation, and decorative canvas content.
3. **Keyboard navigation** for the global menu, persistent journey navigation, service interactions, CTAs, forms, and fixed chrome.

The plan is designed for WCAG 2.2 AA verification. It should be executed against a production-like build, not only development mode, because animation timing, hydration, canvas initialization, and CSS compositing can differ.

## Preconditions

Install dependencies in a local filesystem path rather than the attached mounted path if the mount continues to produce `ENOENT` errors:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Use a running local URL such as `http://localhost:3000`.

Recommended test matrix:

| Category | Minimum coverage |
|---|---|
| Browser | Chromium, Firefox, Safari/WebKit |
| Desktop widths | 1280×800, 1440×900, 1920×1080 |
| Mobile widths | 320×844, 375×812, 390×844, 768×1024 |
| Zoom | 100%, 200%, 400% |
| Motion | Default, `prefers-reduced-motion: reduce` |
| Contrast | Default, forced colors, high contrast where available |
| Input | Keyboard only, mouse, touch, screen reader |
| Rendering | WebGL on, WebGL blocked/disabled, slow connection, JavaScript error simulation |

Recommended tools:

- axe DevTools or `@axe-core/playwright`
- Chrome DevTools Rendering panel
- Firefox Accessibility Inspector
- VoiceOver + Safari on macOS/iOS
- NVDA + Firefox or Chrome on Windows
- TalkBack + Chrome on Android
- Colour Contrast Analyser or browser pixel sampler
- Lighthouse accessibility audit as a secondary signal, not the only test

---

# Part 1 — WebGL Contrast and Legibility

## Goal

Confirm that critical text and controls remain readable during the full range of WebGL, caustic, gradient, focus-veil, and scroll states. A token-level contrast calculation is not sufficient because the visible background is composited and animated.

## Critical content to test

- Hero eyebrow
- Hero `h1`
- Hero offer descriptor
- Hero supporting copy
- Hero primary CTA
- Hero secondary CTA
- Hero proof/stat line
- Section eyebrows and headings
- Services rows, descriptions, capability chips, and `More info` links
- Stories/reviews text
- Contact heading, body copy, form labels, hints, errors, submit button, and email CTA
- Fixed header links and burger button
- Persistent `JourneyNav` links

## WCAG targets

- **1.4.3 Contrast (Minimum):** 4.5:1 for normal text, 3:1 for large text.
- **1.4.4 Resize Text:** text remains usable at 200% zoom.
- **1.4.5 Images of Text:** critical copy must not rely exclusively on a visual gradient or canvas treatment.
- **1.4.10 Reflow:** no loss of content or two-dimensional scrolling at 400% zoom for normal content.
- **1.4.11 Non-text Contrast:** controls and focus indicators need at least 3:1 against adjacent colors.
- **2.4.11 Focus Not Obscured:** focused anchors must remain visible around fixed navigation.

## Test WGL-01 — Static dark-state contrast

1. Open the homepage with WebGL enabled.
2. Pause all animations using DevTools or by setting a debugger breakpoint.
3. Sample the background immediately behind each critical text block.
4. Measure the actual text/background pair with a contrast analyzer.
5. Record the lowest ratio for each block.

**Pass criteria:**

- Normal text is at least 4.5:1.
- Large text is at least 3:1.
- UI controls, borders, icons, and focus indicators are at least 3:1 where required.
- No critical copy relies only on a glow or shadow to become readable.

## Test WGL-02 — Animated caustic contrast sweep

1. Start at the top of the homepage.
2. Record a screen capture while the hero caustics and refraction effects run.
3. Sample the hero copy at:
   - initial load
   - caustic brightest point
   - refraction progress around 25%
   - refraction progress around 50%
   - refraction progress around 75%
   - end of hero transition
4. Repeat with a slow scroll and a fast scroll.
5. Repeat at 1280×800 and 390×844.

**Pass criteria:**

- Every sampled state meets the required contrast ratio.
- Text does not become unreadable during a transient animation frame.
- The CTA remains visually distinct from the background.
- The background does not create a false focus target or make the text appear to flicker.

**If this fails:**

- Increase the opacity of the local `.text-plate` scrim.
- Use a deterministic opaque/semi-opaque fallback behind critical copy.
- Reduce scene brightness while text is active.
- Do not solve the problem only with text-shadow.

## Test WGL-03 — Light-surface states

1. Navigate through every section that uses `data-nav-tone="light"` or a light background.
2. Check header logo, login link, CTA, burger, section eyebrow, body text, links, buttons, and focus rings.
3. Test hover, focus, active, disabled, error, and selected states.
4. Measure the lowest contrast pair.

**Pass criteria:**

- Light-surface text uses a dark token, not unchanged `--ink`, `--cyan`, or `--violet`.
- `--blue` is not used for normal-size text on the light background unless the measured ratio passes.
- Focus rings remain at least 3:1 against the light surface.

## Test WGL-04 — Gradient headline and forced colors

1. Test the hero gradient headline in default mode.
2. Enable Windows High Contrast or Chromium forced-colors emulation.
3. Enable `prefers-contrast: more` if supported.
4. Confirm that the gradient text becomes a normal system text color.
5. Disable CSS background images temporarily and confirm the heading remains readable.

**Pass criteria:**

- The heading remains visible when `background-clip: text` is unsupported or overridden.
- The heading is still exposed as a real text heading to assistive technology.
- No critical information disappears because the gradient becomes transparent.

Recommended fallback:

```css
@media (forced-colors: active), (prefers-contrast: more) {
  .hero-line-accent {
    background: none;
    color: CanvasText;
    filter: none;
  }
}
```

## Test WGL-05 — Reduced motion and reduced transparency

1. Enable `prefers-reduced-motion: reduce`.
2. Reload the homepage in a fresh session.
3. Confirm the loader does not block access.
4. Confirm content is visible without waiting for reveal animations.
5. Confirm the canvas does not create distracting motion.
6. If the browser supports it, enable reduced transparency.

**Pass criteria:**

- No essential content is delayed or hidden.
- No continuous animation is required to understand the page.
- The page remains usable with the WebGL stage disabled or visually quiet.
- The focus veil/text plates become more deterministic when transparency is reduced.

## Test WGL-06 — WebGL failure and low-power fallback

Test three failure modes:

1. Disable WebGL in the browser or block the canvas context.
2. Simulate a slow CPU/GPU or throttle the device.
3. Force the scene component to throw during initialization in a local test build.

**Pass criteria:**

- Header, hero heading, offer, CTAs, services, work, contact, and form remain available.
- No blank full-screen layer blocks pointer or keyboard input.
- No loader remains permanently visible.
- The user sees a calm, usable fallback rather than an error-only state.

## Test WGL-07 — Fixed navigation and focus obscuration

1. Activate every hero, journey-nav, menu, service, and form link using Tab.
2. Check the focused target at desktop and mobile widths.
3. Follow an anchor link.
4. Confirm the heading/section is not hidden beneath the fixed header or mobile journey bar.

**Pass criteria:**

- Focus ring is visible.
- Target content is visible after scrolling.
- The fixed header and bottom journey bar do not cover the focused heading or control.

Use:

```css
[id] {
  scroll-margin-top: 6rem;
}
```

and add extra bottom scroll margin for mobile if needed.

---

# Part 2 — Screen Reader Compatibility

## Goal

Confirm that the visual narrative becomes a coherent, non-duplicated document when canvas, animation, visual progress, and decorative effects are removed from the accessibility tree.

## Screen-reader test setup

### NVDA + Firefox/Chrome

- Start NVDA.
- Use `H` to move through headings.
- Use `D` to move through landmarks.
- Use `K` or link navigation to move through links.
- Use `Tab` to test interactive controls in browse/focus mode.

### VoiceOver + Safari

- Enable VoiceOver with `Cmd+F5`.
- Use rotor headings, landmarks, links, and form controls.
- Test both Tab navigation and VoiceOver cursor navigation.

### TalkBack + Chrome

- Swipe through headings, links, controls, and landmarks.
- Confirm the fixed journey bar is not repeatedly announced as content changes.

## Test SR-01 — Document landmarks

Expected landmarks:

- Skip link
- Main content
- Site navigation/menu where open
- Page section navigation (`JourneyNav`)
- Footer/content landmarks as appropriate

**Pass criteria:**

- There is one clear main landmark.
- The skip link moves focus to `#main-content`.
- Decorative WebGL canvas and visual progress bar are not announced.
- The journey navigation has an understandable label such as `Page sections`.

## Test SR-02 — Heading hierarchy

1. Use the heading rotor/list.
2. Confirm the homepage has one meaningful `h1`.
3. Confirm sections use logical `h2`/`h3` levels.
4. Confirm animated wrappers do not create duplicate headings.

**Pass criteria:**

- The hero heading announces a useful name.
- The direct offer descriptor is announced near the heading.
- No heading is announced twice because of an animated duplicate.
- Decorative labels are not incorrectly exposed as headings.

## Test SR-03 — Hero reading order

Expected order:

1. Hero eyebrow or context label
2. Hero `h1`
3. Direct service descriptor
4. Supporting explanation
5. `Start a project`
6. `See selected work`
7. Proof/stat line

**Pass criteria:**

- The copy makes sense without seeing the WebGL scene.
- The arrow character is not announced as meaningful content; use `aria-hidden="true"`.
- The phrase “Start a project” is a clear link name.
- The stats do not read as a confusing run-on string.

## Test SR-04 — JourneyNav active state

1. Move focus to the journey navigation.
2. Activate each anchor.
3. Scroll through the page without activating links.
4. Revisit the navigation.

**Pass criteria:**

- Each link has a clear accessible name.
- The current section exposes `aria-current="location"`.
- The active state is not announced repeatedly on every animation frame.
- The navigation remains usable if IntersectionObserver is unavailable; links still function.

## Test SR-05 — Menu focus management

1. Focus the burger button.
2. Activate it.
3. Confirm focus moves to the first menu link.
4. Press Tab repeatedly until focus wraps.
5. Press Shift+Tab at the first item.
6. Press Escape.
7. Confirm focus returns to the burger button.

**Pass criteria:**

- Background content is inert or otherwise unreachable while the menu is open.
- The menu has an accessible name.
- The burger exposes `aria-expanded` and `aria-controls`.
- Closing the menu restores focus.

## Test SR-06 — Dynamic announcements

Trigger:

- Contact form validation error
- Contact form success
- Contact form network error
- hCaptcha unavailable
- Any CRM real-time status update

**Pass criteria:**

- Errors use an alert or clearly associated live region.
- Success is announced once.
- Status updates do not interrupt the user unnecessarily.
- The scroll progress bar does not announce every frame.

## Test SR-07 — Form semantics

For each field:

- Name
- Email
- Company
- Budget
- Project brief
- hCaptcha
- Submit button

**Pass criteria:**

- Every field has a visible label.
- Required/optional status is understandable.
- Invalid fields expose `aria-invalid="true"`.
- Error text is connected through `aria-describedby`.
- The submit status has an appropriate `role` and `aria-live` behavior.
- The direct email fallback is reachable when hCaptcha cannot load.

## Test SR-08 — Decorative content

Confirm these are hidden from the accessibility tree where appropriate:

- WebGL canvas
- Caustic rays
- Refraction sweep
- Decorative arrows
- Visual scroll line
- Gradient/particle effects
- Icon-only decoration

Use `aria-hidden="true"` only for truly decorative elements; never apply it to a container that contains interactive or meaningful text.

---

# Part 3 — Keyboard Navigation

## Goal

Confirm that all functionality is available without a mouse, hover, pointer movement, or touch gesture.

## Test KB-01 — Focus order from first paint

1. Reload with cache disabled.
2. Press Tab from the browser address bar into the page.
3. Record the focus order.

Expected early order:

1. Skip link
2. Logo/home link
3. Start a project CTA
4. Log in if enabled
5. Menu button
6. Hero CTA(s)
7. Journey navigation
8. Section links and controls in reading order

**Pass criteria:**

- Focus order follows the visual/document order.
- No hidden menu links receive focus while the menu is closed.
- No focusable element is trapped behind the canvas or loader.

## Test KB-02 — Focus visibility

For every link, button, input, select, textarea, summary, and custom control:

1. Focus it with Tab.
2. View it against the current background.
3. Test focus over dark and light surfaces.
4. Test at 200% zoom.

Recommended baseline:

```css
:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
  border-radius: 4px;
}
```

**Pass criteria:**

- Focus is visible without relying on color alone.
- Focus indicator has at least 3:1 contrast against adjacent colors.
- Focus is not clipped by overflow or hidden by fixed chrome.

## Test KB-03 — Fullscreen menu

Run the SR-05 focus sequence using keyboard only. Also verify:

- Space and Enter activate the burger.
- Escape closes it.
- Tab does not escape to the page behind it.
- The menu remains usable at 320px width and 400% zoom.

## Test KB-04 — JourneyNav

1. Tab to the first journey link.
2. Use Enter to navigate.
3. Confirm target position.
4. Tab through each link.
5. Use Shift+Tab in reverse.
6. Test the horizontal mobile journey bar with keyboard.

**Pass criteria:**

- Every link is a native anchor.
- No custom click-only interaction is required.
- The current item has a visible and semantic active state.
- Horizontal overflow does not prevent keyboard focus from scrolling into view.

## Test KB-05 — Services

If service rows reveal content:

1. Tab to each row trigger.
2. Press Enter and Space.
3. Confirm `aria-expanded` changes.
4. Confirm the associated detail panel is exposed/hidden correctly.
5. Tab into links inside the expanded panel.

Required shape:

```jsx
<button
  type="button"
  aria-expanded={isOpen}
  aria-controls={`service-detail-${slug}`}
>
  {title}
</button>

<div id={`service-detail-${slug}`} hidden={!isOpen}>
  {/* details */}
</div>
```

## Test KB-06 — Forms

1. Complete the form without a mouse.
2. Leave required fields empty and submit.
3. Confirm errors are visible and associated.
4. Correct each error.
5. Submit with hCaptcha available and unavailable.
6. Confirm focus is placed reasonably after an error or status change.

**Pass criteria:**

- Native controls are used where possible.
- No field depends on a pointer animation.
- Error messages do not disappear before the user can read them.
- The submit button communicates submitting state without trapping focus.

## Test KB-07 — Zoom and reflow

At 200% and 400% zoom:

- Navigate the page using Tab.
- Open and close the menu.
- Use JourneyNav.
- Complete the form.
- Confirm no critical text is clipped.
- Confirm the mobile journey bar does not cover form controls.

---

# Complete JourneyNav implementation

## 1. Create `components/JourneyNav.jsx`

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
        // Select the section occupying the useful reading band, not merely
        // one that clips the viewport edge.
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
        {JOURNEY.map(({ id, label }, index) => {
          const isActive = activeId === id;

          return (
            <li key={id}>
              <a
                href={`#${id}`}
                className={isActive ? 'is-active' : undefined}
                aria-current={isActive ? 'location' : undefined}
              >
                <span className="journey-nav-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

## 2. Integrate in `components/Experience.jsx`

Add the import:

```jsx
import JourneyNav from './JourneyNav';
```

Render it alongside the existing fixed chrome:

```jsx
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
        <Hero />
        <SectionHandoff from="top" tone="cyan" label="about">
          <About />
        </SectionHandoff>
        <SectionHandoff from="left" tone="cyan" label="services">
          <Services />
        </SectionHandoff>
        <Approach />
        <SectionHandoff from="right" tone="ink" label="stories">
          <Stories />
        </SectionHandoff>
        <Mark />
        <Lab />
        <Motion />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
```

## 3. Verify or add the required IDs

The component expects these IDs:

```text
hero
about
services
approach
stories
work
contact
```

The current section components already expose most of the homepage IDs. Confirm them in the rendered DOM. If the homepage showcase is not `id="work"`, add the ID to its outer section:

```jsx
<section id="work" className="showcase section" aria-labelledby="work-title">
  {/* existing showcase content */}
</section>
```

If there is no homepage work section, either add one or remove the `work` entry from `JOURNEY`; do not leave a broken anchor.

## 4. Create `app/styles/journey-nav.css`

```css
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

## 5. Import the stylesheet

In `app/globals.css`, add the import after `nav.css`:

```css
@import './styles/nav.css';
@import './styles/journey-nav.css';
```

## 6. Add anchor offsets

Because the site has fixed top and mobile bottom chrome, add:

```css
[id] {
  scroll-margin-top: 6rem;
}

@media (max-width: 900px) {
  [id] {
    scroll-margin-top: 5rem;
    scroll-margin-bottom: 5rem;
  }
}
```

## 7. Add a global focus treatment

The journey navigation should not be the only component with a focus ring. Add this to `app/styles/primitives.css` or a dedicated accessibility stylesheet:

```css
:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
  border-radius: 4px;
}

:where(a, button, input, select, textarea, summary):focus:not(:focus-visible) {
  outline: none;
}
```

## 8. Add graceful fallback if IntersectionObserver is unavailable

Native anchors must remain functional even if the active-state observer cannot run. For older or restricted browsers, the links still work because the component uses regular `<a href="#section">` elements. If needed, guard explicitly:

```jsx
if (!('IntersectionObserver' in window)) return undefined;
```

Do not replace the anchors with click-only buttons.

---

# Release acceptance criteria

The implementation is ready when all of the following are true:

- Critical text remains readable throughout the WebGL animation sweep.
- Dark and light surfaces pass measured contrast checks in resting, hover, focus, and active states.
- Forced-colors mode does not make gradient text transparent.
- The page is understandable with canvas hidden.
- Screen readers find one useful `h1`, logical section headings, labeled landmarks, and no decorative noise.
- The menu traps focus correctly while open and restores focus when closed.
- JourneyNav links work with Enter and remain usable on the horizontal mobile bar.
- `aria-current="location"` identifies the active section without live-announcing every scroll update.
- Every interactive element has a visible keyboard focus state.
- The loader, WebGL failure state, and reveal effects cannot prevent access to core content.
- Tests pass at desktop/mobile widths, 200%/400% zoom, reduced motion, forced colors, and keyboard-only input.
