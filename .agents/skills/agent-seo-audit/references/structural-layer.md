# Structural Layer Reference

How to shape content so LLM retrievers will pull it as a citable passage. This is the layer with the strongest evidence base — the Aggarwal et al. GEO paper showed 30–40% improvement on impression metrics from these structural changes alone.

## Definition-first opening

The first 100–200 words must directly answer the primary query the page targets. No setup, no narrative warm-up.

**Bad opening (narrative):**
> In today's rapidly evolving digital landscape, businesses are constantly searching for new ways to reach customers. One emerging approach that's gaining traction is something called Generative Engine Optimization. Let's explore what it means.

**Good opening (definition-first):**
> Generative Engine Optimization (GEO) is the practice of structuring content so that AI systems like ChatGPT, Claude, and Perplexity cite it when generating answers. Unlike traditional SEO, which optimizes for ranked search results, GEO optimizes for inclusion inside an AI-generated response.

The good version is what a retriever picks up. The bad version contains nothing citable in the first paragraph.

## Question-format headers

H2 and H3 headers should mirror the actual queries users type into AI engines. LLMs pattern-match query strings against headers when scoring passage relevance.

**Bad:**
- "Overview of GEO"
- "GEO Strategy Considerations"
- "Implementation"

**Good:**
- "What is Generative Engine Optimization?"
- "How does GEO differ from SEO?"
- "How do I implement GEO on an existing site?"

Source the actual questions from Google Search Console (People Also Ask, query reports) or from tools like AlsoAsked, AnswerThePublic. Don't invent questions — use the ones users are already asking.

## Self-contained paragraphs

Each paragraph should make sense if pulled out as a standalone block. This is the single biggest difference between content written for humans (which flows) and content optimized for LLM citation (which is composed of citable units).

**Bad (referential):**
> As mentioned above, this approach has several advantages. The first one we discussed is particularly relevant here, since it ties back to the framework introduced in the previous section.

**Good (self-contained):**
> The definition-first approach has three advantages: (1) it surfaces the answer immediately for users who don't read the full page, (2) it gives LLM retrievers a high-density passage to cite, and (3) it forces the author to commit to a clear position instead of building up to one.

## Quantified claims

LLMs disproportionately cite content containing specific numbers, percentages, and dates. Vague claims get filtered out in favor of precise ones.

**Bad:** "AI marketing significantly improves results."
**Good:** "AI-assisted marketing campaigns delivered 23% higher click-through rates in a 2025 HubSpot study of 1,200 B2B campaigns."

Target 2–3 quantified data points per major section. They can be:
- Original research from the brand
- Specific percentages from cited third-party studies
- Concrete time ranges ("within 7 days", "in 45 days")
- Specific entity counts ("47 of the Fortune 500 use…")

If the page makes a claim without a number, ask whether a number can replace the adjective. "Faster" → "3.2x faster". "Many customers" → "1,400+ customers". "Most" → "73%".

## Attributed assertions

When stating a non-obvious fact, name the source inline. LLMs prefer sources that themselves cite sources — this is the "credibility chain" pattern.

**Bad:** "AI crawler traffic increased significantly in 2025."
**Good:** "AI user-action crawling increased over 15x in 2025, with GPTBot, ClaudeBot, and PerplexityBot among the most active crawlers, according to Cloudflare's 2025 Radar Year in Review."

The source can be a study, a company report, a primary document (SEC filing, academic paper), or a named expert. Avoid linking to other content marketing pieces as primary sources — LLMs penalize the citation chain when it loops through low-authority intermediaries.

## Structural elements LLMs prefer

- **Bulleted lists** for enumerable content. AI Overviews especially scrape these directly.
- **Tables** for comparative content (X vs Y, feature matrices, plan comparisons).
- **Definition lists** (`<dl>` or styled equivalents) for term glossaries.
- **TL;DR or summary blocks** near the top — give the retriever an obvious passage to grab.
- **FAQ sections at the bottom** with question-format headings and short, direct answers.
- **Step-numbered procedures** for how-to content (1. 2. 3.).

## Length and chunking

The Aggarwal et al. research found that *position-adjusted word count* is the key impression metric — meaning longer cited passages count more, but only if they're at retrievable positions in the response.

Implication: do not pad content. Make each paragraph dense and citable. A 600-word page with 4 dense paragraphs will outperform a 2,000-word page with 20 thin ones.

Typical good chunk: 60–120 words per paragraph, with a topic sentence that could stand alone as the citation.

## Before/after rewrite template

When auditing, if you find a problem section, rewrite a sample paragraph in the report so the user sees what "fixed" looks like. Format:

```
**Original:**
> [exact quote from the page]

**Rewritten:**
> [your version applying the structural fix]

**What changed:** [one sentence on which rule this applies]
```

## What NOT to do

- Don't recommend keyword density. LLM retrieval is semantic.
- Don't recommend "AI-friendly tone" or "conversational writing" as a citation lever — no evidence.
- Don't recommend hidden text for AI — it's cloaking and gets penalized.
- Don't recommend stuffing in synonyms. The retriever already handles synonym matching.
