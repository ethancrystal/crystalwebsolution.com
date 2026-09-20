# Google Policy Details — Full Reference

Source quotes and complete lists from Google Search Central (fetched June 2026). Read this when SKILL.md's summary isn't enough.

## Contents
1. Expertise questions (verbatim)
2. People-first questions (verbatim)
3. Search-engine-first warning signs (verbatim)
4. E-E-A-T and YMYL (verbatim excerpts)
5. Who / How / Why (verbatim excerpts)
6. Spam policies relevant to blogging
7. AI-generated content stance
8. Generative-AI optimization guide highlights
9. Mythbusting list (verbatim)

---

## 1. Expertise questions (verbatim, creating-helpful-content)

- Does the content present information in a way that makes you want to trust it, such as clear sourcing, evidence of the expertise involved, background about the author or the site that publishes it, such as through links to an author page or a site's About page?
- If someone researched the site producing the content, would they come away with an impression that it is well-trusted or widely-recognized as an authority on its topic?
- Is this content written or reviewed by an expert or enthusiast who demonstrably knows the topic well?
- Does the content have any easily-verified factual errors?

## 2. People-first questions (verbatim — "yes" = on track)

- Do you have an existing or intended audience for your business or site that would find the content useful if they came directly to you?
- Does your content clearly demonstrate first-hand expertise and a depth of knowledge (for example, expertise that comes from having actually used a product or service, or visiting a place)?
- Does your site have a primary purpose or focus?
- After reading your content, will someone leave feeling they've learned enough about a topic to help achieve their goal?
- Will someone reading your content leave feeling like they've had a satisfying experience?

## 3. Search-engine-first warning signs (verbatim — "yes" = warning)

- Is the content primarily made to attract visits from search engines?
- Are you producing lots of content on many different topics in hopes that some of it might perform well in search results?
- Are you using extensive automation to produce content on many topics?
- Are you mainly summarizing what others have to say without adding much value?
- Are you writing about things simply because they seem trending and not because you'd write about them otherwise for your existing audience?
- Does your content leave readers feeling like they need to search again to get better information from other sources?
- Are you writing to a particular word count because you've heard or read that Google has a preferred word count? (No, we don't.)
- Did you decide to enter some niche topic area without any real expertise, but instead mainly because you thought you'd get search traffic?
- Does your content promise to answer a question that actually has no answer, such as suggesting there's a release date for a product, movie, or TV show when one isn't confirmed?
- Are you changing the date of pages to make them seem fresh when the content has not substantially changed?
- Are you adding a lot of new content or removing a lot of older content primarily because you believe it will help your search rankings overall by somehow making your site seem "fresh?" (No, it won't)

NOTE FOR TTML: the third and fourth bullets describe an automated daily batch. The pipeline's defense is that the automation serves one focused audience (Californians with pre-litigation disputes), within one demonstrable expertise lane, with per-page editorial care that can be pointed to. The moment posts become generic summaries, the pipeline crosses from "automation as tool" to "automation as spam."

## 4. E-E-A-T and YMYL (verbatim excerpts)

"Of these aspects, trust is most important. The others contribute to trust, but content doesn't necessarily have to demonstrate all of them."

"Our systems give even more weight to content that aligns with strong E-E-A-T for topics that could significantly impact the health, financial stability, or safety of people, or the welfare or well-being of society. We call these 'Your Money or Your Life' topics, or YMYL for short."

Legal content is YMYL. Every TTML post is judged at the elevated standard.

## 5. Who / How / Why (verbatim excerpts)

Who: "Is it self-evident to your visitors who authored your content? Do pages carry a byline, where one might be expected? Do bylines lead to further information about the author?"

How (re automation): "Is the use of automation, including AI-generation, self-evident to visitors through disclosures or in other ways? Are you providing background about how automation or AI-generation was used to create content? Are you explaining why automation or AI was seen as useful to produce content?" — "Overall, AI or automation disclosures are useful for content where someone might think 'How was this created?'"

Why: "If you use automation, including AI-generation, to produce content for the primary purpose of manipulating search rankings, that's a violation of our spam policies."

## 6. Spam policies relevant to blogging (spam-policies doc)

- **Scaled content abuse**: "many pages are generated for the primary purpose of manipulating search rankings and not helping users." Examples: using generative AI tools to generate many pages without adding value for users; scraping and transforming content to create many pages; creating pages containing search keywords that make little sense to readers.
- **Keyword stuffing**: filling pages with keywords or numbers to manipulate rankings.
- **Doorway abuse**: pages created to rank for specific queries that funnel users to a single destination.
- **Site reputation abuse**: third-party content published on a host site to exploit its ranking signals (not currently a TTML risk; relevant if guest content is ever accepted).
- **Expired domain abuse**: repurposing expired domains to boost low-value content (not a TTML risk).
- **Link spam**: buying/selling links that pass ranking credit; excessive link exchanges.
- **Hidden text and links, cloaking, sneaky redirects**: showing different content to Google than to users.

Enforcement: violations can drop individual pages or the entire site from results. Recent core updates (per industry analysis of the March 2026 update) hit scaled-AI-content sites with 50-80% traffic losses.

## 7. AI-generated content stance (using-gen-ai-content / 2023 blog)

- "Appropriate use of AI or automation is not against our guidelines. Using automation—including AI—to generate content with the primary purpose of manipulating ranking in search results is a violation of our spam policies."
- Reward target is unchanged: "original, high-quality, people-first content demonstrating qualities E-E-A-T," regardless of how it is produced.
- AI disclosure recommended where readers would reasonably expect it; an editorial-process page satisfies this for a blog.

## 8. Generative-AI optimization guide highlights (ai-optimization-guide, updated 2026-06-05)

- AI Overviews / AI Mode use RAG (grounding) over the core search index plus query fan-out — so core SEO IS generative-AI optimization. "Optimizing for generative AI search is optimizing for the search experience, and thus still SEO."
- "Non-commodity content" is the key concept: "Commodity content (for example, something like '7 Tips for First-Time Homebuyers') is often based on common knowledge... In contrast, non-commodity content (such as 'Why We Waived the Inspection & Saved Money: A Look Inside the Sewer Line') provides unique expert or experienced takes."
- "Don't just recycle what others on the internet have already said, or could easily be produced by a generative AI model."
- Warning: "creating separate content for every possible variation of how people might search... primarily to manipulate rankings or generative AI responses violates Google's scaled content abuse spam policy. This is also an ineffective long-term strategy."
- Technical baseline: page must be indexed and snippet-eligible; crawlable; good page experience; images/video help.

## 9. Mythbusting (verbatim list of things NOT to do)

- LLMS.txt files and other "special" markup: not needed.
- "Chunking" content: no requirement to break content into tiny pieces; no ideal page length.
- Rewriting content just for AI systems: AI understands synonyms; don't keyword-variant farm.
- Seeking inauthentic "mentions": not helpful; spam systems block it.
- Overfocusing on structured data: not required for generative AI search; useful only for normal rich-result eligibility.
