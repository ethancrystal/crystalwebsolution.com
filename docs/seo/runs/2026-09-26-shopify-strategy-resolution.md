# SEO run — Shopify strategy resolution — 2026-09-26

## Decision

The Shopify conflict is resolved as a **controlled direct-response exception**, not as an organic service launch. Shopify is absent from `lib/servicePages.mjs`, and the ratified strategy says the site must not build or optimize organic pages for services it does not sell.

The historical `/hire/shopify-developer` route remains reachable by direct URL for qualified conversations. It is now `noindex` with `follow`, excluded from `/sitemap.xml`, and receives no internal-link work. The Ahrefs orphan warning is an intentional exception and should not be fixed by adding a footer, navigation, service-page, or related-post link.

## Evidence

- Ahrefs Site Audit project 10435541, crawl completed 2026-09-26 05:16 UTC: the page was indexable, listed in the sitemap, and had zero crawled inlinks.
- `docs/seo/STRATEGY.md`: services absent from `lib/servicePages.mjs` must not receive organic pages; Shopify is explicitly listed as unsold.
- `docs/seo/KEYWORD-REGISTRY.md`: both Shopify keywords remain parked pending MJ's confirmation that Shopify is a sold offer.
- The route exists because of a historical merge, so deleting it is not necessary for this resolution.

## Changes in this run

- Added `noindex, follow` metadata to `app/hire/shopify-developer/page.jsx`.
- Removed `/hire/shopify-developer` from `app/sitemap.js`.
- Updated the SEO on-page contract test.
- Updated `STRATEGY.md`, `OPERATIONS-MANUAL.md`, `KEYWORD-REGISTRY.md`, `GOAL-FUNNEL.md`, and `docs/seo/README.md`.
- Added the canonical roadmap at `docs/seo/ROADMAP.md`.

## Reopening gate

MJ must confirm in writing that Shopify is a sold offer. A future reopening must update the service taxonomy, page positioning, keyword registry, sitemap, internal links, conversion measurement, and roadmap together. No organic Shopify work is authorized before that decision.
