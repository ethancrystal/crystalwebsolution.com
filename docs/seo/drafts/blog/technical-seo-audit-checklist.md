---
title: Technical SEO Audit Checklist — What to Fix Before You Publish
seo_title: Technical SEO Audit Checklist for 2025
seo_description: A practical technical SEO audit checklist — crawlability, indexation, site speed, structure, and schema. Copy-paste ready, ordered by impact.
excerpt: Most sites fail at the basics before content even matters. This checklist covers the technical fixes that unblock search engines, ordered by what moves the needle first.
cover_image: assets/technical-seo-audit-checklist.jpg
target_keywords: technical seo audit checklist, seo audit template
target_url: /blog/technical-seo-audit-checklist
approved: false
---

Technical SEO is not a mystery. It is a finite set of things that block search engines from crawling, indexing, and understanding your site. If those things are broken, your content cannot rank — no matter how good it is.

This checklist is what we run on every new engagement before we write a single word of strategy. It is ordered by impact: fix the top items first, because they gate everything below them.

## 1. Crawlability — Can search engines reach your pages?

- **Robots.txt** — No critical paths disallowed (`/`, `/services/`, `/blog/`, `/work/`, `/contact/`). Check `Disallow` lines against your actual IA.
- **XML sitemap** — Exists at `/sitemap.xml`, returns 200, lists only canonical indexable URLs (no redirects, no 404s, no auth pages). Submitted in Search Console.
- **Noindex tags** — Zero indexable pages carry `noindex`. Check homepage, service pages, blog, work. Common leak: staging environments, paginated archives, tag pages.
- **Canonical URLs** — Every indexable page has a self-referencing canonical on the www host (or your chosen canonical host). No mixed http/https, no trailing-slash conflicts.
- **Redirect chains** — Zero 301→301 chains. Every old URL resolves in one hop to its final canonical.
- **Status codes** — No 5xx, no soft 404s (pages that return 200 but say "not found"). Real 404s return 404.
- **Blocked resources** — CSS, JS, fonts, images critical to rendering are not blocked in robots.txt or by CSP.

## 2. Indexation — Are the right pages in the index?

- **Site: search** — `site:yourdomain.com` returns roughly the page count you expect. Large gaps = indexation problem.
- **Index coverage (GSC)** — "Indexed, not submitted in sitemap" should be near zero. "Excluded by noindex" should only be intentional pages.
- **Duplicate content** — No two indexable URLs serve substantively the same content. Check: www vs non-www, http vs https, trailing slash, UTM parameters, print views, AMP.
- **Pagination** — If you paginate (blog archive, case studies), `rel="next/prev"` or `link rel="prev/next"` headers present. Canonical points to page 1 or self, not to a "view all" that doesn't exist.
- **International** — If multi-language/region, `hreflang` tags are correct and reciprocal. X-default present.

## 3. Site Speed & Core Web Vitals — Does the page load fast enough?

- **LCP ≤ 2.5s** — Largest Contentful Paint on mobile. Hero image, H1, or first meaningful paint. Preload hero, optimize server response, avoid render-blocking.
- **INP ≤ 200ms** — Interaction to Next Paint. No long tasks blocking the main thread. Defer non-critical JS, use `isInputPending`/`scheduler.yield` patterns.
- **CLS ≤ 0.1** — Cumulative Layout Shift. Reserve space for images, ads, embeds. `aspect-ratio` on media. Font display `swap` with preload.
- **TTFB ≤ 800ms** — Time to First Byte. Edge caching, minimal origin work before first byte.
- **JavaScript weight** — Total JS < 200KB gzipped on mobile. Code-split by route. No unused polyfills.
- **Image optimization** — WebP/AVIF, responsive `srcset`, appropriate dimensions, lazy-load below fold.

## 4. Site Structure & Internal Linking — Can crawlers and users navigate?

- **Shallow depth** — Every important page ≤ 3 clicks from homepage. Service pages, pillar pages, contact.
- **Hierarchy** — URL structure reflects IA: `/services/web-design`, not `/web-design-services`. Breadcrumb trail matches URL hierarchy.
- **Internal links** — Every indexable page has ≥ 3 relevant internal links from other indexable pages. Anchor text describes the destination (not "click here").
- **Orphan pages** — Zero indexable pages with zero internal links. Sitemap inclusion ≠ internal link.
- **Nav/footer** — Global nav links to all pillars. Footer does not stuff 50 links — only the real IA.

## 5. On-Page SEO — Does each page say what it is about?

- **Title tag** — Unique, ≤ 60 chars, primary keyword near front, brand at end. Matches H1 intent.
- **Meta description** — Unique, ≤ 155 chars, includes primary keyword, describes value/outcome, ends with CTA.
- **H1** — Exactly one per page, matches title intent, visible above fold.
- **Heading hierarchy** — H2/H3/H4 nested logically. No skipped levels. Headings contain related terms naturally.
- **Content depth** — Page answers the search intent completely. Thin pages (< 300 words) on commercial terms are expanded or consolidated.
- **Images** — Every meaningful image has descriptive `alt` text. Decorative images have empty `alt=""`.
- **Schema markup** — Valid JSON-LD for page type: Service, Product, Article, FAQPage, BreadcrumbList, Organization. Tested in Rich Results Test.

## 6. Structured Data — Do search engines understand your entities?

- **Organization** — On homepage: name, url, logo, sameAs (real profiles only), address (if local), contactPoint.
- **WebSite** — SearchAction for sitelinks searchbox (if you have site search).
- **Service** — One per service page: name, description, provider (Organization), areaServed, offers (priceSpecification or NotIncluded).
- **FAQPage** — On pages with real FAQs. Each Q/A pair marked up.
- **BreadcrumbList** — On every page deeper than homepage.
- **BlogPosting / Article** — On blog posts: headline, datePublished, dateModified, author (Person or Organization), image, publisher.
- **Review / AggregateRating** — Only if real reviews exist on the page. Never aggregate site-wide on homepage unless reviews are visible there.

## 7. Local SEO (if you serve physical locations)

- **Google Business Profile** — Claimed, verified, NAP matches site footer/schema exactly. Categories specific.
- **LocalBusiness schema** — On contact/location page: address, geo, openingHours, areaServed, telephone.
- **Citations** — Consistent NAP on 10–20 core directories (Yelp, BBB, Chamber, industry-specific).
- **Geo content** — Location pages have unique content (not swapped city names). Real photos, local case studies, directions.

## 8. Measurement — Can you prove it works?

- **GA4** — Enhanced measurement on. `page_view`, `scroll`, `video_play`, `file_download` tracked.
- **Conversion events** — `generate_lead` (or equivalent) fires on contact form submit. Marked as conversion in GA4.
- **Search Console** — Property verified. Sitemap submitted. Indexing API or IndexNow ping on publish.
- **Rank tracking** — Target terms tracked weekly (Ubersuggest, Ahrefs, or GSC average position).
- **UTM hygiene** — Every campaign link tagged. Internal links never carry UTM.

## How to use this checklist

1. **Run top to bottom.** Stop at the first failing section. Fix it completely before moving down.
2. **Assign ownership.** Technical items → dev. Content items → writer/strategist. Local → ops/marketing.
3. **Re-crawl after fixes.** Use Screaming Frog, Sitebulb, or `curl` + GSC URL inspection. Verify before declaring done.
4. **Schedule quarterly.** Technical SEO rots. New plugins, redesigns, migrations, and CMS updates break things.

---

If you would rather have us run this audit and hand you a prioritized fix list, [send the brief](/contact) with your URL. We will tell you what is blocking you and what to fix first — no guesswork, no invented findings.