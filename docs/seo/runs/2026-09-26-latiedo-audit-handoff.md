# SEO audit handoff — 2026-09-26

## Source material used

The implementation used the Latiedo/Ahrefs crawl and duplicate fix plan, homepage copy and quick-win keyword package, keyword cannibalization analysis, web-design SERP/content notes, and the repository authority files `docs/seo/STRATEGY.md` and `docs/seo/OPERATIONS-MANUAL.md`.

## Applied on this branch

- Added route-level SEO overrides for the three long blog titles: `/blog/when-to-redesign-vs-refresh-website`, `/blog/website-redesign-cost`, and `/blog/website-redesign-services`.
- Added the audit-approved description for `/blog/when-page-builders-become-a-trap`.
- Replaced `/services/seo` and `/services/branding` meta descriptions with concise approved copy.
- Expanded `/terms` metadata to accurately describe accounts, projects, payments, IP, and liability.
- Resized `public/projects/clients/06-tiltoootilt.jpg` to 1,280×720 and below 200 KB while preserving its path.
- Confirmed the existing blog route already renders related-post links and confirmed conversion tracking through `brief_start`, `service_cta_click`, and accepted-lead `generate_lead` events.

## Deliberately not applied

No `/hire/shopify-developer` link or page was created because the ratified SEO strategy says Shopify is not a live service and must not receive a page or internal link. No production merge, publication, DNS/redirect change, CMS write, or Search Console submission was performed.

## Owner-gated follow-up

Run the branch build and marketing tests from the sandbox-local clone, verify affected routes in a browser/preview deployment, enter the same blog metadata in the CMS if durable database values are preferred, and re-crawl Ahrefs after deployment. Production merge remains owner-gated.
