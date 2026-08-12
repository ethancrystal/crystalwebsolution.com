# Blog Structure Templates — AI AMPLIFIED

## Post Architecture

Every AI AMPLIFIED post follows this skeleton. Sections marked [required] must always appear; others are conditional.

```
[Title]           — SEO headline ≤60 chars, implies a claim not just a topic
[Hook]            — [required] First 2–3 paragraphs, no heading
[Context Bridge]  — Optional: 1 paragraph connecting the hook to the broader argument
[Body Sections]   — [required] 3–6 H2 sections advancing the argument
[Pull Quote]      — [required] 1–2 blockquotes at natural emphasis points
[Code/Demo Block] — Conditional: when the video showed actual implementation
[Takeaways]       — [required] Actionable closes, titled "What to Do With This"
[Footnotes/Links] — Optional: further reading, tool links, cited benchmarks
```

---

## Hook Patterns

Choose the pattern that fits the video's core angle.

### Pattern A: The Specific Number Hook
Opens with a data point that creates surprise or stakes.

```
[Number] [subject] [consequence that matters].

That [number] is doing a lot of work. [Explain what it means structurally, not just literally.]
```

**Example:**
> GPT-4o costs $5 per million input tokens. GPT-4-turbo costs $10. That 50% price drop, announced with almost no fanfare, is probably the most consequential AI pricing event of 2024.
>
> Here's why it matters more than the benchmark sheets.

---

### Pattern B: The Contrarian Reframe Hook
Opens by naming the conventional wisdom, then immediately complicating it.

```
Everyone says [conventional take]. They're [wrong/missing the point/half right].

[Here's what's actually happening.]
```

**Example:**
> The AI coding assistant wars are supposed to be over. GitHub Copilot has the distribution. Claude has the reasoning. Cursor has the power users. Pick your corner.
>
> But I've been watching something different happen in the teams I talk to, and it doesn't fit the narrative.

---

### Pattern C: The Specific Scene Hook
Opens in a moment — a real or constructed scenario that makes the abstract concrete.

```
[Specific scene or action, past tense, personal or observed].

[Pull back to what this reveals about something bigger.]
```

**Example:**
> Last week I watched a founder demo an AI agent that booked a flight, replied to three emails, and filed an expense report — all while they were explaining what it was doing.
>
> What struck me wasn't the capability. It was that he still had to explain it.

---

### Pattern D: The Provocative Question Hook
Opens with a question the reader already knows matters, then immediately starts answering it (not teasing the answer).

```
[Sharp question that most readers already feel the urgency of]?

[Start answering immediately — never say "we'll explore that question" or "let's find out".]
```

**Example:**
> Is Claude 3.5 actually better at coding than GPT-4o, or is that just what Anthropic's benchmarks say?
>
> I've been running both on the same set of problems for two weeks. Here's what I found.

---

## H2 Heading Strategies

Headings should carry the argument forward, not just label topics.

**Weak headings (label-style):**
- "The New Features"
- "Performance"
- "Use Cases"

**Strong headings (claim-style):**
- "The Feature That Actually Matters Is the One Nobody Noticed"
- "The Performance Numbers Are Real — The Context Is Missing"
- "Three Use Cases That Work, One That Doesn't"

**Formula options:**
- `[Number] [thing] [unexpected modifier]` — "Three Reasons This Matters Less Than It Looks"
- `The [noun] [verb] — [implication]` — "The Benchmark Wins — But the Pricing Kills It"
- `Why [thing] [surprising claim]` — "Why the Slowest Model in the Suite Is the Most Useful"
- `What [thing] Actually [verb]` — "What Agentic AI Actually Costs in Production"

---

## Pull Quote Placement

Use `>` markdown blockquotes for pull quotes. Pull 1–2 quotes per post. Best candidates:

- The sentence that most crisply states the post's central claim
- The most surprising or counterintuitive sentence in the post
- A sentence where the voice is strongest — the one you'd tweet

**Placement rules:**
- Never in the hook (the hook should earn the pull quote)
- Works best mid-post, after a body section has built to it
- Never end with a pull quote — close with your own words

**Example:**
> The real competitive advantage in AI tooling right now isn't the model. It's the latency.

---

## Code and Demo Blocks

When the video demonstrated actual code, implementations, or prompts, include them. Rules:

- Show the exact code/prompt that was demonstrated, not a paraphrased version
- Add a 1–2 sentence annotation above the block explaining what it does
- Add a 1–2 sentence annotation below explaining what was interesting/surprising about the output
- Use language-tagged fences: ` ```python `, ` ```bash `, ` ```text ` for prompt templates

**Prompt template blocks** — use ` ```text `:
```text
System: You are a [role]. You have access to [tools].

User: [specific task]
```

---

## Takeaways Section

Always titled: **"What to Do With This"** (not "Conclusion," "Key Takeaways," or "Wrapping Up")

Format as a numbered list of 3–5 items. Each item:
- Starts with an imperative verb: "Try," "Switch," "Audit," "Build," "Stop"
- Is specific enough to act on today, not "explore the possibilities"
- Contains one sentence of reasoning after the imperative

**Template:**
```markdown
## What to Do With This

1. **[Verb] [specific thing]** — [one sentence on why/how]
2. **[Verb] [specific thing]** — [one sentence on why/how]
3. **[Verb] [specific thing]** — [one sentence on why/how]
```

**Example:**
```markdown
## What to Do With This

1. **Switch your team's default to Claude 3.5 Sonnet for code review** — the context window and instruction-following make it the better choice for multi-file tasks even if GPT-4o wins on quick completions.
2. **Audit your current AI spend against the new pricing** — OpenAI's May rate cuts mean your cost-per-task calculation from Q1 is probably 30–40% too high.
3. **Stop benchmarking models in isolation** — test them on the exact prompts and data formats your use case needs; synthetic benchmarks tell you almost nothing about production behavior.
```

---

## Post Length Guidelines

| Format | Word Count | When to Use |
|--------|------------|-------------|
| Standard post | 900–1,400 | Single model release, one tool, one workflow |
| Deep-dive | 1,400–2,500 | Technical implementation, multi-model comparison, industry analysis |
| Newsletter-style | 600–900 | Quick takes, news reaction, weekly roundup |

Shorter is usually better. If a section isn't advancing the argument, cut it — don't pad.
