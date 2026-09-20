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
| rfp web development | 260 | 13 | $13.83 | commercial | /blog/web-development-rfp-guide | **live 2026-09-03** | Now | yes | 2026-09-23 |
| website development rfp | 260 | 13 | $11.98 | commercial | /blog/web-development-rfp-guide | **live 2026-09-03** | Now | yes | 2026-09-10 |
| web development northern virginia | 260 | 9 | $18.00 | — | /northern-virginia-web-development | not built | Next | yes | 2026-09-10 |
| ai automation agency | 4,400 | 33 | $17.80 | navigational | /services/ai-automation | exists — in `/sitemap.xml` | Monitor | yes | 2026-09-23 |
| branding and web design | 590 | 17 | $18.18 | commercial | /blog/branding-and-web-design-studio | **live 2026-09-06** | Monitor | yes | 2026-09-10 |
| web design manassas va | 20 | 5 | $0.00 | — | /blog/web-design-manassas-va | **live 2026-09-06** | Monitor | **no** | 2026-09-10 |
| how to write a web design rfp | 140 | 22 | $10.25 | informational | /blog/how-to-write-a-web-design-rfp | draft (approved: false) | Now | **no** | 2026-09-24 |

Seven mapped rows. Six tracked in the project. `web design manassas va` and `how to write a web design rfp` are not tracked — adding either needs MJ's explicit yes (Operations Manual §4).

## Drift since 2026-09-10 (all re-pulled 2026-09-24, US 2840)

| Keyword | Was (2026-09-10) | Now (2026-09-24) | Note |
|---|---|---|---|
| rfp web development | diff 13, CPC $15.25 | diff 13, CPC $13.83 | Difficulty stable. CPC down ~9%. Volume 260 stable. |
| website development rfp | diff 13, CPC $11.98 | not re-pulled | — |
| web development northern virginia | diff 9 | not re-pulled | — |
| ai automation agency | diff 40 | **diff 33** | **Significant drop**: 38 (2026-08-21) → 35 (2026-09-02) → 40 (2026-09-10) → **33 now**. Volume 4,400 stable. Now at lowest difficulty since tracking began. |
| hire a shopify developer | diff 8 | not re-pulled | Parked 2026-09-19 |
| hire shopify developer | diff 37 | not re-pulled | Parked 2026-09-19 |
| websites designers | diff 33 | diff 33 | Stable. Volume 27,100 stable. CPC $21.50 stable. |
| digital marketing agency | diff 82 | diff 82 | Stable. Volume 49,500 stable. CPC $14.92 stable. |
| logo design | diff 75 | diff 75 | Stable. Volume 40,500 stable. CPC $8.17 stable. |
| seo agency near me | diff 57 | diff 57 | Stable. Volume 22,200 stable. CPC $28.51 stable. |

**Shopify pair parked 2026-09-19** (see Parked). Volume/difficulty still
favour a page, but Shopify is not in the live eight-service list
(`lib/servicePages.mjs` / `/sitemap.xml`). Building `/hire/shopify-developer`
would be a thin commercial URL for a service the studio does not currently
offer. Do not un-park without MJ confirming Shopify is a sold offer.

`ai automation agency` difficulty dropped to 33 — now more reachable. Remains Monitor-only (pillar page exists but no supporting cluster yet). Recheck next Keywords lane.

### Pillar head terms (STRATEGY.md §3) — verified 2026-09-24

| Theme | Pillar URL | Primary head term | Vol/mo | Diff | CPC | Intent | Matches STRATEGY.md? |
|---|---|---|---|---|---|---|---|
| 1. Web design / redesign | /services/web-design | websites designers | 27,100 | 33 | $21.50 | Commercial | ✅ Exact |
| 2. Digital marketing | /services/digital-marketing | digital marketing agency | 49,500 | 82 | $14.92 | Navigational | ✅ Exact |
| 3. Logo / branding | /services/logo-design + /services/branding | logo design | 40,500 | 75 | $8.17 | Commercial | ✅ Exact |
| 4. SEO / CRO | /services/seo | seo agency near me | 22,200 | 57 | $28.51 | Commercial | ✅ Exact |

All four pillar head terms match the STRATEGY.md table exactly (US 2840, 2026-09-24).

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
| SEO | 6 | digital marketing seo · marketing and seo · search engine optimisation companies · search engine optimization agencies · search engine optimization in digital marketing · seo agency near me | **SEO service page now exists** — `/services/seo` is live in `/sitemap.xml` and codebase. The cluster can now be mapped, but head term stays on pillar; pick ≤1 long-tail for a supporting page. |
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
| hire dedicated shopify developer | 210 | 22 | $7.10 | — (Shopify pair parked 2026-09-19) | CRY-24, 2026-08-21 |
| how to choose digital marketing agency | 170 | 12 | $21.88 | /blog/how-to-choose-a-digital-agency | CRY-20 body, 2026-08-17 |
| web design northern virginia | 170 | 14 | — | /northern-virginia-web-design | CRY-20 body, 2026-08-17 |

Figures in this table have not been re-validated since the dates shown.

## Parked

| Keyword | Vol/mo | Diff | Was mapped to | Why parked |
|---|---|---|---|---|
| web design manassas | 20 | 13 | /manassas-va-web-design | Superseded local-first ladder (CRY-21). Its sibling term is now covered by /blog/web-design-manassas-va |
| web design manassas va | 20 | 5 | — | **Un-parked de facto** by the 2026-09-06 post and moved to the Mapped table above. The supersession itself has *not* been reversed — pending MJ's §3 ruling |
| hire a shopify developer | 880 | 8 | /hire/shopify-developer | **Parked 2026-09-19.** Demand is real (est. 880/mo, diff 8) but Shopify is not among the eight live `/services/*` offers. A hire-landing would be a thin page for an unsold service. Reopen only if MJ confirms Shopify is a sold offer |
| hire shopify developer | 880 | 37 | /hire/shopify-developer | Same decision as the pair's easier half. Difficulty rose 26 → 37 between 2026-09-02 and 2026-09-10 |
| branding agency northern virginia | 0 | 4 | — | Dropped: no demand (CRY-20) |

## Legacy — old domain, for the record only

`the crystal web` — position 6, vol 40, resolved to `/work/crystal-web-solution`
on crystalwebsolution.com (Ubersuggest, 2026-09-02). An accidental brand
ranking on a retired domain. Not a target. The path `/work/crystal-web-solution`
is still listed in the live site's `/sitemap.xml` (WebFetch, 2026-09-10); the
page itself was not fetched.