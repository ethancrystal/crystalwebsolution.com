# SEO run — 2026-10-19 — code SEO audit, redone with embroidery at the centre

Operator: Claude Code session (owner-requested). Branch:
`seo/embroidery-patches-pillars`, stacked on `claude/heritage-embroidery-positioning-8a38b4`
(PR #286, v1.123). Release: v1.125 (v1.124 is held by open PR #287).

Owner instruction, 2026-10-19: "make sure we do the redo and position
embroidery digitizing and patches at the centre of it".

**Goal metric (STRATEGY.md §1): unavailable this run.** GA4 is not connected,
so qualified organic inquiries are not counted or estimated. Leading indicator
from Search Console is below.

## Why this is a redo

An audit with the same date was handed over as
`2026-10-19-code-seo-audit.md`. Checked against this repository and the live
site, it does not hold up:

| Original claim | What is true here |
|---|---|
| "Those issues were corrected in the repository": `llms.txt` now says "Nine service pages", the Shopify page is gone from it, the `/process` title is fixed | **None of it was in this repo.** On 2026-10-19 the live `/llms.txt` still opened with the web-studio blockquote and listed `/hire/shopify-developer`, and the live `/process` title was `Our Process: Design & Build That Ships \| CD Sportswear`. The fixes were made in this run instead. |
| Fix the count by writing "Nine service pages" | Rejected. A written count is what drifted in the first place, and the site now has eleven service pages. `llms.txt` and `/services` state no count; a test pins that. |
| "Run the project build and available test suites from `site/`" | There is no `site/` directory. The app is the repo root (`pnpm test`, `pnpm build`). |
| References `CD-Sportswear-SEO-Implementation-Plan.md` | No such file in the repo. |
| Search Console, crawl status and indexation "were not available" | The GSC connector answers again (property `sc-domain:cdsportswearinc.com`). Figures below. |
| Positioning not mentioned | The biggest gap. The site had no page for embroidery digitizing or custom patches, the business's centre since v1.123. Fixed below. |

The original's other observations (canonical origin centralised in
`lib/seo.mjs`, robots and sitemap sharing it, private routes noindexed and
disallowed, the schema graph) are correct and still are.

## Sources and their limits

| Source | Used for | Access this run |
|---|---|---|
| Repository at `cb3f7e5` (PR #286 head) plus this branch | Code, metadata, schema, llms.txt, tests | Full |
| Live site, `https://www.cdsportswearinc.com` (custom resolver while the local DNS cache was stale) | Status, canonical, robots and title of all 49 sitemap URLs; `/robots.txt`, `/sitemap.xml`, `/llms.txt` | Full, read-only |
| Google Search Console connector | Performance totals and queries, sitemap status, URL Inspection | Full, read-only |
| Ahrefs | Backlinks, competitors, keyword figures | `Insufficient plan`, as in the original. Nothing is claimed from it. |
| Ubersuggest | Keyword figures | Not connected |
| GA4, CrUX field data, Bing Webmaster | Goal metric, Core Web Vitals | Not connected. Not verified. |

## P0 found during the run: `www` had no DNS record

`www.cdsportswearinc.com`, the production host, stopped resolving from about
2026-10-16. Records had been created under `www` (Customer.io and DMARC), and
any record below a name turns it into an empty non-terminal, so the zone's
`*` ALIAS no longer answered for `www` itself. The apex still worked, but the
apex redirects to `www`, so the whole site was unreachable by name.

Fixed 2026-10-19 with the owner's explicit yes: an explicit `www` CNAME to
`cname.vercel-dns.com`, added with the Vercel CLI. Verified at both Vercel
nameservers and at 1.1.1.1, 8.8.8.8 and 9.9.9.9, then HTTPS 200 with a valid
certificate. **Never create records under `www.` again without keeping that
explicit `www` record** (also in STRATEGY.md §8).

Search Console totals below run to 2026-10-17, so they include about two days
of this outage.

## Search Console baseline (first-party)

2026-07-21 → 2026-10-17:

- 223 impressions, 4 clicks, average position 15.4.
- **No embroidery, patch or digitizing query at all.**

Index coverage is the bottleneck, not ranking:

| URL | URL Inspection |
|---|---|
| `/` | Submitted and indexed |
| `/services/seo` | Submitted and indexed |
| `/embroidery-screen-printing-web-design` | Indexed; the last crawl (2026-09-03) recorded the user canonical on the retired `cdsportswearusa.com`, while Google chose the `cdsportswearinc.com` URL. The code canonical is correct today, so a recrawl clears it. |
| `/services`, `/process` | URL is unknown to Google |
| `/services/web-design`, `/services/digital-marketing` | Discovered – currently not indexed |

Sitemap report: 49 URLs submitted, 1 error. The API gives no detail for the
error and reads 0 in its indexed field.

Two blog URLs get Search Console impressions but are not in the sitemap:

- `/blog/soft-navigations-core-web-vitals-spa-websites` returns 200.
- `/blog/google-main-content-service-page-layout` returns 404.

Nothing in the repo links to either. Posts live in Supabase `blog_posts`, so
both are owner checks (below).

## Live crawl (49 sitemap URLs, 2026-10-19)

- All 49 return 200, `index, follow`, and a self-referencing `www` canonical.
- `/process` title lacked the full brand (fixed below).
- Two titles run past 60 characters: `/services/branding` (64) and
  `/work/talk-to-my-lawyer` (61). Not changed: the branding title is a
  ratified ship-table entry (`tests/marketing.test.mjs`), and retitling it
  needs MJ's call.
- `llms.txt` was missing nine published posts, still listed the noindex
  `/hire/shopify-developer`, and opened with the web-studio description.

## What changed in this run

### Embroidery digitizing and patches at the centre

- **Two pillars**, through the existing `/services/[slug]` template:
  - `/services/embroidery-digitizing`: title "Embroidery Digitizing
    Services", H1 "Embroidery digitizing services" (STRATEGY.md §3, theme P1).
  - `/services/custom-patches`: title "Custom Patches with No Minimum
    Order", H1 "Custom patches with no minimum order" (theme P2).

  Every claim comes from `lib/heritage.mjs` or the owner's design brief: the six
  applications, the sew-out and inspection process, the six patch materials
  and the offer's confirmed rows. There is no year figure, since
  `SITE.experience` is still unreconciled with "16 years", and no turnaround,
  since none is confirmed. The only price is the current $5 offer, stated as
  the current offer. Both pages end with the production request form, its
  category preselected, and point their proof at the homepage workbench and
  quality sections, not `/work`. Each has Service, Breadcrumb and FAQ schema
  from the shared template. Neither joins the homepage rail or the camera
  beats.
- **`/services`** now leads with production, then the digital studio. Its
  title, "Services: Digitizing, Patches & Web — CD Sportswear INC", takes no
  pillar's head term. The ItemList also lists production first.
- **Internal links to the pillars.** The homepage is the strongest indexed
  page, so it does the pushing. The Embroidery and Patches outputs
  and the What We Make blocks now link the two pillars, with Crystal
  Digitizing and the patch offer kept as second links.
  `/embroidery-screen-printing-web-design`, which is web design for shops and
  says so, links both pillars for buyers who wanted the embroidery itself.
- **`llms.txt`** starts with an "Embroidery digitizing and patches" section
  (homepage plus both pillars), then "Digital studio services". It states no
  count, has no noindex page, and now includes the nine missing posts.

### The original audit's fixes, made for real

- `/process` title: `Our Process: Design & Build That Ships | CD Sportswear INC`.
- `llms.txt`: count removed (not rewritten) and the Shopify page dropped.

### Strategy and registry

- STRATEGY.md §1–§3 put P1/P2 first, §3 adds the two theme rows, and §8
  records this baseline and the DNS lesson. **These amendments need MJ's
  written yes on the PR (§4)**; the owner's instruction above is quoted in §2,
  but it does not stand in for that confirmation.
- KEYWORD-REGISTRY.md maps six P1/P2 terms to the pillars. Every volume,
  difficulty and CPC is "unavailable" (§5: never estimate). Supporting pages
  (hat, towel and sleeve digitizing; the patch materials) are listed as
  planned, not built.

### Guards

`tests/production-pillars.test.mjs` pins:

- the production group and its order, and each pillar's request category;
- no year figure, no turnaround, and the $5 offer as the only price;
- `/services` production-first with no count;
- the request form on the pillars, and the homepage and shop-page links;
- the `/process` brand and length;
- the STRATEGY and registry rows, with figures still "unavailable".

`tests/home-positioning-copy.test.mjs` pins the new `llms.txt` structure: no
count, no `/hire/`.

## Owner actions

1. **MJ's written yes** on the STRATEGY.md amendments, on the PR.
2. Merge PR #286 (v1.123) first, then this PR. Re-check the number against
   open PRs when it retargets `main`.
3. Once live, use **Request indexing** in Search Console for
   `/services/embroidery-digitizing`, `/services/custom-patches`, `/services`
   and `/process`, and for `/embroidery-screen-printing-web-design` to clear the
   stale `cdsportswearusa.com` canonical.
4. Open the Sitemaps report and read the 1 error. The API does not expose it.
5. `/blog/soft-navigations-core-web-vitals-spa-websites` (200, not in the
   sitemap): confirm its `blog_posts` status. If it is published, find out
   why the sitemap omits it. If it is not, it should not render.
6. `/blog/google-main-content-service-page-layout` (404, has impressions):
   publish it, or 301 it to the closest live post.
7. Keyword figures for P1/P2 (Ubersuggest, or an Ahrefs plan that returns
   them), then add the P1/P2 terms to rank tracking. Pick the 3–5 supporting
   pages from the registry's planned rows only after that.
8. Connect GA4 so the goal metric can be read, not inferred.

## Not verified

- Production HTML of the two new pillars. They exist only on this branch, so
  the check was a local build and browser preview, not the live site.
- Core Web Vitals and backlinks, which need tools that were not available.
