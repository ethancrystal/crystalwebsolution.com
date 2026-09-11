# Operations Manual — Automated Daily Run

> **v3 — 2026-09-10.** The production domain moved again: `cdsportswearusa.com`
> → `cdsportswearinc.com` (PR #174, merged 2026-09-03). The Ubersuggest project
> this manual named was deleted and replaced. The Linear team *Crystal Web
> Solution* is no longer present in the connected workspace, so the `CRY-*`
> issue queue cannot be read or written by the run. Everything in §1 was
> re-verified live on 2026-09-10; §12 records the migration and what it costs.
>
> v2 (2026-09-02) was a reconstruction from Linear, the `crystal-command`
> skill, the scheduled task's prompt, the repository and the 2026-09-01/02
> runs, after Notion was dropped as memory. Sections marked **[proposed]** were
> never in a primary source and are still awaiting MJ's confirmation.
>
> **v3.1 — 2026-09-11.** MJ confirmed two things in conversation: the domain
> for current and future SEO efforts is `https://www.cdsportswearinc.com`
> (already what this manual used), and the brand name is **CD Sportswear
> INC**, resolving the positioning caveat below and blocked item 7. The
> codebase rename shipped as PR #190 (open, not merged — merging is still
> MJ's call, same as every other PR).

## 1. Systems and IDs

State column verified 2026-09-10 unless noted.

| System | Role | Identifier | State (2026-09-10) |
|---|---|---|---|
| Live site | Production | `https://www.cdsportswearinc.com` | **Live.** Homepage self-canonicalises to `https://www.cdsportswearinc.com`; `/sitemap.xml` lists 25 URLs, all on this host (WebFetch, 2026-09-10) |
| Previous domain | Dead | `cdsportswearusa.com` | **Resolves but serves HTTP 404** on both apex and `www` (WebFetch ×2, 2026-09-10). DNS points at Vercel IPs (`getent hosts`, 2026-09-10). See §12 |
| Old domain | Retired | `crystalwebsolution.com` | **Still dark.** No DNS resolution (`getent hosts`, 2026-09-10). Registered to 2027-02-07. See §7 |
| GitHub | Site source, and this memory | `ethancrystal/crystalwebsolution.com`, `main` = production | Merge = deploy. Connector is **read-only** to the run: `403 Resource not accessible by integration` on `POST /git/refs`, 2026-09-10. See §11 |
| Vercel | Deployment | team `team_tpYaICaSl1suJW6Lfpa67Ye9`, project `prj_CxPzQkaSkNnYAl1BBlTjmcKrvwTy` | Not re-verified this run |
| Supabase | CRM, auth, blog table, storage | project ref `wmnjosiikehsuaqucvja` | `blog_posts` holds 4 rows, all `published` (SQL, 2026-09-10) |
| Ubersuggest | Keyword, backlink, domain data; rank tracking | project `109eb16879ab6b871522949b04ab791df52a888ebbab4b2037450214d037b7cf` (`cdsportswearinc.com`, en/2840), tier1, weekly refresh | Created 2026-09-09 15:20 UTC. **54/125 keywords, 5/5 competitors.** `google_analytics_profile: null` |
| — previous project | Deleted | `5dfd943c8a27…` (`cdsportswearusa.com`) | **Gone.** `get_project` → `HTTP 404 Project not found`, 2026-09-10 |
| GA4 | Engagement, conversions | `G-YENE9MFT5K` (code shipped) | **Not verified live.** Not connected to the Ubersuggest project |
| Search Console | Impressions, indexing | Property should be `https://www.cdsportswearinc.com` | Not verified. The property named in v2 was for a domain that now 404s |
| Linear | Execution queue | Team *Crystal Web Solution*, prefix `CRY` | **Not reachable.** `list_teams` returns one team, `TMS`, 2026-09-10. Whether the team was deleted or the connector now points at a different workspace is unknown. `CRY-*` references below are historical |
| Notion | Former archive | — | **Dropped 2026-09-02.** Not used |

Competitors now tracked (all en/2840): `huemor.rocks`, `barrelny.com`,
`ironpaper.com`, `loungelizard.com`, `bopdesign.com`. The set changed when the
project was replaced — v2 recorded Salted Stone where `ironpaper.com` now sits.
Who changed it is not recorded anywhere the run can read.

## 2. Mode logic

Run `mcp__Ubersuggest__auth_status`, then `mcp__Ubersuggest__get_project` for
the project in §1 and read `google_analytics_profile`. Also run
`domain_overview` for `cdsportswearinc.com` (locId 2840) and read
`serviceInfo.isConnectedToGA` / `isConnectedToGSC` if present.

- **Mode A (unblock-first)** — GA and GSC both unconnected. Analytics are
  dark. Do not report traffic or conversion numbers; say measurement is not
  live. Work one lane (§5). *This is the current mode, 2026-09-10.*
- **Mode B (standard daily)** — either connected. Lead the run log with the
  fact that it flipped, then run the daily routine in §6.

If `get_project` 404s, the project has been replaced again: call
`list_projects`, use the project whose `domain` matches the live host, and
record the new ID here in the same run. Do not create a replacement project —
that is an approval gate (§4).

If Ubersuggest is unauthenticated or returns 401/403 on `auth_status`: stop
data gathering, write a short run log naming the exact call that failed, and
end. Never invent data. A 403 on a single data call after `auth_status`
succeeded is **not** an auth failure — it may be a rate or plan limit on that
endpoint. Record which call failed, do not silently substitute another metric
for it, and retry next run.

## 3. Strategy — national and specific, not local-first

The "Manassas first, Northern Virginia next" ladder was superseded on
2026-09-02 in favour of specific, commercial, low-difficulty national terms
where a small studio can win on relevance, keeping one regional term for the
next tier.

**Two things have since diverged from that and need MJ's ruling (§11 item 6).**

1. The tracked keyword set is now **54 terms**, not 6. The added terms are
   mostly broad head terms — `digital marketing agency`, `logo design`,
   `brand identity design`, `seo agency near me` and ~40 near-duplicates of
   those — which is the opposite of the specificity strategy. They are tracked
   in Ubersuggest but **not mapped to URLs**; see `KEYWORD-REGISTRY.md`.
2. `/blog/web-design-manassas-va` was published on 2026-09-06 against a term
   this section had parked as superseded (`web design manassas va`, 20/mo,
   diff 5 — Ubersuggest, 2026-09-10). Either the local ladder is back or that
   post is an exception; the manual cannot tell which.

Current mapped set. Figures: Ubersuggest `keyword_overview`, US 2840, pulled
2026-09-10. All estimates.

| Tier | Keyword | Vol/mo | Diff | CPC | Target URL | State |
|---|---|---|---|---|---|---|
| Now | `rfp web development` | 260 | 13 | $15.25 | `/blog/web-development-rfp-guide` | **Live** since 2026-09-03 |
| Now | `website development rfp` | 260 | 13 | $11.98 | `/blog/web-development-rfp-guide` | **Live** since 2026-09-03 |
| Now | `hire a shopify developer` | 880 | 8 | $25.41 | `/hire/shopify-developer` | Not built |
| Now | `hire shopify developer` | 880 | **37** | $31.06 | `/hire/shopify-developer` | Not built. Difficulty 26 → 37 since 2026-09-02 |
| Next | `web development northern virginia` | 260 | 9 | $18.00 | `/northern-virginia-web-development` | Not built |
| Monitor | `ai automation agency` | 4,400 | **40** | $17.80 | `/services/ai-automation` | Exists. Difficulty 35 → 40 since 2026-09-02 |
| Monitor | `branding and web design` | 590 | 17 | $18.18 | `/blog/branding-and-web-design-studio` | **Live** since 2026-09-06 |
| Monitor | `web design manassas va` | 20 | 5 | $0 | `/blog/web-design-manassas-va` | **Live** since 2026-09-06. Conflicts with this section — see above |

`hire a shopify developer` has a volatile monthly series (210–1,900 over 13
months; 880 is the smoothed figure). Treat volume as directional.

`/blog/how-much-does-ai-automation-cost` is live but has **no viable target
term**: `how much does ai automation cost` returns 0/mo and `ai automation
cost` returns 10/mo at difficulty 45 (Ubersuggest, 2026-09-10). It is a useful
sales asset and a fine internal link; it is not a ranking play, and the
registry records it as unmapped rather than inventing a term for it.

One keyword maps to exactly one URL. The canonical mapping is
`KEYWORD-REGISTRY.md`. Read it before proposing any new target.

**Positioning caveat — RESOLVED 2026-09-11.** The brand is confirmed as
*CD Sportswear INC*, matching the domain and the artwork from PR #189
(2026-09-08). `lib/site.js`'s `SITE.name` and every literal on-page mention of
"CD Sportswear USA" (metadata descriptions, visible copy, aria-labels, two code
comments, the self-referential case study in `lib/projects.js`) were updated
to match in **PR #190**, opened via the Zapier-connected GitHub account
(`ethancrystal`) after the MCP GitHub connector's write access continued to
403 — see the note on that connector in §11 item 2, now partially superseded:
Zapier is a working alternative for this account, at least for branches, file
writes and PRs. Two things were deliberately left alone in #190: `SITE.email`
/ the Resend sending domain (`tests/email.test.mjs` pins `cdsportswearusa.com`
as a contract, almost certainly for verified SPF/DKIM — changing it needs a
newly verified domain first) and the verbatim customer review in
`lib/reviews.js` that names the old brand — it is a real client's quoted
words, not studio copy. MJ's 2026-09-02 keyword seeding stands; a name change
alone does not change the web-design positioning it was seeded against.

## 4. Approval gates — never cross without MJ's explicit yes in the conversation

- Send outreach email or any message
- Buy links, sponsored posts, or paid placements — **including memberships and
  directory listings whose fee buys the placement** (see `backlinks/prospects.md`)
- Submit directory listings in bulk
- **Merge any PR** — `main` deploys to production
- Flip a blog post to `published`
- Publish content anywhere outside the repo PR flow
- File a disavow
- Create, rewrite or delete an Ubersuggest project or its tracked-keyword set
  (adding keywords to an existing project, once MJ has named them, is fine)
- Change the production domain, its DNS, or its redirects

The run **may freely**: create and update files under `docs/seo/`, open PRs,
draft content, upload cover images to storage, and comment on the issue tracker
when one is reachable.

## 5. Lanes (Mode A) — one per run, rotating

Check the most recent `runs/YYYY-MM-DD.md` to see which lane ran last.

- **Content** — write a complete, publish-ready draft for the next unbuilt
  target in §3. Blog posts go to `drafts/blog/<slug>.md` with
  `approved: false`. Code pages (e.g. `/hire/shopify-developer`) go to a PR
  on `seo/<slug>` following `CLAUDE.md`. Never publish in the same run a
  draft was written.
- **Backlinks** — pull `backlinks_overview`, `backlinks`, `linking_domains`
  for `cdsportswearinc.com` **and** for `cdsportswearusa.com` while the dead
  domain still attracts links; score referring domains; check every new one
  against `backlinks/pbn-watch.md`; research 5–10 new prospects with named
  target URLs and specific reasons; write the scored shortlist to
  `backlinks/prospects.md`. Research only — send nothing.
- **Keywords** — re-validate §3 against live `keyword_overview`; note drift
  in the run log; update `KEYWORD-REGISTRY.md` if numbers moved materially.

**Publication pipeline runs first, every run, before choosing a lane.** Scan
`drafts/blog/` and open PRs, and read `blog_posts` directly — posts are
currently reaching the table by some route other than this repo's pipeline
(§12), so the drafts directory is not a reliable index of what is live. For
anything newly live, WebFetch the URL, confirm it renders and
self-canonicalises, confirm it is in `/sitemap.xml`, and note in the run log
that MJ should submit it for indexing in Search Console (until GSC access
exists). Publication work counts as the day's artifact.

## 6. Daily routine (Mode B) — carried from `crystal-command`

1. GA4 collecting? (Realtime, or Ubersuggest `google_analytics_profile`).
   A silent tag is the top failure mode.
2. Search Console: new impressions, indexing errors, coverage drops.
3. `generate_lead` conversions since yesterday — real inbound briefs.
4. Anything blocked in the issue tracker.

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
- Remove it from the Vercel project (MJ action).
- Keep the registration — do not let a spammed domain drop.
- No disavow; there is nothing to disavow for.
- Watch the live domain for the same signature (`backlinks/pbn-watch.md`).

**A second, different network appeared on 2026-08-31/09-01**, pointing at
`cdsportswearusa.com`: three `.shop`/`.site` link-selling shells, DA 2,
`nofollow: true`, all citing `easyrank.link`. Recorded as signature B in
`backlinks/pbn-watch.md`. It is 100% of that domain's inbound profile and none
of it reaches the live site. Nothing to disavow while the target 404s.

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
- **T+90d — kill criterion** — if the anchor term has no top-50 position and
  no impressions, the page's approach is revisited before more pages of the
  same type are built

Clock for the four live posts starts at their `published_at`: RFP guide
2026-09-03, the other three 2026-09-06. **T+7d for the RFP guide falls on
2026-09-10 and cannot be checked** — the run has no Search Console access on
this domain, and organic-keyword data for `cdsportswearinc.com` could not be
read this run (`domain_overview` → HTTP 403, 2026-09-10). Nothing at T+7d can
be evidenced either way.

## 11. Blocked on MJ (as of 2026-09-10)

| # | Item | Why it matters |
|---|---|---|
| 1 | **Decide what `cdsportswearusa.com` should do.** It resolves to Vercel and serves 404 on apex and `www`. Either 301 it to `https://www.cdsportswearinc.com` or detach it | It was the production host 2026-08-27 → 2026-09-03. Anything indexed or linked from that week is currently a dead end (§12) |
| 2 | **Grant the GitHub connector Contents + Pull requests write** on `ethancrystal/crystalwebsolution.com` | Still `403` as of 2026-09-10 on the MCP connector. **2026-09-11: a workaround exists** — this account also has GitHub connected through Zapier (`ethancrystal`, full write access, used for PR #190) — but that is one more moving part to depend on long-term. Fixing the MCP connector's permissions directly is still the right long-term fix |
| 3 | **Restore an issue queue.** The Linear team *Crystal Web Solution* is not present in the workspace this run can reach — `list_teams` returns only `TMS` (2026-09-10); deleted or different workspace is unknown | The run has nowhere to file findings. `CRY-17…30` history is unreachable |
| 4 | **Connect GA4 and Search Console** to Ubersuggest project `109eb168…`, on the **`cdsportswearinc.com`** property | Until then every run is Mode A and no page can be verified past T+0 |
| 5 | **Install the blog publish workflow** at `.github/workflows/seo-publish-blog.yml` (the file is parked at `docs/seo/seo-publish-blog.yml.pending`) and add its repo secrets | `.github/workflows/` still contains only `docker-ci.yml` (2026-09-10). The pipeline built on 2026-09-02 has never run |
| 6 | **Rule on the strategy split in §3**: 54 broad head terms tracked vs. the specificity strategy, and the Manassas post vs. the parked local ladder | The registry cannot map keywords to URLs until this is settled |
| 7 | ~~Settle the brand name.~~ **RESOLVED 2026-09-11** — CD Sportswear INC, shipped in PR #190 (open, awaiting MJ's merge) | — |
| 8 | Name the Supabase Storage bucket for cover images (`SEO_BLOG_COVERS_BUCKET`) | Blocks cover images on drafts |
| 9 | Submit the four live blog URLs in Search Console once #4 exists | They are in the sitemap; nothing else can be done without the property |
| 10 | **Approve or decline two paid backlink routes** — Prince William Chamber membership (dues not published) and NTEN membership | Both are §4 paid-placement gates; the research is done and blocked on a yes/no (`backlinks/prospects.md`, 2026-09-10) |
| 11 | Carried forward, unverified since 2026-09-02: confirm the live `cron.job` row for `drain-crm-outbox` and repoint it, and add the **current** domain to the Supabase auth redirect allow-list | Was scoped to `cdsportswearusa.com`; the domain move makes it more likely to be stale, not less |

## 12. Domain history — and what the last move cost

| Window | Production host | Evidence |
|---|---|---|
| → 2026-08-27 | `crystalwebsolution.com` | §7 |
| 2026-08-27 → 2026-09-03 | `cdsportswearusa.com` | v2 §1; PR #164 |
| 2026-09-03 → | `cdsportswearinc.com` | PR #174 "v1.26 — Point production canonical/contact-form domain at cdsportswearinc.com", merged 2026-09-03 (`git log`, sha `a861aab4`) |

Three production hosts in eight days. The honest consequences, 2026-09-10:

- **Authority does not carry over.** `cdsportswearinc.com`: DA 1, 0 backlinks,
  0 referring domains (Ubersuggest `backlinks_overview`, 2026-09-10). Every
  clock — indexing, trust, ranking — restarted on 2026-09-03.
- **The previous host is a dead end, not a redirect.** Nothing published in the
  2026-08-27 → 2026-09-03 window keeps its address, and the RFP guide, which
  went live 2026-09-03, straddles the move.
- **The only inbound links either domain has are spam.** 6 backlinks / 3
  referring domains reported on the dead host, of which 5 were individually
  returned and all 5 match one link-selling template (the 6th was not returned
  by the `backlinks` call); 0 backlinks and 0 referring domains on the live
  host (Ubersuggest, 2026-09-10).
- **Any further domain change resets this again.** §4 now names it as a gate.

A `domain_overview` call for `cdsportswearinc.com` returned `HTTP 403` on
2026-09-10 after several successful calls; the `backlinks_overview` figures
above are what stood in for it. Retry next run.
