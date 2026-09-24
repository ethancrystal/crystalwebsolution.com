# Plan: scope the animated stage background to the hero, main pages only

Branch: `claude/background-animation-scope-ca6dad` (currently identical to `main`).
Status: implemented 2026-09-22 in v1.44 (commit on this branch); verified in the
browser at 1440x900 and green on CI.

## Findings (verified against live code)

1. **Why it covers the whole page.** Every stage module rendered by
   `components/ui/dark-page-background.jsx` (`acid-squares`, `dot-field`,
   `faulty-terminal`, `letter-glitch`, plus the `.alive-overlay` orb layer inside
   `dark-page-background.jsx` itself) uses `position: fixed; inset: 0; z-index: 0`.
   Fixed = viewport-sized and follows scroll, so it appears behind every section.
2. **Why it is on inner pages.** `components/marketing/SubpageExperience.jsx`
   mounts `<DarkPageBackground interactive={marketingStageBackground(sceneVariant)} />`
   unconditionally, and `marketingStageBackground()` falls back to `'acid-squares'`
   for any unknown/missing variant. `MarketingShell` (and therefore the stage) is
   used by 13 routes:
   - main pages: `/about`, `/services`, `/process`, `/contact`
   - inner pages that should NOT have it: `/services/[slug]`, `/work`, `/work/[slug]`,
     `/blog`, `/blog/[slug]`, `/reviews`, `/privacy`, `/terms`,
     `/embroidery-screen-printing-web-design`
3. **Homepage** (`/`) does not use `DarkPageBackground`; it uses the WebGL crystal
   `Scene.jsx`, which is the core homepage design (camera journey). Do not touch it.
4. **Auth pages** (`/login`, `/signup`, `/forgot-password`, `/auth/*`) also mount
   `DarkPageBackground` but are single-screen forms with no hero/section-2 split.
   Leave them as-is (out of scope; flag to owner in the recap).
5. Hero markup: `components/marketing/PageHero.jsx` renders `<section className="mkt-hero">`.
   CSS in `app/styles/service-pages.css:116-122` (`.mkt-hero` has `min-height: min(68vh, 40rem)`
   and padding). `.mkt-shell` is `position: relative; z-index: 2; background: transparent`.
   The nav (`SubpageNav`) is a fixed header; `.mkt-hero` starts below it in flow, so a stage
   painted inside `.mkt-hero` starts "just below header" and ends where section 2 begins.
   `PageHero` is a server component; `SectionReveal` is client.

## Implementation steps

1. **`components/marketing/SubpageExperience.jsx`**
   - Remove the `<DarkPageBackground …/>` mount from the shell.
   - Gate on the variant map, not a separate route list. As shipped,
     `marketingStageBackground(sceneVariant)` returns
     `MARKETING_STAGE_BACKGROUNDS[sceneVariant] ?? null`, with no fallback.
     The map is the route gate because every route declares its own variant
     or none. `/services` uses `services` and `/services/[slug]` uses its own
     `service-detail`, so an index and its detail pages can never collide.
     `/privacy` and `/terms` pass no `sceneVariant` and get `null`.
     `tests/marketing-stage-background.test.mjs` pins all three rules.
   - Provide the variant via a small React context (static config, not per-frame, so
     context is fine): `StageContext` with value `marketingStageBackground(sceneVariant)`.
     Put the context in a new client file `components/marketing/StageContext.jsx`
     (`'use client'`, exports `StageProvider`, `useStage`).
2. **New client component `components/marketing/HeroStage.jsx`** (`'use client'`):
   reads `useStage()`; if null renders nothing; else renders
   `<div className="mkt-hero-stage" aria-hidden="true"><DarkPageBackground interactive={stage} /></div>`
   with `DarkPageBackground` loaded via `next/dynamic({ ssr:false })` (move that dynamic
   import here from SubpageExperience).
3. **`components/marketing/PageHero.jsx`**: render `<HeroStage />` as the first child of
   `<section className="mkt-hero">`, before `.text-plate`.
4. **CSS, `app/styles/service-pages.css`** (next to `.mkt-hero`):
   ```css
   .mkt-hero { position: relative; overflow: hidden; isolation: isolate; }
   .mkt-hero > .text-plate { position: relative; z-index: 1; }
   .mkt-hero-stage { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
   /* override the modules' viewport-fixed wrappers so they fill the hero box only */
   .mkt-hero-stage .acid-squares-bg,
   .mkt-hero-stage .dot-field-bg,
   .mkt-hero-stage .faulty-terminal-bg,
   .mkt-hero-stage .letter-glitch-bg,
   .mkt-hero-stage .prism-bg,
   .mkt-hero-stage .ripple-grid-bg,
   .mkt-hero-stage .liquid-ether-bg,
   .mkt-hero-stage .alive-overlay { position: absolute !important; }
   ```
   Specificity alone does not settle this. styled-jsx appends its scope class to
   each module's `position: fixed` rule, making it (0,2,0). That ties these
   two-class selectors, and dynamic import makes source order unreliable. So
   the shipped rule uses `!important`, confined to these descendant selectors so
   the auth pages keep their full-viewport modules. Verify each
   module's outer wrapper class name with grep before finalising the list (the first four
   are confirmed: `acid-squares-bg`, `dot-field-bg`, `faulty-terminal-bg`, `letter-glitch-bg`).
   The canvases size themselves from the container's `getBoundingClientRect()`, so they will
   fill the hero box. Mouse listeners are on `window` and convert with `rect`, so still fine.
   Check the `.alive-orb` sizes (vw-based) still look sane inside a shorter box; if not,
   scale them down under `.mkt-hero-stage`. Also add a soft bottom fade so section 2 starts
   cleanly: `.mkt-hero-stage::after { content:''; position:absolute; inset:auto 0 0 0; height:22%; background:linear-gradient(to bottom, transparent, var(--bg)); }`.
5. **Inner pages**: with the null fallback, `/services/[slug]`, `/work*`, `/blog*`,
   `/reviews`, `/privacy`, `/terms`, embroidery page render no stage. `/privacy` and
   `/terms` currently pass `sceneVariant="about"` — change both to omit `sceneVariant`
   so they are treated as inner pages.
6. **Cleanup comments** in `SubpageExperience.jsx`, `IdleScene.jsx`, and
   `ContactPulseLinks.jsx` that say the stage is mounted from SubpageExperience.
7. **Release**: bump `VERSION` and add a top `CHANGELOG.md` entry (check the true head:
   `git log --oneline -3 main` shows v1.43 merged; `VERSION` on disk reads v1.42, so
   reconcile — next = top of CHANGELOG + 0.01). PR title `vX.NN — scope stage background to hero on main marketing pages`.

## Verification

- `pnpm build` (routes/imports changed).
- `pnpm test:marketing` and `node --test tests/*.test.mjs` if any reference SubpageExperience.
- Dev server via `preview_start` and check in the browser:
  - `/about`, `/services`, `/process`, `/contact`: canvas visible only inside the hero,
    stops at section 2, nothing behind lower sections while scrolling.
  - `/services/logo-design` (or any service slug), `/work`, `/blog`, `/reviews`,
    `/privacy`, `/terms`: no canvas, no `.alive-overlay` in the DOM.
  - `/`: crystal scene unchanged.
  - Reduced motion + mobile width: hiding with CSS is not enough, because a
    `display: none` module still runs its RAF loop and holds a WebGL context.
    `DarkPageBackground` does not mount the module at all under
    `(prefers-reduced-motion: reduce), (max-width: 767px)`, and unmounts it if the
    preference flips mid-session. `tests/marketing/darkPageBackgroundGate.test.jsx`
    covers both cases. Only the static `.alive-overlay` wash renders.
- Screenshot proof for the recap, then commit and open the PR.

## Background choice (owner request, added 2026-09-22)

The owner wants the implementer to **choose an appropriate background from
reactbits.dev** for the hero stage rather than keep the current per-page
assignments blindly. Steps:

1. Browse https://reactbits.dev/backgrounds (built-in browser or web fetch) and
   shortlist candidates that fit the brand: dark base (`#04060c`), cyan / blue /
   silver tokens (`--cyan`, `--blue`, `--violet` in `app/globals.css`), slow and
   dim so the H1 keeps hierarchy, and cheap enough to run in a hero-sized box.
2. The repo already ports these React Bits backgrounds under `components/ui/`:
   acid-squares, dot-field, faulty-terminal, letter-glitch, prism, ripple-grid,
   liquid-ether. Prefer reusing one of these if it fits; only port a new one if it
   is clearly better. Any port must be procedural (no binary media), respect
   `prefers-reduced-motion`, hide on `max-width: 767px` like the existing modules,
   and tear down its RAF/WebGL context on unmount.
3. Pick one background for all four main pages (or keep per-page variants if the
   earlier per-page identity is worth preserving), state the choice and the reason
   in the PR description, and update `MARKETING_STAGE_BACKGROUNDS` accordingly.
4. The chosen module still goes through the `.mkt-hero-stage` absolute-position
   override described above so it stays inside the hero.
5. **Brand colors are mandatory.** Never ship the React Bits demo palette. Every
   color in the chosen background (shader uniforms, canvas fill/stroke, gradient
   stops, glow, vignette) must be set from this site's own tokens in
   `app/globals.css`: `--bg` (black base), `--ink`, `--cyan`, `--blue`,
   `--violet`, and the silver/muted tones. Read the token values from
   `globals.css` at implementation time rather than guessing hex codes. Match how
   the existing ports in `components/ui/` already do this (e.g. the cyan / blue /
   silver rgba values in `dark-page-background.jsx`). Before opening the PR,
   screenshot the hero and confirm no off-brand hue (greens, magentas, warm
   oranges, rainbow sweeps) is visible.
