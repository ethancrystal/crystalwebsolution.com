# Active goal

**Goal:** MJ approved a specific query/ranking goal on 2026-09-26: rank the RFP guide for `rfp web development`.

**Finish line:** Search Console average position **≤10** for query `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, held for **14 consecutive complete reporting days**, by **2027-03-31**. A day without a reportable impression for the exact query/page pair has no measurable position and does not count toward the sustain window.

**Source:** Google Search Console, domain property `sc-domain:cdsportswearinc.com`, query and page filters applied together; web search type. Search Console is the only finish-line source. Ahrefs/Semrush figures, when available, may inform prioritization but are estimates and cannot prove goal progress.

**Baseline:** **0 clicks, 0 reportable impressions; average position unavailable** for the exact query/page pair, 2026-08-27–2026-09-23 (latest complete 28-day window queried on 2026-09-26; Pacific Time; GSC Search Analytics API, exact `query` AND `page` filters, final data). The unfiltered query and page tables returned no row for the exact target. Do not interpret position `0` as a rank. Property-wide totals for this range were 1 click, 23 impressions, CTR 4.35%, average position 5.65; these do not substitute for the target baseline.

## Current rung (set by MJ 2026-09-28, armed as a session `/goal`)

**Rung 1 — the guide appears in search at all:** at least **1 Search Console impression** for `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, **any query** (page filter only), Web, **final data**, in a 28-day window ending on or before **2026-11-15**. Proof: `get_search_console_quick_stats` with the page `equals` filter, `dataState: final`, number quoted. This rung sits under the finish line above, which is unchanged. It is a separate check from milestone 2, which needs the exact query *and* page together.

**Baseline (2026-09-28):** final data 2026-08-29–2026-09-25, page filter: **0 impressions, position unavailable**. Fresh, not-yet-final data (`dataState: all`) 2026-09-26–2026-09-28 already shows **4 impressions, avg position 8.75, all on 2026-09-27**. The only query shown is `cdsportswearinc.com` (1 impression, position 24, Italy); the other 3 are anonymized. That's the first sign of life since at least 2026-07-01, and it does **not** count until it's final. Check 2026-09-30.

**Fallback rule (measurement):** Search Console leaves out rare, anonymized queries whenever a query filter is used, so no row doesn't mean zero searches. If the page has had page-level impressions (final data) for 60 days but the exact pair still returns no rows, flag it to MJ as a measurement limit. Don't record it as "no progress". Only MJ can widen or change the query.

**Status (2026-09-28):** **Behind.** Milestone 2 not met: exact pair still has 0 reportable impressions, position unavailable (2026-08-29–2026-09-25, `get_seo_goal_snapshot`, final data; sustain window 2026-09-12–2026-09-25 `insufficient-data`). Context: the page has had no reportable impression for *any* query since at least 2026-07-01, and Google has not yet seen any of the three internal links to it (see the 2026-09-28 run note). Every open front is gated on MJ. Run note: `docs/seo/runs/2026-09-28-goal-monger.md`.

**Status (2026-09-26):** Baseline recorded; no target-query visibility is reportable yet. Indexing milestone verified complete on 2026-09-26. Current milestone: earn the first reportable impression for the exact query/page pair. This is an operational ranking goal explicitly approved by MJ; it does **not** replace or amend the ratified business outcome goal in `STRATEGY.md` and `GOAL-FUNNEL.md` (qualified organic inquiries).

## Milestones

| # | Done when | Proof source | Status | Closed on (evidence) |
|---|---|---|---|---|
| 1 | Target URL returns HTTP 200, is in the live sitemap, is indexable, and Search Console reports indexed with matching user and Google canonicals. | Live HTTP check; `https://www.cdsportswearinc.com/sitemap.xml`; GSC URL Inspection for the exact URL. | **Done** | 2026-09-26: HTTP 200; sitemap lists the target (last modified 2026-09-24); GSC verdict PASS, coverage “Submitted and indexed,” robots ALLOWED, indexing INDEXING_ALLOWED, fetch SUCCESSFUL, and user/Google canonical both `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`; last crawl 2026-09-26 06:06:46 UTC. |
| 2 | At least one reportable Search Console impression exists for the exact query/page pair in a complete reporting window, making position measurable. | GSC Search Analytics API, exact query + page filters, final data. | **In progress** | — |
| 3 | Average position is ≤20 for the exact pair over a complete 28-day window. | GSC Search Analytics API, exact query + page filters, final data. | Not started | — |
| 4 | Average position is ≤10 for the exact pair on each of 14 consecutive complete reporting days, by 2027-03-31. Missing/non-reportable days do not count. | GSC daily Search Analytics rows, exact query + page filters, final data. | Not started | — |

## Open fronts

| Front | State | Last move |
|---|---|---|
| Measurement: rung 1, first final page-level impression (fresh data already shows 4 on 2026-09-27) | **Pending** until 2026-09-30, when 2026-09-27 should turn final. Re-pull with page filter, `dataState: final`, window ending on the latest final day | 2026-09-28 baseline |
| Content: RFP worksheet + scorecard (`docs/seo/drafts/downloads/web-development-rfp-worksheet.md`) | **Gated** on MJ review; check 2026-10-03. Gated 1 run so far. Escalate if still gated at the next run | 2026-09-26 draft |
| Discovery: Google hasn't crawled the three pages that link to the guide (`/services/web-development` last crawled 2026-09-02 with the retired `cdsportswearusa.com` canonical; `/services/web-design` discovered, not indexed; `/blog/custom-react-nextjs-web-development` unknown to Google; re-inspected later on 2026-09-28: now "Discovered – currently not indexed", with Google finding it via `/blog/figma-sites-vs-webflow` and the sitemap, and the other two unchanged) | **Gated** on MJ: GSC UI "Request indexing" for all three (no API for it) | 2026-09-28 found |
| Authority: outreach to 4 Tier-1 RFP prospects (`docs/seo/backlinks/outreach-drafts/2026-09-28-rfp-guide.md`) | **Gated** on MJ's yes per message | 2026-09-28 drafts |
| Hygiene: untracked `docs/seo/drafts/blog/web-development-rfp-template.md` in the main checkout (would publish a second `/blog/` URL for the owned query if approved) | **Gated** on MJ's OK to delete; not touched (another session's checkout) | 2026-09-28 found |

## Moves (newest first)

| Week of | Move | Milestone | Baseline | Check date | Result | Lesson |
|---|---|---|---|---|---|---|
| 2026-09-28 (later) | MJ set rung 1 (≥1 final page-level impression by 2026-11-15). Pulled its baseline, re-inspected the guide and the three linking pages. No site change. | Rung 1 | Page, any query, final: 0 impressions (2026-08-29–2026-09-25). Fresh: 4 impressions, avg pos 8.75 on 2026-09-27. Guide re-crawled 2026-09-26 06:06 UTC, still indexed and self-canonical. | 2026-09-30 (the 2026-09-27 data turns final) | **Pending.** No move claimed as the cause: the impressions arrived the day after the 2026-09-26 re-crawl, before any gated front shipped. | Don't change the guide or its links while this first reading is going final, or the result can't be read. |
| 2026-09-28 | Re-verified the 4 Tier-1 RFP-guide backlink prospects (all HTTP 200, slots and terms unchanged) and drafted one gated, send-ready message each: Nonprofit WP, Choose Manassas, Mason SBDC, and an ASU Lodestar pre-pitch. Raised the Request-indexing owner action for the three linking pages. | 2 — first reportable impression | Exact pair: 0 impressions, position unavailable (GSC, 2026-08-29–2026-09-25). Target page, any query: 0 impressions (2026-07-01–2026-09-25). Referring domains: 0 (Ubersuggest estimate, 2026-09-10). | On MJ's yes per message. Referring domain shows in GSC Links about 2–4 weeks after a link goes live; remeasure the exact pair 28 days after the first live link or recrawl. | **Gated, not sent.** No ranking effect claimed. | The page isn't in striking distance of anything; it has no impressions for any query. The blocker is discovery and trust, not on-page match. Google knows only `/blog` as a referrer, so the internal links built in v1.48 haven't counted yet. |
| 2026-09-26 | Prepare a review-ready, reusable RFP worksheet and scorecard package for the live guide; include the proposed contextual CTA and the existing web-development-pillar link; do not publish or alter CMS content in this run. | 2 — first reportable impression | 0 reportable clicks/impressions; average position unavailable (GSC, 2026-08-27–2026-09-23). | 2026-10-03 for approval/status; remeasure after any approved live change has aged 28 days. | **Draft ready for MJ review.** Not shipped to the live page; no ranking effect claimed. | The page is live, indexed, canonical, and already links to `/services/web-development`. Two currently visible RFP guides differentiate with downloadable editable templates. A practical worksheet is the most actionable content-gap draft; it is not a promise of ranking lift. |

The 2026-09-26 move's draft lives at `docs/seo/drafts/downloads/web-development-rfp-worksheet.md` (moved out of `drafts/blog/` so the publish script can never turn it into a second `/blog/` URL for the owned query).

## Queued goals

None.

## Finished goals

None.
