# SEO STRATEGY — cdsportswearinc.com

**Read this first. It is one page, it is the rule, and it applies to every agent
(Hermes, Claude, Codex, Gemini, or anything else) and every human working on
SEO for this site.** Ratified by MJ on 2026-09-19. Nothing below changes
without MJ saying so in writing; an agent that thinks a rule is wrong proposes
an edit to this file in a PR and keeps following the rule until it merges.

Precedence when documents disagree: **this file → `OPERATIONS-MANUAL.md`
(systems, mode logic, run mechanics) → `KEYWORD-REGISTRY.md` (the live
keyword→URL map) → `runs/*.md` (history).** Older strategy statements —
the Manassas local ladder, the "specific low-difficulty terms" rule of
2026-08-19 / 2026-09-02, the Notion pages — are superseded by §3 below.

---

## 1. What we are trying to do

Rank **`https://www.cdsportswearinc.com`** (brand: **CD Sportswear INC**, a
national, fully-remote web design and digital agency) for the **broad head
terms** that buyers of web design, digital marketing, logo/branding and SEO
services type into Google in the United States. Success is measured as
*qualified impressions → qualified clicks → engaged visits → inquiries →
qualified opportunities* on those terms — never as "number of keywords
tracked" and never as traffic that cannot convert.

Starting position (Ubersuggest, 2026-09-10): DA 1, 0 backlinks, 0 referring
domains. Every clock restarted on 2026-09-03 when the domain moved. Treat
this as a 12–24 month programme. Flat rankings in the first two quarters are
**expected**, not a failure signal; the kill criteria in §6 are what decide
whether an approach is wrong.

## 2. Positioning — what the pages are allowed to say

- National / remote. Never write a location page for a place the business
  cannot demonstrably serve, and never fake local proof.
- Services sold are the eight live `/services/*` pages plus SEO once §3 row 4
  ships. Do **not** build pages for services the site does not sell
  (Shopify, native mobile, and anything else absent from `lib/servicePages.mjs`).
- Brand name is exactly **CD Sportswear INC**. Do not write "Crystal Web
  Solution" or "CD Sportswear USA" on any new page.

## 3. The keyword rule — head terms, reached through pillar + cluster

**Decision (MJ, 2026-09-19): we target the broad head terms.** This reverses
the earlier "specificity, not head terms" rule. At DA 1 a head term is only
reachable through a *cluster*, so the method is fixed too:

> **One pillar URL per theme targets the head term. Supporting pages — specific,
> narrower posts and sub-pages — are built first, each targeting one narrow
> term, and every one links up to its pillar. The head term is the destination;
> the supporting pages are how we get there.**

The four themes, all **Now** priority, worked in this rotation order (easiest
head term first, so the programme shows a signal earliest):

| # | Theme | Pillar URL | Primary head term (Ubersuggest US, 2026-09-19) | Status |
|---|---|---|---|---|
| 1 | Web design / redesign | `/services/web-design` | `websites designers` — 27,100/mo · diff 33 · $21.50 · commercial | Pillar exists |
| 2 | Digital marketing | `/services/digital-marketing` | `digital marketing agency` — 49,500/mo · diff 82 · $14.92 · navigational | Pillar exists |
| 3 | Logo / branding | `/services/logo-design` (logo terms) and `/services/branding` (branding terms) | `logo design` — 40,500/mo · diff 75 · $8.17 · commercial | Pillars exist; the cluster is split across two pillars, never merged |
| 4 | SEO / CRO | `/services/seo` | `seo agency near me` — 22,200/mo · diff 57 · $28.51 · commercial | **Pillar does not exist.** Build it (code page PR, MJ merges) before any supporting page for this theme. CRO terms are a *section* of this pillar, not their own target |

Rules that follow from the table:

- **One keyword → exactly one URL.** `KEYWORD-REGISTRY.md` is the map. Read
  it before proposing any target; update it when a page ships. Never point
  two pages at the same term.
- **One primary head term per pillar.** The other tracked variants in that
  theme (`digital marketing co`, `websites designing`, `logotype design`,
  `…near me` phrasings, etc.) are *secondary* on the same pillar. They are
  never given their own page. "Near me" phrasings are always secondary — the
  business has no local footprint to rank them on.
- **Supporting pages target specific terms only** (platform + service +
  buyer-stage phrasing; difficulty ≤ 30 preferred), and each must link to its
  pillar with descriptive anchor text. A supporting page with no viable
  narrow term is a sales asset, not a ranking play — record it as unmapped.
- **Build order inside a theme:** pillar exists and is complete → 3–5
  supporting pages → internal links wired both ways → then move to the next
  theme. Do not scatter one post per theme.
- The 25 terms tracked in Ubersuggest project `109eb168…` are **all** in
  these four themes. Terms outside them are not targets until MJ adds a theme
  here.

## 4. Approval gates — never cross without MJ's explicit written yes

Automation researches, scores, drafts, and queues. **People approve anything
that leaves the building.** Never, without MJ's yes in the current conversation
or PR: send outreach or any message · buy links, memberships, sponsored posts
or paid placements · bulk-submit directories · **merge any PR** (`main` deploys
to production) · flip a blog post to `published` · publish anywhere outside the
repo PR flow · file a disavow · create, rewrite or delete a Ubersuggest project
or its tracked-keyword set · change the production domain, DNS or redirects.

Freely permitted: create/update files under `docs/seo/`, open PRs, draft
content, upload cover images to storage, comment on the issue tracker.

## 5. Evidence rules — how any number may be stated

Every keyword, metric, competitor claim and recommendation carries **source,
tool, date, and target URL**. Ubersuggest figures are *estimates* and are
labelled as such; Search Console, Bing Webmaster and GA4 are *first-party* and
are the only ranking evidence that counts for §6. If a number cannot be
sourced, say "unavailable" — never estimate around a gap, never invent. One
WebFetch reading is not enough for a consequential claim; verify a second way.

## 6. How we know it is working — checkpoints and kill criteria

For every page, recorded in the run log from `published_at`:

- **T+0** live, self-canonical, in `/sitemap.xml`, submitted in Search
  Console (MJ, until API access exists).
- **T+7d** indexed.
- **T+30d** any impressions for its target term.
- **T+90d — supporting page kill criterion:** no top-50 position *and* no
  impressions for its narrow term → revisit the approach before building
  more pages of that type.
- **T+180d — pillar checkpoint:** the pillar must show first-party
  impressions for its head term. If not, the theme's cluster is audited
  (thin pages, missing links, wrong intent) before more of it is built.
- **Never** judge a head term at T+30 or T+90. Judge the supporting pages.

Weekly: `domain_overview` diffed against last week, new/lost referring
domains with the PBN check (`backlinks/pbn-watch.md`), registry update.
Monthly: the funnel in §1, non-brand growth, referring domains, anchor mix,
competitor gap.

## 7. Never do these

Mass-generated or spun content · private blog networks or link buying · fake
reviews · keyword-stuffed location pages · a page for a service we do not
sell · a page that exists because a keyword looked cheap rather than because
the business can serve that searcher · merging anything · guessing a number.

## 8. Current state (update this block every time it changes)

- **Mode B (standard daily)** as of 2026-09-19: the Ubersuggest project
  reports GA4 property `552972119` connected; Google Search Console and Bing
  Webmaster Tools are verified for the domain (MJ, 2026-09-19). API access
  for the Hermes jobs is still being set up — until then, first-party data is
  read by MJ, and agents report it as "unavailable to this run".
- Daily operator: **Hermes Agent** on MJ's desktop (`CDS-SEO daily` Mon–Fri,
  `CDS-SEO weekly audit` Sun, `CDS-SEO watchdog`). Claude/Cowork sessions
  advise and may open PRs, but must check open PRs and today's run log first
  so two agents never open competing work.
- Live pages that already count toward §3: `/services/web-design`,
  `/services/digital-marketing`, `/services/logo-design`, `/services/branding`
  (pillars); `/blog/web-development-rfp-guide`, `/blog/branding-and-web-design-studio`
  (supporting; re-map them to their pillar in the registry).
- Unresolved, blocked on MJ: see `OPERATIONS-MANUAL.md` §11. The §3 strategy
  split listed there (item 6) is **resolved by this file**.

## 9. If you are an agent starting a run — the 60-second checklist

1. Read this file, then `OPERATIONS-MANUAL.md` §1–§2, then `KEYWORD-REGISTRY.md`.
2. Check the latest `runs/*.md` and the open PRs. Do not duplicate work.
3. Pick the next theme in the §3 rotation whose pillar is not yet complete or
   whose cluster has fewer than 3 supporting pages. Work **one** artifact.
4. Every claim: source · tool · date · URL. Every unknown: "unavailable".
5. Open a PR. Write the run log. Stop. Never merge, never message, never buy.
