# Agent Council Brief — SEO Keyword Strategy Prioritization

**Prepared:** 2026-09-26  
**Artifact type:** SEO strategy decision brief  
**Status:** For critique only; no strategy change or execution approval  
**Primary site:** `https://www.cdsportswearinc.com`

## Decision question

Within MJ's ratified SEO strategy, what should be the **single next keyword/content work item**: (A) complete or strengthen the existing Web Design pillar/cluster in the approved rotation, (B) finish the already-drafted RFP worksheet/scorecard for the live RFP guide as a tightly scoped supporting-page action tied to the approved tactical ranking goal, or (C) select another already-authorized mapped opportunity? What evidence must be gathered before choosing, and does anything justify changing the strategy itself?

The Council must judge the choice against the approved strategy, not reopen its settled broad-head-term direction by default. It may recommend that no content action is justified until a missing measurement or overlap check is completed.

## Governing decisions and constraints

`docs/seo/STRATEGY.md` is authoritative. It defines a national, remote-first digital agency targeting four pillar themes in this fixed rotation: Web Design/Redesign, Digital Marketing, Logo/Branding, and SEO/CRO. The method is one broad head term per pillar supported by narrower cluster pages. Each query has exactly one owning URL in `docs/seo/KEYWORD-REGISTRY.md`; supporting content must link contextually to its pillar. The business outcome is qualified organic inquiries; rankings, impressions, clicks, and keyword counts are leading indicators only.

Do not recommend changing the approved strategy, merging pages, creating a second URL for an owned query, building pages for services the company does not sell, creating unsupported local claims, altering the tracked keyword set, publishing, merging a PR, contacting prospects, purchasing links, or submitting a disavow. Strategy changes and actions that leave the repository remain owner-approval decisions.

The current approved broad pillar targets recorded in `STRATEGY.md` §3 are:

| Rotation | Pillar URL | Primary head term | Registry/strategy note |
|---|---|---|---|
| 1 | `/services/web-design` | `websites designers` | Ubersuggest estimate in strategy dated 2026-09-19; verify freshness before relying on it. |
| 2 | `/services/digital-marketing` | `digital marketing agency` | Ubersuggest estimate in strategy dated 2026-09-19; the strategy records high difficulty. |
| 3 | `/services/logo-design` and `/services/branding` | `logo design` / `brand identity design` | Distinct URL owners; do not merge the two intents/pillars. |
| 4 | `/services/seo` | `search engine optimization agencies` | SEO service pillar is live; CRO is a section, not a separate target. |

## The tactical RFP goal is distinct from the business goal

`docs/seo/goals.md` records a separate, owner-approved tactical goal: Search Console average position ≤10 for exact query `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide` for 14 consecutive reportable days by 2027-03-31. It does not replace the business outcome in `STRATEGY.md`.

The recorded GSC baseline was **0 clicks, 0 reportable impressions, average position unavailable** for 2026-08-27 through 2026-09-23. The exact query and page filters were applied together; data state was final; source was the GSC Search Analytics API for `sc-domain:cdsportswearinc.com`. Property-wide results are not evidence for this exact pair. The target page's indexing/canonical/sitemap milestone was recorded complete on 2026-09-26. Re-pull current data before making a present-tense performance claim.

The registry maps both `rfp web development` and `website development rfp` to the existing RFP guide. Its 260/month volume and difficulty 13 are **Ubersuggest estimates pulled 2026-09-10**, not current demand or first-party ranking evidence. The repo records an unpublished RFP worksheet/scorecard draft at `docs/seo/drafts/blog/web-development-rfp-template.md`; `goals.md` says it is ready for owner review and has not shipped.

## Evidence and freshness requirements

| Claim/evidence | Source and date in project record | Scope and limitation |
|---|---|---|
| Strategy, pillar order, rules | `STRATEGY.md`, ratified 2026-09-19 and amended through 2026-09-24 | Governing decisions; do not treat older contradictory manual/run statements as equal authority. |
| Keyword ownership and estimated demand | `KEYWORD-REGISTRY.md`; many estimates last pulled 2026-09-10, some 2026-09-22/24 | Ubersuggest estimates; revalidate before using as current volume/difficulty. |
| RFP exact-pair baseline | `goals.md`; GSC queried 2026-09-26 for 2026-08-27–2026-09-23 | First-party, exact query AND page; no measurable average position due to no impressions. Requery for current status. |
| RFP page indexing | `goals.md`; live HTTP, sitemap, and GSC URL Inspection recorded 2026-09-26 | Indexing milestone is recorded complete; does not prove ranking or traffic. |
| RFP worksheet status | `goals.md` and `docs/seo/drafts/blog/web-development-rfp-template.md`, 2026-09-26 | Review draft only; not published and no ranking effect can be claimed. |
| Current performance, SERP, cluster inventory, open PRs | Not established by this brief | Must be checked before selecting or implementing the next action. If inaccessible, report unavailable. |

## Alternatives for the Council to weigh

### A. Continue the approved Web Design rotation

First inspect the live pillar and all existing supporting pages/drafts, current internal links, GSC queries/pages, and open PRs. If the pillar is incomplete or its validated cluster has fewer than three useful supporting pages, one evidence-backed Web Design artifact may best fit the strategy. Do not infer incompleteness from this brief alone.

### B. Complete the already-drafted RFP worksheet/scorecard

Assess whether finishing this resource and its contextual CTA/internal link is the best single work item for the indexed guide and the tactical RFP goal. The exact pair had no reportable impressions in the recorded baseline, so there is no evidence yet that a content refresh will improve ranking. The argument for this option is the approved goal, an existing live mapped page, and a review-ready draft; the argument against is opportunity cost relative to the governing pillar rotation and unknown current performance/overlap.

### C. Select another already-mapped opportunity

Only choose one if fresh first-party performance, verified content/technical evidence, or a clearly completed preceding cluster supports it. Use the registry's current single-owner mapping. Do not pick solely on estimated search volume or difficulty.

## Questions for the deliberators

1. Which alternative is best aligned with the governing strategy and the qualified-inquiry objective, given the evidence actually present?
2. Is completing the RFP worksheet a legitimate, proportionate supporting-page action under the fixed pillar/cluster strategy, or should the rotation take precedence? State what evidence would resolve the trade-off.
3. What live-data and overlap checks are mandatory before choosing? Separate first-party GSC evidence from third-party estimates, and identify stale or unavailable data.
4. Does the fact that the RFP pair currently has no impressions support a content rewrite, or does it instead argue for diagnosis/measurement before changing the page?
5. Identify cannibalization, strategy-conflict, unsupported-claim, and premature-action risks. Do not assume the historical registry or operations manual is current where `STRATEGY.md` supersedes it.
6. Give one provisional recommendation, confidence level, explicit counterargument, and a verification plan. If the available evidence is insufficient, recommend a specific evidence-gathering step rather than inventing certainty.

## Required Council output

Return one of `SHIP`, `REVISE`, or `HOLD` for **this decision brief only**; summarize each deliberator's strongest point; state the adjudicator's rationale and any revision brief. Keep disagreement visible. Distinguish a review verdict from permission to modify strategy, publish, merge, or execute SEO actions. A `SHIP` verdict means the brief is fit for decision-making, not that any proposed action has been approved.

## Next step after Council

If the brief passes or is revised, MJ can decide whether to accept the recommendation. Before implementation, refresh exact-filter GSC performance, verify current open PRs/work in progress, inspect the current live page/cluster inventory, and revalidate any keyword estimates used. Then prepare only one reviewable artifact and document its sources and verification plan.
