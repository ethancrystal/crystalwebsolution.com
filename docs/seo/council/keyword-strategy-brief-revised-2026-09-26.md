# Agent Council Brief — RFP Goal Preflight and Evidence Gate

**Prepared:** 2026-09-26  
**Revision:** v2, after Council span `council-9ff5275853ea`  
**Purpose:** Review the evidence preflight for the already-recorded SEO move; do not reopen the work-item selection.  
**Status:** Internal review artifact only. No execution or publication is authorized.

## Scope and decision

`docs/seo/goals.md` already records the current move: prepare a review-ready RFP worksheet and scorecard for the existing RFP guide, with its proposed contextual CTA and a link to the existing web-development pillar. That draft is recorded as awaiting MJ's review. This brief does **not** ask the Council to choose again among the RFP worksheet, the Web Design rotation, or a third keyword opportunity.

The question for this review is narrower:

> What evidence must be refreshed, and what pass/fail conditions must be met, before the owner considers the already-recorded RFP draft for any next step? If the evidence shows that the current move is no longer appropriate, what fact should be escalated to MJ rather than silently changing the plan?

Keep the review proportional. A full multi-agent Council run is not the default weekly SEO data-gathering step. Run the Council only when a material written recommendation or high-stakes strategy artifact needs independent critique. Routine GSC refreshes, indexing checks, and inventory checks belong in the weekly operating run note.

## Governing strategy and owner-approved goal

`docs/seo/STRATEGY.md` governs SEO decisions. Its business outcome is qualified organic inquiries. It fixes a national, remote-first positioning, a four-theme pillar-and-cluster method, one primary query per owning URL, and the approved theme order. Strategy changes require MJ's written approval; actions leaving the repository—including publishing and PR merge—require the stated owner approval. The keyword registry remains the query-to-URL source of truth.

The tactical ranking goal in `docs/seo/goals.md` is separate from the business outcome: Search Console average position ≤10 for exact query `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide` for 14 consecutive reportable days by 2027-03-31. The finish-line source is the GSC domain property `sc-domain:cdsportswearinc.com`, Search Analytics API, web search type, with the exact query and exact page filters applied together. A day without a reportable impression has no measurable position and does not count toward the sustain window.

The current recorded move is to prepare the worksheet/scorecard as a reviewable asset, not to publish it or claim it will improve ranking. The unpublished draft is at `docs/seo/drafts/downloads/web-development-rfp-worksheet.md`. Confirm this is still the active move at the start of the run; do not supersede it without evidence and MJ's approval.

## Baseline: what it establishes—and what it does not

The recorded exact-query-plus-exact-page baseline was 0 clicks, 0 reportable impressions, and average position unavailable for 2026-08-27 through 2026-09-23. GSC was queried on 2026-09-26 and returned final data. Property-wide statistics, query-only rows, and page-only rows are not substitutes for this exact-pair result.

The target page was recorded as HTTP 200, in the sitemap, indexable, and indexed with matching user-selected and Google canonical URLs on 2026-09-26. That establishes the indexing milestone at that time; it does not prove current query visibility, ranking, or demand.

**Interpretation guardrail:** zero reportable impressions on an indexed URL is a diagnostic signal that the target query/page pair has not surfaced in this GSC report over that window. It does **not**, by itself, prove why: it is not proof of a Google penalty, a technical indexing failure, no market demand, a content-depth problem, or a definitive absence from every live SERP. Do not infer that adding a worksheet will create rankings or impressions. Diagnose the cause before proposing a content change as a ranking fix.

The registry maps `rfp web development` and `website development rfp` to the existing guide. Its recorded 260/month volume and difficulty 13 are Ubersuggest estimates pulled 2026-09-10; they are dated third-party estimates, not first-party demand or ranking evidence. Do not treat them as current without revalidation.

## Mandatory preflight before the owner reviews the draft

Record each check as **pass**, **fail**, or **unavailable**, with source, timestamp, property/URL, filter, date window, and limitations. An unavailable check remains open; do not fill it with inference.

| Check | Required evidence | Gate |
|---|---|---|
| Current move and duplicate work | Read the latest `docs/seo/runs/` note, the goal ledger, current site/repo state, and open PRs/issues available to the operator. Confirm the worksheet has not already shipped or been superseded. | If already done or overlapping, stop and report the conflict. |
| Exact-pair performance | Re-pull the latest complete GSC window with exact `query` AND exact `page` filters and final data. Record clicks, impressions, CTR, position only when measurable, search type, property, and dates. Keep query-only, page-only, and property-wide context in separate rows. | If unavailable, stale, partial, or incorrectly filtered, do not make a performance recommendation. |
| Query/page diagnosis | Compare the exact pair with query-only and page-only reports as separate context; inspect the URL's present index/canonical status; check the target query's live U.S. SERP and search intent; inspect the current guide for intent match and whether the worksheet solves a user need. Note date, locale, and method for any SERP sample. | If there are still no exact-pair impressions, report a diagnosis and competing explanations. Do not prescribe a content-depth rewrite solely from zero impressions. |
| Cannibalization and page ownership | Check `docs/seo/KEYWORD-REGISTRY.md`, live pages, drafts, and internal links for the two mapped RFP phrases and related intent. Verify the existing `/services/web-development` relationship. | Do not create a competing URL or reassign the mapped terms. Escalate a genuine ownership conflict. |
| Asset quality and usefulness | Review the RFP worksheet/scorecard draft against actual procurement tasks, truthful service scope, accessibility/usability, and consistency with the guide. Identify any factual gaps. | Keep as draft until MJ reviews it. No ranking-lift claim without subsequent evidence. |
| Strategy fit and process cost | Verify the action remains a narrow supporting asset consistent with the approved pillar/cluster system, and state the opportunity cost without reopening the fixed rotation by assumption. Ask whether this decision actually needs another full Council run. | Any conflict with the ratified strategy is a proposal for MJ, not an automatic edit. |

## Possible findings and next-step handling

1. **Preflight complete; draft remains useful and aligned.** Report the evidence, explain what user problem the asset addresses, and send the existing draft for MJ's review. Do not publish or claim SEO impact.
2. **Exact pair still has no reportable impressions.** Keep the ranking result as “position unavailable.” Identify which diagnostic checks can distinguish query demand/wording, current SERP intent, and technical/discovery context. Treat the worksheet as a possible user-helpful sales resource—not an assumed ranking remedy—and ask MJ whether to retain or defer it if its purpose is unclear.
3. **Exact pair now has impressions or meaningful movement.** Report the fresh measurements with the exact filters and period. Assess the already-prepared asset against the observed intent gap. Do not alter the target or URL absent evidence and owner approval.
4. **Evidence or ownership conflicts with the existing move.** Report the specific source and impact, pause any overlapping work, and present MJ with the smallest decision needed. Do not silently switch to another pillar or keyword.
5. **Measurement, current repository work, or live URL evidence is unavailable.** Mark the preflight incomplete and specify the owner/tool/access needed. Do not mark the action ready by default.

## Council output requested

Give one Council verdict (`SHIP`, `REVISE`, or `HOLD`) **only for the quality of this preflight brief**. Then separately state a readiness finding for the evidence packet: `READY FOR OWNER REVIEW`, `EVIDENCE HOLD`, or `SCOPE/STRATEGY ESCALATION`. Cite the missing checks when holding; preserve the distinction between observed fact and hypothesis; summarize the strongest counterargument; and recommend whether another full Council review is proportionate.

**Execution gate:** Even a Council `SHIP` or an evidence-packet `READY FOR OWNER REVIEW` is not permission to publish, merge, alter the strategy/keyword registry, contact anyone, or claim a ranking outcome. Those actions remain subject to the project’s existing explicit approval rules. The file is ready for owner review only after every mandatory preflight row above has a sourced status.

## After the preflight

Append a dated note to `docs/seo/runs/` with the refreshed evidence, status for each gate, any issue that needs MJ's decision, the draft's proposed disposition, verification date, and open limitation. Update the active move only if an approved decision changes it. Measure any later live change using the exact query-plus-page GSC filters over an appropriate completed period; report results without attributing causality from a single observation.
