# Weekly SEO Run — YYYY-MM-DD

> **Status:** Draft template. Replace every bracketed field with current evidence. Do not copy illustrative values into a real run. Read `STRATEGY.md`, `OPERATIONS-MANUAL.md`, and `KEYWORD-REGISTRY.md` first; check the latest run log and open PRs to avoid duplicate work.

## Executive summary

- **Business goal:** Qualified organic inquiries per `STRATEGY.md` §1. Result this run: **[value / unavailable this run]**.
- **Tactical goal:** `[approved query]` → `[approved URL]`, target `[approved threshold and sustain rule]`. Result: **[measured / insufficient data / not measured]**.
- **This week's decision:** `[one sentence: issue found, evidence-backed action, or no change]`.
- **One reviewable artifact:** `[draft / issue / PR link or path; none if evidence did not justify work]`.
- **Approval blockers:** `[none / explicit items still requiring MJ's approval]`.

## 1. Run controls and overlap check

- **Run date/time/timezone:** `[ISO date/time and timezone]`
- **Operator/workflow version:** `[name/version]`
- **Canonical property/host:** `https://www.cdsportswearinc.com`
- **Last run checked:** `[path/link and date]`
- **Open PRs/issues checked:** `[links/IDs; note overlap or none]`
- **Existing work in progress:** `[item/owner or none]`
- **Cadence status:** `[scheduled / manual / blocked; explain accurately]`

## 2. Data source health and coverage

| Source | Status | Property/project + scope | Date range / freshness | Notes or error |
|---|---|---|---|---|
| Google Search Console | `[available/unavailable]` | `[exact property + permission]` | `[complete window]` | `[filters, final-data state, omitted rows, error]` |
| Ahrefs | `[available/unavailable]` | `[domain mode, country/report]` | `[report date]` | `[limits/estimate caveat]` |
| Semrush | `[available/unavailable]` | `[domain/database/location]` | `[report date]` | `[limits/estimate caveat]` |
| Site crawl / live verification | `[available/unavailable]` | `[canonical www host]` | `[crawl/check date]` | `[coverage and method]` |
| GA4 | `[available/unavailable]` | `[property ID / event scope]` | `[window]` | `[organic attribution definition]` |
| CRM | `[available/unavailable]` | `[system / record scope]` | `[window]` | `[qualification evidence]` |

**Data rule:** If a source is unavailable or incomplete, mark only the affected metric unavailable. Do not substitute third-party estimates for first-party results. Record each material number with source, tool/report, date, scope, and target URL.

## 3. Business outcome scorecard

| Metric | This period | Prior comparable period | Change | Source and interpretation |
|---|---:|---:|---:|---|
| Qualified organic inquiries | `[value or unavailable]` | `[value or unavailable]` | `[value or unavailable]` | `[GA4 + CRM evidence; never infer from clicks]` |
| Organic `generate_lead` events | `[value or unavailable]` | `[value or unavailable]` | `[value or unavailable]` | `[GA4 source/property/date window]` |
| GSC organic clicks | `[value]` | `[value]` | `[absolute / % / n/a]` | `[GSC property and complete equal windows]` |
| GSC impressions | `[value]` | `[value]` | `[absolute / % / n/a]` | `[GSC property and complete equal windows]` |

**Strategy checkpoint:** `[T+90 / T+180 / T+365 / not due]`; target `[from STRATEGY.md]`; actual `[evidence or unavailable]`; interpretation `[evidence-limited statement]`.

## 4. Approved ranking-goal snapshot — leading indicator only

- **Exact query:** `[query]`
- **Exact target URL:** `[canonical URL]`
- **Property:** `[exact GSC property]`
- **Filter semantics:** `query equals [query] AND page equals [URL]`
- **Search type / data state:** `Web / final`
- **Current window:** `[start]` through `[end]` (`America/Los_Angeles`)
- **Previous equal window:** `[start]` through `[end]`

| Measure | Current | Previous | Change |
|---|---:|---:|---:|
| Clicks | `[value / no reportable row]` | `[value / no reportable row]` | `[value / unavailable]` |
| Impressions | `[value / no reportable row]` | `[value / no reportable row]` | `[value / unavailable]` |
| CTR | `[value / n/a]` | `[value / n/a]` | `[value / unavailable]` |
| Average position | `[value / null: no impressions]` | `[value / null: no impressions]` | `[value / unavailable]` |

**Sustain-window check:** `[dates]`; threshold `[e.g. average position ≤ 10]`; required reported days `[N]`; reported qualifying days `[N]`; missing/unreported days `[dates]`; status `[insufficient data / not sustained / sustained under the approved definition]`.

> Search Console average position is an aggregate, impression-weighted metric, not a fixed-location daily rank tracker. Do not say “top 10” based on absent data, property-wide data, separate query/page tables, or a third-party estimated rank.

## 5. Strategy/pillar signal

| Pillar / cluster | Target URL | GSC clicks | Impressions | CTR / position | Interpretation / caveat |
|---|---|---:|---:|---|---|
| Web design / redesign | `/services/web-design` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Digital marketing | `/services/digital-marketing` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Logo / branding | `/services/logo-design`; `/services/branding` | `[ ]` | `[ ]` | `[ ]` | Keep separate owners; cite exact query mapping. |
| SEO / CRO | `/services/seo` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

**Query-to-URL ownership/cannibalization:** `[registry rows checked; evidence-backed conflicts or none observed]`.

## 6. Technical/indexing checks

| URL / issue | Evidence and source | Severity / impact | Action proposed | Approval status |
|---|---|---|---|---|
| `[URL or sitewide item]` | `[live check/crawl/GSC inspection + date]` | `[ ]` | `[ ]` | `[draft-only / owner approval required / none]` |

Check only what was actually verified: canonical host, status/redirect, robots/indexability, canonical, sitemap membership, internal links, and newly shipped page inspection. Do not repeat a historical audit item without revalidation.

## 7. Backlink watch

- **Provider(s), report date, target mode:** `[Ahrefs/Semrush; www/subdomain/domain; date]`
- **New/lost referring domains:** `[counts or unavailable]`
- **PBN-watchlist comparison:** `[signature A/B result with evidence, or not checked]`
- **Potentially suspicious examples:** `[linking URL, target URL, anchor, first seen, follow status, provider flag, independent page evidence]`
- **Interpretation:** `[triage only; spam-score/nofollow alone is not proof of penalty]`
- **Action:** `[monitor / manual review / removal research; no outreach or disavow without explicit approval]`

## 8. Ranked action candidates (maximum three)

1. **[Action]** — Evidence: `[source/date/target]`; expected impact: `[why this matters]`; effort: `[S/M/L]`; confidence: `[high/medium/low]`; guardrail: `[approval or dependency]`.
2. **[Action or “none justified”]** — Evidence: `[ ]`; impact/effort/confidence: `[ ]`.
3. **[Action or “none justified”]** — Evidence: `[ ]`; impact/effort/confidence: `[ ]`.

### Selected action — one artifact only

- **Selected:** `[one action]`
- **Why now:** `[why it beats the other candidates and fits the strategy/registry]`
- **Artifact:** `[path or PR/issue link]`
- **Verification:** `[how and when success will be checked]`
- **Not done:** `[publishing, merge, outreach, paid link, keyword-set edit, disavow, or other gated activity]`

## 9. Next run

- **Next check:** `[date/cadence; scheduled status must be accurate]`
- **Expected data:** `[source, property, complete window]`
- **Next decision gate:** `[what evidence changes the action]`
- **Owner dependencies:** `[explicit approvals/access only]`

---

## Example wording for unavailable evidence

> **GSC goal metric: unavailable this run.** The connected report did not return an exact combined query-and-page result for the requested window; no ranking conclusion is drawn. The sitewide property totals are reported separately and are not substituted for the goal measurement.
