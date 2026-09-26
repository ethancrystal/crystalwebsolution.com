# SEO run — 2026-09-26 — full technical, on-page and business-identity audit

Operator: Claude Code session (owner-requested full audit + implementation).
Branch: `claude/cd-sportswear-seo-audit-ijds83`. Release: v1.58.

**Goal metric (STRATEGY.md §1): unavailable this run.** No GA4 API access, so
qualified organic inquiries are not counted or estimated. Leading indicator
from Search Console (first-party, below): 1 click / 28 impressions in the last
28 complete days, and the two visible queries are both branded.

## How this audit was run — sources and their limits

| Source | Used for | Access this run |
|---|---|---|
| Repository at `origin/main` `1416ce8` | Code, metadata, schema, routes, tests | Full |
| Local production build (`next build` + `next start`, CI placeholder env) | Generated HTML: titles, descriptions, canonicals, robots, OG/Twitter, headings, JSON-LD, links, images; robots.txt and sitemap.xml output | Full for the 27 static URLs. **Blog posts could not render locally** (see below) |
| Google Search Console, property `sc-domain:cdsportswearinc.com` (GSC connector, owner permission) | Performance totals, per-page and per-query rows, sitemap status, URL Inspection for 26 URLs | Full, read-only |
| Supabase project `wmnjosiikehsuaqucvja` (read-only `SELECT` on `blog_posts`) | The 14 published posts: titles, SEO fields, body headings, links, images | Full, read-only |
| Ubersuggest `pagespeed_audit` | Production lab metrics, homepage only | Mobile ok; desktop `unknown_error` (twice) |
| Local Chromium lab probe (`/opt/pw-browsers`, unthrottled, SwiftShader WebGL) | Relative JS/CSS/image weight, LCP element, CLS, long tasks on 7 routes | Full, but **not** representative of production CWV |

Could not be used, and why:

- **The production host itself.** This container's egress policy returns
  `403` on CONNECT to `cdsportswearinc.com` and `www.cdsportswearinc.com`
  (curl, WebFetch). Production HTML, headers, robots.txt and sitemap.xml were
  therefore **not fetched directly**; their production state comes from GSC
  URL Inspection and the local build of the same commit.
- **Supabase from the container** (`403` on CONNECT), so `/blog` and
  `/blog/[slug]` rendered empty locally. Blog content was audited from the
  table via SQL and run through the real parser (`lib/blogMarkdown.mjs`).
- **GA4, Bing Webmaster Tools, CrUX field data:** no connector. Not verified.
- **Local `pnpm build` gotcha found:** this container exports
  `NODE_ENV=development`, which makes `next build` fail prerendering with
  `Cannot read properties of null (reading 'useContext')` — the exact error
  CLAUDE.md records for Windows. With `NODE_ENV=production` the same commit
  builds cleanly (60/60 pages). Recorded in CLAUDE.md.

## Executive summary

The site's SEO plumbing is mostly sound: every indexable static route has a
unique title and description, a self-referencing `www` canonical, `index,
follow`, OG/Twitter cards, `lang="en"`, a viewport, and exactly one `<h1>`.
The problems that matter are elsewhere:

1. **Wrong business identity (P0).** "Sharjah, DXB" is published as a second
   studio in the footer, contact blocks, About copy and FAQ, the OG image and
   the Privacy page, and the site-wide Organization schema declares a Sharjah,
   AE `PostalAddress` and UAE service area. The owner confirmed on 2026-09-26
   that this is **not** a CD Sportswear INC location. No page carries the real
   street or mailing address; Privacy and Terms give "Manassas, VA, United
   States" as a postal address, which is not deliverable.
2. **Most of the site is not indexed (P0, not a code bug).** Of 26 inspected
   URLs, 12 are indexed, 13 are "Discovered – currently not indexed" and
   `/services` is "unknown to Google". Every theme pillar —
   `/services/web-design`, `/services/digital-marketing`,
   `/services/logo-design`, `/services/branding`, `/services/seo` — is
   discovered but not crawled. The indexed service pages were last crawled
   2026-09-02/03 and Google's stored copy still declares the retired
   `cdsportswearusa.com` canonical.
3. **Site-wide review markup outside policy (P1).** `AggregateRating`
   (4.3 / 20) sits on the Organization node on every page; GSC detects
   "Review snippets" on every inspected URL, though the reviews are only
   visible on `/reviews`.
4. **Live blog rendering defects (P1).** 10 of 14 published posts print a
   literal `# Title` paragraph under the real `<h1>`, and 3 posts print a
   stray `!` plus a text link to an Unsplash `.jpg` in place of 6 images.
5. **Robots groups leak private paths to named crawlers (P1).** Bingbot,
   GPTBot, ClaudeBot, PerplexityBot and five others each get their own
   `Allow: /` group, and under RFC 9309 a crawler obeys only its most specific
   group — so none of them inherits the `*` disallows for `/admin`,
   `/dashboard`, `/team`, `/api/`, `/auth/`.
6. **Sitemap freshness (P2).** `/sitemap.xml` is prerendered at build and
   only refreshes when a post is published through the admin UI; seven
   "chore: redeploy to refresh sitemap" commits since 2026-09-22 exist to work
   around that. Every static URL's `lastmod` is the build time, so it changes
   on every deploy without the page changing.
7. **Internal linking gaps (P1–P2).** 8 of 14 published posts are not linked
   from any service pillar; `/hire/shopify-developer` has zero contextual
   inbound links; `/services/digital-marketing`, `/services/seo` and
   `/services/animation` have no supporting posts at all.
8. **Performance is not verified in the field.** Production mobile lab
   (Ubersuggest, homepage): LCP 9.5 s, TBT 18.7 s, CLS 0. Locally, Sentry
   Session Replay is the largest initial chunk on every public page.

## Evidence table

Status uses only VERIFIED / RECOMMENDATION / NOT VERIFIED. P = priority.

| # | P | Area | Finding | Status | Evidence | Impact | Recommended action |
|---|---|---|---|---|---|---|---|
| E1 | P0 | Business identity | "Sharjah, DXB" rendered as a second location on footer, homepage contact, Contact page, About (copy + FAQ), OG image, Privacy | VERIFIED | `lib/site.js` `citySecondary`/`cityCompact`; consumers listed in §Local; owner confirmed not a location (2026-09-26) | Wrong NAP; misleading geography | Remove everywhere; Manassas, VA only |
| E2 | P0 | Structured data | Organization `address` includes `{addressLocality: Sharjah, addressCountry: AE}`; `areaServed` and `contactPoint.areaServed` include UAE; Service `areaServed` includes UAE on all 9 service pages | VERIFIED | `app/layout.jsx`, `components/marketing/ServiceSchema.jsx`, `app/services/[slug]/page.jsx`; local HTML | Conflicting entity location | Single US `PostalAddress` with the real street; `areaServed` United States |
| E3 | P0 | Business identity | No page shows the physical or mailing address; Privacy and Terms "write to us at CD Sportswear INC, Manassas, VA, United States" is not a deliverable address | VERIFIED | `app/privacy/page.jsx`, `app/terms/page.jsx`; repo-wide grep for street/ZIP/P.O. Box = 0 hits | Incomplete NAP; unusable legal contact | Physical address on Contact + schema; P.O. Box as mailing address on Contact/Privacy/Terms only (owner-approved) |
| E4 | P0 | Indexability | 13 of 26 inspected URLs "Discovered – currently not indexed", incl. all 5 theme pillars, `/work`, `/process`, `/reviews`, `/hire/shopify-developer`; `/services` "URL is unknown to Google" | VERIFIED | GSC URL Inspection, 2026-09-26 (table in §Indexability) | Pillars cannot rank until crawled | Owner: request indexing for pillars in GSC; fix sitemap freshness (E9–E10); internal links (E13) |
| E5 | P1 | Canonicals | Indexed pages crawled 2026-09-02/03 still show Google-stored user canonical on `cdsportswearusa.com` (Google chose the `inc` URL anyway) | VERIFIED | GSC `userCanonical` for `/contact`, `/about`, `/services/web-development`, `/services/workflow-automation`, `/services/animation`, `/work/style`, `/embroidery-…` | Stale signals until recrawl | Owner: request re-crawl; 301 `cdsportswearusa.com` → `www.cdsportswearinc.com` (still open, ops §11 #1) |
| E6 | P1 | Structured data | `AggregateRating` 4.3/20 on the site-wide Organization node, emitted on every page; reviews only visible on `/reviews` | VERIFIED | `app/layout.jsx`; GSC "Review snippets" detected on every inspected URL | Structured-data policy risk; self-serving Organization ratings are not shown as stars | Remove site-wide (owner-approved); keep per-review markup on `/reviews` |
| E7 | P1 | Robots | Named bot groups (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Bingbot`, `Applebot`, `Google-Extended`) each contain only `Allow: /`, so they do not inherit `*` disallows | VERIFIED | Local `/robots.txt` output; RFC 9309 §2.2.1 group matching | Bingbot and AI crawlers may request CRM/API/auth URLs | One group, all user agents, same allow/disallow set |
| E8 | P3 | Robots | `Host:` directive emitted | VERIFIED | Local `/robots.txt` | None for Google (non-standard, ignored) | Remove |
| E9 | P2 | Sitemap | `/sitemap.xml` is static (`○` in build output) and refreshes only via `revalidatePath` in the admin publish action; 7 redeploy-only commits 2026-09-22 → 09-25 | VERIFIED | `app/sitemap.js`, `app/actions/blog-actions.js`, `git log --grep "refresh sitemap"` | New posts absent from sitemap until someone redeploys | Hourly revalidation as a safety net |
| E10 | P2 | Sitemap | Every static/service/work URL has `lastmod` = build time | VERIFIED | `app/sitemap.js` `lastModified: now` | `lastmod` is verifiably inaccurate, so search engines learn to ignore it | Omit `lastmod` where no real modification date exists; keep real `updated_at` for posts |
| E11 | P1 | Content rendering | 10/14 posts start with `# <title>` (9 verbatim, 1 without its "(2026 Planning Guide)" suffix); the parser only knows `##`/`###`, so it renders a literal `# …` paragraph | VERIFIED | SQL on `blog_posts`; `parseMarkdown()` on the same text | Visible defect; duplicate title text under the `<h1>` | Drop a leading H1 that restates the title; demote any other `#` to `<h2>` |
| E12 | P1 | Image SEO | 3 posts contain 6 Markdown images; parser outputs `!` + a text link to the image URL | VERIFIED | SQL + parser output | Broken content; outbound links to `.jpg` files | Render as lazy `<img>` with the author's alt text (owner-approved) |
| E13 | P1 | Internal links | 8 published posts not linked from any service pillar: `ai-automation-vs-zapier-make`, `brochure-website-vs-conversion-site`, `when-page-builders-become-a-trap`, `how-much-does-a-small-business-website-cost`, `when-to-redesign-vs-refresh-website`, `website-redesign-services`, `website-redesign-cost`, `wix-harmony-vs-framer-ai-squarespace`; the same 8 fall back to generic "Next" links on the post template | VERIFIED | `lib/servicePages.mjs` `GUIDE_LINKS`; `app/blog/[slug]/page.jsx` `RELATED_BY_SLUG`; SQL | Supporting pages don't feed their pillars both ways (STRATEGY §3) | Add pillar → post and post → pillar links, except the redesign-services post (E17) |
| E14 | P2 | Internal links | `/hire/shopify-developer` has 0 contextual inbound links; STRATEGY §2 and the registry say Shopify is not a sold service and the page is parked, yet it is live and in the sitemap | VERIFIED | Local link graph; `KEYWORD-REGISTRY.md` Parked; PR #208 merged | Orphan page contradicting strategy | Owner decision: confirm Shopify as a sold offer (then link it) or retire the page |
| E15 | P2 | Content gaps | No supporting posts for `/services/digital-marketing` (theme 2), `/services/seo` (theme 4) or `/services/animation` | VERIFIED | SQL + `GUIDE_LINKS` | Pillars without clusters (STRATEGY §3 build order) | Editorial: 3–5 supporting posts per pillar, registry first |
| E16 | P1 | Cannibalization | `/blog/ai-automation-agency` title, H1 and slug use `ai automation agency`, which the registry maps to `/services/ai-automation` | VERIFIED | SQL title; `KEYWORD-REGISTRY.md` | Post competes with its pillar | Editorial: retitle the post to its decision-stage angle; keep the pillar on the head term |
| E17 | P1 | Cannibalization | `/blog/website-redesign-services` title/H1 target `website redesign services`, a tracked term in the registry's "Web design and redesign" cluster, which the registry says would map to `/services/web-design` (not yet formally mapped) | VERIFIED | SQL; `KEYWORD-REGISTRY.md` tracked-but-unmapped table | Post and theme-1 pillar can compete for the same term | Owner rules the mapping; no new pillar → post link until then |
| E18 | P2 | Cannibalization | `/blog/custom-react-nextjs-web-development` title opens with the service page's own title stem "Custom React & Next.js Web Development" | VERIFIED | SQL vs `lib/servicePages.mjs` | Near-duplicate titles | Editorial: lead the post title with the decision question |
| E19 | P2 | Keyword registry | 8 live posts and the live Shopify page are missing or stale in `KEYWORD-REGISTRY.md`; registry still says branding pillar copy is "not yet aligned" although title and H1 now carry `brand identity design` | VERIFIED | Registry vs SQL and `lib/servicePages.mjs` | Cannibalization guard is blind to half the blog | Registry updated this run (records only; mapping new terms still needs research) |
| E20 | P3 | Canonicals | Root layout sets `alternates.canonical: '/'`, so any page without its own canonical (today: 404s and "Post not found") inherits the homepage canonical | VERIFIED | `app/layout.jsx`; local 404 HTML | Latent risk for future routes | Move the homepage canonical to `app/page.jsx` |
| E21 | P3 | Metadata | Meta descriptions over ~160 chars: `/services/seo` (183), `/services/branding` (176); `/terms` is 69 | VERIFIED | Local HTML | Truncation in SERPs | Editorial, low priority |
| E22 | P3 | Metadata | `/process` title ends "\| CD Sportswear" without INC | VERIFIED | `app/process/page.jsx` (title marked "specified by MJ 2026-09-11") | Minor brand inconsistency | Left as-is because the owner specified it; flag only |
| E23 | P3 | Headings | Homepage H1 "Built to be unforgettable.", `/services` H1 "Focused offers. Owned end to end.", `/work` H1 "Built around the real problem." don't name the topic; titles do | VERIFIED | Local HTML | Weaker topical signal | Recommendation only; changing hero copy changes the design |
| E24 | P3 | Structured data | Commercial landing pages (`/embroidery-…`, `/hire/shopify-developer`) use `Article` without `datePublished`/`image` | VERIFIED | Local JSON-LD | Low | Consider `Service` or `WebPage`; no change this run |
| E25 | P2 | Performance | Production mobile lab (homepage): LCP 9.5 s, FCP 2.8 s, TBT 18.7 s, Speed Index 17.4 s, TTI 38.0 s, CLS 0; "unused JavaScript" 522 KB | VERIFIED (lab, one run) | Ubersuggest `pagespeed_audit`, apex, 2026-09-26 | Poor lab scores; field impact unknown | Measure field CWV (CrUX/GSC) before optimizing |
| E26 | P2 | Performance | Sentry client chunk (Session Replay bundled eagerly) is the largest initial script on inner pages: 538 KB raw / 166 KB gzip of 1,117 / 357 KB | VERIFIED (local build) | `.next/static/chunks`, `instrumentation-client.js` | Main-thread and transfer cost on every public page | Owner decision: lazy-load Replay (trade-off: fewer replays of very early errors) |
| E27 | — | Performance | Field Core Web Vitals (LCP/INP/CLS at p75) | NOT VERIFIED | No CrUX/GSC CWV report available to this run | — | Check GSC Core Web Vitals report once there is enough traffic |
| E28 | — | Analytics | Clicks, CTR, conversions, qualified inquiries | NOT VERIFIED beyond GSC totals | No GA4 connector | — | Connect GA4 API for the run |
| E29 | P3 | Image SEO | Homepage carousel: 31 client-tile images × 3 copies, all `alt=""`, no `width`/`height`, 4 eager | VERIFIED | Local HTML | Decorative treatment is correct if the tiles are decorative; measured CLS 0.013 mobile locally | No change; revisit only if field CLS shows shifts |
| E30 | P2 | llms.txt | `public/llms.txt` omits 10 published posts and `/hire/shopify-developer`, and describes Process as "four steps" (the page has six) | VERIFIED | File vs sitemap and `app/process/page.jsx` | Ops-manual rule broken ("must cover every sitemap URL") | Update |

## Critical technical issues

E1–E4 above. E4 is the one that limits everything else: no amount of on-page
work helps a pillar Google has not crawled. It is not caused by a robots or
canonical error (every inspected page is allowed, self-canonical, and in the
submitted sitemap); the pattern — old pages indexed from the 2026-09-02/03
crawl, new or moved pages queued — fits a new domain with no external links
(Ubersuggest 2026-09-10: DA 1, 0 referring domains). What the code can do is
remove reasons for Google to distrust the site's own signals (E9–E10, E7) and
strengthen internal links to the queued URLs (E13).

## Indexability

GSC URL Inspection, 2026-09-26 (Google's view; last crawl in UTC):

| URL | Coverage | Last crawl | Google canonical / user canonical |
|---|---|---|---|
| `/` | Submitted and indexed | 2026-09-21 | `inc` / `inc` |
| `/about` | Submitted and indexed | 2026-09-03 | `inc` / **`usa`** |
| `/contact` | Submitted and indexed | 2026-09-02 | `inc` / **`usa`** |
| `/services/web-development` | Submitted and indexed | 2026-09-02 | `inc` / **`usa`** |
| `/services/workflow-automation` | Submitted and indexed | 2026-09-03 | `inc` / **`usa`** |
| `/services/animation` | Submitted and indexed | 2026-09-02 | `inc` / **`usa`** |
| `/work/style` | Submitted and indexed | 2026-09-02 | `inc` / **`usa`** |
| `/embroidery-screen-printing-web-design` | Submitted and indexed | 2026-09-03 | `inc` / **`usa`** |
| `/blog/web-development-rfp-guide` | Submitted and indexed | 2026-09-26 | `inc` / `inc` |
| `/blog/web-design-manassas-va` | Submitted and indexed | 2026-09-26 | `inc` / `inc` |
| `/blog/branding-and-web-design-studio` | Submitted and indexed | 2026-09-26 | `inc` / `inc` |
| `/blog/website-redesign-services` | Submitted and indexed | 2026-09-26 | `inc` / `inc` |
| `/services` | **URL is unknown to Google** | — | — |
| `/services/web-design`, `/services/digital-marketing`, `/services/seo`, `/services/logo-design`, `/services/branding`, `/services/ai-automation`, `/work`, `/process`, `/reviews`, `/blog`, `/work/crystal-web-solution`, `/hire/shopify-developer`, `/blog/how-much-does-a-small-business-website-cost` | Discovered – currently not indexed | never | — |

`inc` = `https://www.cdsportswearinc.com/…`, `usa` = `https://www.cdsportswearusa.com/…`.

Sitemap in GSC: `https://www.cdsportswearinc.com/sitemap.xml`, submitted
2026-09-21, last downloaded 2026-09-26 01:47 UTC, 0 errors, 0 warnings, 39
URLs submitted. The API's per-sitemap `indexed` count reads 0; that field is
not a reliable index count, so URL Inspection is used instead.

Private routes (local build): `/login` and `/signup` are `noindex, follow`
(deliberate, v1.52); `/login/client`, `/forgot-password` are `noindex,
nofollow`; CRM segments set `index: false` (`tests/seo-onpage.test.mjs`).
404s return HTTP 404 with `noindex`. `/services/` 308-redirects to
`/services`; `/work?x=1` canonicalises to `/work`. No soft-404 found among the
static routes. Blog 404 handling (`generateMetadata` → noindex +
`notFound()`) verified from source only.

## Canonicals

Every indexable static route emits a self-referencing canonical on
`https://www.cdsportswearinc.com` (local build, 27/27), identical to its
sitemap `<loc>` and `og:url`. The homepage canonical and loc are the origin
without a trailing slash; JSON-LD uses `/` — equivalent for a root URL.
Trailing slashes redirect (308) to the slashless form; query strings keep the
clean canonical. Canonical strategy is owned by `lib/seo.mjs` `SITE_ORIGIN`;
unchanged. Production apex → `www` redirect is recorded in CLAUDE.md
(2026-09-03) and in PageSpeed's "Redirects" opportunity when the apex was
tested; not re-fetched directly this run.

## Robots

Syntax valid. CSS, JS, images and `/_next/` are not blocked. The sitemap line
uses the canonical host. Defects: E7 (named groups bypass the private-path
disallows) and E8 (`Host:`). `/login` and `/signup` are intentionally
crawlable so their `noindex` is seen. Production robots.txt was not fetched
directly (egress); GSC reports `robotsTxtState: ALLOWED` on every crawled URL.

## Sitemap

27 static URLs locally (+14 posts in production per the DB, 39 at GSC's last
download). All are canonical, 200, indexable and on the canonical host; no
private routes, duplicates, redirects or 404s among the static set. Issues:
E9, E10. `changefreq`/`priority` are ignored by Google and left alone.

## Metadata — route inventory (local build, before changes)

| Route | Title (len) | Desc len | Canonical | Robots | OG/Twitter | H1 |
|---|---|---|---|---|---|---|
| `/` | Custom Web Design & AI Automation \| CD Sportswear INC (53) | 149 | self | index,follow | yes | Built to be unforgettable. |
| `/services` | Services: Websites, Brands & Automation — CD Sportswear INC (59) | 141 | self | index,follow | yes | Focused offers. Owned end to end. |
| `/services/web-design` | Custom Web Design Studio \| CD Sportswear INC (44) | 160 | self | index,follow | yes | Custom web design for brands |
| `/services/web-development` | Custom React & Next.js Web Development \| … (58) | 153 | self | index,follow | yes | Custom React & Next.js development |
| `/services/branding` | Brand Identity Design Services for Companies \| … (64) | 176 | self | index,follow | yes | Brand identity design that won’t blend in |
| `/services/logo-design` | Custom Logo Design Services for Brands \| … (58) | 127 | self | index,follow | yes | Custom logo design and brand systems |
| `/services/digital-marketing` | Digital Marketing Agency for Brands \| … (55) | 141 | self | index,follow | yes | Digital marketing agency for brands |
| `/services/animation` | Animation & Motion \| … (38) | 105 | self | index,follow | yes | Animation |
| `/services/ai-automation` | AI Automation Agency for Business \| … (53) | 133 | self | index,follow | yes | AI automation for business |
| `/services/workflow-automation` | Workflow Automation \| … (39) | 125 | self | index,follow | yes | Workflow Automation |
| `/services/seo` | SEO Agency — Search Engine Optimization \| … (59) | 183 | self | index,follow | yes | Search engine optimization agency for brands |
| `/work` | Selected Work \| … (33) | 120 | self | index,follow | yes | Built around the real problem. |
| `/work/tucker-trips` | Tucker Trips — Web & app development \| … (56) | 131 | self | index,follow | yes | Tucker Trips |
| `/work/talk-to-my-lawyer` | Talk to My Lawyer — Web & app development \| … (61) | 137 | self | index,follow | yes | Talk to My Lawyer |
| `/work/style` | Style — E-commerce \| … (38) | 134 | self | index,follow | yes | Style |
| `/work/zeus-towing-services` | Zeus Towing Services — Web design \| … (53) | 158 | self | index,follow | yes | Zeus Towing Services |
| `/work/prestige-online-learning` | Prestige Online Learning — Case Study \| … (57) | 140 | self | index,follow | yes | Prestige Online Learning |
| `/work/crystal-web-solution` | CD Sportswear INC — Immersive web experience (44) | 138 | self | index,follow | yes | CD Sportswear INC |
| `/about` | About Our Web Design & Branding Studio — CD Sportswear INC (58) | 139 | self | index,follow | yes | A studio built on clarity, craft, and impact. |
| `/process` | Our Process: Design & Build That Ships \| CD Sportswear (54) | 118 | self | index,follow | yes | From idea to outcome, without the limbo. |
| `/contact` | Send Your Project Brief — CD Sportswear INC (43) | 139 | self | index,follow | yes | Send us your brief. |
| `/reviews` | Client Reviews \| … (34) | 111 | self | index,follow | yes | What clients said, in their own words. |
| `/blog` | Studio Notes on Web Design & Branding — CD Sportswear INC (57) | 137 | self | index,follow | yes | What we’re building, and what we learned doing it. |
| `/privacy` | Privacy Policy \| … (34) | 112 | self | index,follow | yes | Privacy Policy |
| `/terms` | Terms of Service \| … (36) | 69 | self | index,follow | yes | Terms of Service |
| `/embroidery-screen-printing-web-design` | Embroidery & Screen-Printing Web Design \| … (59) | 147 | self | index,follow | yes | Website Design for Embroidery & Screen-Printing Shops |
| `/hire/shopify-developer` | Hire a Shopify Developer \| … (44) | 150 | self | index,follow | yes | Hire a Shopify Developer Who Scopes to the Problem You Actually Have |

No duplicate titles or descriptions. Every page: `lang="en"`, viewport meta,
icon links, `summary_large_image`. Blog posts (from DB): all 14 have a unique
`seo_title` (32–62 chars) and `seo_description` (86–160 chars) and a cover
image; rendered metadata not fetched (egress).

## Headings

Exactly one `<h1>` on every static route. Blog: the template renders the title
as the only `<h1>` and demotes author headings, but E11 prints the Markdown H1
as literal text. Post bodies use 7–11 `##` sections each; none use `####`+.

## Internal linking

Global chrome (nav + footer) links every page to Work, Services, Blog,
Process, Reviews, About, Contact, Privacy, Terms. Contextual inbound links
(excluding chrome), local build:

| URL | Contextual inbound pages |
|---|---|
| `/services/web-design`, `/services/web-development` | 12 each |
| `/work`, `/contact` | 22, 11 |
| `/services/branding`, `/services/digital-marketing` | 6 each |
| `/services/ai-automation` | 5 |
| `/services/logo-design`, `/services/workflow-automation`, `/services/seo` | 4 each (`/services/seo` not linked from the homepage rail, by design) |
| `/services/animation` | 3 |
| `/embroidery-screen-printing-web-design` | 2 |
| `/hire/shopify-developer` | **0** |

Case studies → services: all six link to their related service pages
(v1.53). Blog → commercial: all 14 posts link to at least one `/services/*`
page in-body (SQL). Generic anchors: none of the "click here / learn more"
kind; the homepage rail's "More info" links carry
`aria-label="More info about <service>"`. No external outbound links on the
static pages.

## Keyword targeting — service matrix

Keyword source is `KEYWORD-REGISTRY.md` / STRATEGY.md §3 only; nothing new is
invented here. Inbound = contextual inbound pages from the table above.

| URL | Primary intent | Primary keyword cluster (registry) | Existing title | Existing H1 | Inbound | Cannibalization risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `/services/web-design` | Commercial | Theme 1: `websites designers` + web design / redesign cluster | Custom Web Design Studio | Custom web design for brands | 12 | **High** vs `/blog/website-redesign-services` (E17); moderate vs homepage title "Custom Web Design…" | Get it indexed first (E4); owner rules the redesign term |
| `/services/web-development` | Commercial | Not a §3 theme; supported by RFP + React posts | Custom React & Next.js Web Development | Custom React & Next.js development | 12 | Medium vs `/blog/custom-react-nextjs-web-development` (E18) | Differentiate the post title |
| `/services/branding` | Commercial | Theme 3: `brand identity design` (+ `…services`) | Brand Identity Design Services for Companies | Brand identity design that won’t blend in | 6 | Low | Aligned; registry note corrected |
| `/services/logo-design` | Commercial | Theme 3: `logo design` (+ `logo design services`) | Custom Logo Design Services for Brands | Custom logo design and brand systems | 4 | Low–medium: H1 "brand systems" overlaps the branding pillar | Consider an H1 without "brand systems"; add a case study |
| `/services/digital-marketing` | Commercial | Theme 2: `digital marketing agency` | Digital Marketing Agency for Brands | Digital marketing agency for brands | 6 | Low | Build the cluster (E15) |
| `/services/animation` | Commercial | Unmapped | Animation & Motion | Animation | 3 | Low | Keyword research before retitling; weakest-linked pillar |
| `/services/ai-automation` | Commercial | `ai automation agency` (Monitor) | AI Automation Agency for Business | AI automation for business | 5 | **High** vs `/blog/ai-automation-agency` (E16) | Retitle the post |
| `/services/workflow-automation` | Commercial | Unmapped | Workflow Automation | Workflow Automation | 4 | Low: related links both ways already separate it from AI automation | Keyword research; case study needed |
| `/services/seo` | Commercial | Theme 4: `search engine optimization agencies` (+ `seo agency near me`) | SEO Agency — Search Engine Optimization | Search engine optimization agency for brands | 4 | Low | Build the cluster (E15) |

Pairs the brief asked about: web design vs custom development — separated
(design-led vs React/Next.js engineering), but the React post shares the dev
page's title stem. AI automation vs workflow automation — pages are
differentiated; the AI-agency post is the conflict. Branding vs logo design —
split ruled 2026-09-22 and implemented; only the logo H1 blurs it. Local web
design vs general — `/blog/web-design-manassas-va` is a metro supporting page
allowed by STRATEGY §2 and links up to `/services/web-design`.

## Content opportunities

No new content was written. Evidence-backed gaps, in STRATEGY §3 order:

1. Theme 2 (`/services/digital-marketing`) and theme 4 (`/services/seo`) have
   pillars but **zero** supporting posts. The registry lists the tracked
   terms; pick narrow terms (difficulty ≤ 30) before drafting.
2. The website-redesign cluster (3 live posts) is unregistered; decide which
   URL owns `website redesign services` (E17) before writing more redesign
   content.
3. Case-study proof is missing for logo design, AI automation and workflow
   automation. Only real projects qualify; none were invented.

## Case studies

| Case study | Client | Problem → solution | Service category / related pages | Technologies stated | Documented outcome |
|---|---|---|---|---|---|
| `/work/tucker-trips` | Tucker Trips | Generic blog theme → map-first trip logbook + light authoring flow | Web & app dev → web-development, web-design | Not stated | Qualitative only ("reads less like a blog") |
| `/work/talk-to-my-lawyer` | Talk To My Lawyer | Form-heavy letter flow → guided builder | Web & app dev → web-development | Not stated | Qualitative only |
| `/work/style` | Style | Generic storefront → editorial product pages, faster filtering, mobile-first | E-commerce → web-design, web-development | Not stated | Qualitative only |
| `/work/zeus-towing-services` | Zeus Towing Services | Slow cluttered site → mobile-first, phone-first, service-area structure | Web design → web-design, digital-marketing, seo | Not stated | Qualitative only |
| `/work/prestige-online-learning` | Prestige Online Learning | Confusing platform → learning path, progress, dashboard | Web & app dev → web-development | Not stated | Qualitative only |
| `/work/crystal-web-solution` | CD Sportswear INC (own site) | Interchangeable agency page → WebGL world driven by section data | Immersive web → web-design, animation | WebGL, shared motion clock, reduced-motion path | Qualitative only |

No fabricated metrics anywhere; the `/work` FAQ says so explicitly. The
`/work/crystal-web-solution` slug keeps the retired brand name; renaming it
needs a redirect and is an owner call (it is not indexed yet, so the cost of a
rename is lowest now).

## Image SEO

Static pages: 33 distinct images, all with an `alt` attribute. Logo (53
placements) `alt="CD Sportswear INC"` with width/height. Homepage carousel
tiles and `/d/02-messenger.gif` are `alt=""` (decorative). Blog: 6 authored
images currently not rendered (E12); their alt text is descriptive, but
whether it matches the image content is **not verified** (Unsplash blocked by
egress). Cover images exist for all 14 posts and are used for OG/`BlogPosting`
`image`.

## Structured data

Present: `Organization`+`ProfessionalService` and `WebSite` (site-wide,
`@id`-linked), `Service` (service pages), `BreadcrumbList` (all inner pages),
`FAQPage` (pages with visible FAQs), `ItemList` (`/services`, `/work`,
`/reviews` with `Review` items), `CreativeWork` (case studies), `Article`
(two landing pages), `BlogPosting` (posts). All blocks parse as JSON. One
Organization entity site-wide; Service and BlogPosting reference it by `@id`
or name. Issues: E2, E6, E24. No `sameAs` (correctly empty until profiles are
real), no hours, no geo, no awards.

## Local / business SEO

- Business name: "CD Sportswear INC" everywhere (legacy `cd-sportswear-usa-*`
  logo filenames are served assets, left alone).
- Location before this run: Manassas, VA **and** Sharjah, DXB (E1–E3).
- Address after this run (owner-approved): physical
  `8956 Dahlgren Ridge Rd, Manassas, VA 20111, United States` — schema
  `address` and Contact page; mailing `P.O. Box #41424, Arlington, VA 22204,
  United States` — Contact, Privacy and Terms only, never in schema. No
  opening hours, no "visit us" wording: service-area business, national and
  remote per STRATEGY §2.
- Google Business Profile, Bing Places, directories, social profiles: **not
  verified** — none are referenced by the site and no connector exists.

## Performance / Core Web Vitals

Production (Ubersuggest `pagespeed_audit`, apex `cdsportswearinc.com`, mobile
lab, 2026-09-26, single run): FCP 2.8 s, LCP 9.5 s, Speed Index 17.4 s, TBT
18.7 s, TTI 38.0 s, CLS 0. Opportunities: unused JS 522 KB (~600 ms),
redirects ~1.1 s (the apex → `www` hop, an artifact of testing the apex),
unused CSS 16 KB. Desktop: `unknown_error` twice.

Local lab (unthrottled, SwiftShader WebGL, decoded bytes; relative only):

| Route | Device | LCP element | CLS | Long tasks | JS KB | IMG KB |
|---|---|---|---|---|---|---|
| `/` | mobile | `p` (hero copy) | 0.013 | 42 | 2,433 | 1,247 |
| `/` | desktop | `span.decode` | 0.004 | 22 | 2,552 | 1,247 |
| `/services` | mobile | `h1.blur-letters` | 0 | 2 | 2,093 | 397 |
| `/services/web-design` | mobile | `h1.blur-letters` | 0 | 3 | 2,263 | 397 |
| `/work/zeus-towing-services` | mobile | `p.section-reveal` | 0 | 1 | 1,299 | 397 |
| `/contact` | mobile | `h1.blur-letters` | 0.005 | 1 | 2,070 | 397 |
| `/about` | mobile | `h1.blur-letters` | 0 | 1 | 2,070 | 397 |

`/blog` was excluded (Supabase timeout locally). Initial `<script>` tags on
`/about`: 1,117 KB raw / 357 KB gzip, of which Sentry is 538 / 166 KB (E26).
No third-party requests on the local build (GTM/GA are production-only).
Fonts: 88 KB (3 families via `next/font`). The WebGL scene was **not**
changed; nothing here proves it is the production bottleneck.

## Search Console / Analytics

GSC, 2026-08-29 → 2026-09-25: 1 click, 28 impressions, CTR 3.6%, average
position 4.9. Pages with impressions: `/about` (23), `/` (17),
`/services/workflow-automation` (11), `/services/animation` (9),
`/services/web-development` (9), `/work/prestige-online-learning` (6),
`/work/style` (5), `/work/zeus-towing-services` (5), `/embroidery-…` (4).
Visible queries: `cdsportswearinc.com` (11 impressions), `cd sportswear` (2);
the rest are anonymised. Too little data for CTR or decline analysis.
GA4: **not verified.**

## Recommended implementation plan

Implemented in this run (v1.58), in priority order: E1–E3, E6, E2, E7–E8,
E11–E12, E9–E10, E13 (except the redesign-services post), E20, E30, E19
(registry records). Left for the owner or for editorial work: E4/E5 (GSC
requests, old-domain 301), E14, E15–E18, E21–E24, E25–E27.

---

# After implementation (same day, v1.58)

## Changes implemented

Owner decisions taken in the session (2026-09-26), each the recommended
option: remove Sharjah; publish the physical address as a service-area
business (no hours, no visit wording) with the P.O. Box as mailing address
only; remove the site-wide `AggregateRating`; render blog Markdown images.

| Finding | Change |
|---|---|
| E1, E3 | `lib/site.js`: `citySecondary`/`cityCompact` removed; `address` and `mailingAddress` added with `cityStateZip()`. "Also Located in" lines removed from `MarketingFooter`, homepage `Contact`, `ContactPulseLinks`; Contact lists "Physical address" and "Mailing address"; About paragraph + FAQ and Contact FAQ + "Direct" paragraph reworded to Manassas-only, remote-by-default; OG image shows `SITE.city`; Privacy "operates from" sentence and Privacy/Terms "write to us" lines use the real addresses, "Last updated" → September 26, 2026. Privacy data-transfer clause left as-is (legal statement, not a location claim) |
| E2, E6 | `app/layout.jsx`: single `PostalAddress` spread from `SITE.address`; `areaServed` and `contactPoint.areaServed` US only; `AggregateRating` removed. `ServiceSchema` default and web-design `areaServed` drop the UAE |
| E20 | Homepage canonical moved from `app/layout.jsx` to `app/page.jsx` |
| E7, E8 | `app/robots.js`: one group for `*` + named crawlers sharing the private-path disallows; `host` removed |
| E9, E10 | `app/sitemap.js`: `revalidate = 3600`; `lastModified` only on posts |
| E11, E12 | `lib/blogMarkdown.mjs`: `#` headings parsed; a leading one that restates the title (verbatim, or the title minus a trailing qualifier) is dropped, others become `<h2>`; `![alt](src)` → image token, `safeImageSrc()` allows https and site-relative only. `PostBody` passes `title` and renders `<img class="post-image" loading="lazy" decoding="async">`; `.post-image` CSS in `app/styles/case-study.css` |
| E13 | `lib/servicePages.mjs` `GUIDE_LINKS`: +3 posts on web-design, +1 on web-development, +1 on ai-automation, +1 on workflow-automation. `app/blog/[slug]/page.jsx` `RELATED_BY_SLUG`: entries for the 8 posts that fell back to the default |
| E19 | `KEYWORD-REGISTRY.md`: 10 unregistered live posts recorded as unmapped (no volumes invented), Shopify state conflict, branding-pillar note corrected |
| E30 | `public/llms.txt`: 10 posts + `/hire/shopify-developer` added; Process described as six steps |
| — | CLAUDE.md build gotcha (`NODE_ENV`); ops manual §1 Search Console row and §11 items 12–15; STRATEGY §8 current state |

Not changed on purpose: the WebGL scene, any hero/H1 copy (E23 — would change
the design), the owner-specified `/process` title (E22), post titles and
bodies in `blog_posts` (E16–E18 are editorial and live content edits are an
approval gate), the Sentry setup (E26 — owner trade-off), and anything at
the DNS/Vercel layer.

## Validation

All run in this container on the final tree.

| Check | Result |
|---|---|
| `pnpm test` (`tests/*.test.mjs` + `tests/crm/*.test.mjs`) | 579 / 579 pass (578 at the first post-change run, before the last parser case was added). The suite was not run on the untouched baseline |
| `pnpm test:marketing` (vitest) | 12 files, 42 / 42 pass |
| `pnpm build` with CI placeholder env and `NODE_ENV=production` | Pass, 60/60 static pages; `/sitemap.xml` reported as `○ … 1h` (revalidating) |
| Lint / typecheck | No lint script exists (CLAUDE.md); `next build` ran its TypeScript step without errors |
| Before/after crawl of the built site, 37 URLs | On every 200 page: titles, descriptions, robots, `lang`, H1 count and canonicals unchanged. Only diffs: 404s no longer carry a homepage canonical; 4 pillars gained guide links; Privacy/Terms dates |
| Generated metadata | 27 distinct indexable pages, 27 unique titles and descriptions, all self-canonical on `www`, one `<h1>` each |
| robots.txt output | One group (`*` + 8 named crawlers), 12 disallows, sitemap line, no `Host` |
| sitemap.xml output | Same 27 static URLs as before, no `lastmod` on them |
| JSON-LD | 0 parse errors on 37 URLs; one Organization per page; address = the Manassas street address; no UAE, no P.O. Box, no `aggregateRating` anywhere |
| Visible text | Contact shows both addresses; Privacy/Terms show the P.O. Box; no "Sharjah"/"DXB" on any crawled page |
| Internal links | 32 distinct internal non-blog hrefs on the static pages, 0 broken; all 11 blog hrefs point at posts `blog_posts` reports as published; RELATED targets likewise |
| Blog rendering | Verified by parser tests on the real openings (SQL: 9 verbatim title restatements, 1 prefix) and a jsdom render of `PostBody`; **not** verified on a rendered production post (egress) |

No before/after performance comparison was made: no change in this release
targets performance, and production cannot be measured from here.

## Remaining issues

- E4/E5: pillars not indexed; Google's stored canonical still on the old host
  for 7 indexed pages — owner action in GSC (ops §11 #12) and the
  `cdsportswearusa.com` 301 (ops §11 #1).
- E14 Shopify page, E17 `website redesign services` ownership, E26 Sentry
  Replay — owner decisions (ops §11 #13–15).
- E16/E18: retitle `/blog/ai-automation-agency` and
  `/blog/custom-react-nextjs-web-development` away from their pillars' terms
  (editorial, via the admin UI).
- E15: supporting posts for digital marketing, SEO and animation.
- E21–E24: long descriptions, `/process` brand suffix, topical H1s, `Article`
  on landing pages — low priority.

## Not yet verified

- Production HTML, headers, robots.txt and sitemap.xml fetched directly
  (egress-blocked); rendered blog posts on production.
- Field Core Web Vitals (no CrUX / GSC CWV data); desktop PageSpeed (tool
  error). The one mobile lab run is a single sample.
- GA4 traffic, conversions and qualified inquiries; Bing Webmaster data.
- Google Business Profile, Bing Places, directory and social listings.
- Whether each blog image matches its alt text (Unsplash blocked).
- The effect of any change here on indexing or rankings — measure at T+7 /
  T+30 in GSC; nothing in this run is claimed as an SEO improvement.

## Next SEO actions (priority order)

1. After merge: GSC "Request indexing" for the pillars and re-crawl requests
   for the stale-canonical pages (ops §11 #12); resubmit the sitemap.
2. After merge: `node scripts/seo/indexnow-ping.mjs` for `/contact`, `/about`,
   `/privacy`, `/terms`, the four pillars with new links, and the 10 posts
   whose rendering changed.
3. Owner rulings: ops §11 #13 (Shopify), #14 (redesign term), #15 (Sentry
   Replay), #1 (301 the old domain).
4. Editorial: retitle the two cannibalising posts (E16, E18).
5. Build the theme-2 and theme-4 clusters (E15), registry first.
6. Re-inspect the 26 URLs in GSC on 2026-10-03 (T+7) and record coverage.

## Files changed

`CHANGELOG.md`, `CLAUDE.md`, `VERSION`, `app/about/page.jsx`,
`app/blog/[slug]/page.jsx`, `app/contact/page.jsx`, `app/layout.jsx`,
`app/opengraph-image.jsx`, `app/page.jsx`, `app/privacy/page.jsx`,
`app/robots.js`, `app/services/[slug]/page.jsx`, `app/sitemap.js`,
`app/styles/case-study.css`, `app/terms/page.jsx`,
`components/marketing/ContactPulseLinks.jsx`,
`components/marketing/MarketingFooter.jsx`,
`components/marketing/PostBody.jsx`, `components/marketing/ServiceSchema.jsx`,
`components/sections/Contact.jsx`, `docs/seo/KEYWORD-REGISTRY.md`,
`docs/seo/OPERATIONS-MANUAL.md`, `docs/seo/STRATEGY.md`,
`docs/seo/runs/2026-09-26-full-audit.md`, `lib/blogMarkdown.mjs`,
`lib/servicePages.mjs`, `lib/site.js`, `public/llms.txt`,
`tests/blogMarkdown.test.mjs`, `tests/content.test.mjs`,
`tests/marketing/postBody.test.jsx` (new),
`tests/marketing/serviceSchema.test.jsx`,
`tests/seo-identity-and-crawl.test.mjs` (new).
