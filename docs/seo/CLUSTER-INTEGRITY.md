# Cluster integrity — what the test enforces

`tests/seo-cluster-integrity.test.mjs` turns the pillar + cluster rule in
`STRATEGY.md` §3 into a build gate. It runs inside `pnpm test`, so a broken
cluster link fails CI rather than sitting undetected.

## Why this exists

The strategy's method is a link graph:

> One pillar URL per theme targets the head term. Supporting pages are built
> first, each targeting one narrow term, and every one links up to its pillar.

Three files have to agree for that graph to be real, and nothing checked that
they did:

| Source | Holds |
|---|---|
| `docs/seo/KEYWORD-REGISTRY.md` | the keyword → URL map |
| `docs/seo/drafts/blog/*.md` | the post bodies, and the post → pillar links |
| `lib/servicePages.mjs` (`GUIDE_LINKS`) | the pillar → post links |

They had already drifted. `/blog/web-development-rfp-guide` went weeks with no
reportable Search Console impressions for any query, and part of the reason was
that Google had not crawled the pages linking to it — an internal-link problem
that no test could see. Separately, the registry recorded two posts as
`draft 2026-09-22` that had never existed as files in any branch (corrected
2026-09-29; see the registry's own correction note).

## The seven invariants

| # | Invariant | Catches |
|---|---|---|
| 1 | One keyword maps to exactly one URL | Two pages competing for the same term |
| 2 | A row claiming `draft` has that file in `docs/seo/drafts/blog/` | The registry describing work that was never started |
| 3 | Every draft on disk is mapped in the registry | An unmapped draft publishing a URL that competes for an owned term |
| 4 | Each draft's `target_url` equals `/blog/<filename>` | A publish-time rejection, caught earlier |
| 5 | Every draft links up to a real `/services/` pillar, anchor text ≥ 10 chars | The §3 rule itself, plus thin anchors like "here" |
| 6 | An **approved** post that links up to a pillar is linked back from that pillar's `guideLinks` | One-way links; the pillar not passing authority back down |
| 7 | Every `guideLinks` href is a well-formed `/blog/<slug>` with descriptive anchor text | Typos and thin anchors in the pillar → post direction |

Invariant 6 deliberately skips unapproved drafts: a live pillar must not link to
a post that has not shipped.

## When it fails

Read the assertion message — each one names the file and the offending link.

- **"no link to a /services/ pillar"** — add one contextual link in the body to
  the pillar that owns the theme, with anchor text that describes the
  destination. Not a bare "here".
- **"does not link back to /blog/…"** — add the post to `GUIDE_LINKS` in
  `lib/servicePages.mjs`, under the signal for that pillar.
- **"registry claims a draft that does not exist"** — either the draft was never
  written (correct the page-state column, as on 2026-09-29) or it exists
  elsewhere and should be committed. Do not delete the registry row: the
  mapping reserves the URL, and removing it frees the term for another page.
- **"a keyword pointing at two URLs"** — a mapping conflict. This is MJ's call,
  not an automatic edit; `STRATEGY.md` governs which URL owns the term.

## What it does not check

- **Live post bodies.** Published posts live in Supabase, not in the repo.
  `scripts/seo/publish-blog-drafts.mjs` upserts approved drafts into the
  database, so a draft file is only the source of truth up to the moment it
  ships; a post edited afterwards in the CRM drifts unseen. Posts published
  before the drafts directory existed (for example
  `/blog/branding-and-web-design-studio`) have no file at all, which is why
  invariant 2 is scoped to rows claiming `draft` rather than every row.
- **Whether a link is contextually sensible**, only that it exists, resolves and
  has real anchor text.
- **Whether Google has crawled any of it.** That is Search Console's job, and it
  remains the only proof of the ranking goal in `goals.md`.
