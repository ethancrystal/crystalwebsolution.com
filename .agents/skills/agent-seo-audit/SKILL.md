---
name: agent-seo-audit
description: Audit web content (blog posts, landing pages, docs, or whole sites) for AI-agent discoverability and citation likelihood across ChatGPT, Claude, Perplexity, and Google AI Overviews. Has two modes — site-audit (domain-level — robots.txt, sitemap, JS-rendering, llms.txt) and page-audit (per URL — opening, headers, quantification, authorship). Use whenever the user asks to audit, review, score, or improve content for AI search, generative engine optimization (GEO), answer engine optimization (AEO), LLM visibility, getting cited by AI, ranking in ChatGPT/Perplexity/AI Overviews, llms.txt setup, or AI crawler access. Also trigger when the user pastes a URL or article and asks "is this AI-friendly", "will Perplexity cite this", "why isn't AI finding my site", "audit my blog", or "make this rank in AI search". Default to this skill for any audit-style request about AI/LLM visibility even if the user does not use the exact term GEO.
---

# Agent SEO Audit

This skill audits a piece of web content for how likely AI agents (ChatGPT, Claude, Perplexity, Google AI Overviews, Gemini, Copilot) are to discover it, parse it correctly, and cite it in generated answers.

It is opinionated. The AI-SEO space is flooded with cargo-cult advice — special meta tags, HTML comments for AI, hidden "AI info pages", JSON-LD as a citation lever. Most of this has no evidence behind it. This skill audits against what is actually known to influence citation, and explicitly flags pseudoscience tactics the user may already be wasting effort on.

## When to run this skill

The user gives you one of the following and wants feedback:

- A URL to audit ("audit talk-to-my-lawyer.com/blog/abc")
- Pasted article/page text ("here's my post, will it get cited?")
- A general question like "why isn't AI finding my content"
- A request to improve an existing page for AI visibility

If the user asks to *write* new content optimized for AI agents, this skill still applies — run the audit framework against the draft after it's written, or audit a similar existing page to extract guidance.

## Two modes — pick before auditing

This skill has two modes. Pick one based on what the user gave you.

### Mode 1: `site-audit`

Audits the **domain**, not any specific page. Covers everything that's a property of the site infrastructure rather than the article content.

Use site-audit when:
- The user gives you a domain ("audit talk-to-my-lawyer.com")
- The user asks "why isn't AI finding my site"
- The user wants to audit multiple pages and you haven't done a site-audit for this domain yet
- The user mentions things like robots.txt, llms.txt, AI crawler access, JS-rendering, or general site visibility

Output file: `/mnt/user-data/outputs/agent-seo-site-audit-{domain}.md`

The site-audit covers:
- **Discovery layer** in full (robots.txt, sitemap.xml, llms.txt, JS-rendering pattern, per-route metadata pattern, WAF/Cloudflare, 404 handling)
- **Authority layer — site-level signals only** (entity consistency across the web, Wikipedia presence, trusted-domain mentions of the brand, sitewide author/byline patterns)
- **Snake oil check** at the site level

It does NOT cover article-level structure — that's per-page.

### Mode 2: `page-audit`

Audits a **specific URL or pasted article**. Covers what's specific to this page.

Use page-audit when:
- The user gives you a specific URL to a content page
- The user pastes article text
- A site-audit for this domain already exists in the conversation or outputs folder

Output file: `/mnt/user-data/outputs/agent-seo-page-audit-{slug}.md`

The page-audit covers:
- **Discovery layer — page-specific only** (does *this* URL appear in the sitemap, does *this* URL's content render in raw HTML, does *this* URL have unique meta tags). Site-level discovery findings (robots.txt rules, JS framework choice) are referenced, not re-explained.
- **Structural layer** in full (opening, headers, paragraphs, quantification, attributions, lists/tables, TL;DR)
- **Authority layer — page-specific only** (this page's byline, this page's update date, inbound citations to this URL, internal linking)
- **Snake oil check** at the page level

### Routing logic

When the user gives you a URL:

1. Check whether a site-audit for this domain already exists at `/mnt/user-data/outputs/agent-seo-site-audit-{domain}.md` or in conversation history.
2. If **yes** → run page-audit only. Reference the site-audit at the top of the page report ("Site-level findings covered in agent-seo-site-audit-{domain}.md — not repeated here").
3. If **no** → ask the user once: "Should I run the site-audit first (covers the whole domain — robots.txt, JS rendering, etc.), then this page? Or just this page?"
4. If the user says "just this page" → run page-audit and include a 2-line note that site-level checks were skipped at user request.
5. If the user says "site first" or doesn't answer → run site-audit, then page-audit, then summarize both.

If the user explicitly asks for a site audit ("audit my site", domain-only input), skip the question and go straight to site-audit.

## What this skill produces

Always a Markdown file. Never skip the file — the user explicitly prefers Markdown deliverables over long inline explanations.

After saving and presenting the file with `present_files`, give a short conversational summary of the top 3 fixes. Don't restate the whole report inline.

## The audit framework

Work through these four layers in order. Each layer has check items. For each item, record: **status** (✅ pass / ⚠️ partial / ❌ fail / 🤷 unknown), **what you found**, and **fix** (if not passing).

### Layer 1 — Discovery

This is whether AI agents can even see the content. A perfectly written page is invisible if crawlers bounce off it.

Read `references/discovery-layer.md` for the full check list and current bot user-agents. Core checks:

- **robots.txt allows the right AI bots** — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Bingbot. Many sites accidentally block these.
- **Content renders in raw HTML, not just JavaScript** — most AI crawlers (Perplexity, ChatGPT browse, ClaudeBot) execute little to no JS. If the main article body is rendered client-side, it's invisible. Test by fetching with curl and looking for the actual text.
- **`/llms.txt` exists (optional, low-cost bet)** — server logs show major crawlers don't request this unprompted, but the engineering cost is near-zero and humans paste URLs into AI tools. Worth doing, don't oversell it.
- **No WAF/Cloudflare bot challenge blocks AI agents** — Cloudflare's default "block AI bots" toggle is now common. Check.
- **Sitemap.xml present and submitted** — still the primary discovery path for OAI-SearchBot and PerplexityBot.

### Layer 2 — Structure

Even when crawlers reach the page, content has to be shaped so LLM retrievers will pull it as a citable passage. The Aggarwal et al. GEO paper, Frase, Enrich Labs, and GenOptima all converge on the same patterns. The evidence for these is much stronger than for any technical-file trick.

Read `references/structural-layer.md` for the full check list and examples. Core checks:

- **Definition-first opening** — the first 100–200 words directly answer the primary query. No throat-clearing intro, no "in today's fast-paced world". State what the thing is in sentence one.
- **Question-format headers** — H2s phrased as questions a user would actually ask ("What is X?", "How does Y work?", "When should you use Z?"). LLMs pattern-match headers against query strings.
- **Self-contained paragraphs** — every paragraph should make sense pulled out as a standalone citation. If a paragraph depends on the previous one to make sense, an LLM will skip it.
- **Quantified, specific claims** — "increased citations from 4% to 14% in 45 days" gets cited; "improves visibility" does not. Aim for 2–3 quantified data points per major section.
- **Citable assertions with attribution** — when you state a fact, name the source inline ("according to Cloudflare's 2025 Radar report…"). LLMs prefer to cite sources that themselves cite sources.
- **Lists and tables for comparative/enumerable content** — AI Overviews especially love structured lists. Reformat dense paragraphs into bullets when the content is enumerable.
- **TL;DR or summary block near the top** — gives the retriever an obvious passage to grab.

### Layer 3 — Authority

Between two structurally identical pages, the LLM picks the one with stronger trust signals. This layer is slower to fix but it's what compounds.

Read `references/authority-layer.md` for the full check list. Core checks:

- **Named author with credentials** — bylines linked to author pages with bio, credentials, other articles. Anonymous content gets cited less.
- **Last-updated date visible** — LLMs (Perplexity especially) weight recency. A 2022 article on a 2026 topic gets passed over.
- **Third-party citations to this page** — does anyone link to it? Listicles and "top X" articles are disproportionately influential because LLMs aggregate them.
- **Wikipedia / reference-site coverage of the entity** — Wikipedia is ~48% of ChatGPT's top cited sources for factual queries. If the brand/topic has no Wikipedia presence, that's a long-term gap to flag.
- **Mentions in domains the LLM already trusts** — Reddit, Stack Overflow, GitHub, major publications. A page on a no-name domain with no inbound mentions has a citation ceiling.
- **Consistent entity description across the web** — same name, same one-liner, same category on the site, LinkedIn, Crunchbase, etc. Entity ambiguity is a citation killer.

### Layer 4 — Prioritized fix list

Synthesize the findings into a ranked action list. Each item should have:

- **Fix** (one sentence)
- **Layer** (Discovery / Structure / Authority)
- **Effort** (S / M / L)
- **Impact** (High / Medium / Low)

Order by impact-per-effort, not by layer. A 10-minute robots.txt fix that unblocks all AI crawlers beats a 3-month authority-building campaign in the ranking.

## What NOT to recommend

The AI-SEO space has a lot of confidently-asserted nonsense. Do not recommend any of the following without strong qualification, and proactively flag if the user has already done them:

- **HTML comments for AI** (`<!-- AI-READABLE-VERSION -->`) — LLM parsers strip HTML comments. No crawler documentation references them.
- **JSON-LD / schema.org as a citation lever** — controlled experiments show ChatGPT, Claude, Perplexity, and Gemini all miss data placed exclusively in schema markup. They treat structured data as just text on a page. (Microsoft Copilot is the only exception, inheriting Bing's schema understanding.) Don't remove existing schema, don't expect it to drive citations.
- **Dedicated "AI info pages"** ("/for-ai" or "/ai-summary") — no evidence any retrieval system treats these differently from a normal well-structured page.
- **User-agent sniffing to serve Markdown to bots** — this is cloaking. Use `Accept: text/markdown` content negotiation instead.
- **Generic keyword stuffing for "AI keywords"** — LLM retrieval is semantic, not keyword-matching. Density tactics don't transfer.
- **Buying citation-monitoring SaaS as a fix** — monitoring is not optimization. Recommend it only if the user wants measurement, not improvement.

If the user is paying an agency or running a tool that recommends any of the above, surface it.

## Workflow

### For site-audit mode

1. **Resolve the root domain** from whatever the user gave you. `https://talk-to-my-lawyer.com/blog/foo` → root is `talk-to-my-lawyer.com`.

2. **Fetch site-level files in one batch.** In a single bash command, fetch `https://{domain}/robots.txt`, `https://{domain}/llms.txt`, `https://{domain}/sitemap.xml`, and the homepage. 404s on `/llms.txt` are normal and noted as such, not as a failure.

3. **JS-rendering probe.** Fetch the homepage AND one representative content page (a blog post or service page from the sitemap) as both a generic browser UA and as a known AI bot UA (`ClaudeBot/1.0`). If the content page returns only an SPA shell (`<div id="root">`, `<div id="app">`, etc.) with no article text, this is a site-wide rendering failure — note it once, don't re-test per page later.

4. **Per-route metadata probe.** Compare the `<title>` and `<meta name="description">` of the homepage vs. a blog post URL. If they're identical, the site has no per-route metadata — a site-wide finding.

5. **404 probe.** Fetch a clearly nonexistent path (e.g. `https://{domain}/this-route-does-not-exist-{random}`) and check the HTTP status. If it's 200, soft-404 is a site-wide finding.

6. **Site-level authority signals.** Quick web searches for entity consistency (`"{brand}" site:reddit.com`, `"{brand}" site:wikipedia.org`, the brand on LinkedIn/Crunchbase if relevant). Don't go deep — flag presence/absence, not exhaustive coverage.

7. **Write the site-audit report.** Use the site-audit section of `references/report-template.md`. Save to `/mnt/user-data/outputs/agent-seo-site-audit-{domain}.md` where domain is hyphenated (e.g. `talk-to-my-lawyer-com`).

8. **Present + summarize.** `present_files`, then 3 bullets on the highest-impact site-level fixes.

### For page-audit mode

1. **Check for an existing site-audit** for this domain. If one exists in the outputs folder or earlier in the conversation, reference it. If not, ask the user whether to run site-audit first (see routing logic above).

2. **Fetch the page two ways.** First, as a JS-executing fetch (use `web_fetch` or, for SPAs, `https://r.jina.ai/{url}` which executes JS server-side and returns rendered Markdown). Second, as raw curl with an AI bot User-Agent to verify whether the page-specific content survives. The first gives you the article text to audit; the second confirms whether AI crawlers can see it.

3. **Run the structural layer in full.** This is where page-audit earns its keep. Read `references/structural-layer.md`. Check opening, headers, paragraph self-containment, quantification, attributions, lists/tables, TL;DR.

4. **Run the page-specific authority checks.** Read `references/authority-layer.md` for the per-page items: this page's byline, publish/updated date, internal linking, inbound citations to this specific URL.

5. **Quick page-specific discovery checks.** Is this URL in the sitemap? Does it have unique meta tags? Don't redo site-level checks already in the site-audit.

6. **Write the page-audit report.** Save to `/mnt/user-data/outputs/agent-seo-page-audit-{slug}.md`. Use the page-audit section of `references/report-template.md`. Include a note at the top referencing the site-audit if one exists.

7. **Present + summarize.** `present_files`, then 3 bullets on the highest-impact page-level fixes — *plus* a reminder if there are unresolved site-level blockers (e.g. "Site-level SSR issue still blocks AI crawlers from seeing this page regardless of structural fixes — see site-audit").

### Bulk auditing (multiple pages)

If the user asks to audit several URLs:

1. Run site-audit once.
2. Run page-audit per URL — these can reuse the same site-audit reference.
3. After the last page-audit, write a one-paragraph synthesis: which posts are structurally strongest, which need the most work, common patterns across the set.

Don't restate site-level findings in every page report. Reference once, fix once.

## Tone

This skill is for someone who builds things and wants real answers, not marketing fluff. Be direct. When something is broken, say it's broken. When advice in the wild is wrong, say it's wrong and why. Don't hedge with "it depends" unless it actually depends. Don't say "consider" when you mean "do this".

When something is genuinely uncertain (e.g. exact ChatGPT ranking weights), say so — and say what we do know that's adjacent.

## Reference files

- `references/discovery-layer.md` — full crawler list, robots.txt syntax, llms.txt format, JS-rendering test
- `references/structural-layer.md` — examples of definition-first openings, question headers, quantified claims, before/after rewrites
- `references/authority-layer.md` — entity consistency checklist, recency signals, citation-earning patterns
- `references/report-template.md` — the Markdown skeleton for the audit output
- `references/snake-oil.md` — full list of debunked tactics with sources, for when you need to explain to the user why their agency's advice is wrong
