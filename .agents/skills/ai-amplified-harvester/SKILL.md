---
name: ai-amplified-harvester
description: >
  Runs the daily AI Amplified title-harvesting run. Searches live AI news sources,
  picks 10 blog titles (5 short + 5 long) balanced across 4 pillars, validates
  each against Google policy, marks any breaking item 🔴, and writes
  title-bank-YYYY-MM-DD.md plus title-bank-latest.md to AI-Amplified-Blog/.
  Trigger on "run the harvester", "pick today's titles", "harvest titles",
  "title bank", "morning titles", or any phrasing that means "find what to write
  about today for AI Amplified." Runs BEFORE the blog-batch skill; the batch
  reads this file's output. Also trigger automatically if the blog-batch
  finds no title-bank file for today.
---

# AI Amplified — Daily Title Harvester

Companion to the **ai-amplified-blog-batch** skill. Runs once each morning (or
on demand) and produces the title bank the batch writer reads.

---

## Output Files

| File | Location |
|---|---|
| Dated bank | `AI-Amplified-Blog/title-bank-YYYY-MM-DD.md` |
| Latest alias | `AI-Amplified-Blog/title-bank-latest.md` |

Both files are **identical in content**. The alias lets the batch skill read
`title-bank-latest.md` without knowing today's date.

---

## The 4 Content Pillars

Every pick must be assigned to exactly one pillar. Keep the total split as
close to **3 / 2 / 3 / 2 or 2 / 3 / 2 / 3** as the news supports — never
more than 3 picks in any single pillar per run.

| Code | Pillar | Topics that belong here |
|---|---|---|
| P1 | AI Tools | Tool reviews, comparisons, tutorials, pricing breakdowns, workflow integrations |
| P2 | Prompt Engineering | Prompt techniques, system-prompt patterns, context engineering, jailbreak defense |
| P3 | AI Models | Model benchmarks, new releases, comparisons (Claude vs GPT vs Gemini), open-source news |
| P4 | AI Automation | AI agents, no-code automation, agentic frameworks, scheduled tasks, AI-assisted workflows |

---

## Step 1 — Source Today's AI News

Search **at minimum** these sources every run:

- https://www.buildfastwithai.com/blogs (daily AI news digest)
- https://llm-stats.com/llm-updates (model benchmark & release updates)
- https://ossinsight.io/trending/ai (trending open-source AI repos)
- https://thenewstack.io (engineering + AI tool coverage)
- General web search: `"AI news today [YYYY-MM-DD]"` + `"new AI model [current month]"`

Collect at least **15–20 raw candidate topics** before filtering. Note the
source URL for every candidate — each pick must ship with a source.

**Breaking-item rule:** If any source shows a **same-day** major model release,
product launch, or policy event (something that happened in the last ~24 h),
flag it. If it passes the Google policy gate, mark it 🔴 in the bank and put
it in a `## BREAKING TODAY` section at the top of the file.

---

## Step 2 — Assign Short / Long Type

The batch needs exactly:
- **5 short posts** — 600–900 words, tactical, single clear takeaway
- **5 long posts** — 1,800–2,200 words, comprehensive, includes tables/examples

Trending / time-sensitive topics suit shorts. Deep-dives, comparisons, and
tutorials suit longs.

---

## Step 3 — Google Policy Gate

Load and apply the **google-blog-policy** skill to every candidate.
Run five tests in order: people-first → non-commodity → expertise-fit →
answerability → cannibalization. Record the annotation inline.

Expertise lane for AI Amplified: AI tools, prompt engineering, model evaluation,
automation workflows. Reject anything outside this lane even at high volume.

Non-commodity bar: favour picks with extractable specifics — exact benchmark
numbers, named tools with pricing, copy-paste prompts, step-by-step
instructions. Reject generic listicles unless you can add a unique angle.

---

## Step 4 — Balance Check

Before locking in picks, confirm:
1. Exactly 5 short + 5 long
2. No pillar has more than 3 picks (hard cap)
3. At least 1 pick is tied to something that happened this week (trend anchor)
4. Every pick has a real, fetchable source URL

---

## Step 5 — Write the Title Bank File

Use this exact structure:

```markdown
# AI Amplified — Title Bank [YYYY-MM-DD] ([MORNING|EVENING] run)

## BREAKING TODAY  ← only include if a 🔴 pick exists
🔴 **[Title]** — [one-sentence why it's breaking]

---

## Recommended Batch — 10 Picks

| # | Type | Pillar | Title | Primary Keyword | Source |
|---|---|---|---|---|---|
| 1 | S | P1 | ... | ... | [link] |
...

### Full Annotations

**#1 [S / P1] — "[Title]"**
GOOGLE-POLICY: people-first PASS | non-commodity X/10 ([reason]) | expertise PASS | answerable PASS | no cannibalization | ★-questions: all clear
Trend tie: [what makes this timely]
...

---

## More Candidates (did not make the cut)
- "[Title]" — dropped because [reason]

---

## Trend Notes
[3–6 bullets on the week's dominant AI stories, sourced]
Sources: [comma-separated links]
```

---

## Done = ✅ When ALL of the Following Are True

- [ ] `AI-Amplified-Blog/title-bank-YYYY-MM-DD.md` exists and is non-empty
- [ ] `AI-Amplified-Blog/title-bank-latest.md` is byte-for-byte identical
- [ ] Exactly 5 picks labelled `S` and 5 labelled `L`
- [ ] No pillar appears more than 3 times in the table
- [ ] Every pick has a real source URL
- [ ] Every pick has a GOOGLE-POLICY annotation
- [ ] Breaking items (if any) appear in `## BREAKING TODAY` with 🔴
- [ ] A `## Trend Notes` section with ≥3 sourced bullets exists

---

## Hard Rules

- **Never fabricate sources.** If you can't find a real URL for a pick, drop it.
- **One intent per pick.** If two titles target the same reader question, keep only the stronger one.
- **Timely beats evergreen** when both score equally.
- **The 🔴 pick ships first** in the batch (the blog-batch skill reads this convention).
- If called from blog-batch as a fallback (no bank exists), produce a full 10-pick bank *before* the batch starts writing.
