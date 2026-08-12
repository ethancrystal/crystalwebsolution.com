# Performance Budgets & Core Web Vitals

Performance is a feature with a number. Set targets *before* building, measure against them in CI, and treat regressions as bugs. "It feels fast on my machine" is not a measurement — your machine is a fast machine on a fast network.

## The targets (Core Web Vitals, 75th percentile, field data)

| Metric | Good | Needs work | Poor | What it measures |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s | When the main content paints (loading) |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 | Visual stability (no jumping) |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms | Responsiveness to taps/clicks/keypresses |

INP replaced FID in 2024 — it measures *every* interaction's full latency, not just the first input. Supporting metrics: **TTFB** (server response, target < 0.8s — a slow TTFB caps LCP), **FCP** (first paint).

**Field (real users, CrUX/RUM) is what ranks and what matters.** Lab (Lighthouse) is for debugging, not for grading. A green Lighthouse score with red field data means real users on real devices are suffering.

## Bundle budgets (set these, enforce in CI)

- **Initial route JS: ~170KB gzipped** as a default ceiling for the critical path (the historic "interactive on mid-tier mobile over 3G" baseline). Smaller is better; SPAs routinely blow past this.
- **Per-route lazy chunks:** keep individual lazy chunks reasonable; split at route boundaries first.
- **Total CSS critical path:** keep small; inline critical CSS where the framework supports it.
- Enforce with **`size-limit`** (or `bundlesize`) as a **blocking CI gate**. A budget you don't enforce is a wish.

## Levers, cheapest and highest-impact first

1. **Ship less JavaScript.** The fastest code is code you don't ship.
   - Audit deps with `vite-bundle-visualizer` / `source-map-explorer` / `npx @next/bundle-analyzer`. Find the fat.
   - Replace heavyweight libs: moment → `date-fns`/`Temporal`/`Intl`; lodash whole → per-method or native; a charting/animation lib for one effect → CSS/Web Animations.
   - **Verify tree-shaking actually works** — use ESM imports (`import { x }`), avoid `import * as`, prefer libraries marked `"sideEffects": false`. Importing a component library *whole* defeats it.
   - Prefer the platform: CSS for animation/layout, `<dialog>`/`<details>`, native form validation, `Intl` for dates/numbers/currency.
2. **Code-split at route boundaries.** `React.lazy`/dynamic import per route so users download only the route they're on. Then split heavy below-the-fold or rarely-used widgets (rich editor, charts, modals).
3. **Defer non-critical work.** Lazy-load below-the-fold components; load third-party scripts (analytics, chat) with `defer`/`async` or after interaction; never block render on them.
4. **Right-size images** (usually the LCP element and the #1 win):
   - Modern formats (AVIF/WebP), responsive `srcset`/`sizes`, framework `<Image>` if available.
   - **Always set explicit `width`/`height` (or `aspect-ratio`)** so the box is reserved → prevents CLS.
   - `loading="lazy"` below the fold; **`fetchpriority="high"` on the LCP image** and preload it; never lazy-load the LCP image.
5. **Fonts:** `font-display: swap` (or `optional`), preload the critical font, subset it, self-host to avoid a third-party round trip. Reserve space to avoid CLS from font swap.
6. **Memoize only proven hot paths.** `useMemo`/`useCallback`/`React.memo` after a profile shows a real re-render cost. Blanket memoization adds allocation + complexity and hides the real bottleneck. (React Compiler, where available, makes most manual memoization unnecessary — let it do the work.)
7. **Virtualize long lists** (`@tanstack/virtual`) — but only beyond hundreds of rows. Virtualizing a 20-row list is pure complexity.

## Hitting each metric

- **LCP:** identify the LCP element (DevTools / web-vitals). Make it fast: SSR/SSG the above-the-fold content, preload + `fetchpriority="high"` the hero image, cut render-blocking JS/CSS, fix TTFB (cache, edge). Don't lazy-load it.
- **CLS:** reserve space for *everything* async — images (dimensions), ads/embeds (placeholder boxes), fonts (swap + matched metrics), injected banners. Never insert content above existing content after load. Use `transform`, not layout properties, for animation.
- **INP:** keep the main thread free. Break up long tasks (`scheduler.postTask`, `isInputPending`, chunk work). Debounce expensive handlers. Move heavy compute to a Web Worker. Avoid synchronous re-renders of huge trees on keystroke (this is also a state-architecture problem — see [[state-management.md]] on high-frequency state). Defer non-urgent updates (`useTransition`/`useDeferredValue`).

## Measuring (free-tier, WSL-friendly)

- **`web-vitals`** npm lib → log real INP/LCP/CLS from real users (RUM). The ground truth.
- **Lighthouse / PageSpeed Insights** (PSI also surfaces field CrUX data, free) for lab debugging.
- **React DevTools Profiler** for re-render hunting; the browser **Performance** panel for long tasks/main-thread.
- **Bundle analyzers** above for the JS audit.
- Note (this env): Lighthouse CI and Playwright trace capture drive headless Chromium, which may not launch on WSL Ubuntu without a browser install (and `sudo` isn't passwordless). Prefer **PSI (cloud)** and the **`web-vitals` RUM** approach locally; run Lighthouse CI in real CI or a container.

## Definition of done (performance)

- [ ] Budgets written down (initial JS KB, LCP/CLS/INP targets) before building.
- [ ] `size-limit` (or equivalent) is a blocking CI gate.
- [ ] LCP element identified and prioritized; no layout shift from images/fonts/embeds.
- [ ] Routes code-split; no single heavyweight dep pulled in for a one-line need.
- [ ] Optimizations are measured (profile/bundle report attached), not speculative.

## Anti-patterns

- Optimizing by feel with no profile or field data.
- Green Lighthouse, red field data — declaring victory on the wrong number.
- Memoizing everything / `useCallback` on every handler / virtualizing tiny lists.
- Lazy-loading the LCP image, or shipping images with no dimensions (CLS).
- Importing a whole UI/util library for one function or component.
- Treating bundle budget as advisory (not enforced in CI) — it will rot.
