---
name: ai-amplified-blog-batch
description: >
  Writes the daily AI Amplified blog batch — 20 posts (10 short + 10 long)
  across the 4 content pillars, reading from the title bank produced by the
  ai-amplified-harvester skill. Validates all posts for word count, frontmatter
  completeness, banned phrases, and meta description length before reporting done.
  Trigger on "run the blog batch", "write today's AI Amplified posts", "write the
  posts", "run the batch", "write the AI blog", or any phrasing meaning
  "generate today's posts for AI Amplified." If no title bank exists for today,
  run ai-amplified-harvester first as a blocking prerequisite.
---

# AI Amplified — Daily Blog Batch

Writes 20 posts per run for the AI Amplified blog (ai-amplified.com or equivalent).
Reads titles from the harvester's title bank; validates every post before reporting done.

---

## Prerequisites

1. `AI-Amplified-Blog/title-bank-latest.md` must exist. If it does not, **stop
   and run the ai-amplified-harvester skill first**, then resume.
2. Check whether a dated folder for today (`AI-Amplified-Blog/YYYY-MM-DD/`)
   already exists and contains posts. If 20 posts are already present and
   validated, report done without rewriting.

---

## Output Structure

```
AI-Amplified-Blog/
  YYYY-MM-DD/
    short-01.md  through  short-10.md
    long-01.md   through  long-10.md
    README.md                         ← generated after all 20 posts
  topics-index.md                     ← append-only master index, updated each run
```

---

## Post Spec

### Short posts (short-01 through short-10)
- **Word count:** 999–1,200 words (body prose only, excluding frontmatter)
- **Angle:** single clear takeaway, tactical, actionable
- **Structure:** short answer callout at top → 3–4 H2 sections → CTA close

### Long posts (long-01 through long-10)
- **Word count:** 1,800–2,200 words
- **Angle:** comprehensive, includes at least one table or code block
- **Structure:** short answer callout → 5–7 H2 sections (question-phrased) → honest-limitations section → CTA close

### Mandatory frontmatter (11 fields, YAML)

```yaml
---
title: "..."                    # exact title from title bank
slug: "..."                     # kebab-case, max 60 chars
description: "..."              # ≤155 chars, used as meta description
date: YYYY-MM-DD                # true publication date — never fabricate
pillar: P1|P2|P3|P4
type: short|long
primary_keyword: "..."
word_count: 0                   # update to actual body count after writing
source: "https://..."           # source URL from title bank
trend_tie: "..."                # one sentence on why this is timely
meta_description: "..."         # ≤155 chars (can be same as description)
---
```

### AI-Overview anchor (required in every post)
Place a **"Short answer"** callout within the first 150 words of body prose.
Format as a blockquote or bold sentence. This is what gets extracted by
Google AI Mode and Perplexity — make it quotable and specific.

### Writing voice
- First-person experience signals ("I tested this for a week and here's what happened")
- Specific numbers, not vague claims ("cut prompt length by 40%", "costs $0.003/1k tokens")
- Hedged facts where uncertain ("as of June 2026", "in my tests")
- Varied CTAs — don't end every post the same way

---

## Banned Phrases (auto-fail validation)

The following words/phrases are **never** acceptable in post body prose.
A post containing any of these in prose (not inside a code block or quoted
instruction example) fails validation and must be rewritten before shipping:

- delve
- leverage (as a verb meaning "use")
- game-changer
- groundbreaking
- in conclusion
- it's worth noting
- importantly
- transformative
- robust (when describing software/AI)

---

## Writing Order

1. Read the title bank. Note which pick is marked 🔴 (breaking) — write that one first as `short-01` or `long-01` depending on its type.
2. Write the 10 short posts (short-01 through short-10), then the 10 long posts.
3. If running two sequences (20 posts is the standing authorization when you have a full title bank), split into Sequence 1 (short-01–05, long-01–05) and Sequence 2 (short-06–10, long-06–10) and parallelize across agents where possible.

---

## Step-by-Step

### Phase 1 — Setup
- Read `AI-Amplified-Blog/title-bank-latest.md`
- Create `AI-Amplified-Blog/YYYY-MM-DD/` folder
- Read `AI-Amplified-Blog/topics-index.md` if it exists (for dedup check)

### Phase 2 — Write posts
- Write each post to its file
- Set `word_count` in frontmatter to the actual body word count after writing

### Phase 3 — Validate (all 20 posts must pass before reporting done)

Run these checks programmatically (bash word count + grep):

| Check | Pass condition |
|---|---|
| File count | Exactly 20 files present |
| Short word count | Each `short-*.md` body: 999–1,200 words |
| Long word count | Each `long-*.md` body: 1,800–2,200 words |
| Frontmatter completeness | All 11 fields present, no empty values |
| meta_description length | ≤155 characters |
| H1 count | Exactly 1 H1 per file (the title) |
| Banned phrase sweep | Zero hits outside code fences |
| word_count field accuracy | frontmatter `word_count` within ±50 of actual body count |

Fix any failures before proceeding to Phase 4. Log what was fixed.

### Phase 4 — Generate README and update index

Write `AI-Amplified-Blog/YYYY-MM-DD/README.md`:
- Date, pillar breakdown (5/5/5/5 target), total word count
- List of all 20 titles with type and pillar
- Validation summary (all checks passed / what was fixed)

Append to `AI-Amplified-Blog/topics-index.md` (create if missing):
- One line per post: `YYYY-MM-DD | type | pillar | title | primary_keyword`
- This is the canonical dedup reference for future runs

---

## Done = ✅ When ALL of the Following Are True

- [ ] `AI-Amplified-Blog/YYYY-MM-DD/` contains exactly 20 `.md` files
- [ ] All 20 posts have complete 11-field YAML frontmatter
- [ ] All short posts: 999–1,200 words; all long posts: 1,800–2,200 words
- [ ] All `meta_description` fields ≤155 chars
- [ ] Zero banned phrases in prose (outside code fences)
- [ ] All `word_count` fields accurate (within ±50)
- [ ] `README.md` present in the dated folder
- [ ] `AI-Amplified-Blog/topics-index.md` updated with today's 20 entries
- [ ] Validation log confirms all checks passed (or lists fixes applied)

---

## Hard Rules

- **Never fabricate statistics.** If a post claims a benchmark number, it must
  come from a real source. Use web search to verify, and cite the source in the
  post's frontmatter `source` field.
- **No padding.** Hitting 1,200 words with filler fails the Google policy gate.
  Cut the post short rather than pad it — a 950-word post that fully answers the
  question beats a 1,200-word post with a filler conclusion.
- **True date only.** `date:` is today's actual date. Never change it to make
  content look fresh.
- **Fallback when no title bank:** Generate 20 fresh topics internally using the
  4-pillar balance rules, conduct the same Google policy validation, then write.
  Log clearly that this was a fallback run.
- **Quality gate beats quota.** If a post cannot pass validation without
  fabricating content or padding, drop it and note it in the README. 19 solid
  posts ship. 20 padded posts do not.
