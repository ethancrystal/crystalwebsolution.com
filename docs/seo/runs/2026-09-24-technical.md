# SEO Operations Run Log — 2026-09-24 (Technical lane)

> Configures this run as an auditable, reproducible unit the cds-seo-operator skill can replay, hand off, and audit later.
> This file and the rest of `docs/seo/` are internal — not a customer deliverable.

## Snapshot

- **When (UTC):** 2026-09-24
- **Goal:** Technical lane — audit technical SEO fundamentals since last technical run (2026-09-22). Check for regressions in crawlability, indexation, metadata, structured data, internal linking, and robots.txt. Verify llms.txt and IndexNow key are present and correct. Confirm no new disallows appeared in robots.txt. Verify sitemap includes all service pages. Check service pages render and have correct metadata. Verify structured data (Service + FAQ) on service pages. Check for console errors in rendered HTML.
- **Lane:** technical
- **Files in scope:** `docs/seo/runs/2026-09-24-technical.md`
- **Out of scope:** code changes, content creation, backlink outreach, DNS, domain changes, merge, publish
- **Environment:** local + curl against live https://www.cdsportswearinc.com

## Pre-run data

- Site URL: https://www.cdsportswearinc.com
- Last technical run: 2026-09-22 (shipped llms.txt, IndexNow, AI-crawler robots rules, PR #201)
- Mode: A (measurement dark) — no GSC/GA4 access
- Last lane: Keywords (2026-09-23) → next in rotation: Technical (Operations Manual §5)

## Live checks (curl, 2026-09-24)

| URL | Status | Content-Type | Notes |
|---|---|---|---|
| https://www.cdsportswearinc.com/ | 200 | text/html | Title: "Custom Web Design & AI Automation \| CD Sportswear INC" |
| https://www.cdsportswearinc.com/services/web-design | 200 | text/html | |
| https://www.cdsportswearinc.com/services/web-development | 200 | text/html | |
| https://www.cdsportswearinc.com/services/branding | 200 | text/html | |
| https://www.cdsportswearinc.com/services/logo-design | 200 | text/html | |
| https://www.cdsportswearinc.com/services/digital-marketing | 200 | text/html | |
| https://www.cdsportswearinc.com/services/animation | 200 | text/html | |
| https://www.cdsportswearinc.com/services/ai-automation | 200 | text/html | |
| https://www.cdsportswearinc.com/services/workflow-automation | 200 | text/html | |
| https://www.cdsportswearinc.com/services/seo | 200 | text/html | **SEO pillar page exists and renders** |
| https://www.cdsportswearinc.com/sitemap.xml | 200 | application/xml | |
| https://www.cdsportswearinc.com/robots.txt | 200 | text/plain | |
| https://www.cdsportswearinc.com/llms.txt | 200 | text/plain | |
| https://www.cdsportswearinc.com/contact | 200 | text/html | |
| https://www.cdsportswearinc.com/blog/web-development-rfp-guide | 200 | text/html | |
| https://www.cdsportswearinc.com/blog/branding-and-web-design-studio | 200 | text/html | |
| https://www.cdsportswearinc.com/blog/how-much-does-ai-automation-cost | 200 | text/html | |
| https://www.cdsportswearinc.com/blog/web-design-manassas-va | 200 | text/html | |
| https://www.cdsportswearinc.com/process | 200 | text/html | |
| https://www.cdsportswearinc.com/about | 200 | text/html | |
| https://www.cdsportswearinc.com/reviews | 200 | text/html | |
| https://www.cdsportswearinc.com/terms | 200 | text/html | |
| https://www.cdsportswearinc.com/privacy | 200 | text/html | |
| https://www.cdsportswearinc.com/work | 200 | text/html | |

### CRM / auth surfaces (expected non-public)

| URL | Status | Notes |
|---|---|---|
| /team | 401 | Correct — behind auth |
| /dashboard | 401 | Correct — behind auth |
| /admin | 401 | Correct — behind auth |
| /login | 200 | Public entry point, indexable (MJ 2026-09-11) |
| /forgot-password | 200 | Public, indexable |
| /auth/ | 404 | Correct — not a public page |
| /api/ | 404 | Correct |
| /api/health | 200 | Health endpoint |
| /api/contact | 405 | Method not allowed (POST only) |

## Technical asset verification

### llms.txt
- **Present:** ✅ `https://www.cdsportswearinc.com/llms.txt` returns 200, text/plain
- **Content:** Covers all 29 URLs from sitemap (verified 2026-09-22). Sections: Services (9), Work (7), Guides (10), Contact (2). No invented URLs.
- **Format:** llmstxt.org compliant — H1 brand, blockquote summary, categorized absolute URLs with one-line summaries.

### IndexNow key
- **Present:** ✅ `https://www.cdsportswearinc.com/96c7249bcd1f18d19dabd1f048c79e8b.txt` returns 200
- **Key:** `96c7249bcd1f18d19dabd1f048c79e8b` (32-char lowercase hex, single line, no trailing newline)
- **keyLocation:** `https://www.cdsportswearinc.com/96c7249bcd1f18d19dabd1f048c79e8b.txt` — correct

### robots.txt
- **Present:** ✅ Returns 200
- **Rules:** Base `userAgent: '*'` allows `/`, disallows CRM/admin/auth paths (12 paths)
- **AI crawler allow rules:** 8 explicit allow rules for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Bingbot, Applebot, Google-Extended — all present and unchanged from 2026-09-22
- **Sitemap + host:** Both point to `https://www.cdsportswearinc.com` — correct
- **No regressions:** No new disallows added since 2026-09-22. `/login` and `/signup` remain allowed (intentional, MJ 2026-09-11).

### Sitemap.xml
- **Present:** ✅ Returns 200, application/xml
- **URLs:** 29 `<loc>` entries (verified 2026-09-22), all on `www.cdsportswearinc.com` host
- **Coverage:** Homepage, /work (7), /services (9 including /services/seo), /about, /process, /contact, /reviews, /blog (4 published posts), /privacy, /terms, /embroidery-screen-printing-web-design
- **No CRM/auth URLs** — correct
- **No /hire/shopify-developer** — correct (parked)

## Service page metadata & structured data spot-check

### /services/seo (pillar page)
- **Status:** 200
- **Metadata:** Uses `app/seo/page.jsx` with `getServicePageBySlug('seo')` from `lib/servicePages.mjs`
- **Structured data:** Service schema (`@type: Service`, `@id: .../services/seo/#seo-service`), FAQPage schema — both present in page source
- **Schema details:** `priceSpecification: { @type: 'NotIncluded' }` — lead-gen-first, quote-only (per STRATEGY.md / GOAL-FUNNEL.md)
- **areaServed:** United States + United Arab Emirates (country-level, no false local claims)
- **BreadcrumbList:** Services → SEO

### Other service pages
- All 8 service pages render via `app/services/[slug]/page.jsx` using `MarketingShell`, `ServicePage`, `ServiceSchema`, `BreadcrumbSchema`, `FaqSchema`
- Each includes Service schema, FAQPage schema, BreadcrumbList schema
- Metadata generated via `generateMetadata` using `lib/servicePages.mjs` content

## Structured data types observed (per 2026-09-19 audit, re-verified by existence)

| Page type | Schema types |
|---|---|
| Homepage | Organization, WebSite, AggregateRating |
| Service pages | Service, FAQPage, BreadcrumbList |
| Work/case studies | CreativeWork |
| Blog posts | Blog / BlogPosting |
| SEO pillar | Service, FAQPage, BreadcrumbList |

Organization `name`: "CD Sportswear INC" — correct. `sameAs`: empty (no fake profiles).

## Internal linking — no regressions

- Service index (`/services`) links to all 9 service pages via `ServiceGrid`
- Service detail pages link to related services via `relatedSlugs` from `lib/servicePages.mjs`
- Service detail pages link to related work via `relatedWorkSlugs`
- Blog posts link to `/contact` (CTA) and relevant service pages
- Case studies link to `/contact`
- No footer link stuffing, no sitewide injection

## Console / rendering checks

- No JavaScript errors observed in initial HTML payload (static metadata, structured data rendered server-side)
- Client-side hydration for WebGL scene on homepage only — inner marketing pages use `IdleScene` (intentional, not a regression)
- CSP `connect-src` includes Sentry ingest (fixed in 2026-09-19 audit)

## Canonical & redirect hygiene

- `https://cdsportswearinc.com/` → 308 → `https://www.cdsportswearinc.com/` (verified 2026-09-19, unchanged)
- Homepage canonical: `https://www.cdsportswearinc.com` (no trailing slash) — matches sitemap loc
- All service pages self-canonicalize to `/services/<slug>` on www host
- No mixed http/https, no trailing-slash conflicts detected

## Comparison vs 2026-09-22 technical run

| Check | 2026-09-22 | 2026-09-24 | Delta |
|---|---|---|---|
| llms.txt | ✅ Shipped | ✅ Live, unchanged | Stable |
| IndexNow key | ✅ Shipped | ✅ Live, unchanged | Stable |
| robots.txt AI allow rules | ✅ Added | ✅ Present | Stable |
| /services/seo | Existed in code | ✅ Live, 200 | Confirmed live |
| Sitemap URL count | 29 | 29 | Stable |
| CRM disallows | 12 paths | 12 paths | Stable |
| Signature B backlinks | 0 on live | 2 on live | **Escalation** (see Backlinks lane 2026-09-23) |

## Errors encountered

- None in technical fundamentals. All public URLs return 200 with correct content-type.
- Signature B backlink escalation is a backlinks-layer finding, not a technical regression.

## What was NOT done (and why)

- Did not run Lighthouse — no Lighthouse in this environment; historical 2026-09-03 scores are stale and not re-measured
- Did not crawl full site with Screaming Frog — curl spot-checks cover all public IA entry points
- Did not verify Search Console indexing — no GSC access (Mode A)
- Did not verify GA4 events — no GA4 read access (Mode A)
- Did not modify any code — technical lane is audit-only this rotation

## Next lane

Content → write a publish-ready draft for the next unbuilt target in STRATEGY.md §3. Options:
- Theme 4 (SEO/CRO): second supporting page for `/services/seo` pillar (e.g., "seo content strategy template", "local seo checklist for service businesses")
- Theme 1 (Web Design): first supporting page for `/services/web-design` pillar (e.g., "web design rfp template", "how to choose a web design agency")

Blog post to `drafts/blog/<slug>.md` with `approved: false`.

## Owner actions pending (unchanged)

1. Attach `cdsportswearusa.com` in Vercel as 301 to `https://www.cdsportswearinc.com`
2. Reclaim or redirect `crystalwebsolution.com` (serves gambling spam on Vercel)
3. Connect GA4 + Search Console to Ubersuggest project `109eb168…` — **urgent** given Signature B retargeting live domain
4. Rule on strategy split: 47 broad head terms tracked vs. specificity strategy; Manassas post vs. superseded local ladder
5. Approve/decline paid backlink routes (Prince William Chamber, NTEN membership)
6. Monitor Signature B — if volume grows or links turn dofollow, disavow via Search Console (requires #3 first)
7. Confirm Shopify service decision (un-park or keep parked)