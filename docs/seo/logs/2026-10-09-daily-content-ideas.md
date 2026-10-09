## 2026-10-09 — Daily content ideas (Desk automation)

**Scheduled run** · Data window ~last 14 days (≈2026-09-25 → 2026-10-09)  
**Site:** https://www.cdsportswearinc.com  
**Audience:** US beginners/intermediate learners; SMB owners (DIY vs hire); secondary aspiring designers  
**Scope:** Research/reporting only — do not publish; do not edit KEYWORD-REGISTRY; do not change production; do not clear Writer or Publisher. Skip Shopify organic recommendations. Desk owns mid-difficulty web-design long-tails supporting `/services/web-design` (no money-page heads; no second RFP URL).  
**Run note:** PR #279 is still open (mergeable but behind), so this entry is appended on the same branch (`seo/desk-content-ideas-2026-10-01`).  
**Sources = web search + fetched pages:**
1. https://make.wordpress.org/ai/2026/10/06/whats-new-in-ai-1-4-0/ (2026-10-06; WordPress AI plugin 1.4.0: Markdown Feeds experiment at `/feed/markdown/` and `?output_format=markdown`; Alt Text Generation respects decorative-image setting)
2. https://www.webability.io/blog/ai-accessibility-ai-built-landing-pages (2026-10-08; designer-panel findings on AI-built landing pages: layout/hierarchy, typography, color contrast; maps flags to WCAG 2.2)
3. https://juniperline.co.uk/web-design-trends-for-small-business-websites/ (2026-10-07; SMB-focused: hero as signpost, calmer spacing/body text, speed and accessibility as design decisions)
4. https://www.figma.com/release-notes/ (2026-10-06 entry: Figma agent GA; library guidelines as markdown files read on every prompt; AI credits as of Oct 6)
5. https://www.figma.com/blog/figma-agent-and-design-systems/ (2026-10-06; how library guidelines capture rules/patterns for the agent)
6. https://www.framer.com/updates/firewall (2026-10-01; geo/path firewall — noted, skipped as niche/enterprise)
7. https://www.cdsportswearinc.com/sitemap.xml (live inventory check 2026-10-09: 23 `/blog/*` URLs in cached sitemap; age ≈95h, `last-modified` 2026-10-05 12:57 GMT)

**Evidence vs hypothesis:** Every "Why now" cites a URL fetched/verified in this run. Volume/KD left **unverified** (Ryze Google Ads returned `subscription_required` again this run). WebAbility's Contra Labs figures are designer judgments on AI model output (small panels), not WCAG conformance tests or builder-product rankings — any post must say so. WordPress Markdown Feeds is an **Experiment** in the AI plugin, not core; confirm enablement steps and plan limits in a fact pack. Juniper Line is a studio blog, not Google/W3C — use it as a timely SMB framing source, not as authority for CWV thresholds.

**Buckets covered (≥4):** AI website builders/design tools (WordPress AI 1.4.0 Markdown Feeds + decorative alt; Figma library guidelines) · design trends (SMB hero-as-signpost / calmer type) · Google Search / Core Web Vitals (hero clarity tied to speed-as-design in SMB trend coverage; CWV thresholds only via prior live guides, not new Google docs this window) · accessibility/WCAG (AI landing-page readability flags mapped to WCAG 2.2; decorative-image alt semantics)

**Skipped as duplicates or unverified:** Figma agent GA buyer angle (2026-10-07 idea); Figma Motion / Lottie (2026-10-01 idea); Figma auto layout vertical wrap (2026-09-29 idea); Webflow MCP / Agent Instructions / agentic translation (live or prior); Typeform AI Landing Pages (2026-10-08 idea); llms.txt / AI visibility tools (2026-10-07–08 ideas); website color contrast (2026-10-08 idea); contact form design (2026-10-08 idea); are AI website builders accessible (2026-10-05 idea); AI generated alt text review (2026-10-05 idea); web design trends 2026 small business (live); soft navigations / Title II (live); WCAG 3 draft (2026-09-30 idea); Framer Firewall (niche, Advanced Hosting/Enterprise); Stackra CWV-by-platform study (dated 2026-09-20, outside window); Squarespace Sept product updates (posted 2026-09-21, outside window); RFP topics (Claude lane); money-page heads; Shopify.

**Live-site observation (for Publisher, not actioned here):** `/sitemap.xml` is still the cached copy (Vercel HIT, `last-modified` 2026-10-05 12:57 GMT, age ≈95h) and still omits `/blog/soft-navigations-core-web-vitals-spa-websites` and `/blog/title-ii-website-accessibility-web-vendors`, both of which return 200. Third+ day of the same gap; likely needs a sitemap revalidate.

---

## 1. Should Your WordPress Site Publish a Markdown Feed for AI Tools?
- Target keyword: wordpress markdown feed | Secondary: WordPress feed markdown, markdown output for AI website
- Search intent: Commercial investigation
- Format: decision guide / explainer
- Angle: Builders and plugins are racing to expose site content to AI systems. Explain what WordPress AI 1.4.0's Markdown Feeds experiment actually adds (`/feed/markdown/` and `?output_format=markdown`), how it differs from yesterday's llms.txt topic, when a small business should enable it versus fixing crawlable service pages first, and when hiring a developer/designer is the better path.
- Why now: WordPress AI plugin 1.4.0 (released 2026-10-05; announced 2026-10-06) introduces a Markdown Feeds experiment that publishes Markdown versions of content for AI agents and Markdown consumers — https://make.wordpress.org/ai/2026/10/06/whats-new-in-ai-1-4-0/
- Volume / KD: unverified
- Effort: Medium
- Outline starter:
  - H2: What a Markdown feed is (and what it is not)
  - H2: What WordPress AI 1.4.0 actually ships
  - H2: Markdown feed vs llms.txt vs clear service pages
  - H2: When to enable it yourself vs when to hire help
  - H2: A short enable-and-check list before you call it done

## 2. When Should Website Images Be Marked Decorative? A Plain-Language Alt Text Rule
- Target keyword: decorative image alt text | Secondary: when to leave alt text empty, mark image as decorative WordPress
- Search intent: Informational
- Format: how-to checklist
- Angle: Owners and DIY builders still write alt text for every image, including purely decorative ones. Use the new WordPress AI alt-text behavior that respects the decorative setting to teach a simple rule: informative vs decorative, empty alt when decorative, and why wrong alt text hurts more than no alt on a flourish.
- Why now: WordPress AI 1.4.0's Alt Text Generation now integrates with the Image block's decorative-image setting and skips images marked decorative — https://make.wordpress.org/ai/2026/10/06/whats-new-in-ai-1-4-0/
- Volume / KD: unverified
- Effort: Low
- Outline starter:
  - H2: Informative vs decorative images in plain words
  - H2: The empty-alt rule (and why "image of…" is worse)
  - H2: How WordPress's decorative setting works with AI alt tools
  - H2: A 10-minute image audit for a small business homepage
  - H2: When a designer should rebuild the image system

## 3. How to Review an AI-Built Landing Page Before You Show It to Anyone
- Target keyword: AI landing page design review | Secondary: review AI generated website design, AI landing page checklist before launch
- Search intent: Commercial investigation
- Format: checklist / audit guide
- Angle: Not "are AI builders accessible?" (already covered) and not "should you use an AI landing page builder?" (2026-10-08). This is the post-generation review step: layout/hierarchy, typography, and contrast — the issues designers keep flagging — plus when the review ends in a DIY fix versus hiring a designer.
- Why now: A 2026-10-08 analysis of designer panels on AI-built landing pages found layout/spacing/hierarchy as the top flag, with typography and color contrast next, and mapped those flags to WCAG 2.2 checks owners can run — https://www.webability.io/blog/ai-accessibility-ai-built-landing-pages
- Volume / KD: unverified
- Effort: Medium
- Outline starter:
  - H2: Treat the first AI output as a draft, not a launch
  - H2: Check 1: layout, spacing, and real heading hierarchy
  - H2: Check 2: typography and color contrast on supporting text
  - H2: Check 3: keyboard focus, zoom, and mobile width
  - H2: DIY fix vs hire: a decision rule after the review

## 4. Rewrite Your Homepage Hero So a Stranger Gets the Answer in Five Seconds
- Target keyword: homepage hero section best practices | Secondary: above the fold website design small business, homepage hero rewrite
- Search intent: Informational
- Format: how-to tutorial
- Angle: Narrower than the live "web design trends 2026" post. One concrete DIY brief: what the business does, where it operates, and how to get in touch — above the fold — with one CTA and one proof cue, plus why heavy hero motion fights both clarity and speed.
- Why now: A 2026-10-07 SMB design piece argues the biggest useful shift is structural — heroes that lead with the answer like a signpost, not a mood board — https://juniperline.co.uk/web-design-trends-for-small-business-websites/
- Volume / KD: unverified
- Effort: Low
- Outline starter:
  - H2: The five-second stranger test
  - H2: What belongs in the hero (and what to cut)
  - H2: One CTA and one proof cue — examples for service businesses
  - H2: Mobile fold: headline first, image second
  - H2: A weekend rewrite checklist you can do without a rebuild

## 5. Figma Library Guidelines Files: What to Put in Them So AI Stays On-Brand
- Target keyword: figma library guidelines | Secondary: figma agent design system guidelines, design library markdown guidelines Figma
- Search intent: Commercial investigation
- Format: buyer brief / Q&A list
- Angle: Distinct from the 2026-10-07 "Figma agent vs hiring" idea. This is the artifact owners should ask a designer to create: markdown guideline files on the published library (rules, do's/don'ts, antipatterns) so agent output stays on-system — what to include, what not to expect, and how it shows up in a quote.
- Why now: Figma's 2026-10-06 release notes and design-systems blog say you can add markdown guideline files to a design library that the agent reads on every prompt — https://www.figma.com/release-notes/ · https://www.figma.com/blog/figma-agent-and-design-systems/
- Volume / KD: unverified
- Effort: Medium
- Outline starter:
  - H2: What a library guidelines file is (in client language)
  - H2: What to ask your designer to document first
  - H2: What the agent can enforce vs what still needs human review
  - H2: How this can appear in a design quote (seats, credits, time)
  - H2: Five questions before you approve "AI-assisted" design work

---

**Top pick:** #1 "Should Your WordPress Site Publish a Markdown Feed for AI Tools?" (keyword: wordpress markdown feed). Fresh primary release, commercial-investigation framing, pairs with the 2026-10-08 llms.txt idea as an "AI readiness for SMB sites" cluster without repeating it, and naturally links to clear service-page design on `/services/web-design`. Quick-win alternate: #2 (decorative image alt text), Low effort and extends the accessibility cluster.

**Already covered/planned:** Website Redesign Cost, Website Redesign Services, When to Redesign vs Refresh, How Much Does a Small Business Website Cost, When Page Builders Become a Trap, Brochure vs Conversion, AI Automation vs Zapier/Make, Custom React/Next.js vs Page Builders, AI Automation Agency, Web Design Agency Manassas/NOVA, Branding + Web Design Studio, How Much Does AI Automation Cost 2026, How to Write a Web Development RFP, Core Web Vitals for small business website (live), Figma Sites vs Webflow (live), Wix Harmony vs Framer AI vs Squarespace AI (live), ADA website accessibility checklist (live), Webflow MCP agents vs hiring designer (live), web design trends 2026 small business (live), WordPress.com AI theme vs hiring designer (live), Figma Weave tools website imagery (live), Webflow Agent Instructions vs hiring designer (live), Claude Design Wix Send to Wix (live), soft navigations Core Web Vitals (live), Title II website accessibility for web vendors (live), custom website design, small business web design, professional website design, affordable web design services, hire a web designer, Webflow AI site builder vs designer, website performance budget redesign, DESIGN.md for SMB, Squarespace Blueprint AI vs custom design, Squarespace Image Studio vs custom photography, Figma Make prototype to website, website accessibility release process, fix INP small business website, branding vs brand identity, logo redesign vs refresh, business of web design, product page design, how to write a web design RFP, Figma auto layout vertical wrap, Framer Skills design system, WCAG 3 draft web designers, CrUX ad density website design, context engineering AI website builder, Figma Motion Lottie website, multimodal search website design, Gutenberg text shadow WordPress design, Webflow CMS components rich text, are AI website builders accessible, AI generated alt text review, how long google update after website redesign, service area pages design, how to give feedback on website design, main content vs supplementary content, are AI website builders good for SEO, how to test website on different devices, website animation accessibility, do website templates hurt SEO, are PDFs on websites ADA compliant, how to check AI visibility of my business, AI website translation, figma agent, wordpress maintenance checklist, AI landing page builder, website color contrast, contact form design best practices, llms.txt, SEO for web designers, wordpress markdown feed (2026-10-09 idea), decorative image alt text (2026-10-09 idea), AI landing page design review (2026-10-09 idea), homepage hero section best practices (2026-10-09 idea), figma library guidelines (2026-10-09 idea)

**Desk note:** Top pick needs a Researchy fact pack before any Writer clear: confirm Markdown Feeds is an Experiments toggle in the WordPress AI plugin (not core), document exact URLs (`/feed/markdown/`, `?output_format=markdown`), note minimum WordPress version 7.0.3 for AI 1.4.0, and keep Google llms.txt guidance separate (do not claim Markdown feeds improve rankings). Do not clear Writer or Publisher from this run.
