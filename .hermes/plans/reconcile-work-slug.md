# Plan: Finish IMPLEMENTATION-RECONCILIATION — migrate `/work/[slug]` into `MarketingShell`

## Context
`IMPLEMENTATION-RECONCILIATION.md` conclusion #2 states both `/work` AND `/work/[slug]`
still used the older hand-rolled header. Phase 1–2 of the bundle already migrated the
`/work` **index** into `MarketingShell`, but the **case-study detail route**
`app/work/[slug]/page.jsx` was left on its own `<header className="nav">` with an inline
`CWS` monogram — the only inner route not yet on the shared shell.

Verification confirmed the gap:
- `grep -rl "MarketingShell" app/` → 8 routes, does NOT include `app/work/[slug]/page.jsx`.
- `grep -rl 'header className="nav"' app/` → ONLY `app/work/[slug]/page.jsx`.

Goal: bring the detail pages onto `MarketingShell` so **every** inner route shares one
shell (SubpageNav + IdleScene + FocusVeil + ScrollProgress + MarketingFooter), without
breaking the route's server-render API (it is an `async` server component with
`generateStaticParams`, `generateMetadata`, and `notFound()`).

## Constraints (from the doc + repo conventions)
- Keep `MarketingShell` a server component; the client runtime lives in `SubpageExperience`.
  The detail page is already a server component, so it stays server-rendered — just wrap
  children in `<MarketingShell>` instead of hand-rolling the header.
- `SubpageExperience` already renders `<main className="mkt-main page subpage subpage-page">`.
  The detail page must NOT add its own `<main>` (it currently has none — good) and its
  `.case` content should sit inside the shell's `<main>`.
- Preserve all existing behavior: `generateStaticParams` (6 slugs), `generateMetadata`,
  `notFound()`, the "Next case study" link, and `ProjectVisual` rows.
- Do NOT mix CRM work (doc boundary).
- The old inline monogram header is replaced by `SubpageNav` (which already uses
  `<BrandLogo />`). The detail-specific "All projects" back-link stays as in-page content.

## Steps
1. **Edit `app/work/[slug]/page.jsx`**
   - Add import: `import MarketingShell from '../../../components/marketing/MarketingShell';`
   - Remove the hand-rolled `<header className="nav">…</header>` block (logo monogram +
     "All projects" ghost link).
   - Wrap the returned `<div className="subpage">…</div>` content in `<MarketingShell>`:
     return `<MarketingShell>{/* existing <main className="case"> … </main> */}</MarketingShell>`.
     Keep the outer `<div className="subpage">` (or drop it — `SubpageExperience` already
     applies `.subpage` via `.subpage-page`; verify visually and pick the non-duplicative one).
   - Keep the "All projects" affordance as an in-page link (e.g. a `Link` near the top of
     the `.case` block or in the closing area) so users can return to `/work`.

2. **CSS check (no new file needed)**
   - `.case` rules already exist in `app/globals.css` (lines ~1876, 2191–2211) and are
     compatible with `.subpage`/`.subpage-page`. No phase-2 CSS addition required — confirm
     the detail page still looks right under the shell's `.subpage-page` wrapper.

3. **Verify**
   - `pct test` gate: `pnpm test` (expect same as before — `latestFeatures` pass, CRM
     `auth-portals` pre-existing failure only). No test references the detail header markup.
   - `pnpm build` — confirm `/work/[slug]` still prerenders all 6 slugs and imports resolve.
   - Browser pass (desktop + mobile + reduced-motion) on `/work/tucker-trips` (and one more
     slug): confirm SubpageNav renders, IdleScene/fallback works, footer present, "All
     projects" link works, "Next case study" works, `notFound` still fires for a bad slug
     (e.g. `/work/does-not-exist`).

## Out of scope (explicit doc boundaries)
- CRM redesign (separate subsystem).
- Real case-study result metrics (conditional until `lib/projects.js` has verified data).
- Any WebGL changes beyond the existing `useRenderQuality` extension already shipped.

## Files touched
- `app/work/[slug]/page.jsx` (modify — wrap in MarketingShell, drop old header)
- `app/globals.css` (added `.case-back` link styles)

## Status: ✅ EXECUTED & VERIFIED (2026-08-07)
- Wrapped case-study content in `<MarketingShell>`; removed hand-rolled `<header className="nav">` monogram.
- Added `.case-back` ("← All projects") link + CSS.
- `pnpm test`: 157 pass / 1 fail (pre-existing CRM `auth-portals`, unrelated to this change).
- `pnpm build`: exit 0; `/work/[slug]` still SSG-prerenders all 6 slugs.
- Browser: detail page renders SubpageNav + footer; back-link → /work (200); bad slug → 404 (notFound intact); mobile 390×844 → center links hidden, burger shown; reduced-motion inherited from shared shell.
- All inner routes now share one shell. IMPLEMENTATION-RECONCILIATION.md fully complete.
