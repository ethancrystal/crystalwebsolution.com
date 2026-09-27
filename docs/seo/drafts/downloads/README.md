# Downloadable asset drafts

Drafts of files a live page will offer as a download (worksheets, templates,
checklists). They are **not** blog posts and must never go in
`docs/seo/drafts/blog/`: the publish script upserts every approved file there
as a `/blog/<slug>` post, which would give an asset its own URL and can create
a second owner for a query already mapped in `KEYWORD-REGISTRY.md`.

Each asset names the page it supports (`target_url`) and stays
`approved: false` until MJ reviews it. Shipping one means converting it to an
accessible file and adding the CTA to the owning page through the normal PR
flow — nothing in this folder is read by any script.
