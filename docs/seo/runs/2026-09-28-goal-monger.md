# Goal-monger — weekly run — 2026-09-28

Operator: Claude Code, scheduled task `seo-goal-monger-weekly` (non-interactive).
Branch: `seo/weekly-2026-09-28` from `origin/main` `5caf5ab`.

**Goal metric (STRATEGY §1, qualified organic inquiries): unavailable this run.**
GA4 is not wired to this session, and `docs/ANALYTICS.md` (v1.82) records the
live tag as broken (`G-B42BM1Q95J` 404s; fix is owner-side). No inquiry count
is estimated.

## Goal (from `docs/seo/goals.md`, unchanged)

GSC average position ≤10 for exact query `rfp web development` on
`https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, held 14
consecutive complete reporting days, by 2027-03-31. Property
`sc-domain:cdsportswearinc.com`.

## Verify

### Goal metric — exact query AND exact page

Source: Search Console connector `get_seo_goal_snapshot`, retrieved
2026-09-28T12:35Z. Filters `query equals "rfp web development"` AND
`page equals https://www.cdsportswearinc.com/blog/web-development-rfp-guide`,
one AND group, Web, final data, Pacific Time.

| Window | Clicks | Impressions | CTR | Avg position |
|---|---|---|---|---|
| Current, 2026-08-29 → 2026-09-25 | 0 | 0 | unavailable | **unavailable** |
| Previous, 2026-08-01 → 2026-08-28 | 0 | 0 | unavailable | **unavailable** |
| Sustain, 2026-09-12 → 2026-09-25 | 0 reported days with impressions (09-12→09-19 not reported; 09-20→09-25 reported with 0 impressions) | — | — | `thresholdStatus: insufficient-data` |

Milestone 2 (first reportable impression) is **not** met. Flat against the
2026-09-26 baseline (0 impressions, 2026-08-27 → 2026-09-23). A query filter
drops anonymised low-volume queries, so this is "no reportable data", not
proof of zero searches.

### Context rows (not the goal metric)

| Scope | Range | Result | Tool |
|---|---|---|---|
| Page-only (target page, every query) | 2026-08-29 → 2026-09-25 | 0 clicks, 0 impressions, no query rows | `get_search_console_quick_stats`, page equals filter, final |
| Query-only (`rfp web development`, every page) | 2026-08-29 → 2026-09-25 | 0 clicks, 0 impressions, no page rows | same, query equals filter, final |
| Property-wide | 2026-08-29 → 2026-09-25 | 1 click, 34 impressions, CTR 2.94%, avg position 7.59 | same, no filters |
| Property-wide by page | 2026-07-01 → 2026-09-25 | 9 page rows (`/`, `/about`, `/services/web-development`, `/services/animation`, `/services/workflow-automation`, `/embroidery-screen-printing-web-design`, three `/work/*`). **The RFP guide is in none of them** | same, dimension page |
| Property-wide by query | 2026-07-01 → 2026-09-25 | 3 query rows, all branded (`cdsportswearinc.com`, `cd sportswear`, `consumer direct sports supplies inc`) | same, dimension query |
| Sitemap | last downloaded 2026-09-27 23:21 UTC | 41 submitted, 0 errors, 0 warnings; the "indexed" count reads 0 | `list_sitemaps` (the per-sitemap indexed count is known to lag; not treated as an indexing fact) |

**What the context says.** The guide has had no reportable impression for
*any* query since at least 2026-07-01, and the whole property shows only
branded queries. Milestone 2 is blocked by discovery and trust, not by a
mismatch between the page and the query. On-page edits to the guide are not
the binding constraint right now.

### Indexing and internal-link discovery (GSC URL Inspection, 2026-09-28)

| URL | Coverage | Last crawl | Note |
|---|---|---|---|
| `/blog/web-development-rfp-guide` (target) | Submitted and indexed, PASS | 2026-09-26 06:06 UTC | User and Google canonical match. **Only referring URL Google reports: `/blog`** |
| `/services/web-development` | Submitted and indexed, PASS | **2026-09-02 21:15 UTC** | Stored copy predates v1.48 (2026-09-23), which added the guide link. Google still holds user canonical `https://www.cdsportswearusa.com/services/web-development` (retired domain) |
| `/services/web-design` | **Discovered – currently not indexed** | never | Links to the guide (GUIDE_LINKS.web) since v1.48 |
| `/blog/custom-react-nextjs-web-development` | **URL is unknown to Google** | never | Live 200, in sitemap (lastmod 2026-09-24), links to the guide |

Live checks (curl, 2026-09-28): target returns 200 with title "Web Development
RFP: Guide and Template | CD Sportswear INC" and a self canonical; it is in
`/sitemap.xml`. `/services/web-development` and `/services/web-design` each
carry one live `href="/blog/web-development-rfp-guide"`.

So the three internal links built for this page exist on the live site, but
Google has seen none of them. That is the cheapest unblock available, and it
is owner-side (GSC UI "Request indexing" has no API).

### Previous move

| Move (2026-09-26) | Check date | State today |
|---|---|---|
| RFP worksheet + scorecard draft, `docs/seo/drafts/downloads/web-development-rfp-worksheet.md` | 2026-10-03 | **Gated on MJ review, not yet due.** Not re-verified or edited this run. First run it's been gated; if it's still gated at the next run, escalate |

## SERP sample (not Google)

A third-party search index (Parallel `web_search`, 2026-09-28) returned the
target guide first for `rfp web development`. **That index is not Google and
this is not evidence of a Google position.** Useful only for format: the
other results with templates offer them as downloads (Sayenko Design Word
template; New Media Campaigns DOCX/Pages; requestforproposaltemplate.com),
which agrees with the 2026-09-26 worksheet gap finding.

## This run's move

**Authority front: gated, send-ready outreach drafts for the four Tier-1
prospects where the RFP guide is the natural link target.**
File: `docs/seo/backlinks/outreach-drafts/2026-09-28-rfp-guide.md`.

- Re-fetched each prospect page first (all HTTP 200, slots and terms
  unchanged). Recorded in `docs/seo/backlinks/prospects.md`.
- Nonprofit WP (resource-link suggestion), Choose Manassas (founder resource
  suggestion), Mason SBDC ("Other Resources" suggestion), ASU Lodestar
  (pre-pitch asking whether a bio link is allowed *before* writing 500–750
  words).
- Nothing sent. Each message needs MJ's yes separately.

**Why this beats the runner-up.** The runner-up was an on-page change to the
guide. The page-only context row shows zero impressions for any query, so
on-page tuning has nothing to tune against, and the worksheet (the content
front) is already waiting for review on the same target. Outreach touches a
different lever and doesn't stack a second untested change on the page.

**Owner action raised (above the outreach in priority, but not doable by the
agent):** GSC "Request indexing" for `/services/web-development`,
`/services/web-design` and `/blog/custom-react-nextjs-web-development`. It
exposes the three internal links to the guide and replaces Google's stale
`cdsportswearusa.com` canonical on the web-development pillar.

## Overlaps and risks checked

- **Open PRs:** #258 (sitemap redeploy) covers sitemap freshness, so this run
  doesn't propose one. No open PR touches the RFP guide or outreach.
- **Untracked file in the main checkout:** `docs/seo/drafts/blog/web-development-rfp-template.md`
  (`approved: false`, `target_query: rfp web development`) sits in the main
  checkout at `C:\Users\moizjmj\CD Sportswear USA\site` and is not in git. It
  looks like a leftover copy of the worksheet from before the 2026-09-26 move
  to `drafts/downloads/`. Under `drafts/blog/`, approving it would publish a
  second `/blog/` URL for the owned query. Another session owns that
  checkout, so it was **not deleted or moved**. MJ to confirm it can be
  deleted.
- **Sibling draft:** `docs/seo/drafts/blog/how-to-write-a-web-design-rfp.md`
  (`approved: false`) targets `web design rfp` and links to the development
  guide. The registry keeps the two queries apart, and the draft is
  correctly positioned as a companion. Low risk while it stays unapproved.
  If it's ever approved, watch the exact pair for position loss in the
  following 28 days.

## Measurement notes

- The Search Console connector worked in this session (read-only).
- `web_search` was rate-limited once and then succeeded.
- No Ubersuggest/Semrush/Ahrefs figures were pulled or used this run.

## Report

```
GOAL: GSC avg position ≤10 for "rfp web development" on /blog/web-development-rfp-guide, 14 consecutive complete days — deadline 2027-03-31
CONTEXT: SEO · proof: Search Console sc-domain:cdsportswearinc.com (reachable) · STRATEGY §1 goal metric: unavailable this run (GA4 not wired) · ledger: docs/seo/goals.md
STATUS: Behind — milestone 2 (first impression) not met; the page has no reportable impression for any query since ≥2026-07-01
PROGRESS: 0 impressions / position unavailable (2026-08-27→09-23) → 0 impressions / position unavailable (2026-08-29→09-25) (target ≤10 held 14 days)  [GSC exact query+page, final]
MILESTONES: ✅ 1 indexed + self-canonical · ▶ 2 first reportable impression · ○ 3 ≤20 over 28 days · ○ 4 ≤10 for 14 consecutive days
MOVES THIS RUN: outreach drafts for 4 Tier-1 RFP prospects → gated (not sent) · prospect pages re-verified 200
OPEN FRONTS: worksheet draft → gated on MJ review, check 2026-10-03 · outreach (4 messages) → gated on MJ's yes per message · request indexing for 3 linking pages → gated on MJ (GSC UI, no API) · stray drafts/blog RFP template in the main checkout → gated on MJ's OK to delete
STOPPED BECAUSE: Everything is waiting — every open front is gated on MJ; no live change is in a lag window
WAITING ON MJ: (1) GSC Request indexing: /services/web-development, /services/web-design, /blog/custom-react-nextjs-web-development · (2) review worksheet draft · (3) yes/no on each of 4 outreach drafts · (4) OK to delete untracked drafts/blog/web-development-rfp-template.md in the main checkout · (5) review/merge the v1.87 docs PR
RESTARTS WHEN: 2026-10-03 worksheet check, MJ's yes on any gated item, or the next scheduled weekly run — whichever comes first
```
