# Blog drafts

One file per post: `docs/seo/drafts/blog/<slug>.md`. The filename is the slug
(lowercase, digits, single hyphens, ≤80 chars — the same rule as the
`blog_posts` table). Cover images go in `assets/<slug>.<jpg|png|webp>`.

On merge to `main`, `scripts/seo/publish-blog-drafts.mjs` upserts every draft
with `approved: true` into `blog_posts` as **`status: draft`**. MJ then
publishes from `/admin/blog`. The script never publishes.

## Front-matter

```
---
title: How to Write a Web Development RFP That Gets Real Proposals
seo_title: Web Development RFP: Guide and Template
seo_description: A practical guide to writing a website development RFP — what to include, what to leave out, a copy-paste template, and how to score the proposals you get back.
excerpt: Web development RFPs tend to get vague, padded proposals because they ask vague, padded questions. Here is what an agency actually needs from you to price the work honestly.
cover_image: assets/web-development-rfp-guide.jpg
target_keywords: rfp web development, website development rfp
target_url: /blog/web-development-rfp-guide
approved: false
---
```

| Key | Required | Limit | Notes |
|---|---|---|---|
| `title` | yes | 1–200 | Becomes the page `<h1>`. Do not repeat it as a heading in the body |
| `seo_title` | no | ≤70 | Falls back to `title` |
| `seo_description` | no | ≤200 | Falls back to `excerpt` |
| `excerpt` | no | ≤320 | Listing summary. Derived from the opening prose if blank |
| `cover_image` | no | — | Path relative to this directory. Uploaded to Storage on publish; must be `.jpg`, `.jpeg`, `.png` or `.webp` |
| `target_keywords` | yes | — | Comma-separated. Must exist in `KEYWORD-REGISTRY.md` mapped to `target_url` |
| `target_url` | yes | — | `/blog/<slug>` |
| `approved` | yes | `true`/`false` | **Only MJ sets this to `true`.** |

Values are plain strings — no quotes needed, no YAML lists, no nesting. The
parser is deliberately tiny (see the script) so a draft can never carry
anything it should not.

## Body

Everything after the closing `---`. The blog renders a **small Markdown
subset** (`lib/blogMarkdown.mjs`) and treats anything else as literal text:

- `##` and `###` headings only — **no `#`** (the title is the page's H1)
- paragraphs, `-` lists, `1.` lists, `>` blockquotes, ``` fenced code, `---` rules
- inline `**bold**`, `*italic*`, `` `code` ``, `[text](https://…)` or `[text](/relative)`
- links to anything other than `http(s):`, `/…`, `#…` or `mailto:` are
  rendered as plain text
- **no HTML, no images in the body, no tables, no footnotes** — they will show
  as literal characters

Internal links use site-relative paths (`/services/web-design`), so they stay
correct if the domain ever changes again.

## What a complete draft contains

Title tag and meta description (front-matter), an opening that answers the
search intent in the first paragraph, `##` sections that each earn a place,
at least two internal links to existing pages, one call to action, and no
invented numbers, clients, or outcomes. Every claim that needs a source has one
inline. The run's verifier agent checks all of that before the PR opens.
