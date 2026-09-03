# Operations Manual — Automated Daily Run

> **RECONSTRUCTED v2 — 2026-09-02.** The original Operations Manual lived in
> Notion ("⚙️ Operations Manual — Automated Daily Run", child of "SEO Command —
> Crystal Web Solution") and could not be read when this was written: the
> Notion connector available to the run exposes only a limited tool set. This
> version was rebuilt from the Linear issues in team *Crystal Web Solution*,
> the `crystal-command` skill, the scheduled task's own prompt, the repository,
> and the 2026-09-01/02 runs. Anything that existed only in Notion is not here.
> Sections marked **[proposed]** were not in any available source and are
> offered for MJ to confirm or strike.
>
> MJ approved a reconstructed v2, clearly marked, on 2026-09-02.

## 1. Systems and IDs

| System | Role | Identifier | State (2026-09-02) |
|---|---|---|---|
| Live site | Production | `https://www.cdsportswearusa.com` | Live. Canonical, sitemap, robots, JSON-LD all on this host (verified across 12 pages, PR #164) |
| Old domain | Retired | `crystalwebsolution.com` | **SERVFAIL, deliberately.** Registered to 2027-02-07. See §7 |
| GitHub | Site source, and this memory | `ethancrystal/crystalwebsolution.com`, `main` = production | Merge = deploy |
| Vercel | Deployment | team `team_tpYaICaSl1suJW6Lfpa67Ye9`, project `prj_CxPzQkaSkNnYAl1BBlTjmcKrvwTy` | Old domain attached but inert (DNS dead); MJ to remove |
| Supabase | CRM, auth, blog table, storage | project ref `wmnjosiikehsuaqucvja` | `blog_posts` table (migration 0035) |
| Ubersuggest | Keyword, backlink, domain data; rank tracking | project `5dfd943c8a27d604e022aa36799f20aed98d576af23047216c0445d8236cd1ca` (`cdsportswearusa.com`, en/2840), tier1 | Created 2026-09-02, 6/125 keywords, 0/5 competitors, GA not connected |
| GA4 | Engagement, conversions | `G-YENE9MFT5K` (code shipped) | **Not verified live.** CRY-17 |
| Search Console | Impressions, indexing | Property should be `https://www.cdsportswearusa.com` | Not verified. CRY-19 |
| Linear | Execution queue | Team *Crystal Web Solution*, prefix `CRY` | Active |
| Notion | Former archive | — | **Dropped 2026-09-02.** Not used |

## 2. Mode logic

Run `mcp__Ubersuggest__auth_status`, then `mcp__Ubersuggest__get_project` for
the project above and read `google_analytics_profile`. Also run
`domain_overview` for `cdsportswearusa.com` (locId 2840) and read
`serviceInfo.isConnectedToGA` / `isConnectedToGSC` if present.

- **Mode A (unblock-first)** — GA and GSC both unconnected. Analytics are
  dark. Do not report traffic or conversion numbers; say measurement is not
  live. Work one lane (§5). *This is the current mode.*
- **Mode B (standard daily)** — either connected. Lead the run log with the
  fact that it flipped, then run the daily routine in §6.

If Ubersuggest is unauthenticated, unavailable, or returns 401/403: stop data
gathering, write a short run log naming the exact call that failed, and end.
Never invent data.

Note: `domain_overview` for `cdsportswearusa.com` returns `noData` while the
domain is new. That is a fact about the domain's age, not a tool failure.

## 3. Strategy — national and specific, not local-first

The earlier "Manassas first, Northern Virginia next" ladder is **superseded**
(per the scheduled task's prompt; the Notion original's wording is not
available). The portfolio now leads with specific, commercial, low-difficulty
national terms where a small studio can win on relevance, and keeps one
regional term for the next tier.

Current tracked set — seeded 2026-09-02 on MJ's explicit approval. Figures:
Ubersuggest `keyword_overview`, US 2840, pulled 2026-09-02. All estimates.

| Tier | Keyword | Vol/mo | Diff | CPC | Target URL | Issue |
|---|---|---|---|---|---|---|
| Now | `hire a shopify developer` | 880 | 8 | $25.41 | `/hire/shopify-developer` | CRY-24 |
| Now | `hire shopify developer` | 880 | 26 | $31.06 | `/hire/shopify-developer` | CRY-24 |
| Now | `rfp web development` | 260 | 13 | $15.25 | `/blog/web-development-rfp-guide` | CRY-22 |
| Now | `website development rfp` | 260 | 13 | $11.98 | `/blog/web-development-rfp-guide` | CRY-22 |
| Next | `web development northern virginia` | 260 | 9 | $17.99 | `/northern-virginia-web-development` | — |
| Monitor | `ai automation agency` | 4,400 | 35 | $17.80 | `/services/ai-automation` | — |

`hire a shopify developer` has a volatile monthly series (260–1,900 over 13
months; 880 is the smoothed figure). Treat volume as directional.

Parked, not tracked: `web design manassas va` (20/mo, diff 5), `web design
manassas` (20/mo, diff 13) — CRY-21, superseded ladder. `how to choose digital
marketing agency` (170/mo, diff 12) — was in the original Now list per CRY-20's
body; not seeded; re-add if MJ wants it.

One keyword maps to exactly one URL. The canonical mapping is
`KEYWORD-REGISTRY.md`. Read it before proposing any new target.

**Positioning caveat.** The brand is *CD Sportswear USA* but the live title is
"Custom Web Design & AI Automation | CD Sportswear USA" and MJ seeded a
web-design keyword set on 2026-09-02. The run treats that as confirmation the
studio's positioning is unchanged. If that ever changes, this whole section
and the three content issues are wrong and must be revisited first.

## 4. Approval gates — never cross without MJ's explicit yes in the conversation

- Send outreach email or any message
- Buy links, sponsored posts, or paid placements
- Submit directory listings in bulk
- **Merge any PR** — `main` deploys to production
- Flip a blog post to `published` (the workflow lands rows as `draft`)
- Publish content anywhere outside the repo PR flow
- File a disavow
- Rewrite or delete the Ubersuggest project or its tracked-keyword set
  (adding keywords with approval is fine; CRY-20 seeding was approved)

The run **may freely**: create and update files under `docs/seo/`, open PRs,
create, comment and reprioritise Linear issues, draft content, upload cover
images to storage, add keywords/competitors to the Ubersuggest project once
MJ has named them.

## 5. Lanes (Mode A) — one per run, rotating

Check the most recent `runs/YYYY-MM-DD.md` to see which lane ran last.

- **Content** — write a complete, publish-ready draft for the next unbuilt
  target in §3. Blog posts go to `drafts/blog/<slug>.md` with
  `approved: false`. Code pages (e.g. `/hire/shopify-developer`) go to a PR
  on `seo/<slug>` following `CLAUDE.md`. Never publish in the same run a
  draft was written.
- **Backlinks (CRY-23)** — pull `backlinks_overview`, `backlinks`,
  `linking_domains` for `cdsportswearusa.com`; score referring domains; check
  every new one against `backlinks/pbn-watch.md`; research 5–10 new prospects
  with named target URLs and specific reasons; write the scored shortlist to
  `backlinks/prospects.md`. Research only — send nothing.
- **Keywords** — re-validate §3 against live `keyword_overview`; note drift
  in the run log; update `KEYWORD-REGISTRY.md` if numbers moved materially.

**Publication pipeline runs first, every run, before choosing a lane.** Scan
`drafts/blog/` and open PRs. If a draft is approved and merged, confirm the
row landed in `blog_posts`. If a code-page PR was merged, WebFetch the live
URL, confirm it renders and self-canonicalises, and note in the run log that
MJ should submit it for indexing in Search Console (until GSC access exists).
Publication work counts as the day's artifact.

## 6. Daily routine (Mode B) — carried from `crystal-command`

1. GA4 collecting? (Realtime, or Ubersuggest `google_analytics_profile`).
   A silent tag is the top failure mode.
2. Search Console: new impressions, indexing errors, coverage drops.
3. `generate_lead` conversions since yesterday — real inbound briefs.
4. Anything blocked in Linear.

Weekly: `domain_overview` diffed against last week; content pipeline status;
new/lost referring domains with the PBN check; registry update. Monthly:
non-brand growth, landing-page performance, conversions, referring domains,
anchor mix, competitor gap — reported as *qualified impressions → qualified
clicks → engaged visits → inquiries → qualified opportunities*, never keyword
count alone.

## 7. The old domain — decided 2026-09-02

`crystalwebsolution.com` received a PBN link blast between 2026-08-16 and
2026-08-27 (~32 referring domains, one template, casino/PLR/fake-news shells).
MJ confirmed nobody bought a backlink package. Decision: **leave it dark.**

- Do not repair the DNS delegation (split Cloudflare/Vercel, all SERVFAIL).
- Remove it from the Vercel project (MJ action; still attached at time of
  writing).
- Keep the registration — do not let a spammed domain drop.
- No disavow; there is nothing to disavow for.
- Watch `cdsportswearusa.com` for the same signature (`backlinks/pbn-watch.md`).

The new domain starts from zero authority. That is the honest baseline. Full
evidence: CRY-29, CRY-27.

## 8. Evidence rules

Every keyword, metric, competitor claim and recommendation carries **source,
date, tool, and target URL**. If a number cannot be sourced, say so. Label
Ubersuggest estimates as estimates; never present them as the same kind of
fact as Search Console or GA4 first-party data. A single WebFetch reading of a
live page is not sufficient evidence for a consequential claim — re-check
through a second URL or an independent verifier (the 2026-09-01 run's first
homepage canonical reading was wrong; the verifier caught it).

## 9. Never do these

Mass-generated content, spun text, private blog networks, link buying, fake
reviews, keyword-stuffed location pages for towns the business cannot serve,
or a location page with no unique local proof. A page exists because the
business can serve that searcher — not because a keyword looked cheap.

## 10. Verification framework — [proposed]

The original framework's wording is not available. Proposed checkpoints for a
newly published page, each recorded in the run log:

- **T+0** — live, self-canonical, in `/sitemap.xml`, MJ asked to submit in GSC
- **T+7d** — indexed (GSC once available; otherwise a `site:` check noted as
  weak evidence); any ranking in top 100 for its target term
- **T+30d** — position for the target term; impressions if GSC exists
- **T+90d — kill criterion** — if the anchor term (`hire a shopify developer`
  is the anchor per CRY-24) has no top-50 position and no impressions, the
  page's approach is revisited before more pages of the same type are built

## 11. Blocked on MJ (as of 2026-09-02)

| # | Item | Issue |
|---|---|---|
| 1 | Remove `crystalwebsolution.com` + `www` from Vercel → Settings → Domains | CRY-27 / CRY-29 |
| 2 | Confirm live `cron.job` row for `drain-crm-outbox` and repoint it; add `cdsportswearusa.com` to Supabase auth redirect allow-list | CRY-28 |
| 3 | Set GA4 env var + redeploy; verify Search Console on the **new** domain; connect both to Ubersuggest project `5dfd943c…` | CRY-17, CRY-19, CRY-25 |
| 4 | Add repo secrets so the blog publish workflow activates (see workflow file) | — |
| 5 | Name the Supabase Storage bucket for cover images (`SEO_BLOG_COVERS_BUCKET`) | — |
| 6 | Competitors for the Ubersuggest project (0/5). The old five were Lounge Lizard, Huemor, Salted Stone, Barrel, Bop Design | — |
| 7 | ~~Update the scheduled task's stored prompt~~ Done 2026-09-02 — now targets `cdsportswearusa.com` and reads `docs/seo/` | — |
| 8 | Fix the 24 live `[CONFIRM: …]` placeholders on all `/services/[slug]` pages (also in FaqSchema). PR #162 does not cover them | **CRY-30** |
| 9 | Approve or edit `drafts/blog/web-development-rfp-guide.md` — flip `approved: true` and merge. Two softened claims to restore if true (see CRY-22 comment) | CRY-22 |
| 10 | Grant the GitHub connector Contents + Pull requests write, so runs open PRs instead of handing over patches | CRY-18 |
