# Authority Layer Reference

Between two structurally identical pages, the LLM picks the one with stronger trust signals. This layer compounds over time and is slower to fix than discovery or structure, but it's the difference between getting cited occasionally and getting cited consistently.

## Named author with credentials

LLMs weight content with attributed authorship higher than anonymous content. The mechanism: training data is heavy on academic, journalistic, and professional sources, all of which have bylines. Anonymous blog posts pattern-match to lower-trust clusters.

Checks:
- Is there a visible byline on the page?
- Does the byline link to an author page?
- Does the author page list credentials, other articles, professional affiliation, LinkedIn?
- Is the author a real, searchable person? (Generic "Editorial Team" bylines are common and weak.)

For TTML specifically: attorney-reviewed content should have the reviewing attorney named with bar credentials. This is a strong differentiator vs generic legal blogs.

## Last-updated date

Perplexity and ChatGPT Search both bias toward recent content. A page from 2022 about a 2026 topic gets passed over even if it's structurally perfect.

Checks:
- Is there a visible publish date?
- Is there a visible last-updated date when the content has been revised?
- Does the URL slug contain a year that's now stale? (`/2023-guide-to-X` reads as outdated even if the content is current.)
- Does the article reference current versions, current pricing, current laws? Stale references signal staleness.

For evergreen content, the fix is to actually update the page (refresh dates, current stats, current product versions) and set the updated date — not just bump the date metadata.

## Inbound citations

Pages that other pages link to get cited more by LLMs. This is the strongest predictor and the slowest to move.

Checks:
- How many referring domains does the page have? (Tools: Ahrefs, SEMrush, Moz, or free Ubersuggest.)
- Is the page included in any "best of" or "top X" listicles? These are disproportionately influential because LLMs aggregate them when generating recommendation lists.
- Has the page been cited in any high-authority domain (gov, edu, major publications, Wikipedia)?

Action for the user: outreach to relevant listicles asking to be included; HARO/Qwoted/Featured.com for expert citations; guest posts on category-defining domains.

## Wikipedia and reference site coverage

Wikipedia is approximately 48% of ChatGPT's top cited sources for factual queries. If the brand, product, or person has no Wikipedia presence, that's a structural ceiling on factual citation visibility.

This is not a "create a Wikipedia page about yourself" recommendation — that violates Wikipedia notability and conflict-of-interest policies and will be deleted. The actual paths:
- Get genuinely covered by independent reliable sources first; Wikipedia coverage follows.
- For categories rather than the brand: edit existing relevant articles to be more accurate. Improve the category, get cited as the brand within the category.

Also consider: Crunchbase, Wikidata, G2, Capterra, Trustpilot, industry-specific reference sites. Entity presence across these is what allows LLMs to confidently disambiguate the brand.

## Trusted-domain mentions

LLMs heavily weight mentions in domains they already trust:
- **Reddit** — especially relevant subreddits with active discussion of the topic
- **Stack Overflow / Stack Exchange** — for technical topics
- **GitHub** — README mentions, awesome-lists, dependency in real projects
- **Hacker News** — discussion threads
- **Major publications** in the category
- **Industry-specific high-authority sites** (e.g. for legal: Cornell LII, ABA, state bar sites)

Audit by searching `site:reddit.com "{brand}"`, `site:stackoverflow.com "{brand}"`, etc.

## Entity consistency

LLMs build internal representations of entities (people, companies, products). If your entity description varies across the web, the LLM either picks one canonical version (maybe not yours) or hedges with ambiguity.

Checks — do these all agree?
- Site homepage one-liner
- Site About page description
- LinkedIn company page tagline
- Crunchbase description
- Twitter/X bio
- Google Business Profile (if applicable)
- Wikipedia (if present)
- Industry directory listings

Variations to flag:
- Different category positioning ("legal SaaS" vs "AI legal assistant" vs "lawyer marketplace")
- Different founding dates
- Different founder names or counts
- Different geographic descriptions

Fix: pick one canonical description, propagate.

## Schema markup (calibrated take)

Schema.org / JSON-LD has limited direct citation impact in current LLM retrieval (per SearchVIU experiments and Search Engine Roundtable confirmations: ChatGPT, Claude, Perplexity, and Gemini all miss data placed exclusively in schema). The exception is Microsoft Copilot, which inherits Bing's schema understanding.

However, schema still helps:
- Traditional SEO (which feeds Google AI Overviews indirectly via Googlebot)
- Microsoft Copilot specifically
- Rich results which themselves get linked and crawled

Recommendation: keep existing schema, don't strip it out. Don't recommend adding new schema specifically to influence ChatGPT/Claude/Perplexity citations — there's no evidence that works.

## What to put in the audit for this layer

For each check, the report should say:
- ✅ / ⚠️ / ❌ / 🤷
- Concrete observation (e.g., "Byline is 'Admin', author page is a stub")
- Fix (specific, time-bounded action, not "build authority")
