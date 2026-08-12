# Audit Report Templates

This skill produces two report types. Use the matching template based on the mode being run.

---

## Site-audit template

Save to `/mnt/user-data/outputs/agent-seo-site-audit-{domain}.md`. The domain in the filename should be hyphenated and lowercase: `talk-to-my-lawyer-com`, `example-com`, `my-app-io`.

```markdown
# Agent SEO Site Audit — {domain}

**Audited:** {root URL}
**Date:** {today}
**Pages probed:** {homepage + 1 representative content page from sitemap}
**Overall verdict:** {one sentence — fully crawlable / partially crawlable / functionally invisible to AI / etc.}

## TL;DR — top 3 site-level fixes

1. **{Fix}** — {one-line reason, impact}
2. **{Fix}** — {one-line reason, impact}
3. **{Fix}** — {one-line reason, impact}

---

## Discovery layer (site-wide)

| Check | Status | Finding |
|---|---|---|
| robots.txt allows AI bots | ✅/⚠️/❌ | {quote the actual problematic line if applicable} |
| Content renders in raw HTML (not JS-only) | ✅/❌ | {result of curl probe on representative page} |
| Per-route SEO metadata exists | ✅/❌ | {compare homepage `<title>` to blog post `<title>`} |
| /llms.txt present | ✅/⚠️/❌ | {HTTP status, whether it returns real content or SPA shell} |
| Sitemap.xml present and valid | ✅/⚠️/❌ | {count of URLs, presence of lastmod, whether content pages are included} |
| 404s return 404, not 200 | ✅/❌ | {status code returned for nonexistent path} |
| No WAF/Cloudflare AI bot challenge | ✅/⚠️/🤷 | {check Cloudflare/WAF clues} |

### Notable findings
{Lead with the biggest issue. If robots.txt has contradicting stanzas (Cloudflare-managed vs custom), call this out specifically — it's a common silent failure.}

### Fixes
- {Specific change — dashboard setting, exact line to remove, file to add}
- {...}

---

## Authority layer (site-wide signals only)

Per-page authority (byline, inbound links to a specific URL, etc.) is handled in page-audits.

| Check | Status | Finding |
|---|---|---|
| Sitewide author/byline pattern | ✅/⚠️/❌ | {do articles have named authors? generic team bylines?} |
| Brand on Wikipedia or major reference site | ✅/⚠️/❌/🤷 | {result of search} |
| Brand mentions on trusted domains (Reddit, etc.) | ✅/⚠️/❌/🤷 | {brief result} |
| Entity description consistent across web | ✅/⚠️/🤷 | {does homepage one-liner match LinkedIn, Crunchbase, etc.?} |

### Notable findings
{Authority gaps are slower to fix — flag them honestly but note the time horizon.}

### Fixes
- {Specific, time-bounded actions}

---

## Snake oil check (site-level)

Tactics found that don't work. If none, omit this section.

- [ ] HTML comments for AI ({finding or not present})
- [ ] AI-only pages ({finding or not present})
- [ ] User-agent cloaking ({finding or not present})
- [ ] Schema-only data with no rendered text ({finding or not present})
- [ ] Other ({...})

---

## Prioritized fix list (site-level)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | {fix} | S/M/L | High/Med/Low |
| 2 | {fix} | ... | ... |

Ordered by impact-per-effort.

---

## What's working (site-wide)

{1–3 bullets on what the site already does well. Always include this section.}

---

## Next steps

Now that the site-audit is done, page-level audits on this domain can skip site-wide discovery checks and focus on:
- Structural quality of individual articles (opening, headers, quantification)
- Per-page authority signals (byline, inbound links to that URL, internal linking)

Reference this site-audit at the top of each page-audit for context.
```

---

## Page-audit template

Save to `/mnt/user-data/outputs/agent-seo-page-audit-{slug}.md`. The slug is a short hyphenated identifier — domain + key path segment, or article title keywords.

```markdown
# Agent SEO Page Audit — {Page title or path}

**Audited:** {full URL}
**Date:** {today}
**Site-audit reference:** {link to site-audit file if exists, or "Not run — site-level findings not included in this report"}
**Overall verdict:** {one sentence on this page's citation readiness, accounting for site-level context}

## TL;DR — top 3 page-level fixes

1. **{Fix}** — {one-line reason, impact}
2. **{Fix}** — {one-line reason, impact}
3. **{Fix}** — {one-line reason, impact}

{If site-level blockers exist that override page-level work, add a callout:}

> ⚠️ **Site-level note:** {e.g. "The site has no SSR — AI crawlers see no article content on this URL regardless of structural quality. See site-audit for the fix."}

---

## Discovery (page-specific only)

Site-level discovery is covered in the site-audit. These are this-page-specific checks.

| Check | Status | Finding |
|---|---|---|
| This URL in sitemap.xml | ✅/❌ | {present or absent} |
| This URL has unique meta tags | ✅/❌ | {compare to homepage; if site-wide SSR is broken, this is moot} |
| Canonical tag present and correct | ✅/⚠️/❌ | {finding} |

---

## Layer 2 — Structure

This is the heart of the page-audit.

| Check | Status | Finding |
|---|---|---|
| Definition-first opening (first 100–200 words) | ✅/⚠️/❌ | {finding} |
| Question-format H2 headers | ✅/⚠️/❌ | {count question-format vs statement-format} |
| Self-contained paragraphs | ✅/⚠️/❌ | {finding} |
| Quantified claims (2–3 per section) | ✅/⚠️/❌ | {count specific numbers} |
| Attributed assertions | ✅/⚠️/❌ | {does the article cite sources inline?} |
| Lists/tables for enumerable content | ✅/⚠️/❌ | {finding} |
| TL;DR or summary near top | ✅/⚠️/❌ | {finding} |
| Comparison tables for "vs" articles | ✅/⚠️/❌/N/A | {only if article is a comparison} |

### Notable findings
{Identify the biggest structural problem. If the opening is bad, this is almost always the highest-impact fix. Be specific about which paragraph/header.}

### Rewrite example

If structure is weak in a specific spot, include at least one before/after:

**Original:**
> {exact quote from the page}

**Rewritten:**
> {fixed version applying the structural rule}

**What changed:** {one sentence on which rule this applies}

---

## Layer 3 — Authority (page-specific)

Site-wide authority (entity consistency, Wikipedia presence) is in the site-audit. These are this-page-specific.

| Check | Status | Finding |
|---|---|---|
| Named author with credentials on this article | ✅/⚠️/❌ | {byline content} |
| Last-updated date visible on this article | ✅/❌ | {date or absence} |
| Internal linking to/from this article | ✅/⚠️/❌ | {count and quality} |
| Inbound citations to this URL | ✅/⚠️/❌/🤷 | {if checked} |

### Notable findings
{Anything article-specific.}

### Fixes
- {Specific actions for this article}

---

## Snake oil check (page-level)

- [ ] HTML comments for AI ({finding or "not present"})
- [ ] Keyword stuffing ({finding or "not present"})
- [ ] Schema-only data on this page ({finding or "not present"})

If none apply, omit this section entirely.

---

## Prioritized fix list (page-level)

| # | Fix | Layer | Effort | Impact |
|---|-----|-------|--------|--------|
| 1 | {fix} | Discovery/Structure/Authority | S/M/L | High/Med/Low |
| 2 | {fix} | ... | ... | ... |

If site-level blockers from the site-audit are unresolved, list them at the top with a note: "Pending site-level fixes from site-audit — these dominate page-level work until resolved." Then list page-specific fixes below.

---

## What's working

{1–3 bullets on what this specific page does well. Always include this section.}
```

---

## Slug / filename rules

### Site-audit filename
- Format: `agent-seo-site-audit-{domain}.md`
- Domain hyphenated, lowercase, dots become hyphens
- Examples:
  - `talk-to-my-lawyer.com` → `agent-seo-site-audit-talk-to-my-lawyer-com.md`
  - `example.io` → `agent-seo-site-audit-example-io.md`

### Page-audit filename
- Format: `agent-seo-page-audit-{slug}.md`
- Slug = short identifier of the page, lowercase, hyphens
- Build from URL path segments or article title
- Cap at ~50 chars
- Examples:
  - `talk-to-my-lawyer.com/blog/competitor-selling-knockoffs-what-to-do` → `agent-seo-page-audit-ttml-knockoffs.md`
  - `example.com/pricing` → `agent-seo-page-audit-example-pricing.md`

## Tone within reports

The reports should be direct, no marketing fluff. The user is technical and wants real diagnostics. Numbers, quotes, specific line references. Avoid:
- "It's important to note that…"
- "You may want to consider…"
- "Best practices suggest…"
- Long executive-summary style introductions

Use:
- "robots.txt line 14 blocks PerplexityBot. Remove it."
- "The first paragraph contains no answer. The page won't be cited for the query it targets."
- "Author is 'Admin'. Add a real byline."
