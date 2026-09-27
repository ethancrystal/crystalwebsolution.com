# CD Sportswear INC — Continuous SEO Operating Plan

**Prepared:** 2026-09-26  
**Site:** `https://www.cdsportswearinc.com`  
**Purpose:** Run a sustained, evidence-led program that improves qualified organic inquiries—not rankings or traffic volume for their own sake.

## Executive direction

Keep the ratified strategy in `STRATEGY.md`: serve the US market as a remote-first studio; organize work around the four commercial pillars; give each query one owning URL; build supporting pages only when they solve a real buyer question; and measure success at the qualified-inquiry end of the funnel. The weekly program should combine first-party Search Console evidence, Ahrefs/Semrush research, technical verification, useful content work, internal-linking, and cautious backlink monitoring. It should produce one coherent, reviewable work item at a time, not a new batch of unrelated blog posts.

## Goal and measurement

The outcome metric remains the qualified-organic-inquiry definition and checkpoints in `STRATEGY.md` / `GOAL-FUNNEL.md`:

- **T+90 — 2026-12-02:** at least 1 qualified organic inquiry.
- **T+180 — 2027-03-02:** at least 5 qualified organic inquiries in the trailing month.
- **T+365 — 2027-09-03:** at least 15 qualified organic inquiries in the trailing month.

Track the leading indicators separately: GSC impressions/clicks/CTR/position by pillar, organic landing-page sessions and conversion events in GA4, and verified inquiry quality in the CRM. Do not substitute rankings, estimated traffic, or keyword counts for qualified inquiries. If a first-party source is not available to a particular run, label that metric **unavailable for this run** rather than estimating it.

## Data-source roles

| Source | Use | Guardrail |
|---|---|---|
| **Google Search Console** | First-party query/page performance, indexing and coverage checks; compare equal, complete date windows. | The currently verified read-only connector is local to the user's Windows desktop. A scheduled Manus task must first confirm direct property access or use a user-provided export; do not imply the desktop connector is callable from the schedule. |
| **Ahrefs** | Backlink/referring-domain analysis, organic keyword/competitor research, and independent crawl checks when the relevant report is available. | Use the correct `www`/subdomain scope; record report date, target, country, and any missing fields. Tool risk labels are triage signals, not proof of a Google penalty. |
| **Semrush** | Independent keyword/SERP and competitor validation; use when it adds a distinct cross-check. | Label estimates and geo/database scope. Avoid spending on duplicate pulls that do not change a decision. |
| **GA4 + CRM** | Qualified organic inquiries, attribution, and page-to-lead outcomes. | These sources have been documented as not yet wired to the SEO operator in the existing project files; confirm actual connector access before reporting outcomes. |
| **Public SERP and live site** | Validate intent, page type, title patterns, content coverage, and site changes. | A SERP sample is not a demand/volume report; do not infer search volume or rank from it. |

## Operating cadence

The repo documents existing desktop SEO operations (weekday daily checks and a weekly audit). **Coordinate with those runs instead of duplicating them.** At the start of each cycle, read the latest run log, inspect open PRs/issues, and check what work has already started.

### Every week — one integrated SEO work cycle

1. **Check delivery and measurement first.** Confirm recent content/PR state, canonical `www` host, sitemap and indexation for newly shipped pages, analytics availability, and any blocking production defect.
2. **Review performance.** Compare the latest complete 28-day window with the prior equal 28 days; also consult longer trend only where the source supports it. Split brand from non-brand and group queries/pages by the four strategy themes. Use clicks, impressions, CTR and position together; don't infer a penalty from a small change or a small sample.
3. **Run the backlink watch.** Diff new/lost referring domains from Ahrefs/Semrush against both recorded PBN signatures in `backlinks/pbn-watch.md`, on the live host and retired domains. Capture source URL, target URL, first-seen date, anchor, follow status, domain/site context, tool flags, and independent evidence. Escalate a credible new match for manual review; don't automatically remove or disavow.
4. **Choose one high-impact artifact.** Prefer a page already receiving relevant impressions, a broken measurement/indexing issue, a near-winner supported by first-party data, completion of an existing cluster, or a clear content gap that fits a mapped pillar. Check the registry before assigning any target. Avoid duplicate intent and low-value publishing.
5. **Prepare a reviewable change.** Depending on evidence, produce one page refresh, a publish-ready draft, internal-link improvements, a technical fix proposal, or an earned-link asset/prospect shortlist. Drafts stay unpublished; outreach, paid placements, PR merges, production changes, keyword-set changes and disavows remain owner-approval gates.
6. **Close the loop.** Write a dated run note: source and date, what changed in the data, action and rationale, intended owner, verification method/date, blockers, and next step. Keep the work log in `site/docs/seo/runs/` and update the keyword registry only when an actual page/target state changes.

**Weekly deliverable:** concise scorecard, up to three ranked actions, one reviewable artifact, and explicit limits/missing data. Do not create several drafts just to satisfy a content quota.

### Monthly — strategy and quality review

- Recheck query-to-URL ownership, cannibalization, cluster coverage, internal link paths, stale metadata/content and technical issues across the four pillars.
- Assess page cohorts at the strategy's T+7, T+30, T+90 and T+180 checkpoints. If a supporting page meets the T+90 no-impressions/no-top-50 condition, review intent, page quality, linking and indexing before building another of that type. Judge pillar terms at their intended longer horizon.
- Review referring-domain/backlink growth and loss, anchors and concentration; re-evaluate PBN signatures against current data. Treat Ahrefs/Semrush third-party scores as estimates, cross-checked with the source pages.
- Compare two to three meaningful organic competitors only if the data source and credit cost are acceptable. Competitor link-gap pulls are optional and should be excluded when they add API cost without changing a decision.
- Check GA4 conversion wiring and reconcile organic inquiries with CRM records. Keep the stated goal metric unavailable until the end-to-end evidence exists.

### Quarterly — decide where effort compounds

Review the four pillars using first-party performance, qualified inquiries, shipped assets, and cluster maturity. Continue the fixed theme rotation unless an owner-approved strategy review changes it. Don't pivot on early flat rankings alone; the strategy records the new-domain horizon as 12–24 months.

## Initial sequence

### 1. Baseline the current state and clear the measurement/release gates

- Confirm direct access and actual property scope for GSC; confirm which GA4 and CRM data is readable by the operator.
- Compare the published blog, sitemap, registry and open PRs. Resolve stale status in old audits before carrying forward any “fix” as still open.
- Run a fresh, dated crawl of the canonical `www` host and verify the issues called out by previous audits: internal links to priority posts, image weight, title/description quality, response/redirect behavior, canonical tags, sitemap membership, and indexation. Do not infer that historical crawl findings remain live.

### 2. Triage the spam-link watch before making any cleanup decision

The watchlist records two historical link patterns: **Signature A** targeted retired `crystalwebsolution.com` and was reported as dofollow; **Signature B** targeted `cdsportswearusa.com`, used `easyrank.link` anchors and three `.shop`/`.site` shells, and was reported as nofollow. The watchlist's last recorded check was 2026-09-10; it does **not** establish the current live-domain backlink status. The next link run should explicitly test the live `cdsportswearinc.com` property and report its date and coverage.

A `nofollow` attribute alone does not establish that a link is spam, and a spam-score flag alone does not establish that Google is counting or penalizing it. Google says most sites do not need the disavow tool; it is intended for a considerable number of spammy/artificial links plus a manual action or likely manual action, and Google recommends trying removal where possible first. Preserve evidence and make no disavow submission without the owner's explicit approval.

### 3. Work the existing content system, then move through the pillars

- Audit the live site against `KEYWORD-REGISTRY.md` and the ratified strategy before drafting: reconcile which Web Design supporting posts are already live, approved, or still drafts. The blog expanded after some older project notes, so don't repeat content that is already published.
- Complete or refresh the Web Design cluster only where the registry and current SERP/GSC evidence show a real missing piece; ensure each support page links contextually to its owning pillar and the pillar links back.
- Once the Web Design cluster is complete, move to the next theme in the ratified order (Digital Marketing, then distinct Logo/Branding pillars, then SEO/CRO), building one validated support page at a time and checking the primary query against the registry.
- Add relevant work/reviews and strong service CTAs where accurate. Don't add unsubstantiated locations, service offers, client results, or keyword volumes.

### 4. Earn legitimate authority, not link volume

Prioritize genuinely useful assets (the RFP scorecard is already documented as a strong resource), relevant partnerships, editorial contributions with real reader value, and accurate business profiles. Revalidate dated prospects before approaching anyone. Do not buy links, use PBNs, mass-submit directories, or send outreach without the required approval.

## Governance and safeguards

- `STRATEGY.md` is the governing SEO strategy; it outranks the operations manual, registry history and older run logs where they conflict. Keep the US/national remote positioning and one-keyword-to-one-URL rule.
- Check for overlapping daily work and open PRs before creating an artifact. One active work item per cycle; no competing changes to the same page.
- Suggestions/drafts and documentation are safe outputs. No content is published, no production code merged, no outreach sent, no paid placement purchased, no tracked keyword set rewritten, and no disavow submitted without the approval specified by the owner.
- Every metric should include its source, target/property, scope, date range, country/database where relevant, and uncertainty.

## Proposed weekly operating slot

**Proposed:** Monday at 9:00 a.m. America/New_York for the integrated planning/report cycle, coordinated with the existing daily desktop operator. **Not active yet:** the earlier attempt to register the Manus recurring task was rejected by the platform with `permission_denied: control source is not authorized for target device`; schedule status showed no task. The next attempt must be made from an authorized control source. Until then, this file is the operating plan, not an active automation.

## Official Google references

- [Google Search Console: Disavow links to your site](https://support.google.com/webmasters/answer/2648487)
- [Google Search Central: Spam policies — link spam](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)
- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: Learn about sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
