# Snake Oil Reference

Tactics that are widely recommended in the AI-SEO space but lack evidence — or have evidence against them. Use this when the user asks "should I do X" or when you see one of these implemented on the page you're auditing.

The goal of this file is not to be cynical for sport; it's to save the user from spending effort on tactics that don't move the needle. Each item below has either (a) controlled-experiment evidence against it, (b) absence from any crawler documentation, or (c) basic mechanism issues that make it implausible.

## HTML comments as AI signals

**Claim:** Add `<!-- AI-READABLE-VERSION: ... -->` or similar to tell AI what's important.

**Reality:** LLM parsers strip HTML comments before processing. ChatGPT, Claude, and Perplexity all work with rendered text, not raw HTML source. No published crawler documentation references HTML comments as a signal.

**What to do instead:** Make the content itself answer the question. Definition-first openings do the job the comment was trying to do.

## "AI info pages" or "/for-ai" routes

**Claim:** Create a dedicated page (e.g. `/for-ai`, `/ai-summary`, `/llm-context`) containing structured facts about your business "for AI agents".

**Reality:** No evidence any retrieval system treats these pages differently from any other well-structured page on the site. Crawlers don't have a "look for /for-ai" instruction. The page works as well or as poorly as any normal page on the site would.

**What to do instead:** A good `/llms.txt` and clean Markdown routes (where supported) already do what the dedicated page tried to do, without inventing a non-standard URL.

## User-agent sniffing to serve Markdown

**Claim:** Detect AI crawlers by User-Agent string and serve them Markdown automatically while humans see HTML.

**Reality:** This is cloaking — serving different content based on who the requester is, not what they asked for. Google penalizes it. Even if it weren't penalized, it's brittle: spoofed user-agents and new AI bots break it constantly.

**What to do instead:** Use `Accept: text/markdown` content negotiation. The client explicitly requests Markdown; you serve Markdown. Standards-compliant, no cloaking concern.

## JSON-LD / Schema.org as a citation lever for LLMs

**Claim:** Add rich JSON-LD schema markup so AI engines understand your content.

**Reality:** Controlled experiments (SearchVIU, confirmed by Search Engine Roundtable) placed product data exclusively in JSON-LD and tested whether ChatGPT, Claude, Perplexity, Gemini, and Copilot could retrieve it. All except Copilot missed it. They treat structured data as just text on the page. Copilot is the exception because it inherits schema understanding from Bing.

**What to do instead:** Keep your schema for traditional SEO and Copilot — it still helps there. Don't expect adding schema to drive ChatGPT or Perplexity citations. Put the data in rendered text too.

## llms.txt as a primary lever

**Claim:** Adding `/llms.txt` will dramatically increase AI citations.

**Reality:** Server log analyses show major crawlers don't request `/llms.txt` unprompted. No provider has formally committed to reading it. It's a community proposal that some sites have adopted, not an industry standard the bots actively consume.

**What to do instead:** Add it anyway because cost is near-zero and some client tools fetch it when humans paste URLs. But do not let it crowd out structural and authority work. If the user has spent more than 2 hours on `/llms.txt`, redirect them.

## "Just write conversationally and AI will love it"

**Claim:** Conversational tone helps AI cite your content.

**Reality:** No evidence. LLM retrieval is based on semantic match, recency, authority, and passage structure — not tone. A clinical, dense, definition-first paragraph outperforms a chatty narrative on every measured citation metric.

**What to do instead:** Optimize for citability (self-contained chunks with quantified claims), not for tone.

## Keyword density and synonym stuffing

**Claim:** Hit your target keyword 1.5% of the time, sprinkle in synonyms, watch LLM citations rise.

**Reality:** LLM retrieval is semantic. The retriever embeds the query and the candidate passage into vectors and computes similarity. Keyword density tactics from 2008 SEO don't transfer. Stuffing actively hurts because it makes the passage less coherent and reduces information density.

**What to do instead:** Write the clearest possible answer to the question. The retriever will find it on semantic grounds.

## Buying citation-monitoring SaaS as the fix

**Claim:** Install our $499/month platform and your AI citations will improve.

**Reality:** These tools measure citations across LLMs. Measurement is not optimization. Many of them then sell you content services. The measurement tier alone won't move citations — only the actual content changes will.

**What to do instead:** If the user wants to measure, recommend they manually query the 4 major LLMs with their key prompts weekly. Free, takes 20 minutes, more informative than most dashboards. Buy the tool only if measurement at scale is genuinely the bottleneck.

## "Submit your site to AI directories"

**Claim:** New directories exist (often the agency's own) where you can list your site for AI visibility.

**Reality:** No major LLM provider has any directory submission process. The "AI directories" are link-farms or marketing-content plays.

**What to do instead:** Get listed on directories LLMs actually trust — Crunchbase, G2, Capterra, Wikidata, industry-specific reference sites with real editorial standards.

## Hidden text "optimized for AI"

**Claim:** Place AI-optimized text in `display: none`, `visibility: hidden`, off-screen positioning, or extremely small font.

**Reality:** This is a textbook SEO violation that predates LLMs and gets pages demoted in Google. LLM crawlers also typically follow the rendered DOM, which means hidden text either gets included (and the page gets demoted in Google) or gets excluded (and the tactic does nothing).

**What to do instead:** Put the optimized text visibly on the page. If it doesn't fit the user-facing design, that's a content design problem, not a "hide it for AI" problem.

---

## How to use this in the audit

When auditing, check whether any of these tactics are present on the page. For each one found:
- Include it in the "Snake oil check" section of the report
- Quote the specific implementation
- Explain briefly why it doesn't work
- Recommend what to do instead

If the user has paid an agency that recommended these tactics, be direct: "Your agency recommended X. The evidence is against it. Here's a better use of that budget."
