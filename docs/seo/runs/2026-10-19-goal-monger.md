# 2026-10-19 goal-monger weekly run (scheduled, non-interactive)

**Goal:** GSC average position ≤10 for exact query `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, held 14 consecutive complete reporting days, by 2027-03-31 (ledger: `docs/seo/goals.md`).

**STRATEGY §1 business goal (qualified organic inquiries): unavailable this run.** GA4 isn't wired to this session.

## Measurement

All figures: Google Search Console, property `sc-domain:cdsportswearinc.com`, Web, `dataState: final`, Pacific Time, retrieved 2026-10-19 ~01:12 UTC. End date 2026-10-16 (today minus 3).

### Goal metric: exact query AND page (`get_seo_goal_snapshot`)

| Window | Dates | Clicks | Impressions | Avg position |
|---|---|---|---|---|
| Current | 2026-09-19 to 2026-10-16 | 0 | 0 | unavailable |
| Previous | 2026-08-22 to 2026-09-18 | 0 | 0 | unavailable |
| Sustain (≤10) | 2026-10-03 to 2026-10-16 | — | 0 on all 14 reported days | `insufficient-data`, 0 days meeting |

**Milestone 2 (first reportable impression for the exact pair): not met.**

### Context only: these rows don't measure the goal

| Scope | Tool / filter | Dates | Result |
|---|---|---|---|
| Guide page, any query | `get_search_console_quick_stats`, page equals | 2026-09-19 to 2026-10-16 | 9 impressions, 0 clicks, avg pos 6.89. By day: 4 on 09-27 (pos 8.75), 2 on 09-28 (pos 8), **3 new on 10-05 (pos 3.67)**. The other 24 reported days had 0; 09-19 not reported. |
| Guide page, query breakdown | same, dimension query | same | One visible row: `cdsportswearinc.com` (1 impression, pos 24). The other 8 impressions are anonymized. |
| Property, any query containing `rfp` | query contains `rfp` | same | **0 rows, 0 impressions.** No visible RFP query reaches any page on the property. |
| Property-wide | no filter, dimension page | same | 4 clicks, 223 impressions, avg pos 15.43. |

The page-level signal is real but small, and the queries behind it are anonymized. By the ledger's fallback rule, the 60-day measurement-limit flag can't trigger before ~2026-11-26 (60 days after the first final page impression on 2026-09-27).

### URL Inspection (`inspect_url`)

| URL | Coverage | Last crawl | Note |
|---|---|---|---|
| `/blog/web-development-rfp-guide` | Submitted and indexed, PASS | 2026-09-26 06:06 UTC | Canonicals match. Referring URLs: **only `/blog`** (unchanged since 2026-09-28). |
| `/services/web-development` | Submitted and indexed, PASS | **2026-09-02** (not recrawled in 47 days) | Google's last crawl still saw user canonical `https://www.cdsportswearusa.com/...` (retired domain). Live page, fetched 2026-10-19, links to the guide under "Further reading". |
| `/services/web-design` | Discovered, currently not indexed | never | Unchanged. |
| `/blog/custom-react-nextjs-web-development` | Discovered, currently not indexed | never | Unchanged. |

Live check (web fetch, 2026-10-19): the guide loads, with title "Web Development RFP: Guide and Template | CD Sportswear INC". Local `curl` couldn't resolve DNS for the domain in this session, so HTTP status codes came from the fetch tool, not from `curl -I`.

## Verify (moves due)

- **2026-09-26 RFP worksheet draft:** check date 2026-10-03 has passed. Still `approved: false`, not shipped. **Gated 3 runs now (09-28, 10-05, 10-19). Escalated to MJ.**
- **2026-09-28 Mason SBDC outreach:** reply check ~2026-10-08 has passed. This session can't see the `sales@` mailbox, so the reply status is **unknown, and MJ needs to report it**. GSC Links wasn't queried (no API tool). No follow-up goes out without a fresh yes.
- **Request indexing for the 3 linking pages:** not done. All three inspections are unchanged from 2026-09-28. Still gated on MJ, since the GSC UI has no API.

## Move this run

**Internal link to the guide from an indexed, crawled development post.** In `app/blog/[slug]/page.jsx`, `soft-navigations-core-web-vitals-spa-websites` gets its own related-links entry: `/services/web-development`, `/blog/custom-react-nextjs-web-development` and `/blog/web-development-rfp-guide`. Before this it fell back to the generic `DEFAULT_RELATED`.

- **Why this beats the runner-up:** Google knows the guide only through `/blog`, and every other page that links to it has either never been crawled or was last crawled 47 days ago. This post *is* indexed and earning impressions (16 impressions, avg pos 8.0, same window, page-level context), so Google crawls it, and it's development-themed (SPA/Core Web Vitals). The runner-up was another internal link from a web-design post, but those belong to the Desk's `/services/web-design` cluster.
- **Baseline:** guide referring URLs = `/blog` only; exact pair 0 impressions (above).
- **Check:** after it merges, URL Inspection should list the soft-navigations post as a referring URL. Re-measure the exact pair 28 days after merge.
- **Gate:** a code PR. Merging deploys production, so it waits for MJ.

## Overlap check

- Open PR #282 (`seo/weekly-2026-10-05`, v1.122) is last week's run of this lane: GSC was unavailable then and nothing else changed. It's still unmerged, so its run note isn't on `main`, and its findings are carried forward here. It can be closed without loss once this PR lands.
- Open PR #286 (v1.123) repositions the homepage and STRATEGY §1/§2/§8 around **embroidery digitizing**. It doesn't touch the guide, but if MJ ratifies it, the priority of a web-development RFP goal is MJ's call. Flagged, not acted on.
- Hermes/Desk run logs from 2026-10-06 to 2026-10-19 cover web-design drafts, keyword pulls and a code SEO audit (`llms.txt`, `/process` title). None of them touches the RFP guide or its query. No duplication.

## Report

```
GOAL: avg pos ≤10 for "rfp web development" on /blog/web-development-rfp-guide, 14 consecutive days — deadline 2027-03-31
CONTEXT: SEO · proof: GSC sc-domain:cdsportswearinc.com (reachable) · GA4 unavailable · ledger: docs/seo/goals.md
STATUS: Behind. 0 impressions for the exact pair in either 28-day window; page-level signal is small and anonymized.
PROGRESS: 0 impressions / position unavailable → 0 impressions / position unavailable (target ≤10) [GSC final, 2026-09-19 to 2026-10-16]
MILESTONES: ✅ 1 indexed+canonical · ✅ rung 1 page impression · ▶ 2 first exact-pair impression · ○ 3 ≤20 · ○ 4 ≤10 held 14 days
MOVES THIS RUN: internal link from /blog/soft-navigations-core-web-vitals-spa-websites → gated (PR, needs merge)
OPEN FRONTS: worksheet draft → gated on MJ review (3 runs, escalated) · Request indexing ×3 → gated on MJ (GSC UI) · Mason SBDC reply → unknown, MJ to report · 3 other prospects → blocked on addresses · internal-link PR → gated on merge
STOPPED BECAUSE: Everything is waiting. Every remaining front is gated on MJ.
WAITING ON MJ: (1) review/approve the RFP worksheet draft; (2) GSC "Request indexing" for /services/web-development, /services/web-design, /blog/custom-react-nextjs-web-development; (3) say whether Mason SBDC replied; (4) review/merge this PR; (5) confirm whether the RFP goal keeps priority if #286's embroidery-first repositioning is ratified
RESTARTS WHEN: any MJ action above, or the next weekly run (2026-10-26), which re-pulls GSC and re-inspects the guide's referring URLs
```
