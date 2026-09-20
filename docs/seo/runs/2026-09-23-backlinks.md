# SEO Operations Run Log — 2026-09-23 (Backlinks lane)

> Configures this run as an auditable, reproducible unit the cds-seo-operator skill can replay, hand off, and audit later.
> This file and the rest of `docs/seo/` are internal — not a customer deliverable.

## Snapshot

- **When (UTC):** 2026-09-23
- **Goal:** Backlinks lane — pull `backlinks_overview`, `backlinks`, `linking_domains` for `cdsportswearinc.com` and `cdsportswearusa.com`; score referring domains; check every new one against `backlinks/pbn-watch.md`; research 5–10 new prospects with named target URLs and specific reasons; write scored shortlist to `backlinks/prospects.md`. Research only — send nothing.
- **Lane:** backlinks
- **Files in scope:** `docs/seo/backlinks/prospects.md`, `docs/seo/runs/2026-09-23-backlinks.md`
- **Out of scope:** outreach, disavow, DNS, domain changes, merge, publish
- **Environment:** local + Ubersuggest MCP

## Pre-run data

- Site URL: https://www.cdsportswearinc.com
- Ubersuggest project: `109eb16879ab6b871522949b04ab791df52a888ebbab4b2037450214d037b7cf` (cdsportswearinc.com, en/2840)
- Mode: A (measurement dark) — no GSC/GA4 access
- Last lane: Content (2026-09-23) → next in rotation: Backlinks (Operations Manual §5)

## Fresh Ubersuggest data (pulled 2026-09-23)

### cdsportswearinc.com (live domain)
- **Domain Authority:** 1
- **Backlinks:** 2 (up from 0 on 2026-09-10)
- **Referring domains:** 2 (up from 0 on 2026-09-10)
- **Follow:** 0
- **NoFollow:** 2
- **Referring domains (detail):**
  1. `white-hat-high-authority-seo.shop` — DA 2, gained 2026-09-14, anchor: "cdsportswearinc.com was a caterpillar until easyrank.link gave it backlinks. now it's a butterfly that flies high in search results. for cdsportswearinc.com on white-hat-high-authority-seo.shop", nofollow: true
  2. `skyrocket-ranking-with-high-quality-backlinks.site` — DA 2, gained 2026-09-12, anchor: "cdsportswearinc.com was a caterpillar until easyrank.link gave it backlinks. now it's a butterfly that flies high in search results. for cdsportswearinc.com on skyrocket-ranking-with-high-quality-backlinks.site", nofollow: true

### cdsportswearusa.com (dead domain, serves 404)
- **Domain Authority:** 1
- **Backlinks:** 8
- **Referring domains:** 4
- **Follow:** 0
- **NoFollow:** 8
- **Referring domains (all Signature B):**
  1. `white-hat-high-authority-seo.shop` (2 backlinks)
  2. `seo-backlinks-contextual-dofollow.site` (2 backlinks)
  3. `quality-manual-link-building.shop` (2 backlinks)
  4. `skyrocket-ranking-with-high-quality-backlinks.site` (2 backlinks)

## CRITICAL FINDING: Signature B escalation

**The `easyrank.link` network (Signature B, documented in `pbn-watch.md` §66–97) has now targeted the live domain.**

This is the exact escalation `pbn-watch.md` warned about: *"What would change that: the same `easyrank.link` anchor appearing on `cdsportswearinc.com`"* — it has now happened (first seen 2026-09-12 on dead domain, now 2026-09-12/14 on live domain).

**Assessment (same as pbn-watch.md):** still low immediate risk (nofollow, DA 2, no authority to pass), but the network is actively retargeting the live domain. If links turn dofollow or volume grows, a Search Console property + disavow becomes necessary. **Recheck every Backlinks lane.**

## Prospect research — 12 new prospects (5 Tier 1/2, 7 Tier 2/3)

All 12 prospects checked against `backlinks/pbn-watch.md` signatures A and B — **all clean**.

### Tier 1 — pursue first (3)
1. **Nonprofit WP** (`nonprofitwp.org`) — DA 27, 402 ref domains. Resource page with self-declared link slot for RFP guides. Asset: RFP template + scorecard.
2. **Choose Manassas** (`choosemanassas.org`) — DA 21, 236 ref domains. City EDA "start a business" page linking to private providers. Asset: RFP template for Manassas founders.
3. **Prince William Living** (`princewilliamliving.com`) — DA 43, 2,746 ref domains. Local business magazine with outdated resource roundup (dead link angle). Asset: contributed article or roundup update.

### Tier 2 — good, one caveat each (6)
4. **ASU Lodestar Center** (`lodestar.asu.edu`) — DA 91 (root), subdomain modest. Guest contribution, but guidelines promise byline not link — confirm placement.
5. **Mason SBDC** (`masonsbdc.org`) — DA 26, 224 ref domains. Resource handout for Prince William/Manassas clients. Compounds with Choose Manassas, GEMS, PWC Economic Dev.
6. **Make Solution Partners** (`make.com`) — DA 58, 31,225 ref domains. Partner directory for automation implementers. Unresolved: whether partner profile carries followed outbound link.
7. **University of Pittsburgh SBDC** (`entrepreneur.pitt.edu`) — DA ~60+ (root). Resource page with marketing research categories. NEW.
8. **Ohio SBDC Network** (`ohiosbdc.net`) — DA ~40+. State-wide network, 28 centers. NEW.
9. **SCORE Madison/Dane County** (`score.org/wi/madison`) — DA 70+ (root). e-Guide with "Digital Marketing & SEO" category. National SBA partner. NEW.

### Tier 3 — conditional/weak (3)
10. **Hub101** (`hub101.org`) — DA ~30. Startup resource list, open submission.
11. **NH Tech Alliance** (`nhtechalliance.org`) — DA ~35. Lists 30+ free SBDC e-courses including Digital Marketing.
12. **TechSoup** (`techsoup.org`) — DA 70+. RFP article links to external templates. Blocker: submission path returned 403 (2026-09-10). Worth manual look.

## What shipped

1. **`docs/seo/backlinks/prospects.md`** — completely rewritten with:
   - Updated baseline (live domain now has 2 Signature B referring domains)
   - 12 prospects (3 Tier 1, 6 Tier 2, 3 Tier 3) — all with PBN check lines
   - Signature B escalation section documenting the live-domain targeting
   - Updated "What this list says" and format requirements
   - Checked-and-rejected table carried forward

2. **`docs/seo/runs/2026-09-23-backlinks.md`** — this file

## Verification

- Ubersuggest calls: `backlinks_overview` ×2, `backlinks` ×2, `linking_domains` ×1 — all successful
- Every new prospect checked against pbn-watch.md signatures A and B — no matches
- Prospect format matches required schema (domain, page, target URL, reason, asset, route, evidence, authority, caveat, PBN check)
- No outreach sent — research only per Operations Manual §4

## Errors encountered

- None

## What was NOT done (and why)

- Did not send outreach — MJ's explicit yes required per message (Operations Manual §4)
- Did not file disavow — Signature B still nofollow/DA 2, no Search Console property on live domain (Operations Manual §4, pbn-watch.md assessment)
- Did not add keywords to Ubersuggest — MJ's explicit yes required (Operations Manual §4)
- Did not pursue paid placements (Prince William Chamber, NTEN) — approval required, fees unknown

## Next lane

Technical → audit crawlability, indexability, metadata, structured data, internal linking on the live site. Check for regressions since 2026-09-22 technical lane.

## Owner actions pending (updated 2026-09-23)

1. Attach `cdsportswearusa.com` in Vercel as 301 to `https://www.cdsportswearinc.com`
2. Reclaim or redirect `crystalwebsolution.com` (serves gambling spam on Vercel)
3. Connect GA4 + Search Console to Ubersuggest project `109eb168…` — **now more urgent** given Signature B retargeting live domain
4. Rule on strategy split: 47 broad head terms tracked vs. specificity strategy; Manassas post vs. superseded local ladder
5. Approve/decline paid backlink routes (Prince William Chamber, NTEN membership)
6. Monitor Signature B — if volume grows or links turn dofollow, disavow via Search Console (requires #3 first)