# API spec — POST /api/blog/publish

Authoritative reference. Source of truth: `server/blogPublishRoute.ts` in `moizj00/ttml-app`.

## Request

```
POST https://talk-to-my-lawyer.com/api/blog/publish
Authorization: Bearer <BLOG_PUBLISH_API_KEY>
Content-Type: application/json   OR   text/markdown
```

Alternative auth header: `X-Blog-Publish-Key: <key>` (use either, not both).

## JSON body schema

Required: `slug`, `title`, `content`. Everything else optional with defaults.

```jsonc
{
  "slug": "kebab-case-slug",            // lowercase, hyphens only, no underscores
  "title": "Human-readable title",
  "content": "# Markdown body here",
  "excerpt": "Card teaser (auto-derived if absent)",
  "category": "demand-letters",          // default "general"; see categories.md
  "status": "published",                 // or "draft"; default "published"
  "metaDescription": "≤155 char meta description",
  "ogImageUrl": "https://...",
  "authorName": "Talk to My Lawyer Team",
  "tags": ["demand letter", "california"],
  "date": "2026-05-25"
}
```

## Markdown body (with frontmatter)

```markdown
---
slug: kebab-case-slug
title: "Human-readable title"
description: "≤155 char meta description"
author: "Talk to My Lawyer Team"
category: demand-letters
tags: ["demand letter", "california"]
status: published
date: 2026-05-25
---

# Markdown body here
```

In markdown mode, `description` populates both `excerpt` and `metaDescription`.

## Response

- **201 Created** — slug did not exist (row inserted)
- **200 OK** — slug already existed (row updated)

```json
{
  "ok": true,
  "id": 42,
  "slug": "your-slug",
  "status": "published",
  "action": "created"
}
```

## Errors

| Code | Body | Cause |
|---|---|---|
| 400 | `Missing or invalid 'slug'/'title'/'content'` | required field absent or wrong type |
| 400 | `Invalid category 'x'. Must be one of: ...` | category not in enum |
| 400 | `Invalid status 'x'. Must be 'draft' or 'published'.` | status typo |
| 401 | `Unauthorized` | bad/missing API key |
| 500 | `Internal server error` | DB or upstream failure — retry once |
| 404 | Railway fallback `Application not found` | service down — check Railway |

## Side effects on success

1. Upsert row in `blog_posts` (Supabase Postgres)
2. Recalculate reading time from content length
3. Invalidate Cloudflare KV cache for `/blog/{slug}` AND the category list
4. Log `[blog-publish] {action} post: slug={slug}, id={id}, status={status}`

Drafts are invisible to the public site (excluded from `/api/blog-internal/*`).

## Idempotency

Endpoint upserts by slug. Re-POSTing the same slug is always safe.
