---
name: ttml-blog-batch
description: Runs the daily TTML (Talk-to-My-Lawyer) blog batch. Reads state files to avoid duplicate topics, picks today's weekday theme, generates 4 search-optimized Markdown articles (one per content bucket), writes them to the local git clone, commits using the GitHub no-reply email, and pushes to main so GitHub Actions syncs them to the live site. Use this skill whenever asked to "run the blog batch", "publish today's posts", "write the TTML blog articles", "do the daily blog run", "run the TTML blog", or any variation on generating and pushing that day's blog content. Also trigger when the user just says "run it" or "go" if blog publishing is the ongoing context.
---

# TTML Daily Blog Batch

Automated daily blog publisher for Talk-to-My-Lawyer (ttml.app).

## Quick Reference

- **Repo (local clone):** `C:\Users\moizjmj\ttml-app-work`
- **Blog directory:** `blog/` at repo root
- **Filename pattern:** `YYYY-MM-DD-slug.md`
- **Git identity (repo-local):** name `moizj00`, email `22807005+moizj00@users.noreply.github.com`
- **State files:** `.claude/published-topics.md`, `.claude/theme-weights.json`, `.claude/citation-scores.md`
- **Full conventions:** `.claude/repo-conventions.md` (read this if anything is unclear)
- **File writing tool:** Desktop Commander MCP — GitHub MCP is read-only on this repo

---

## Step 1 — Pre-Flight: Read State Files

Before generating any content, read these files using Desktop Commander `start_process` with PowerShell `Get-Content`:

1. **`.claude/published-topics.md`** — running log of every published title by date. Avoid any topic already listed here.
2. **`.claude/theme-weights.json`** — citation-derived bucket weights. When two topic ideas are equally strong, prefer the higher-weighted bucket.
3. **`.claude/citation-scores.md`** — which queries TTML is being cited for and which are gaps. Prioritize "Content Gaps" topics if the file exists. (It's generated weekly by CI; skip if absent.)
4. **`.claude/repo-conventions.md`** — skim for any recent changes (re-inspect monthly or when the file's "Last inspected" date is stale).

Also run `git pull --rebase origin main` now so the local clone is current before you start writing. Use `start_process` with `shell: "cmd"` (see Step 7 for the exact pattern).

---

## Step 2 — Pick Today's Theme

Determine today's weekday and map to the content theme:

| Day | Theme | Primary category |
|-----|-------|-----------------|
| Monday | Landlord / tenant / eviction | `landlord-tenant` or `eviction-notices` |
| Tuesday | Contractor / construction disputes | `contract-disputes` |
| Wednesday | Ecommerce / IP / counterfeit | `intellectual-property` |
| Thursday | Freelancer / unpaid invoices / B2B | `demand-letters` |
| Friday | Consumer complaints / refunds | `consumer-complaints` |
| Saturday | Letter deep-dives (pick highest-weight letter type) | match specific category |
| Sunday | Comparison / pricing / process | `pricing-and-roi` or `general` |

Pick a focused search query for today's theme that does not appear in `published-topics.md`. The query becomes the H1, the slug, and the `description` meta tag.

---

## Step 3 — Generate 4 Articles (One Per Bucket)

Write one article per bucket. All four target the same theme and day's audience but approach it from a different angle. Keep each bucket distinct — don't let them bleed into one another.

### Bucket 1 — Problem-Aware
**Audience:** Someone experiencing the problem right now, searching in frustration.
**Angle:** Validate their situation, lay out their options clearly, position TTML as the fastest path to a professional attorney letter.
**Length:** 600–750 words.
**Title pattern:** "My [X] happened — what can I do in California?" or "I'm owed $X and [situation] — what are my options?"

### Bucket 2 — Letter-Type Explainer
**Audience:** Someone who has heard of the letter type but doesn't know what it does or whether it works.
**Angle:** Define the letter, explain what an attorney-signed version accomplishes that a DIY version doesn't, and set realistic expectations.
**Length:** 600–750 words.
**Title pattern:** "What Is a [Letter Type] and Does It Actually Get Results?"

### Bucket 3 — Industry / Use-Case
**Audience:** Someone in a specific role (freelancer, contractor, landlord, ecommerce seller) with this exact problem.
**Angle:** Step-by-step process tailored to their situation, including California statutes where they add credibility.
**Length:** 650–800 words.
**Title pattern:** "How [Role] Can [Action] Without [Fear] in California"

### Bucket 4 — Process / Comparison
**Audience:** Someone deciding between two options (letter vs. court, attorney vs. DIY, demand letter vs. collections agency).
**Angle:** Concrete cost/time comparison, decision criteria, clear recommendation.
**Length:** 600–750 words.
**Title pattern:** "[Option A] vs. [Option B]: Which Is [Faster/Cheaper/Smarter] for [Audience] in California"

---

## Step 4 — Article Writing Rules

Every article must follow these rules (distilled from `repo-conventions.md`):

### Structure
- **Direct answer in the first 100 words** — answer the search query before any preamble. This is what AI engines (Perplexity, ChatGPT, Claude) extract for citations.
- **Short Answer paragraph (≤300 chars)** as the very first body paragraph — `BlogPost.tsx` renders this as a styled callout.
- **H2 sections phrased as questions** — e.g. "## What happens if my client ignores the letter?" — so JSON-LD FAQ schema can pick them up.
- **Disclaimer always last:**
  `*This article is general information only and is not legal advice. Consult a licensed attorney for advice specific to your situation.*`

### California law references
Include statute citations where they add credibility (e.g., CCP § 337 for 4-year SOL on written contracts, 10% annual prejudgment interest). Only cite statutes you are confident about — do not invent numbers.

### Internal links
Include at least one link to a prior TTML post using its slug path:
```markdown
[demand letters](/blog/2026-05-13-what-is-a-demand-letter)
```
Use titles from `published-topics.md` to find linkable posts.

### What to avoid
- No raw HTML in the body.
- No guarantees ("you will win", "guaranteed to work").
- No invented case citations or made-up statistics.
- No H1 in the body — the `title` frontmatter field becomes the page H1.

---

## Step 5 — Frontmatter Schema

Every article must begin with this YAML block:

```yaml
---
title: "Specific, search-intent title here"
slug: specific-search-intent-title-here
description: "≤155 char meta description that includes the focused query."
excerpt: "2–3 sentence plain-English summary used as card teaser on /blog."
date: YYYY-MM-DD
author: "Talk to My Lawyer Team"
category: demand-letters
tags: ["demand letter", "unpaid invoice", "freelancer", "california"]
status: published
---
```

**Rules:**
- `slug` must be kebab-case, all lowercase, hyphens only, no underscores, and must match the filename (minus the date prefix).
- `description` ≤ 155 chars — this becomes the `<meta name="description">` tag.
- `category` must be exactly one of the BLOG_CATEGORIES enum values from `repo-conventions.md`.
- `status: published` to go live. Use `draft` to hold a post out of sync.

**BLOG_CATEGORIES quick reference (full list in repo-conventions.md):**
`demand-letters` · `cease-and-desist` · `contract-disputes` · `eviction-notices` · `employment-disputes` · `consumer-complaints` · `pre-litigation-settlement` · `debt-collection` · `landlord-tenant` · `intellectual-property` · `pricing-and-roi` · `general` · (and others)

---

## Step 6 — Write Files via Desktop Commander

Write each article file using `mcp__Desktop_Commander__write_file` in chunks of 25–30 lines:

1. First chunk: `mode: "rewrite"` — frontmatter + opening paragraphs.
2. Each subsequent chunk: `mode: "append"` — continue body sections.

**File path:**
```
C:\Users\moizjmj\ttml-app-work\blog\YYYY-MM-DD-slug.md
```

After all four articles are written, append today's section to the state file:

**`C:\Users\moizjmj\ttml-app-work\.claude\published-topics.md`** — append:
```markdown

## YYYY-MM-DD
- Title of article 1
- Title of article 2
- Title of article 3
- Title of article 4
```

---

## Step 7 — Git Commit and Push

GitHub MCP is read-only on this repo. All git operations use Desktop Commander `start_process`.

**Shell note:** Use `shell: "cmd"` for git commands. PowerShell quoting breaks commit messages that contain colons. For the commit step specifically, write a `.bat` file and execute it — CMD still misparsed inline commit messages with colons in some contexts.

### 7a. Pull before writing (do this in Step 1, confirm again before committing)
```bat
cd /d C:\Users\moizjmj\ttml-app-work
git pull --rebase origin main
```

### 7b. Stage the files
```bat
cd /d C:\Users\moizjmj\ttml-app-work
git add blog\YYYY-MM-DD-*.md
git add -f .claude\published-topics.md
```
The `-f` flag is required — `.claude\` is listed in `.gitignore`.

### 7c. Commit via .bat file
Write `C:\Users\moizjmj\commit-blog.bat`:
```bat
@echo off
cd /d C:\Users\moizjmj\ttml-app-work
git commit -m "blog: 4 posts for YYYY-MM-DD"
```
Run it with `start_process` using `shell: "cmd"`. Delete the file afterward.

### 7d. Push
```bat
cd /d C:\Users\moizjmj\ttml-app-work
git push origin main
```

### 7e. Git identity (should already be set — verify only if push is rejected)
```bat
cd /d C:\Users\moizjmj\ttml-app-work
git config user.name "moizj00"
git config user.email "22807005+moizj00@users.noreply.github.com"
```
The no-reply email is mandatory. GitHub rejects pushes from the real Gmail address because it is set to private on the account.

---

## Step 8 — Confirm

After a successful push, report:
- The 4 article titles published today
- The category and weekday theme used
- The git commit hash or message
- A note that `sync-blog.yml` (GitHub Actions) will pick up the posts and sync them to the live Postgres DB within a few minutes.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Push rejected — non-fast-forward | `git pull --rebase origin main` then push again. GitHub Actions may have committed between your pull and push. |
| GH007 push blocked — private email | Verify repo-local email is the no-reply address. Amend: `git commit --amend --reset-author --no-edit` then push. |
| `git add .claude/...` silently skipped | Use `git add -f .claude\published-topics.md` — the directory is gitignored. |
| Commit message parse error in CMD | Use the `.bat` file approach. Inline `git commit -m "..."` with colons fails in some CMD contexts. |
| Desktop Commander `write_file` truncates content | Chunk files to ≤30 lines per call. First call uses `mode: "rewrite"`, subsequent calls use `mode: "append"`. |
| `repo-conventions.md` looks stale | Re-read it — check the "Last inspected" date at the top. Re-inspect monthly or when new config files appear at the repo root. |
| `citation-scores.md` missing | File is generated weekly by CI. If it doesn't exist yet, skip it and proceed with the weekday theme defaults. |
