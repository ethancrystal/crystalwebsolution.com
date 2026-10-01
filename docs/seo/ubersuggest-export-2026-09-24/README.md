# Ubersuggest export, 2026-09-24 (account closing)

A snapshot of everything useful from the Ubersuggest account before it closed. All figures are **Ubersuggest estimates**, US English (2840), pulled 2026-09-24 through the Ubersuggest MCP. Search Console and GA4 remain the first-party sources.

| File | Contents |
|---|---|
| 01-project-and-domain.md | Project config, the 25 tracked keywords, stored business summary, domain overview |
| 02-keyword-lists.csv | Both saved keyword lists (125 rows) |
| 03-rankings-aisv-opportunities.md | Rank tracking, AI Search Visibility, site-audit flags |
| 04-seed-research.csv | Volume/SD/CPC for the NoVA, RFP, AI-automation, dev and SMB clusters |
| 05-serps.md | SERP top-15 for 5 target queries |
| 06-competitors-and-backlinks.md | What local competitors rank for, our backlinks, link sources, spam domains |
| 07-pagespeed-and-suggestions.md | Mobile lab performance and autocomplete expansions |

## What matters, in order
1. **Mobile performance is the biggest technical problem.** LCP is 7.8 s and total blocking time is 22.6 s (07). Fixing it helps every page's ranking.
2. **The "Virginia web design company" cluster can be won.** It's seven or more terms at 170/mo with SD 16–26. A DA-8 homepage ranks top 5 for all of them. Together with the NoVA terms (140/mo each, SD 12–14), that's about 1,500 searches a month from local buyers (06).
3. **The tracked keyword set is unwinnable at DA 3** (SD 33–82, 0 of 25 ranking). It also no longer matches KEYWORD-REGISTRY.md. Rebuild tracking in whatever tool replaces Ubersuggest, using the clusters above.
4. **RFP content needs a free template** to compete. Every ranking guide offers one (05).
5. **AI assistants never mention the brand.** It had 0% visibility across 10 prompts (03).
6. **The spam links are nofollow and harmless.** Add the directory-farm and PBN domains to `backlinks/pbn-watch.md` (06).

## Not captured
- The backlink-gap report (`backlink_opportunity`) never finished processing. Re-run it in Semrush.
- Desktop PageSpeed returned an error.
- Rank history before 2026-08-24. Only one weekly check existed in range, and every keyword was unranked.
