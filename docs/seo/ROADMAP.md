# SEO Roadmap — CD Sportswear INC

**Updated:** 2026-09-26  
**Canonical strategy:** [`STRATEGY.md`](./STRATEGY.md)  
**Owner approval:** Shopify decision recorded as an implementation resolution; reopening the offer still requires MJ's written confirmation.

## Current decision: Shopify is not an organic SEO offer

The site sells the services represented in `lib/servicePages.mjs`. Shopify is not in that service taxonomy, and the ratified strategy prohibits building or optimizing organic pages for services the studio does not sell.

The existing `/hire/shopify-developer` route came from a historical merge and is retained as a **direct-response exception** only:

- It remains reachable by a direct URL for a qualified conversation.
- It emits `noindex` with `follow`.
- It is excluded from `/sitemap.xml`.
- It receives no footer, navigation, service-page, or related-post internal-link investment.
- Its keywords remain parked and do not count as organic targets or qualified organic service inquiries.
- The Ahrefs orphan-page warning is therefore a **known intentional exception**, not a defect to fix by adding a link.

Reopening Shopify as an organic target requires MJ to confirm that Shopify is a sold offer. That decision must then update the service taxonomy, positioning, keyword registry, sitemap, internal-link plan, conversion measurement, and roadmap as one package.

## Priority roadmap

### P0 — Ship and verify the Shopify exception

1. Deploy the route metadata and sitemap exclusion through the normal PR-to-`main` flow.
2. Verify `/hire/shopify-developer` returns a `noindex` directive and is absent from `/sitemap.xml`.
3. Tell Ahrefs to treat the page as an intentional noindex/direct-response exception during the next crawl.
4. Confirm no navigation, footer, service-page, or related-post link is added to the route.

**Success measure:** the next crawl no longer reports the page as an indexable orphan; the route remains available only by direct URL.

### P1 — Fix indexable technical issues from the 2026-09-26 audit

- Shorten the three overlong blog titles using the conditional brand-suffix template.
- Rewrite the four indexable meta descriptions: SEO, branding, terms, and the page-builder article.
- **Completed on branch 2026-09-26:** add contextual related-post links for the three low-inlink blog posts; verify after deployment and Ahrefs re-crawl.
- Re-test `/terms` server response and make the route static/cacheable if the slow response repeats.
- Correct the two-hop apex-to-`www` redirect in hosting configuration when the owner approves the DNS/Vercel change.

**Evidence:** Ahrefs Site Audit project 10435541, crawl completed 2026-09-26 05:16 UTC.

### P1 — Strengthen the homepage brand/entity signal

- Use the approved homepage metadata package where it matches the live brand and offer.
- Lead the homepage title with the CD Sportswear INC brand signal.
- Keep Organization/WebSite structured data accurate and link the logo, footer, and About page to the homepage with brand anchors.
- Re-check branded queries in Search Console after 4–6 weeks.

**Evidence:** Keyword cannibalization review, run 2026-09-26; current issue is low non-brand visibility, not material cannibalization.

### P2 — Build the web-design content cluster

- Complete the definitive `/services/web-design` pillar and its supporting guides.
- Prioritize the RFP guide, branding/web-design bridge content, and other approved narrow-intent pages.
- Ensure every supporting page links to its pillar and relevant conversion path.
- Keep unsupported local pages and unsold-service pages out of the organic roadmap.

**Evidence:** SERP analysis and outline for “web design” (US), 2026-09-25; existing keyword registry.

### P3 — Measurement and recurring operations

- Complete the Search Console connector/property selection required by the weekly quick-wins and index-health automations.
- Run the daily rankings check against the latest available seven-day Search Console window.
- Measure qualified organic inquiries through GA4 `generate_lead` plus CRM reconciliation; never substitute rankings or impressions for the goal.
- Re-run the cannibalization review only after the site has meaningful non-brand query data.

## Explicitly not on the roadmap

- Adding an internal link to `/hire/shopify-developer` solely to satisfy an audit crawler.
- Adding Shopify to `lib/servicePages.mjs` without an owner-approved offer decision.
- Creating a Shopify pillar, supporting blog cluster, or keyword expansion while Shopify remains unsold.
- Treating the empty keyword-research PDF (0 keywords, 0 clusters, 0 opportunities) as evidence for prioritization.
