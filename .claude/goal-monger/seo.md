# Goal-monger project profile — SEO

Loaded by the `goal-monger` skill when a goal matches **Scope**. It overrides the skill's generic defaults. `CLAUDE.md` and `docs/seo/STRATEGY.md` override it.

## Scope

Goals about search rankings, organic traffic, backlinks, or organic leads for CD Sportswear INC (`https://www.cdsportswearinc.com`). It does **not** cover site animation, CRM, or design goals: use the generic rules and `CLAUDE.md` for those.

## Read first

1. `docs/seo/STRATEGY.md` — authoritative.
2. `docs/seo/OPERATIONS-MANUAL.md` §1–§2.
3. `docs/seo/KEYWORD-REGISTRY.md`.
4. The `crystal-command` skill, if available: approval gates, evidence rules, the difficulty ceiling, and the never-do list.
5. The newest `docs/seo/runs/*.md`, then `gh pr list --state open`. The Hermes Agent also runs SEO jobs on this machine. If a run log or an open PR already covers a move, report the overlap instead of duplicating it.

## Ledger

`docs/seo/goals.md`.

## Where to work

Never work in the main checkout at `C:\Users\moizjmj\CD Sportswear USA\site`, because it can hold another session's uncommitted files.

1. Run `git fetch origin`.
2. Create a worktree under `.claude/worktrees/` on a new branch (`seo/<topic>-<YYYY-MM-DD>`) from `origin/main`.

Every PR to `main` follows the versioning rule in `CLAUDE.md`:
- Bump `VERSION` and add the entry at the top of `CHANGELOG.md`.
- Title it `vX.NN — …`.
- Take the number one above the highest in `git log --oneline -5 origin/main` **and** in open PR titles.

## Proof sources

- **Finish-line sources:**
  - Google Search Console, property `sc-domain:cdsportswearinc.com`: positions, clicks, impressions, CTR.
  - GA4 property `552972119`: `generate_lead` and engaged sessions.
  - The CRM, for qualified inquiries.
- **Never a finish line:** Ubersuggest, Semrush, and Ahrefs. They are estimates and may only inform the plan.
- **Ranking goals** measure the exact query AND the exact page together (one filter group, Web search, final data):
  - Prefer the Search Console connector's `get_seo_goal_snapshot`.
  - Otherwise, call `get_search_console_quick_stats` with both filters at once.
  - Never join a query-only table to a page-only table.
- **Context rows** (query-only, page-only, property-wide) are reported separately and labelled as context.
- **No impressions** means position unavailable, not 0. Days without impressions never count toward a sustain window. A query filter drops anonymized low-volume queries, so "no row" is not proof of zero searches.
- **Business goal.** STRATEGY §1 defines success as qualified organic inquiries:

  | Checkpoint | Date |
  |---|---|
  | T+90 | 2026-12-02 |
  | T+180 | 2027-03-02 |
  | T+365 | 2027-09-03 |

  A ranking goal is a leading indicator and never replaces this. When GA4 isn't reachable, write "goal metric: unavailable this run".

## Lag

Search Console data trails by about 2–3 days, and a ranking change needs about 28 days to read. Use:
- **End date:** today (Pacific) minus 3 days.
- **Current window:** 28 days.
- **Comparison:** the equal-length window immediately before it.
- **Sustain window:** 14 days.

## Set-the-goal checks

- **Difficulty ceiling.** If the target keyword is above the ceiling in `crystal-command` or STRATEGY §3, say so and propose a ladder.
- **Registry.** If the target query maps to a different URL in `KEYWORD-REGISTRY.md`, stop and resolve ownership first. Chasing a query on the wrong page cannibalises it.
- **Typical milestones:**
  1. Technical blockers cleared.
  2. Indexed and self-canonical (URL Inspection).
  3. The query shows impressions.
  4. Position ≤ 20.
  5. Position ≤ 10.
  6. Finish line.

## Move playbook

1. **Unblock measurement or indexing.** Broken tracking, noindex, a wrong canonical, missing from the sitemap, crawl errors.
2. **Page move.** When the target page is in striking distance (position 4–20) for its query and has no pending change, hand off to the `striking-distance` skill, pinned to that page and query.
3. **Coverage or proof gap.** Content missing compared with the live top 5, or real proof: a case study, a named client outcome, local presence. If no proof exists, ask MJ for it.
4. **Authority.** Internal links from relevant pages first, then external referring-domain prospects under crystal-command's backlink rules.

Never create a second URL for a query the registry already assigns. Downloadable assets go under `docs/seo/drafts/downloads/`, never `docs/seo/drafts/blog/`, because the publish script turns every approved file there into a `/blog/<slug>` post.

## Validators

- **Live checks:** HTTP status, canonical, and presence in `https://www.cdsportswearinc.com/sitemap.xml`.
- **Search Console:** URL Inspection.
- **Code changes:** `pnpm test`, `pnpm test:marketing`, and CI's `test` and `build` jobs.

## Approval gates (STRATEGY §4) — MJ's explicit written yes, every time

MJ must say yes before any of these:
- Merge any PR. Merging `main` deploys production.
- Run `vercel --prod`.
- Flip a draft to `approved: true` or `published`.
- Send outreach or any message.
- Buy links, memberships, or placements.
- Bulk-submit directories.
- File a disavow.
- Create, rewrite, or delete an Ubersuggest project or its tracked keywords.
- Change the domain, DNS, or redirects.
- Change Google Cloud or Search Console settings.

Free to do without asking: files under `docs/seo/`, branches, PRs, and drafts.

## Report

Owner: **MJ** (`WAITING ON MJ:`). Open the report with progress against the STRATEGY §1 qualified-inquiry goal, or "unavailable this run".
