# Crystal Web Solution — Inner Pages Reconciliation

Target repository: `ethancrystal/crystalwebsolution.com`
Target branch: `agent/marketing-inner-pages`
PR: #57, base `preview`

## Current-state conclusions

1. PR #57 already established dedicated inner marketing routes and a reusable `components/marketing/*` system.
2. `/work` and `/work/[slug]` still use the older hand-rolled header and have not been migrated into that shell.
3. The new attached design plan supersedes PR #57's earlier "no WebGL on inner pages" visual constraint, but the existing adaptive render-quality system should be extended rather than duplicated.
4. `lib/projects.js` does not contain verified year/result/percentage metrics. Case-study result bands must remain conditional until real data exists.
5. CRM redesign work is intentionally not mixed into PR #57; it is a separate subsystem and conflicts with the branch's explicit CRM regression boundary.

## Phase 1–2 implementation in this bundle

- Shared brand-logo atom reused by homepage nav and subpage nav.
- `SubpageNav`: desktop center navigation + existing menu overlay on compact screens.
- `IdleScene`: same Crystal/Particles/Lights family as the homepage, governed by `useRenderQuality`; static fallback for eco/reduced-motion and `frameloop="never"` while tab-hidden.
- `SubpageExperience`: reuses SmoothScroll, FocusVeil and ScrollProgress without changing the server-route API of `MarketingShell`.
- `/work`: migrated into `MarketingShell`.
- `WorkLibrary`: real-data category filters, animated visible count, accessible summary expand/collapse, existing ProjectVisual rows retained.
- CSS additions are isolated in `styles/inner-pages-phase1.css` so they can be appended to `app/globals.css` after review.

## Files intended to replace

- `components/Nav.jsx`
- `components/marketing/MarketingShell.jsx`
- `app/work/page.jsx`

## Files intended to add

- `components/BrandLogo.jsx`
- `components/marketing/SubpageNav.jsx`
- `components/marketing/IdleScene.jsx`
- `components/marketing/SubpageExperience.jsx`
- `components/marketing/WorkLibrary.jsx`

## Verification required after applying

```bash
pnpm test
pnpm build
```

Then browser-check `/work`, `/about`, `/services`, `/process`, `/contact`, `/reviews`, and `/embroidery-screen-printing-web-design` at desktop/mobile widths and with reduced motion enabled.
