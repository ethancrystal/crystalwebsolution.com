# Campaign amplification kits

One file per published post: `docs/seo/campaigns/<slug>.md`, where `<slug>`
matches the post's `/blog/<slug>` and its draft in `../drafts/blog/`.

A kit is **channel copy, not a channel action.** Committing one here publishes
nothing and sends nothing. Per `../README.md`, sending outreach or any message
needs MJ's explicit yes in the conversation, every time — a kit sitting in this
directory is not that yes, and neither is a merge.

## What a kit holds

| Section | Notes |
|---|---|
| Post | Slug, live URL, target keywords, and the kit's registry state |
| LinkedIn | Long-form. One soft CTA at the end |
| X / short | Under 280 characters including the URL |
| Email / list | Subject options plus one body |
| Canva creative notes | Art direction for the creative — hook, visual, footer CTA |
| Channel status | Which channels have actually gone out, and when |

## Rules the copy has to hold to

- **Soft CTA only.** Invite a brief or a reply; never promise a turnaround, a
  free audit, a no-obligation review, or a discount. The RFP-guide verifier
  struck exactly those two promises on 2026-09-02 (see `../runs/2026-09-02.md`)
  and they must not come back in through social copy.
- **No invented numbers, clients, testimonials, or outcomes.** Price bands are
  planning ranges and must be labelled as such — "typical, not quotes" — in
  every channel that carries them, because they read as a quote otherwise.
- **No local-ranking claims.** No "#1 in Manassas", no "top-rated", no implied
  storefront. The site is remote-default and the copy says so.
- **Absolute URLs only in outbound copy.** Blog bodies use site-relative paths;
  social and email cannot, so they carry the full `https://www.cdsportswearinc.com/…`.
  Re-check these against the live host before sending — the production domain
  has moved twice without a code change to announce it (see the root
  `CLAUDE.md`).

## Registry state

Each kit records how its post sits against `../KEYWORD-REGISTRY.md`. A post
that is live against a **parked or dropped** keyword is a drift note, not a
licence to edit the registry — the registry is MJ-approved strategy, and
unparking a term is a strategy decision, not bookkeeping. Log it, leave it,
raise it.
