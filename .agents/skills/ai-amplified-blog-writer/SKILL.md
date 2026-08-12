---
name: ai-amplified-blog-writer
description: Turn YouTube video transcripts, timestamps, or topic summaries into polished, SEO-optimized tech columnist blog posts for the AI AMPLIFIED channel. Use when the user provides a transcript, topic, video notes, or asks to write/draft a blog post for AI AMPLIFIED. Produces opinionated, authoritative posts with proper web structure: hook, narrative arc, subheadings, pull quotes, actionable takeaways, and natural keyword integration.
---

# AI AMPLIFIED Blog Writer

## Overview

Converts raw YouTube video content (transcripts, notes, topics) into publication-ready blog posts matching the AI AMPLIFIED columnist voice — opinionated, analytically sharp, conversational without being casual, authoritative without being academic.

## Workflow

### Step 1 — Intake

Identify what you're working with:

| Input | Action |
|-------|--------|
| Full transcript | Extract 3–5 core claims, identify the central argument, note any specific data/demos/names |
| Topic + notes | Treat notes as supporting evidence; build the argument from the topic |
| Topic only | Ask for 1–2 sentences on the main insight the video delivers |

Before writing, confirm:
- **Central claim**: What is the one thing this post argues or demonstrates?
- **Primary audience**: Developers? Business operators? AI-curious generalists?
- **Target keyword**: What would someone Google to find this content?

### Step 2 — Write

Follow the post structure from `references/structure-templates.md`. Key invariants:

1. **Hook first** — never open with "In this post we'll explore…" or a definition. Open with tension, a specific scenario, or a number.
2. **Argue, don't summarize** — the blog post is not a video recap. It takes a position. The transcript is evidence, not the script.
3. **One idea per section** — each H2 should advance the argument, not just change the subject.
4. **Show the work** — include code blocks, specific tool names, real outputs when the video demonstrated them.

For voice and tone: read `references/voice-guide.md`.
For SEO requirements: read `references/seo-guide.md`.

### Step 3 — Structure Check

Before delivering the post, verify:

- [ ] Hook: opens with tension or specificity, not a thesis statement
- [ ] Each H2 heading includes or implies the benefit/insight (not just a label)
- [ ] At least one pull quote (the most quotable sentence in the post, set off with `>`)
- [ ] Takeaways section is actionable: "Do X" not "X is important"
- [ ] Target keyword appears in: title, first 100 words, one H2, meta description
- [ ] No banned words: leverage (v.), navigate, delve, robust ecosystem, paradigm shift, "in today's fast-paced world"
- [ ] Word count: 900–1,800 words for standard posts; 1,800–3,000 for deep-dives

### Step 4 — Deliverable Format

Output the post in this order:

```
## Meta
- **Title**: [SEO title, ≤60 chars]
- **Slug**: [url-friendly-slug]
- **Meta description**: [140–160 chars, includes primary keyword]
- **Primary keyword**: [target keyword phrase]
- **Secondary keywords**: [3–5 related phrases]
- **Estimated read time**: [X min]

---

[Full blog post in markdown]
```

## References

- **Voice & tone**: `references/voice-guide.md` — columnist persona, banned phrases, sentence rhythm, what makes a sentence sound like AI AMPLIFIED
- **Structure templates**: `references/structure-templates.md` — hook patterns, H2 strategies, pull quote placement, takeaway formats
- **SEO guidelines**: `references/seo-guide.md` — keyword integration, heading hierarchy, meta copy, content signals for AI/tech topics
