# design-sync notes — Crystal Web Solution

## What this repo is (and isn't)

A Next.js **application**, not a packaged design system: `package.json` is
`private: true` with no `main`/`module`/`exports`, there is no `dist/`, no
TypeScript, and no Storybook. The converter therefore runs the package shape
in **synth-entry mode**, scanning `components/` directly. Everything below
follows from that.

## Fixes this sync required (all reproducible from config + the fork)

- **`export *` never forwards `default`.** Every component here is
  `export default function Name()`, so the stock synth entry produced a bundle
  with zero components on `window.CrystalWebSolution` and validate failed all
  66 with `[BUNDLE_EXPORT]`. `.design-sync/overrides/source-kit.mjs` now emits
  an explicit `export { default as Name }` per file (first name wins; a
  duplicate would silently drop both under esbuild).
- **`components/crm/` and `components/auth/` are excluded** by the same fork.
  They import `'use server'` actions (Node builtins, service-role Supabase
  clients) that cannot bundle for a browser preview, and they are not part of
  the marketing visual identity.
- **`process is not defined` killed every preview.** `lib/crmFlag.js` reads
  `process.env.NEXT_PUBLIC_CRM_ENABLED` at module scope — correct under
  Next.js (which statically replaces `NEXT_PUBLIC_*`), fatal under bare
  esbuild, and it threw while the *shared* bundle was still evaluating, so all
  66 cards died. Fixed by `.design-sync/shims/process-global.mjs`, imported
  **first** by the synth entry (an assignment at the top of the entry would
  not work — imported modules evaluate before the importing module's body).
- **`next/link` / `next/navigation` are aliased to local shims** via
  `cfg.tsconfig` → `.design-sync/tsconfig.shim.json`. Next's client runtime
  reads build-time-injected `process.env.__NEXT_*`.
- **`scheduler` is aliased to the real package.** `lib/bundle.mjs`'s
  `reactShim` replaces any `scheduler` import with a module that *throws*,
  assuming react-dom leaked into a dist. Here it is legitimate:
  `@react-three/fiber` → `react-reconciler` → `scheduler`. The alias points
  past the tripwire.
- **`@types/react` is not a repo dependency.** It was copied into
  `node_modules/@types/` (gitignored, no `package.json` change) to silence
  `[DTS_REACT]`. Re-do this on a fresh clone, or accept the warning — it
  changes nothing here, since the source has no type annotations to extract.

## Fonts

`next/font/google` self-hosts Space Grotesk / Inter / Space Mono into `.next/`
under content-hashed names. `.next/` is gitignored and rewritten by every
build, so it cannot be the sync source. `.design-sync/fonts/` is the durable
extraction (16 woff2 + `fonts.css`, all SIL OFL 1.1, redistributable), wired
via `cfg.extraFonts`. Regenerate by re-running `pnpm build` and re-extracting
the `@font-face` rules from `.next/static/css/*.css`, rewriting the
`/_next/static/media/` URLs to sibling-relative.

## Known render warns

None outstanding. Two were resolved rather than recorded:
`[RENDER_THIN]` on `ServiceEmblem` / `ServiceThreadArc` (both are aria-hidden
decorative SVG with no text — authored previews gave them labelled context),
and `[GRID_OVERFLOW] wide` on `ServiceEmblem`, fixed with the suggested
`cardMode: "column"`.

## Component reality

- **36 of 66 ship the floor card** — the deliberate baseline. Of these, the 13
  `three/` components can never have a static preview (they need an R3F
  `<Canvas>` ancestor), and the 9 `sections/` are whole-page scroll beats
  driven by module singletons that only `SmoothScroll` populates.
- **8 have authored previews**, all 25 cells graded `good`.
- **`ImageBlock` has no production usage** (tests only) and collapses to zero
  height without a sizing `className` — both its image and placeholder are
  `position: absolute` inside a bare `inline-block` figure. Worth raising with
  the owner as a latent bug or an orphaned component.

## Re-sync risks

- **The `scheduler` alias pins a pnpm store path**
  (`node_modules/.pnpm/scheduler@0.27.0/...`). A lockfile bump changes that
  hash and the alias silently stops matching — the `[SCHEDULER_MISSING]` throw
  returns and every preview dies again. Re-point it in
  `tsconfig.shim.json` after any dependency update.
- **Fonts drift from `.next/`.** If the font stack in `app/layout.jsx`
  changes, `.design-sync/fonts/` is stale until re-extracted.
- **Grading was not visual.** This environment returns OCR text instead of
  images, so cells were graded on the render check's objective signals
  (non-blank, non-thin, distinct variants, captured text, height/byte size)
  plus structural confirmation that the fonts and component CSS are reachable
  from `styles.css`. Pixel-level appearance is unverified — a human should
  review `ds-bundle/.review.html`.
- **Props are stubs.** No TypeScript in the repo means every `<Name>Props` is
  `[key: string]: unknown`. To give the design agent a real contract, add
  `cfg.dtsPropsFor` entries hand-written from each component's JSX
  destructuring.
