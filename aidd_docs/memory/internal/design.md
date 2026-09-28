# Design

## System

- A dark, cinematic look: a fixed WebGL stage with DOM scrolling over it. Marketing visuals are procedural.
- Plain global CSS. `app/globals.css` is an import manifest whose order is the cascade order. The partials live in `app/styles/`.
- Class names stay global on purpose, because GSAP selects them.

## Tokens

- `app/styles/tokens.css`: `--bg`, `--ink`, `--muted`, `--cyan`, `--blue`, `--violet`, `--line`, `--font-display`, `--font-body`, `--font-mono`, `--spring`.
- Easing and duration tokens for choreography live in `lib/easing.js`.

## Components

- Text effects: `DecodeText`, `Reveal`, `BlurLetters`, `HoverScramble`, `Magnetic`.
- Inner-page heroes: `PageHero` with `HeroStage`, which mounts `components/ui/*-background.jsx` for the four whitelisted stages only.
- `[data-quiet]` sections raise `scrollState.focus`, and `FocusVeil` / `FocusDimmer` keep text legible over the scene.
- CRM admin forms share `components/crm/AdminFormShell.jsx`.

## Accessibility

- The target is WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and focus indicators. See `docs/visual/`.
- Every animation respects reduced motion: CSS `prefers-reduced-motion`, the `lib/motionScale.js` singleton for the canvas, and `lib/experienceFeatures.mjs` for feature gating.
