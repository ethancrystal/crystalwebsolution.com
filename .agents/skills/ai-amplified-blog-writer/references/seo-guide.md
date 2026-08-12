# SEO Guide — AI AMPLIFIED Blog Posts

## Philosophy

AI AMPLIFIED SEO is search-intent-first, not keyword-density-first. Write for a reader who searched for the answer to a specific question, not for a crawler counting keyword repetitions. Google's Helpful Content system rewards posts that clearly satisfy intent; it penalizes posts that look optimized.

The approach: identify the one search query this post should rank for, satisfy it better than any existing result, and let the keyword integration flow from that rather than from a checklist.

---

## Keyword Research Approach

### Primary keyword selection

For each post, identify ONE primary keyword phrase (2–4 words). Criteria:

- **Matches search intent**: if someone searched this phrase, would THIS post be the best result?
- **Specific over generic**: "claude 3.5 sonnet code review" beats "AI coding" for a deep-dive post
- **Informational or comparison intent** for blog content (not transactional)

### Secondary keywords (3–5 phrases)

These are related phrases that should appear naturally in the post. They're not stuffed — they appear because they're relevant to a thorough treatment of the topic.

**How to find them for AI/tech topics:**
- Google the primary keyword; note the "People also ask" questions and related searches
- Think about the vocabulary a developer or operator in this space would use
- Named entities matter: specific model names, company names, version numbers are natural secondary keywords

---

## Keyword Placement Rules

### Mandatory placements for primary keyword:

1. **Title** — within the first 40 characters if possible
2. **First 100 words** — appears naturally in the hook
3. **One H2 heading** — not forced; restructure the heading if it sounds unnatural
4. **Meta description** — within the first 80 characters

### For secondary keywords:

Appear once each, naturally, within body copy. No section should feel like it was written to hit a keyword — if it does, revise the sentence to prioritize clarity and let the keyword appear as a byproduct.

### Keyword density

- Primary keyword: 3–6 appearances in a 1,200-word post (0.25–0.5%)
- Never back-to-back in adjacent sentences
- Use variations: if primary is "Claude 3.5 Sonnet," variations include "Claude's latest model," "Anthropic's Sonnet release," "the 3.5 update"

---

## Title Optimization

**Format:** `[Primary Keyword or Close Variant]: [Benefit or Angle]`

**Length:** 50–60 characters (Google truncates at ~60)

**Patterns that work for AI AMPLIFIED:**

```
[Model/Tool Name] Review: What [specific audience] Actually Needs to Know
Why [Tool/Model] Is [Claim] — And What That Means for [Use Case]
[Number] Things Nobody Told You About [Topic]
[Tool A] vs [Tool B]: The Comparison That Actually Matters
How [Specific Technique] Cut Our [Metric] by [Number]%
```

**Avoid:**
- Clickbait that the post doesn't deliver on ("You Won't Believe...")
- Generic titles that could apply to any AI blog ("AI Tools Are Changing Everything")
- Titles over 60 characters (will truncate in SERPs)

---

## Meta Description

**Length:** 140–160 characters (Google may rewrite shorter ones)

**Formula:**
`[What this post answers/covers] + [for whom] + [the specific value or angle]`

**Example:**
> Claude 3.5 Sonnet's code review performance tested against GPT-4o on real production files — with benchmarks, cost comparison, and a verdict for engineering teams.

**Rules:**
- Primary keyword in first 80 characters
- Avoid "In this post..." or "Click to learn..." — start with the content's value
- Must be a complete sentence or coherent phrase

---

## Heading Hierarchy (H1/H2/H3)

```
H1: Post title (one per page, set by CMS — don't repeat in the body)
H2: Major sections (3–6 per post)
H3: Sub-points within a section (use sparingly; avoid deep nesting)
```

**H2 SEO rules:**
- Include primary or secondary keyword in at least one H2 (natural placement only)
- H2s should make sense as standalone mini-headlines — a skimmer reading only H2s should understand the argument

**H3 rules:**
- Only use when a section genuinely has 3+ sub-points that each need a label
- Don't use H3 for formatting effect — use bold or bullet points instead

---

## Internal Linking

When a previous AI AMPLIFIED post is relevant, link to it naturally (not in a list of "related posts" at the end — within the body copy, in context).

**Formula:** `[anchor text that describes the linked content]` not `click here` or `this post`

---

## Content Signals Google Rewards (AI/Tech Niche)

These are structural quality signals that improve search performance for technical content:

| Signal | Implementation |
|--------|---------------|
| **Specific named entities** | Use model names, company names, version numbers — not "a popular AI model" |
| **Original data/testing** | "I ran X tests and found..." outperforms posts that only cite others' benchmarks |
| **Date specificity** | Name the release date, the version, the quarter — signals freshness and accuracy |
| **Code examples** | Technical posts with real, working code rank better for developer-intent queries |
| **Structured comparisons** | Tables or clear A vs. B comparisons satisfy comparison-intent searches |
| **FAQs** | Answer "People also ask" questions directly, in H3s if appropriate — can capture featured snippets |

---

## Featured Snippet Optimization

For posts targeting informational queries ("how does X work," "what is Y"), format the direct answer as:

```markdown
### [The exact question as a heading]

[Answer in 40–60 words, one paragraph, using the keyword from the question in the first sentence.]
```

Place this early in the relevant section — Google pulls snippets from within the first few paragraphs of a section.

---

## AI Content and Search

Google's guidance on AI-generated content: it's acceptable if it's high-quality, accurate, and serves users. What gets penalized is scaled, thin, templated content with no original perspective.

AI AMPLIFIED posts should always contain:
- At least one original observation, test result, or interpretation not available elsewhere
- Specific named examples rather than generic claims
- A clear point of view (the columnist's opinion)

These aren't just editorial standards — they're SEO differentiators.
