# Lighthouse baseline — production, 2026-09-03

Closes TASK-008 of `docs/plans/refactor-architecture-cleanup-2.md` (carried
as Task 3 of `docs/plans/audit-followups-crm-hardening-3.md`). The Phase 1
run on 2026-09-01 was flagged unreliable because it measured a local build
inside a sandbox; this one measures the live deployment.

## Method

- Lighthouse **13.4.1** via `pnpm dlx lighthouse`, headless Chrome
  (`--headless=new`), Windows 11 host, `simulate` throttling (Lighthouse
  default: mobile = slow 4G / 4× CPU; desktop preset = no throttling).
- Target: `https://www.cdsportswearinc.com` — the production alias since
  PR #174 (v1.26). Commit deployed at the time: `e54ab78` (v1.26, #175).
- Routes: `/`, `/work`, `/services`, `/login`. `/admin`, `/team`,
  `/dashboard` redirect unauthenticated visitors to `/login`, so `/login`
  stands in for the CRM entry surface. Authenticated CRM pages were not
  measured (would need a seeded session).
- One run per route × form factor. Single runs vary ±5 points; treat
  differences under that as noise.
- Raw JSON/HTML reports are in the session scratchpad, not committed
  (~2 MB each).

## Scores

| Route | Form | Perf | A11y | Best-practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | mobile | **34** | 100 | 100 | 100 | 1.8 s | **13.5 s** | **3.2 s** | 0.057 | 17.7 s |
| `/` | desktop | **36** | 100 | 92 | 100 | 3.3 s | 3.5 s | 0.6 s | 0.071 | 7.9 s |
| `/work` | mobile | 44 | 100 | 100 | 100 | 1.2 s | 9.6 s | 2.0 s | 0.000 | 4.8 s |
| `/work` | desktop | 79 | 100 | 92 | 100 | 0.5 s | 2.2 s | 0.04 s | 0.003 | 7.7 s |
| `/services` | mobile | 43 | 100 | 100 | 100 | 1.1 s | 11.3 s | 1.1 s | 0.000 | 9.6 s |
| `/services` | desktop | 81 | 100 | 100 | 100 | 0.6 s | 2.3 s | 0.09 s | 0.000 | 2.6 s |
| `/login` | mobile | 63 | 100 | 100 | 69 | 2.0 s | 2.5 s | 1.2 s | 0.000 | 11.5 s |
| `/login` | desktop | 91 | 100 | 100 | 69 | 0.4 s | 0.7 s | 0.09 s | 0.000 | 3.7 s |

Accessibility is 100 on every page. `/login` SEO 69 is the intended
`noindex` (`is-crawlable` fails by design on the CRM). Best-practices 92 on
`/` and `/work` desktop is one audit: `errors-in-console` (below).

## What the numbers say

**The homepage is script-bound, not network-bound.** Main-thread breakdown
on `/` mobile: Script Evaluation 15.9 s, Other 13.3 s, Style & Layout
2.4 s. On desktop the same three are 5.8 s / 4.7 s / 1.2 s. That is the
WebGL stage (`components/Scene.jsx` and the R3F actors) plus GSAP/Lenis
booting, then running the intro loader under a 4× CPU slowdown. The Phase 0
bundle figure (`/` = 378 kB First Load JS, 228 kB shared) is consistent with
what shipped — the heaviest first-party chunks are `2c7bdfb3-*.js` (171 kB
transfer, the Three.js bundle) and `3871-*.js` (127 kB, Sentry + shared
runtime). Lighthouse's `unused-javascript` flags ~83 kB of the Three chunk
and ~60 kB of `3871` as unused at load on every route.

**Inner pages pay the shared cost too.** `/work` and `/services` load the
same 171 kB Three chunk and the same 127 kB runtime chunk even though they
render no WebGL, which is why their mobile LCP is 9–11 s with almost nothing
above the fold that needs it. Phase 1 verified Three.js is out of the *CRM*
chunks; it is not out of the marketing inner-page chunks.

**Third-party weight.** `googletagmanager.com/gtag/js` is 171 kB transfer
on every route (69 kB unused). It is the single largest script on `/login`.

## Findings that are not performance

1. **Sentry envelopes are blocked by the Content-Security-Policy.** Every
   desktop run of `/` and `/work` logs repeated
   `Connecting to 'https://o4511961274712064.ingest.us.sentry.io/…/envelope/…'`
   CSP violations followed by `Fetch API cannot load …`. `connect-src` in
   `next.config.js` does not include the Sentry ingest host, so client-side
   error reports never leave the browser in production. Either add
   `https://*.ingest.us.sentry.io` to `connect-src` or enable
   `tunnelRoute` in the Sentry Next.js config so envelopes go through the
   app's own origin. Note `tests/csp-policy.test.mjs` pins every CSP token
   by design, so the fix is a reviewed edit to both files. This is the
   `errors-in-console` / `inspector-issues` failure behind the 92
   best-practices score.
2. **One `ChunkLoadError: Loading chunk 7774 failed`** on `/work` desktop,
   alongside two `net::ERR_HTTP2_PING_FAILED` resource failures in the same
   run. Single occurrence, consistent with a transient connection reset
   rather than a missing chunk; re-run before treating it as a bug.

## Recommended next steps (not done in this PR)

Ordered by expected gain per unit of risk, all compatible with the
"zero visual change" rule:

1. Fix the Sentry CSP gap (config-only; restores production error
   reporting).
2. Keep the Three.js chunk off marketing inner pages: audit which shared
   layout component imports the WebGL boundary on `/work` and `/services`
   and move it behind the same `dynamic(..., { ssr: false })` seam the
   homepage uses.
3. Defer `gtag.js` until first interaction or idle (`strategy="lazyOnload"`
   on the analytics `<Script>`), which removes 171 kB from the critical
   path on every route.
4. Re-run this report after each of the above; the Phase 0 bundle table in
   `refactor-architecture-cleanup-2.md` TASK-000c is the comparison point.
