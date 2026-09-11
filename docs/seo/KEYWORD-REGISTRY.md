# Keyword Registry

One keyword → exactly one URL. This is what prevents two pages competing for
the same term. Read it before proposing any new target; update it when a draft
is approved or a page ships.

Figures are Ubersuggest `keyword_overview` estimates, US (locId 2840), English.
`Pulled` is the date of the figures shown. Re-validate on the Keywords lane.

**Domain moved 2026-09-03.** All target URLs are now on
`https://www.cdsportswearinc.com`. The previous host, `cdsportswearusa.com`,
serves 404 (WebFetch on apex and `www`, 2026-09-10) — Operations Manual §12.

**Project moved 2026-09-09.** Rank tracking is now Ubersuggest project
`109eb16879ab6b871522949b04ab791df52a888ebbab4b2037450214d037b7cf`
(`cdsportswearinc.com`, en/2840, weekly, **54/125 keywords**). Its predecessor
`5dfd943c…` returns `HTTP 404 Project not found` (2026-09-10).

## Mapped — one keyword, one URL

| Keyword | Vol/mo | Diff | CPC | Intent | Target URL | Page state | Tier | Tracked? | Pulled |
|---|---|---|---|---|---|---|---|---|---|
| rfp web development | 260 | 13 | $15.25 | commercial | /blog/web-development-rfp-guide | **live 2026-09-03** | Now | yes | 2026-09-10 |
| website development rfp | 260 | 13 | $11.98 | commercial | /blog/web-development-rfp-guide | **live 2026-09-03** | Now | yes | 2026-09-10 |
| hire a shopify developer | 880 | 8 | $25.41 | — | /hire/shopify-developer | not built | Now | yes | 2026-09-10 |
| hire shopify developer | 880 | 37 | $31.06 | navigational | /hire/shopify-developer | not built | Now | yes | 2026-09-10 |
| web development northern virginia | 260 | 9 | $18.00 | — | /northern-virginia-web-development | not built | Next | yes | 2026-09-10 |
| ai automation agency | 4,400 | 40 | $17.80 | navigational | /services/ai-automation | exists — in `/sitemap.xml`, not fetched | Monitor | yes | 2026-09-10 |
| branding and web design | 590 | 17 | $18.18 | commercial | /blog/branding-and-web-design-studio | **live 2026-09-06** | Monitor | yes | 2026-09-10 |
| web design manassas va | 20 | 5 | $0.00 | — | /blog/web-design-manassas-va | **live 2026-09-06** | Monitor | **no** | 2026-09-10 |

Seven of the eight are tracked in the project. `web design manassas va` is not:
it was parked on 2026-09-02 as part of the superseded local-first ladder, and
then a post shipped against it on 2026-09-06. It is recorded here as mapped
because the page exists, not because the strategy changed — Operations Manual
§3 flags the contradiction for MJ. If MJ wants it tracked, adding it to the
project needs MJ's explicit yes (§4).

## Drift since 2026-09-02 (all re-pulled 2026-09-10, US 2840)

| Keyword | Was | Now | Note |
|---|---|---|---|
| hire shopify developer | diff 26 | **diff 37** | Volume 880 and CPC $31.06 unchanged. The harder half of the Shopify pair got harder |
| ai automation agency | diff 35 | **diff 40** | 38 on 2026-08-21, 35 on 2026-09-02, 40 now. Oscillating, trending up. Volume 4,400 unchanged |
| hire a shopify developer | diff 8 | diff 8 | Unchanged |
| rfp web development | diff 13 | diff 13 | Unchanged |
| website development rfp | diff 13 | diff 13 | Unchanged |
| web development northern virginia | diff 9 | diff 9 | Unchanged |

Neither drift changes a build decision on its own: `hire a shopify developer`
(diff 8) is still the anchor for `/hire/shopify-developer`, and
`ai automation agency` was already Monitor-only. Recheck both next Keywords lane.

## Tracked in the project but NOT mapped — 47 terms

Added when the project was created on 2026-09-09. They are broad head terms,
and most are near-duplicates of five ideas. **None is mapped here, and none
should be built against until MJ rules on the §3 strategy split** — mapping
them now would create exactly the many-keywords-one-page collision this
registry exists to prevent. Counts are disjoint; every one of the 47 appears
in exactly one row.

| Cluster | n | Terms | Would plausibly map to |
|---|---|---|---|
| Digital marketing agency | 17 | agency marketing digital · digital agency marketing · digital marketers · digital marketing advertising agency · digital marketing agency · digital marketing agency near me · digital marketing and advertising agency · digital marketing businesses · digital marketing co · digital marketing company · digital marketing firms · digital marketing near me · digital marketing services · internet marketing service · marketing agency digital · marketing agency near me · social marketing agencies | /services/digital-marketing — one page cannot carry 17 terms; pick one head term and one long-tail at most |
| Logo and brand identity | 14 | and logo design · brand identity design · branding and brand identity · branding and identity design · branding identity · design logo design · designer logo design · identity design branding · logo & branding · logo and branding · logo design · logo design services · logos and designs · logotype design | /services/logo-design and /services/branding — the cluster spans two existing pages and must be split before either is targeted |
| SEO | 6 | digital marketing seo · marketing and seo · search engine optimisation companies · search engine optimization agencies · search engine optimization in digital marketing · seo agency near me | **No SEO service page exists** — none of the eight `/services/*` URLs enumerated in `/sitemap.xml` is an SEO page (WebFetch, 2026-09-10). Do not target until one does |
| Web design and redesign | 6 | web designing near me · website builders for small business · website redesign near me · website redesign services · websites designers · websites designing | /services/web-design |
| Conversion | 3 | conversion optimization · conversion rate optimisation · optimize for conversions | No page. Belongs as a section of a service page, not as a target |
| Other | 1 | native mobile application development | No page, and the studio's own service list does not advertise native mobile |

Source: Ubersuggest `get_project` `109eb168…`, 2026-09-10. The project is the
source of truth for what is tracked; this table is the map.

## Live pages with no viable target term

| URL | Published | Why unmapped |
|---|---|---|
| /blog/how-much-does-ai-automation-cost | 2026-09-06 | `how much does ai automation cost` = 0/mo; `ai automation cost` = 10/mo at difficulty 45 (Ubersuggest, 2026-09-10). Keep it as a sales asset and an internal-link target; do not count it as a ranking play |

## Secondary terms recorded but not tracked

| Keyword | Vol/mo | Diff | CPC | Would map to | Source |
|---|---|---|---|---|---|
| hire dedicated shopify developer | 210 | 22 | $7.10 | /hire/shopify-developer | CRY-24, 2026-08-21 |
| how to choose digital marketing agency | 170 | 12 | $21.88 | /blog/how-to-choose-a-digital-agency | CRY-20 body, 2026-08-17 |
| web design northern virginia | 170 | 14 | — | /northern-virginia-web-design | CRY-20 body, 2026-08-17 |

Figures in this table have not been re-validated since the dates shown.

## Parked

| Keyword | Vol/mo | Diff | Was mapped to | Why parked |
|---|---|---|---|---|
| web design manassas | 20 | 13 | /manassas-va-web-design | Superseded local-first ladder (CRY-21). Its sibling term is now covered by /blog/web-design-manassas-va |
| web design manassas va | 20 | 5 | — | **Un-parked de facto** by the 2026-09-06 post and moved to the Mapped table above. The supersession itself has *not* been reversed — pending MJ's §3 ruling |
| branding agency northern virginia | 0 | 4 | — | Dropped: no demand (CRY-20) |

## Legacy — old domain, for the record only

`the crystal web` — position 6, vol 40, resolved to `/work/crystal-web-solution`
on crystalwebsolution.com (Ubersuggest, 2026-09-02). An accidental brand
ranking on a retired domain. Not a target. The path `/work/crystal-web-solution`
is still listed in the live site's `/sitemap.xml` (WebFetch, 2026-09-10); the
page itself was not fetched.
