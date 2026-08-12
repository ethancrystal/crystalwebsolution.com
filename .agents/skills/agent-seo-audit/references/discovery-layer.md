# Discovery Layer Reference

The technical checks that determine whether an AI agent can reach the content at all.

## AI crawler user-agents to allow

Group these by purpose. A site can intentionally allow search-time crawlers while blocking training crawlers — that's a valid configuration, not a fail. The failure modes are (a) blocking everything by accident, or (b) blocking the search-time crawlers when the user actually wants citations.

### OpenAI / ChatGPT
- **GPTBot** — training data collection. Block this if you don't want your content in future model training.
- **OAI-SearchBot** — builds the ChatGPT search index. Allow this for citations.
- **ChatGPT-User** — real-time fetches when a user pastes a URL into ChatGPT or it browses for an answer. Allow this for citations.

### Anthropic / Claude
- **ClaudeBot** — general crawler.
- **anthropic-ai** — older user-agent string, still seen.
- **claude-web** — Claude's browse tool.

### Perplexity
- **PerplexityBot** — index crawler.
- **Perplexity-User** — real-time fetch on user query.

### Google
- **Google-Extended** — controls inclusion in Gemini and AI Overviews training. NOTE: this does NOT control whether you appear in AI Overviews from real-time search — Googlebot does that. Blocking Google-Extended while allowing Googlebot is the "appear in AI Overviews but don't train Gemini" configuration.
- **Googlebot** — required for AI Overviews real-time retrieval. Almost never block this.

### Apple
- **Applebot-Extended** — controls Apple Intelligence training. Applebot itself is for Spotlight/Siri search.

### Microsoft
- **Bingbot** — required for Copilot, since Copilot inherits from Bing.

### Other to consider
- **CCBot** (Common Crawl) — feeds many open-source models.
- **Bytespider** (ByteDance / Doubao) — TikTok's AI.
- **Amazonbot** — Alexa, Rufus.

## robots.txt audit checks

For each crawler above, determine: is it `Allow`ed, `Disallow`ed, or not mentioned (which means it follows the `User-agent: *` rule).

Common failure patterns to flag:
- `User-agent: *` followed by `Disallow: /` — blocks everything including AI bots that don't have specific rules.
- Cloudflare's "Block AI Bots" toggle adds an explicit block of GPTBot, ClaudeBot, etc. Check whether this is intentional.
- WordPress security plugins (Wordfence, Sucuri) sometimes block AI user-agents at the WAF layer even when robots.txt allows them. The robots.txt check alone is not sufficient — also try fetching as one of these user-agents if possible.

## llms.txt — measured stance

The `/llms.txt` proposal is a Markdown file listing important pages on the site for LLM consumption. The honest current state:

- **Server log analysis shows major crawlers do NOT request `/llms.txt` unprompted.** No provider (OpenAI, Anthropic, Perplexity, Google) has committed to reading it.
- **However**: it costs near-zero to add, and when humans paste a URL into an AI tool, some clients do fetch `/llms.txt` as additional context.
- **Recommendation**: add it, but do not let the user believe it's the main lever. If they're spending more than an hour on it, redirect them to structural fixes.

A minimal `/llms.txt`:

```
# Site Name

> One-sentence description of what the site/company is.

## Core pages
- [About](https://example.com/about): What we do.
- [Pricing](https://example.com/pricing): Plans and costs.
- [Docs](https://example.com/docs): Full documentation.

## Blog
- [Most important post title](https://example.com/blog/post): Summary.
```

## JavaScript rendering check

This is one of the most common silent failures. Many AI crawlers execute little or no JavaScript. If the article body only appears after client-side rendering, AI agents see an empty page.

How to test:
1. `curl -A "Mozilla/5.0 (compatible; ClaudeBot/1.0)" https://example.com/article` and grep for a distinctive sentence from the article body.
2. If the sentence is missing, the content is JS-rendered.
3. Fix paths: server-side rendering (SSR), static generation (SSG), or prerendering for known bot user-agents (this is legit; it's the documented Google pattern, not cloaking).

Frameworks to flag specifically: Next.js with client-side data fetching, Create-React-App, Vue SPAs, Angular SPAs without Angular Universal. Next.js with `getStaticProps`/`getServerSideProps` or App Router server components is fine.

## Sitemap.xml

Less glamorous than llms.txt but actually used. OAI-SearchBot and PerplexityBot both process sitemaps. Checks:
- Present at `/sitemap.xml` or referenced from `robots.txt` (`Sitemap: https://example.com/sitemap.xml`).
- Includes the pages the user wants cited (blog posts, key landing pages).
- `<lastmod>` dates are accurate — stale dates that never update suggest the page never changes, which hurts recency-weighted retrieval.

## Cloudflare and WAF gotchas

Cloudflare's recent default behavior changes have created accidental blocks:
- "Block AI Bots" toggle in the dashboard.
- "Bot Fight Mode" sometimes catches AI crawlers as suspicious.
- Rate limiting set too aggressively (AI crawlers fetch in bursts).

If the user is on Cloudflare and AI traffic is low, check these settings before assuming the content is the problem.

## What to put in the audit for this layer

For each check, the report should say:
- ✅ / ⚠️ / ❌ / 🤷
- What was found (literal quote from robots.txt, presence/absence of llms.txt, JS-rendering test result)
- Fix (specific change, not generic advice)
