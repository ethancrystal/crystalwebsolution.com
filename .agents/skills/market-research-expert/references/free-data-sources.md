# Free / Public Data Sources & Demand Validation

Default to free, public, primary sources. Reach for paid data only when explicitly authorized. The goal of demand validation: distinguish a **real, recurring, painful, paid-for** problem from a "nice idea."

## The triangulation rule
No single free signal is conclusive. Combine **at least two independent signal types** (e.g., search volume + community complaints, or review velocity + job postings) before calling demand "validated." Always trace a secondary source to its primary origin before counting it as independent.

## Source log template (keep this as you research)
```
claim | value | source name | URL | date accessed | type (primary/secondary/estimate) | confidence (H/M/L)
```
Type definitions: **primary** = the originating record (filing, census, the company's own page, an actual review). **secondary** = someone summarizing a primary (analyst note, listicle). **estimate** = your own modeled figure.

---

## Directory of free sources

### Search & keyword demand
- **Google Trends** (trends.google.com) — *relative* interest over time, by region, and rising/breakout queries. Use for seasonality, trajectory (growing/declining), and brand-vs-brand comparison. It is relative, not volume — never quote it as absolute searches.
- **Google Keyword Planner** (free with a Google Ads account) — volume ranges and competition for keywords. Ranges, not exact.
- **Free keyword tools** — Ubersuggest (limited free), Keyword Surfer / Keywords Everywhere (freemium browser extensions), AnswerThePublic (a few free queries/day, surfaces real question phrasings), Google autocomplete & "People also ask" (free, shows real demand language).
- **Bing Webmaster keyword tool**, **YouTube search autocomplete** — secondary cross-checks.

### Communities & forums (qualitative demand + language)
- **Reddit** — search relevant subreddits for complaints, "how do I…", "is there a tool for…", recommendation threads. Sort by Top/All-time for durable pains. Reddit's own search is weak; use `site:reddit.com <query>` on Google.
- **Hacker News** (hn.algolia.com — full-text search of all posts/comments) — strong for developer/technical and startup markets.
- **Stack Overflow / Stack Exchange** — question volume and tags = developer demand signal; high-view unanswered questions = unmet need.
- **Niche communities** — Discord/Slack groups, Facebook Groups, industry forums, Quora, Indie Hackers, Product Hunt comments. Capture verbatim quotes (with link + date).

### Product & app review mining (incumbent strengths/gaps)
- **G2, Capterra, TrustRadius, GetApp** — B2B software reviews; filter by rating, segment, and recency.
- **App Store / Google Play** — consumer/mobile; review **count** ≈ installed-base proxy, review **velocity** ≈ momentum.
- **Trustpilot, Amazon reviews** — consumer products/services.
- **Mining technique:** read the **1–3★ reviews hardest** — that's where unmet needs and switching triggers live. Tally recurring complaints. Note what users *wish* it did. Quote and link the strongest examples.

### Developer & technical signals
- **GitHub** — stars/forks/contributors (momentum), issue volume & "good first issue"/feature-request labels (unmet needs), dependents (adoption), release cadence (vitality). Star history via star-history.com.
- **Stack Overflow Trends** (insights.stackoverflow.com/trends) — tag share over time = technology adoption curve.
- **Stack Overflow Developer Survey**, **npm/PyPI download stats**, **Docker Hub pulls** — adoption proxies.

### Market size, industry & demographic inputs
- **Government statistics** — US Census (Bureau / County Business Patterns for establishment counts by NAICS), BLS, data.gov; Eurostat; UK ONS; World Bank Open Data; OECD.Stat; UN data. Best free source for population/establishment counts that anchor a bottom-up model.
- **Company filings** — SEC EDGAR (10-K/10-Q, S-1 prospectuses are gold for market framing & metrics), investor decks, annual reports → incumbent revenue, customer counts, ARPU.
- **Industry associations & trade bodies** — segment counts, adoption rates, annual "state of" reports (often free).
- **Think tanks / Pew / academic papers / Google Scholar** — behavioral and adoption data with methodology you can scrutinize.
- **Press-release & funding data** — Crunchbase (limited free), company newsrooms, TechCrunch — funding ≈ where smart money sees demand.

### Ad-platform & marketplace signals
- **Meta Ads Library / Google Ads Transparency / TikTok Ad Library** — who is advertising what, how long ads run (long-running ad ≈ profitable = validated demand), and their messaging/positioning.
- **Marketplace data** — Amazon Best Sellers rank & "X bought in past month", Etsy/eBay sold counts, Shopify app store installs, Chrome Web Store users — direct purchase signal.
- **Job postings** (LinkedIn, Indeed, company careers pages) — hiring for a role/skill = budget and growth in that area; a competitor's open roles reveal their roadmap.

### Cheap primary tests (when secondary signals are ambiguous)
- **Smoke-test landing page** + small ad spend → measure click/sign-up rate against a benchmark.
- **5–10 customer interviews** (see [[references/survey-and-interview-design.md]]) — fastest way to resolve a high-stakes unknown.
- **Pre-order / waitlist / fake-door test** — willingness to act, not just willingness to say.

---

## Reading the signals (interpretation)
- **Growing + painful + paid-for = strong.** Search trending up, communities actively complaining, incumbents charging money and getting bad reviews on a specific axis.
- **Flat search + no community chatter = weak or too early.** Distinguish "no demand" from "no awareness yet" (a genuinely new category may have low search but high pain in interviews).
- **Seasonality** — always check 3–5 years on Trends before reading a recent spike as a trend. Annotate seasonal peaks/troughs.
- **Declining trend** — flag it loudly; a shrinking market changes the recommendation.
- **Beware survivorship & selection bias** — loud complainers and reviewers are not the average user. Quantitative volume + qualitative depth together.

## Anti-patterns
- Quoting Google Trends as absolute search volume.
- One Reddit thread = "validated demand."
- Auto-generated "$X Bn market by 2030, CAGR Y%" SEO pages treated as authoritative — they cite each other circularly. Trace to a primary source or discard.
- Confusing review *rating* with review *count* (rating = sentiment; count = adoption).
- Ignoring seasonality and reading a seasonal peak as growth.
- Counting two outlets that both quote the same press release as two sources.
