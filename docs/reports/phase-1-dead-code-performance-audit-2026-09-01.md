# Phase 1 — Dead Code & Performance Audit (2026-09-01)

Executed per `docs/plans/refactor-architecture-cleanup-2.md` Phase 1
(the plan doc itself lives on PR #165, not yet merged to `main` at the
time of this audit — see "Baseline caveat" below).

## Summary

One real bug found and fixed (`pnpm livecheck` was broken outright). One
depcheck false positive investigated and ruled out. Bundle/code-splitting
verified correct — no regression. Two owner-decision items carried over
from v1's audit: one is now moot, one still stands and needs a decision
below. Lighthouse numbers gathered but flagged unreliable in this
environment (see that section).

## Findings

### 1. Fixed: `pnpm livecheck` was broken (missing dependency)

`scripts/livecheck.mjs` imported directly from `playwright`:

```js
import { chromium } from 'playwright';
```

`playwright` is not a direct dependency — only `@playwright/test`
(devDependency) is declared, and pnpm's strict node_modules layout does
not hoist it to the root, so this import threw
`Cannot find package 'playwright'` and the script never ran.

**Fix**: changed the import to `@playwright/test`, which re-exports
`chromium` and is already installed. Verified:
- `node --check scripts/livecheck.mjs` — syntax OK
- Direct import + `chromium.launch()` — succeeds
- Ran the corrected script against a production build (`pnpm build && pnpm start`)
  across all 9 marketing routes — 0 console/page errors, correct
  `subpage-nav` presence/absence on every route, `ALL CHECKS PASS`.

### 2. Investigated, not a bug: `depcheck` flags `typescript` as unused

`pnpm dlx depcheck` reports `typescript` as an unused devDependency. This
is a false positive: the repo has a root `tsconfig.json` (JS project mode
— `allowJs: true`, `checkJs: false`) that supplies the `@/*` path alias
used throughout the codebase and IDE/editor IntelliSense. Next.js requires
the `typescript` package to be present whenever `tsconfig.json` exists,
even in an all-JS project — removing it would break `next dev`/`next
build`. No action taken.

### 3. Verified: all `dynamic(..., { ssr: false })` usages are correct

All three call sites are legitimate client-only WebGL/canvas boundaries:

- `components/Experience.jsx` → `Scene` (main homepage WebGL stage)
- `components/marketing/SubpageExperience.jsx` → `IdleScene`
- `components/marketing/ServiceEmblem.jsx` → `ServiceEmblem3D`

No unnecessary `ssr: false` usage found elsewhere.

### 4. Verified: Three.js/R3F is correctly excluded from shared and CRM bundles

- `pnpm build` — clean, exit 0, 57/57 routes (matches PR #165's recorded
  baseline).
- "First Load JS shared by all" = 227 kB (PR #165 baseline: 228 kB — no
  regression).
- `/` (homepage, WebGL): 89.4 kB own + 378 kB First Load JS.
- `/admin` (CRM, no WebGL): 302 kB First Load JS — comparing
  `.next/app-build-manifest.json`'s chunk lists for `/page` vs
  `/admin/page` confirms the homepage pulls ~5 extra chunks (Three.js/R3F/
  camera-journey code) that never appear in the admin page's chunk list.
  Three.js is not part of any chunk shared with CRM routes.

### 5. Owner-decision item — now moot: untracked SEO CSVs in `public/`

v1's audit flagged ~30 untracked SEO-crawl CSVs in `public/`
(`accessibility_all.csv`, `sitemaps_all.csv`, etc.) as publicly
downloadable. Re-checked: `public/` currently has zero untracked files.
Already resolved (by a prior session or prior cleanup) — no action needed.

### 6. Owner-decision item — resolved 2026-09-03: orphaned custom-cursor leftovers

> **Correction (2026-09-03).** This section, and the "finish building it"
> option below, were written on a false premise. The cursor was **not
> unbuilt**: `components/Cursor.jsx` (60 lines, `gsap.quickTo` dot + ring,
> label read from `data-cursor`) shipped in the initial commit `fdf3c1d`
> and was deliberately deleted in PR #10 (`1a2807c`, 2026-07-13) "per
> design feedback that it cluttered the page." `docs/PIXEL-POLISH-PLAN.md`
> names that merge as its baseline. The 51 attributes,
> `app/styles/cursor-loader.css:1-40`, and the `html.has-cursor` rule at
> `app/styles/reset.css:19` (missed below) are what the removal left
> behind. Every later audit re-litigated this as an open feature decision
> because none read the git history. **Owner decision 2026-09-03:**
> remove, consistent with PR #10 — shipped in v1.28 via
> `docs/plans/audit-followups-crm-hardening-3.md` Task 5. Restoring it is a
> 65-line revert from `git show 1a2807c^:components/Cursor.jsx` if design
> direction ever changes.

Original text follows for the record.

Found a larger version of the same issue v1 flagged (v1 counted 31
`data-cursor` attributes; current count is **51**, across 21 source
files). Two matching but disconnected halves of an unbuilt "magnetic
cursor" feature exist:

- **CSS**: `app/styles/cursor-loader.css` lines 1–40 define
  `.cursor-dot`, `.cursor-ring`, `.cursor-ring.is-hover`, `.cursor-label`,
  `.cursor-ring.has-label .cursor-label` — a full custom-cursor visual
  design (dot + ring + hover-expand + text label), disabled on touch via
  `@media (pointer: coarse)`.
- **Markup**: 51 `data-cursor="<label>"` attributes on interactive
  elements repo-wide (nav links, CTAs, case-study cards — e.g.
  `data-cursor="View case"`, `data-cursor="Say hi"`, `data-cursor="Home"`),
  clearly meant to feed per-element label text into that cursor.

**Neither half is wired to the other or to anything else**: no JS file
anywhere in the repo renders a `.cursor-dot`/`.cursor-ring`/`.cursor-label`
element, reads a `data-cursor` attribute, or toggles `.is-hover`/
`.has-label`. Confirmed via repo-wide grep excluding `node_modules`/
`.next`. This is inert: the CSS ships unused bytes, the attributes are
inert DOM data with no runtime effect (screen readers ignore unknown
`data-*` attributes, so this isn't an accessibility issue — just dead
weight).

Per `CLAUDE.md`'s "always confirm with the owner before deleting
anything," **no removal was made**. Two paths forward, owner's call:
1. **Remove** both halves (dead CSS + all 51 attributes) as cleanup.
2. **Finish building it** — write the small JS controller (position two
   fixed-position elements on `pointermove`, toggle `is-hover`/`has-label`
   and set the label text on `data-cursor`-bearing element hover) as a
   follow-up feature, since the design and markup are both already done.

File list (attribute sites):
`components/ui/review-carousel.jsx`, `components/sections/{Stories,Services,Motion,Hero,Contact}.jsx`,
`components/marketing/{WorkLibrary,SubpageNav,ServicePage,ServiceGrid,MarketingHeader,CaseNavRail}.jsx`,
`components/{Nav,Menu}.jsx`.

### 7. Re-verified: `public/d/02-messenger.gif` size

329,484 bytes (~322 KB), matching v1's recorded size. No regression.

### 8. Re-verified: CSP in `next.config.js`

The `'unsafe-inline'`/`'unsafe-eval'` comment ("required by Next's inline
bootstrap and by the R3F/GSAP runtime; tightening needs a nonce refactor,
tracked separately") is still accurate — still pinned token-for-token by
`tests/csp-policy.test.mjs`. Documented, not changed, per the plan's
explicit scope exclusion of the nonce refactor.

### 9. Lighthouse — gathered, flagged unreliable in this environment

Ran Lighthouse (desktop preset) against the production build on `/` and
`/admin`:

| Route | Performance | Accessibility | Best Practices | SEO | TBT |
|---|---|---|---|---|---|
| `/` | 56 | 100 | 100 | 100 | 28,840 ms |
| `/admin` | 48 | 100 | — | — | 39,250 ms |

The TBT figures are not credible as real-world numbers — a plain
server-rendered CRM page with zero canvas/WebGL work (`/admin`) scored
*worse* than the WebGL homepage, and 28–39 **seconds** of blocking time is
not physically consistent with either page's actual JS payload (`/admin`
is 302 kB First Load JS total). This points to Lighthouse's `simulate`
throttling mode misbehaving in this sandboxed/shared-CPU container rather
than a real regression. Accessibility/Best Practices/SEO scores (100
across the board where measured) are trustworthy since those are
static-analysis audits, not timing-based.

**Not treated as a Phase 1 finding or regression.** Recommend the owner
(or a follow-up session with a real desktop/CI runner) re-run
`pnpm dlx lighthouse` for a trustworthy performance baseline — this audit
does not have one to compare against besides these numbers.

## Test baseline (informational — not yet gate-passing)

This branch was created off `main` before PR #165 (Phase 0) merged, so it
does not yet include Phase 0's `tests/email.test.mjs` fix. Per the
handoff doc, Phase 1's `pnpm test` baseline gate is deferred until #165
merges and this branch is rebased onto it.

- `pnpm test`: **451/452** passing — the 1 failure is exactly the known,
  already-fixed-on-#165 `tests/email.test.mjs` domain assertion. No other
  failures; no regressions introduced by this audit's changes.
- `pnpm build`: clean, 57/57 routes.
- `pnpm test:marketing`: not yet re-run against this exact commit — no
  Phase 1 change touches marketing component behavior, low risk, but flag
  for the merge-and-rebase pass.

## Changes made in this commit

- `scripts/livecheck.mjs`: `playwright` → `@playwright/test` import fix
  (item 1 above).

No other files changed — every other finding above is either verified-OK
or an owner-decision item awaiting a call.
