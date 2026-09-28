# Goal-monger — first push — 2026-09-26

## Goal

**Finish line:** GSC average position ≤10 for `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, sustained for 14 consecutive complete reporting days by 2027-03-31. MJ confirmed this exact goal and milestone ladder on 2026-09-26. It is a leading-indicator ranking goal and does not replace the ratified qualified-organic-inquiry business goal.

## Verification and baseline

**Property:** `sc-domain:cdsportswearinc.com`; connected read-only local GSC account reports `siteOwner`.

**Baseline range:** 2026-08-27–2026-09-23 inclusive, last complete 28-day window available at the 2026-09-26 pull; Pacific Time; Search Console Search Analytics API; final data; Web search type; exact query `rfp web development` AND exact page `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`.

- Exact pair: 0 clicks, 0 reportable impressions. No measurable average position; **position is unavailable, not zero**.
- Separate unfiltered query and page rows: exact query and exact page were absent from the returned rows; both tables returned other rows (2 query rows and 9 page rows). Low-volume/anonymized query reporting may omit rows.
- Property-wide totals for the same range: 1 click, 23 impressions, CTR 4.35%, average position 5.65. These are not target-query metrics.
- Search Analytics request: `dimensionFilterGroups` combines `query equals` and `page equals`; daily exact-pair rows returned 0 metrics for 2026-09-20 through 2026-09-23. Do not infer a rank from an all-zero day.

## Technical eligibility milestone

Completed 2026-09-26:

- Live HEAD request: HTTP 200 at the requested canonical URL.
- Live sitemap: exact URL included; last modified 2026-09-24.
- GSC URL Inspection: verdict PASS; coverage “Submitted and indexed”; `robotsTxtState=ALLOWED`; `indexingState=INDEXING_ALLOWED`; `pageFetchState=SUCCESSFUL`; Google canonical and user canonical both match the target URL. Last crawl: 2026-09-26 06:06:46 UTC.

## SERP / content-gap evidence

- Target guide fetched on 2026-09-26. It is a substantial practical article, including an 11-section copyable RFP, proposal-scoring weights, and a service-oriented closing CTA. It already links to `/services/web-development`; no missing pillar link was found.
- Live US search sampling on 2026-09-26 returned RFP guides/templates including [New Media Campaigns — How to Write a Great Website RFP](https://www.newmediacampaigns.com/blog/website-design-request-for-proposal-template-tips) (published/updated 2026-07-13; provides editable DOCX and Pages templates and covers SEO/analytics and other requirements) and [DesignRush — How To Write a Web Development RFP](https://www.designrush.com/agency/web-development-companies/trends/website-development-rfp) (published 2025-10-30, updated 2025-12-11; offers a free template and emphasizes outcomes). These are a small page sample, not a full top-10 SERP teardown or a claim about exact current positions.
- Current gap opportunity: make the existing useful template easier to put into practice with an editable worksheet and same-criteria scorecard, while retaining the copyable in-page version. This is a hypothesis to test, not a forecast of ranking improvement.

## This week's move

Drafted `docs/seo/drafts/downloads/web-development-rfp-worksheet.md`: review-ready worksheet, response checklist, evaluation scorecard, CTA/placement proposal, and implementation guardrails. It remains `approved: false`; nothing was added to the public site, CMS, sitemap, or Search Console. No change can be credited with ranking impact yet.

**Why this beats the runner-up:** technical indexability, canonical, and sitemap are already verified, and the guide already has its web-development-pillar link. A reusable template is the clearest observed information-gain gap in the sampled relevant pages. Do not make a second on-page change while a later approved change is awaiting its 28-day measurement window.

## Measurement/connectors

- Direct Search Console access worked only through the user's Windows-local, read-only stdio MCP and Credential Manager. It is not configured as a Manus connector, so this local integration is not available to a future cloud-scheduled task.
- Semrush MCP returned that the current plan does not include MCP access. Ahrefs project discovery returned an insufficient-plan error. No third-party keyword volume/difficulty or backlink estimate was substituted for first-party data.
- The current task has no schedule (`manus-config schedule status` returned `{}`). Earlier schedule creation in this project was blocked by task-control authorization. Do not claim a schedule exists or bypass that control. The user has previously requested a recurring weekly SEO task; resume creation only when the scheduler is authorized for this task.

## Status and next check

**STATUS:** Baseline measured; target query position unavailable because there are no reportable impressions. The page is indexed and technically eligible. No pace claim is possible from the zero-visibility baseline.

**MILESTONES:** ✅ Indexed, self-canonical, in sitemap · ▶ First reportable impression for exact query/page · ○ Average position ≤20 over 28 days · ○ ≤10 for 14 consecutive complete days.

**LAST MOVE:** Confirmed live/indexed/canonical status → technical milestone closed [GSC URL Inspection, 2026-09-26].

**THIS WEEK'S MOVE:** Review the editable RFP worksheet/scorecard draft; approve or request changes. This precedes further content edits because the page already meets indexability requirements and already points to its service pillar.

**WAITING ON MJ:** Review whether to convert the worksheet into an accessible DOCX/PDF and add the draft CTA through the normal content/release process. A production publish/merge remains owner-controlled.

**NEXT CHECK:** 2026-10-03 for review/measurement-access/schedule status; if a site change is approved and published, start its 28-day evaluation clock from the confirmed live date. If not published, keep this move pending and do not attribute GSC movement to the draft.
