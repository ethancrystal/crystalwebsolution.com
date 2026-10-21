# Internal-link audit — low-inlink blog posts — 2026-09-26

## Executive summary

**The new related-link graph is contextually sound and conversion-oriented, but production authority still needs a crawl-based confirmation.** The three audited CMS posts now emit nine links: four editorial cross-links between the brochure, page-builder, and redesign cluster; four links to live service pillars; and one direct contact CTA. The eight unique anchors are descriptive, with only the redesign anchor repeating twice; there are no naked URLs or generic “click here” anchors. All service and contact targets resolve to repository routes. A static source audit shows the service/contact destinations already have broader support, while the CMS blog destinations are represented only through the dynamic related-link map and cannot be fully measured without a live crawl or CMS export. The implementation therefore improves topical connectivity and conversion routing, but the final authority judgment depends on deployment, rendered HTML, and the next Ahrefs crawl. The next sprint should prioritize merging and re-crawling this change, then close the remaining `/terms` performance and redirect-chain issues before expanding the web-design content cluster.

## Evidence basis and limits

This audit uses the repository source, the 2026-09-26 Ahrefs fix specification, the current SEO roadmap, and the successful local test/build results. The new links are not yet confirmed in production HTML. Blog bodies and the blog index are CMS-rendered, so static source counts are an authority proxy rather than PageRank, URL Rating, or a replacement for Ahrefs/GSC internal-link exports.

## Link inventory

| Source post | Editorial cross-links | Conversion/service links | Total |
|---|---:|---:|---:|
| `/blog/brochure-website-vs-conversion-site` | 2 | 1 (`/services/web-design`) | 3 |
| `/blog/ai-automation-vs-zapier-make` | 0 | 3 (`/services/ai-automation`, `/services/workflow-automation`, `/contact`) | 3 |
| `/blog/when-page-builders-become-a-trap` | 2 | 1 (`/services/web-development`) | 3 |
| **Total** | **4** | **5** | **9** |

All nine links are site-relative and use the existing blog template’s related-link block. The new test contract passed for all three source slugs.

## Anchor-text distribution

| Anchor text | Count | Share | Type |
|---|---:|---:|---|
| Redesign vs refresh your website | 2 | 22.2% | Editorial/topic cluster |
| When page builders become a trap | 1 | 11.1% | Editorial/topic cluster |
| Brochure site vs conversion site | 1 | 11.1% | Editorial/topic cluster |
| Custom web design for brands | 1 | 11.1% | Service/conversion |
| AI automation for business | 1 | 11.1% | Service/conversion |
| Workflow automation | 1 | 11.1% | Service/conversion |
| Custom React & Next.js development | 1 | 11.1% | Service/conversion |
| Send a brief | 1 | 11.1% | Direct conversion |

**Distribution verdict:** 8 unique anchors across 9 links. The repeated redesign anchor is intentional cluster reinforcement, not over-optimized repetition. Commercial anchors describe the destination and map to the relevant service; the single generic CTA is appropriate because it names the action rather than a target keyword.

## Target-page authority proxy

The following counts are static source references across `app/`, `components/`, and `lib/`; they include existing template/service references and should not be read as live crawled inlink counts.

| Target | New links | Static source references | Authority reading |
|---|---:|---:|---|
| `/services/web-design` | 1 | 5 | Strongest relevant web-design hub; receives links from the blog map and other marketing sources. |
| `/services/web-development` | 1 | 5 | Strong service destination with existing supporting-page references. |
| `/services/ai-automation` | 1 | 3 | Relevant service pillar; new link gives the comparison post a direct commercial exit. |
| `/services/workflow-automation` | 1 | 3 | Relevant companion pillar; balanced with AI automation rather than forcing one target. |
| `/contact` | 1 | 18 | Broadest sitewide conversion destination; static count includes shared navigation/footer/template references. |
| `/blog/when-page-builders-become-a-trap` | 1 | 1 map reference | Gains one sibling inlink; CMS crawl must confirm rendered count. |
| `/blog/brochure-website-vs-conversion-site` | 1 | 1 map reference | Gains one sibling inlink; CMS crawl must confirm rendered count. |
| `/blog/when-to-redesign-vs-refresh-website` | 2 | 2 map references | Becomes the cluster’s most-linked editorial target, supported by both sibling posts. |

**Authority verdict:** the new links route equity toward live commercial pages without creating a single-page funnel. The redesign post is the editorial hub of this small cluster; the brochure and page-builder posts each have one new sibling entry point. After deployment, confirm the actual inlink counts and click depth in Ahrefs rather than relying on source counts.

## Route and quality checks

- All service and contact targets resolve through existing application routes.
- CMS blog targets are valid slugs referenced by the dynamic blog route; their page records should be verified in the next crawl.
- No link points to the Shopify exception.
- No anchor uses a naked URL, “click here,” or an unsupported service term.
- SEO regression suite: **16/16 passed**.
- Full test suite: **569/569 passed**.
- Production build: **successful**.

## Next sprint priorities

1. **Merge and deploy this link graph, then trigger an Ahrefs re-crawl.** Confirm rendered inlinks, anchor text, canonical URLs, and click depth for all three CMS posts.
2. **Re-test `/terms` server response.** If the slow response repeats after warm and cold requests, make the route static/cacheable.
3. **Fix the apex-to-`www` redirect chain** through the approved hosting/DNS change so non-canonical requests reach the canonical host in one hop.
4. **Finish homepage brand/entity strengthening:** verify homepage title, Organization/WebSite schema, logo/About/footer links, then re-check branded queries after 4–6 weeks.
5. **Advance the web-design content cluster** only after the pillar/supporting-page link structure is confirmed; keep each supporting page linked to `/services/web-design` and a conversion path.
6. **Complete Search Console and GA4/CRM measurement access** so qualified organic inquiries—not rankings alone—can be measured against the 2026-12-02 T+90 target.
