# SEO operations — repository memory

This directory is the operating memory for the CD Sportswear USA SEO programme.
It replaced the Notion archive on 2026-09-02 (MJ's decision). Everything the
automated daily run needs to know lives here, and everything it produces lands
here, so the same reviewed-PR gate that protects the site protects the plan.

| Path | What it is | Who writes it |
|---|---|---|
| `OPERATIONS-MANUAL.md` | Strategy, mode logic, approval gates, system IDs. **Authoritative.** | MJ approves; the run proposes edits via PR |
| `KEYWORD-REGISTRY.md` | One keyword → one URL. The cannibalisation guard. | The run, on approved drafts |
| `runs/YYYY-MM-DD.md` | Daily run logs, newest at the bottom of the list | The run, every run |
| `drafts/blog/<slug>.md` | Blog post drafts, front-matter matching `blog_posts` | The run drafts; MJ approves |
| `drafts/blog/assets/` | Cover images for drafts, uploaded on publish | The run or MJ |
| `backlinks/prospects.md` | Scored outreach shortlist. Research only. | The run |
| `backlinks/pbn-watch.md` | The spam signature to watch for, and the known bad domains | The run |

## How a blog post ships

1. The run writes `drafts/blog/<slug>.md` with `approved: false` and opens a PR.
2. MJ reviews the draft in the PR. To approve, flip `approved: true` (in the PR
   or in a follow-up commit) and merge.
3. On merge to `main`, `.github/workflows/seo-publish-blog.yml` runs
   `scripts/seo/publish-blog-drafts.mjs`, which upserts every approved draft
   into the `blog_posts` table **as `status: draft`**, uploading the cover
   image to Supabase Storage on the way.
4. MJ opens `/admin/blog`, reads it once more, and flips it to Published.

Step 4 is deliberate — MJ chose to keep a final look before anything goes
live. The merge publishes to the table; only the admin UI publishes to the
site. The workflow never sets `published`.

The workflow is inert until the repo has the secrets it needs — see
`.github/workflows/seo-publish-blog.yml` for the list. Merging drafts before
the secrets exist is harmless: the script logs what it would have done and
exits 0.

## How a code page ships (e.g. `/hire/shopify-developer`)

Landing pages are Next.js routes, not blog rows. The run opens a PR on a
`seo/<slug>` branch following the App Router conventions in `CLAUDE.md`. MJ
merges. Merging deploys production — the run never merges.

## What the run may do without asking

Create and update anything under `docs/seo/`, open PRs, create and comment
Linear issues, add keywords to the Ubersuggest project, upload cover images.

## What the run must never do without MJ's explicit yes in the conversation

Send outreach or any message. Buy links or placements. Bulk directory
submissions. Merge a PR. Flip a blog post to `published`. File a disavow.
Delete a Ubersuggest project. The full list is in the Operations Manual.
