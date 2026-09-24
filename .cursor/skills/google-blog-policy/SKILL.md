---
name: google-blog-policy
description: Google Search content policy gate for blogging — apply whenever choosing blog topics, ranking harvested titles, writing blog posts, or publishing content for talk-to-my-lawyer.com or any blog. Encodes Google's current (2026) helpful-content guidance, E-E-A-T, YMYL standards, spam policies (scaled content abuse), AI-content rules, and the generative-AI search optimization guide. Use this skill in the ttml-question-harvester (topic scoring) and ttml-elite-blog-batch (writing + pre-publish gate) scheduled tasks, and any time the user mentions SEO topic selection, "what should we blog about", content quality checks, AI Overviews / AI Mode visibility, or Google penalties. Trigger even when the user only says "pick today's topics" or "run the blog batch" — both tasks must consult this policy.
---

# Google Blog Policy (2026)

This skill is the single source of truth for what Google's ranking systems reward and punish, distilled from Google Search Central documentation current as of June 2026. It exists because the TTML pipeline publishes 10 AI-assisted posts per day on **legal topics — a YMYL ("Your Money or Your Life") category** where Google applies its *strictest* E-E-A-T weighting. A daily automated batch is exactly the pattern Google's scaled-content-abuse enforcement targets, so every topic picked and every post written has to be defensibly people-first. Sites publishing high volumes of AI pages without editorial value saw 50-80% traffic drops in recent core updates. The margin for sloppiness is zero.

Two consumers, two sections:

- **Topic selection policy** → used by the harvester (and anyone ranking candidate titles)
- **Writing & publishing policy** → used by the blog batch (and anyone drafting posts)

Both consumers MUST run Google's verbatim self-assessment questions (next section). Read `references/google-policy-details.md` for the full question bank including expertise questions, the complete spam-policy list, and search-engine-first warning signs.

---

## GOOGLE'S CONTENT AND QUALITY QUESTIONS (VERBATIM — ASK THESE EVERY RUN)

These are Google's own words from the helpful-content documentation. The harvester asks them *prospectively* of each candidate title ("could the post we'd write answer yes?"). The writer asks them *retrospectively* of each finished draft before the voice-dna pass. A post or topic that draws a "no" on any starred (★) question is rejected or rewritten — these are the ones an automated daily batch is most likely to fail, which is exactly why they get the star.

- ★ Does the content provide original information, reporting, research, or analysis?
- Does the content provide a substantial, complete, or comprehensive description of the topic?
- ★ Does the content provide insightful analysis or interesting information that is beyond the obvious?
- ★ If the content draws on other sources, does it avoid simply copying or rewriting those sources, and instead provide substantial additional value and originality?
- Does the main heading or page title provide a descriptive, helpful summary of the content?
- Does the main heading or page title avoid exaggerating or being shocking in nature?
- ★ Is this the sort of page you'd want to bookmark, share with a friend, or recommend?
- Would you expect to see this content in or referenced by a printed magazine, encyclopedia, or book?
- ★ Does the content provide substantial value when compared to other pages in search results?
- Does the content have any spelling or stylistic issues?
- Is the content produced well, or does it appear sloppy or hastily produced?
- ★ Is the content mass-produced by or outsourced to a large number of creators, or spread across a large network of sites, so that individual pages or sites don't get as much attention or care?

(For the last question the *right* answer is "no" — the defense for a daily automated batch is that each individual page demonstrably got attention and care: verified statutes, original tables, real timelines. If a page can't show its care, it doesn't ship.)

---

## PART 1 — TOPIC SELECTION POLICY (harvester)

Google's core question for every page: *would this content exist if search engines didn't?* Topics must serve a real audience need, not just a keyword gap. When scoring harvested candidates, first run the verbatim questions above prospectively, then apply these five tests in order:

### 1. People-first test (pass/fail)
A real Californian with a real legal problem would type this question. Reddit-sourced questions (Section A) pass automatically — they ARE real people. Keyword-tier titles (Section D) pass only if you can name the person and situation behind the search. Fail any title that exists only because "it has volume."

### 2. Non-commodity test (score 0-10)
Google's 2026 generative-AI guide explicitly devalues "commodity content" — generic listicles anyone could write ("7 Tips for First-Time Renters") — and rewards unique angles grounded in specific experience ("Why We Sent the Demand Letter Before the 3-Day Notice — and It Worked"). Score high when TTML can add something nobody else has: specific statute mechanics, flat-fee cost comparisons, letter outcomes, California-specific timelines. Score low when the best possible post would summarize what's already in the top 5 results.

### 3. Expertise-fit test (pass/fail)
Google flags "entering a niche topic without real expertise mainly for traffic" as search-engine-first behavior. TTML's demonstrable expertise: California demand letters, pre-litigation disputes, landlord-tenant, contractor, freelancer-invoice, consumer, IP/counterfeit matters. A trending topic outside this lane (immigration, criminal, family law) fails — even at high volume — because the post can't demonstrate first-hand expertise and dilutes the site's primary purpose.

### 4. Answerability test (pass/fail)
Google penalizes content that "promises to answer a question that actually has no answer." Fail titles that bait an answer the post can't deliver (e.g., "exactly how much will I win in small claims").

### 5. Cannibalization / scale check (pass/fail)
Creating near-duplicate pages for every phrasing variation of one intent is **scaled content abuse** — Google's AI systems explicitly understand synonyms, so variants add risk without reward. If a candidate targets the same *intent* (not just the same words) as anything in `published-topics.md`, fail it. One strong page per intent beats five thin ones.

### Output format for the harvester
Annotate each pick in the title file:

```
[R3] "Can my landlord keep my deposit for normal wear and tear?"
GOOGLE-POLICY: people-first PASS (real Reddit q) | non-commodity 8/10 (Civ. Code 1950.5 mechanics + itemization timeline) | expertise PASS | answerable PASS | no cannibalization | ★-questions: all clear
```

Any candidate failing a pass/fail test or a ★ question is excluded from the RECOMMENDED BATCH regardless of search volume.

---

## PART 2 — WRITING & PUBLISHING POLICY (blog batch)

### E-E-A-T for a YMYL legal site

Trust is the dominant factor; the other three feed it. Each post must demonstrate at least two of:

- **Experience** — what actually happens when these letters get sent: timelines, typical responses, settlement patterns. Write from the practice, not the textbook.
- **Expertise** — real, verified California statute citations with plain-English explanations of what they *do* for the reader. A fabricated or wrong citation is the single most damaging thing a legal YMYL site can publish — it torpedoes trust sitewide, not just on that page. Never cite a statute you haven't verified.
- **Authoritativeness** — internal links into TTML's existing topic clusters; consistent author attribution ("Talk to My Lawyer Team" byline must link to an about page).
- **Trustworthiness** — the legal-information disclaimer, honest uncertainty ("outcomes vary; here's the typical range"), no overpromising results.

### Who / How / Why (Google's framing — answer all three)

- **Who**: byline present, consistent, and linked to background. Required on every post.
- **How**: this is AI-assisted content. Google does not penalize AI assistance — it penalizes AI content *whose primary purpose is ranking manipulation*. The site should disclose its editorial process where readers would reasonably expect it (an editorial-process or about page covers this; individual posts don't need a per-post disclosure).
- **Why**: the post must be useful to someone arriving at TTML directly, never written "because the keyword has volume." If you can't articulate the reader's problem in one sentence, don't write the post.

### Draft vetting (apply during Phase 5 stress-test AND the final batch vet)

Run the verbatim Content and Quality Questions against the finished draft. Then confirm:

1. Substantially complete for its intent — reader does NOT need to search again afterward.
2. Title describes the content accurately; no exaggeration, no shock bait.
3. No easily-verified factual errors (statutes, deadlines, dollar thresholds all checked).
4. No filler paragraphs that exist to hit length. Google explicitly has **no preferred word count**; the 600-900 / 1,800-2,500 targets are TTML editorial ranges, and cutting a thin post short always beats padding it.

### Freshness honesty (hard rule)

Never change a date to make unchanged content look fresh, and never add/remove content "to make the site seem fresh" — Google names both as search-engine-first signals. A post's `date` is its true publication date. Updates that substantially change content may update the date; cosmetic edits may not.

### Generative-AI search (AI Overviews / AI Mode) — what actually works

Google's 2026 guidance: AI features are grounded in the same core ranking systems (RAG over the search index + query fan-out). What earns citations:

- Direct, quotable answers high on the page (TTML's "Short answer" callout is exactly right — keep it).
- Clear heading structure that lets systems extract sections (question-phrased H2s serve this).
- Unique data points, tables, and specific numbers — extractable facts get cited; vague prose doesn't.
- Crawlable, indexed, snippet-eligible pages (technical baseline).

**Explicitly do NOT bother with** (Google's own mythbusting): llms.txt files, content "chunking," rewriting prose "for AI," seeking inauthentic mentions, or treating structured data as an AI-ranking hack. AEO/GEO "hacks" beyond normal SEO are noise.

### Spam-policy hard bans (any one of these can deindex the site)

- **Scaled content abuse**: many pages generated primarily to manipulate rankings with little added value. The defense isn't volume reduction — it's that every page independently passes the question bank above. If a day's batch can't clear the bar at 10 posts, ship fewer posts. Quality gate outranks quota. Always.
- **Keyword stuffing**: write for the reader; mention the topic naturally.
- **Doorway pages**: no near-identical pages funneling to the same CTA (the per-intent dedup rule again).
- **Misleading functionality / bait**: never promise a tool, template, or answer the page doesn't contain.

### Pre-publish gate (runs before publish_guard.py)

Per post confirm: ★ questions all clear · statutes verified · title accurate · original value articulable in one sentence · no intent-duplicate of an existing live post · true date · disclaimer present · byline present. Log one line per post in the final report:

```
GOOGLE-POLICY: PASS — original value: "only page explaining the 21-day deposit itemization clock with a day-by-day table"
```

or the specific failure and what was done about it.

---

## Sources (verify against these if guidance seems stale)

- Creating helpful, reliable, people-first content — developers.google.com/search/docs/fundamentals/creating-helpful-content
- Spam policies — developers.google.com/search/docs/essentials/spam-policies
- Optimizing for generative AI features — developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Guidance on AI-generated content — developers.google.com/search/docs/fundamentals/using-gen-ai-content

If more than ~6 months pass, re-fetch these pages — Google revises them several times a year.
