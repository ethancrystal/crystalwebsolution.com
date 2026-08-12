---
name: writer-thinker
description: Produce reasoned, persuasive prose for tasks that require BOTH rigorous thinking AND crafted writing — where the user doesn't yet fully know their own position and the output has to convince a reader who isn't already on board. Use for decision memos, RFCs, architectural arguments, post-mortems, founder essays grounded in technical or business detail, position papers, op-eds with technical depth, public engineering writeups, Substack pieces about systems being built, and internal proposals that need to land with skeptical readers. Trigger when the task is BOTH "figure out what I actually think about X" AND "write it so someone else is persuaded." Do NOT use when the user already knows their position and just wants it phrased well — that's columnist. Do NOT use for internal reasoning or transactional answers where prose quality doesn't matter — that's sequential-thinking. Also skip for pure narrative or memoir essays without an argumentative spine.
---

# Writer-Thinker

A protocol for tasks where the thinking and the prose are doing equal work — where you have to figure out what you actually believe *and* convince a reader of it, in the same piece.

## Why this exists

Sequential-thinking is great when the output is functional — code, a decision, a diagnosis. It treats prose as the wrapper around the answer. Columnist is great when the position is already known — the work is finding the voice and the architecture. But there's a third territory neither parent covers well:

**Pieces where the writer hasn't decided what they think yet, the substance is technical or argumentative (not narrative), and the reader is a skeptic.** RFCs, architectural decision records, post-mortems that have to be honest, founder essays where the engineering matters as much as the rhetoric, position papers, op-eds whose authority depends on technical precision. In this territory, columnist alone will produce beautifully-phrased confusion (because the thesis was never stress-tested), and sequential-thinking alone will produce a correct conclusion that nobody finishes reading (because it sounds like an internal memo).

Writer-thinker is the merge: sequential-thinking's adversarial reasoning runs *before* a position is locked in, then columnist's craft machinery shapes the prose. The thinking is upstream of the writing, but the writing is what the reader receives.

## When to engage

Trigger when **all three** of these are true:

1. **The output is a piece of prose someone other than the writer will read** (not internal scratch, not transactional reply).
2. **The substance is argumentative or technical** — there's a position being taken, evidence being marshalled, a reader being persuaded.
3. **The writer doesn't yet have a locked-in thesis** — they need to figure out what they think *as part of writing the piece*, not before.

Concrete examples:

- "Help me write up the case for migrating off pg-boss to BullMQ"
- "I need to draft a post-mortem for the notification constraint drift incident"
- "Write me a founder essay on why attorney-in-the-loop AI is the only model that survives California legal liability"
- "Turn these notes into an RFC for the new RAG pipeline"
- "I want to write a Substack piece about what we learned shipping a 4-stage AI pipeline — but I'm not sure what the actual argument is yet"
- "Draft a decision memo on whether to keep n8n in the stack or rip it out"

**Skip for:**
- "Polish this draft" where the thesis is already there → columnist
- "Write a column about X" with no technical/engineering substance → columnist
- "Should I refactor Y" where the output is a decision, not prose → sequential-thinking
- Code reviews, debugging, architecture discussions in chat (not as written deliverables) → sequential-thinking
- Personal narrative, memoir, character pieces → columnist
- Quick emails, READMEs, code comments → neither

If you're unsure between writer-thinker and columnist: ask "does the writer already know what they think?" If yes → columnist. If no or partially → writer-thinker.

## The protocol

Nine phases. Phases 1–4 are the thinking spine (imported and hardened from sequential-thinking). Phases 5–9 are the craft spine (imported from columnist). The handoff at Phase 4 → 5 is the load-bearing seam — the thesis must survive Phase 4 before any voice gets picked in Phase 5.

### Phase 1 — Inventory

List before reasoning. Same as both parents:

- **Topic** in one sentence
- **Input type**: raw notes? rough draft? bullets? brain-dump? topic only?
- **Audience**: who reads this, what do they already believe, what would change their mind
- **Venue**: internal RFC? public blog? team Slack canvas? Substack? attorney-review memo?
- **Length**: stated or implied. Default to ~800 words for memos/RFCs, ~1200 for essays, ~400 for short positions
- **Stakes**: reversible or not? Decision-making or persuasion or both?
- **Every technical parameter the user gave**: file names, system names, constraints, prior decisions, stack details. If the piece is about TTML, the architecture context from memory applies.
- **Prior learnings**: read columnist's `learnings.md` if present (sibling to columnist's SKILL.md). Writer-thinker shares columnist's learning loop deliberately — no duplicate logs.
- **User canon**: scan columnist's `references/user-canon/` for pieces that overlap. The argumentative-essay register is rare in that canon (Burrough's memoir is the closest), so most writer-thinker pieces will lean on the voice-fingerprints rather than the canon. But check.

Rule from sequential-thinking: every item in the inventory must be used or explicitly dismissed by Phase 5. If you finish thinking and one is unreferenced, you skipped it.

### Phase 2 — Identify what's actually being argued

Two questions:

- **The literal question**: what did the user ask for?
- **The underlying argument**: what position would the piece have to take to be *interesting*? A post-mortem that concludes "we should be more careful next time" is not a piece — it's a non-event. A post-mortem that concludes "our notification system has a category model that drifts under any schema change, and the fix isn't more discipline but a different invariant" is a piece.

For decision memos and RFCs: the underlying question is almost always "what should we do, and why is the obvious answer wrong (or right for non-obvious reasons)?" If the recommendation is the obvious one, the piece's value is in the *reasoning* — make that load-bearing.

### Phase 3 — Generate ≥3 candidate theses

This is the anti-pattern-matching step, hardened from sequential-thinking's Phase 3. **For an argumentative piece, generate at least three distinct positions you could defensibly take**, including the contrarian one and the "actually the status quo is right" one. Number them.

- Thesis 1: [first instinct — usually the obvious take]
- Thesis 2: [a different framing, often a sharper or narrower claim]
- Thesis 3: [the contrarian — "what if the conventional answer is wrong"]
- Thesis 4+: as needed

Then test each against the columnist disagreement rule: *would a reasonable smart person disagree with this?* If no, it's a topic, not a thesis. Discard.

The thesis you carry into Phase 4 should be (a) defensible, (b) non-obvious enough to be interesting, (c) actually what the evidence supports — not the most contrarian for its own sake.

### Phase 4 — Stress-test the leading thesis

This is the writer-thinker upgrade. Sequential-thinking's Phase 4 — assumption check, parameter check, failure modes, adversarial reading — applied to the *thesis* before any prose gets written.

- **Assumption check**: what am I assuming that the evidence/context doesn't actually establish? List each assumption. If any is wrong, does the thesis collapse?
- **Parameter check**: walk back through Phase 1's inventory. Does the thesis use or address each piece of context? Anything ignored that a reader would flag?
- **Adversarial reading**: imagine the skeptic in the audience. What's their best counter-argument? Write it out in one sentence. Now ask: does the thesis already address it, or does the piece need a steelman beat to defuse it?
- **Failure modes**: where does this argument break? Edge cases, scope conditions, what's true only "sometimes"?

If the thesis doesn't survive: **revise**. Announce "Revision:" in the trace and either sharpen the thesis (most common) or fall back to a different Phase 3 candidate. Do not paper over a weak thesis with good prose — that's the failure mode this skill exists to prevent.

### Phase 5 — Pick voice and architecture

Now you know what you think. Now pick how to say it. This is columnist's territory — defer to its voice library.

For writer-thinker pieces, voice choices skew toward the analytical end of columnist's library:

- **Ben Thompson** for tech/business memos and strategic arguments — named frames, "the question is" pivots
- **Matt Levine** for system-explanation pieces where the absurdity-and-clarity tension does the work
- **Paul Graham** for first-principles arguments and "the conventional wisdom is wrong because…" pieces
- **Ezra Klein** for policy-adjacent or multi-stakeholder pieces where the steelman beat matters
- **Morgan Housel** for retrospectives and "what we learned" pieces that accumulate small truths
- Blends often work better than pure voices — see columnist's `references/voice-fingerprints.md` for blend pairings

For internal memos and RFCs, voice is *quieter* than for public essays — but it's still voice. Even a decision memo can be unmistakably yours rather than generic-corporate. The goal isn't to perform a columnist's voice; it's to write with the specificity and rhythm those columnists model.

**Architecture for argumentative prose** (default shape, modify as needed):

1. **Lede** — concrete and specific. The event, the decision, the moment that made this piece necessary. Not "in today's fast-paced world."
2. **Stakes** — why this matters, in one beat. Why the reader should care.
3. **Steelman** — the strongest version of the position you're *not* taking. Skip this only if the piece is purely explanatory.
4. **The argument** — your thesis, with the reasoning that survived Phase 4. Beats should accumulate, not just list.
5. **Counterpoint absorption** — address the strongest objection. (Phase 4 already identified it.)
6. **Implication / kicker** — what this means for the reader, or for the decision being made. Short. Memorable. Not "in conclusion."

For RFCs and decision memos specifically: the recommendation belongs *near the top* (TL;DR), not the bottom. Skeptical readers scan first. Lead with the answer; let the argument carry the people who keep reading.

### Phase 6 — Draft

Write the piece. Voice on. Throat-clearing off. No "in today's fast-paced world," no "navigate," no "delve," no "tapestry," no em-dashes deployed like commas. Specifics over abstractions. Real numbers, real names, real systems.

If the piece is about a TTML decision, name the TTML systems by their real names (pg-boss, Drizzle, tRPC, Supabase Auth). If it's about an incident, name the incident. The absurd-specific number move from columnist's Burrough notes applies here too: $651k beats "about $650k" beats "hundreds of thousands."

### Phase 7 — Cut

First draft is always too long. For writer-thinker pieces specifically, the bloat sites are:

- **Throat-clearing in the lede** — if the first paragraph could be deleted and the piece would start stronger, delete it
- **Over-steelmanning** — one beat for the counter-position, not three
- **Hedging adjectives and adverbs** — "somewhat," "fairly," "arguably," "perhaps" — these are usually fear, not nuance
- **Recap paragraphs** — readers know what they just read
- **Multi-clause sentences that say one thing twice** — pick the better clause, kill the other

Target cut: 20–40% of the first draft, more if it was a brain-dump.

### Phase 8 — Tighten at the sentence level

Columnist's Phase 8. Read every sentence aloud (mentally). Each one earns its place by doing one of: advancing the argument, landing a specific image, setting up the next beat, or scoring on rhythm. If a sentence does none of those, cut it.

Specific moves:

- Reverse nominalizations: "the implementation of monitoring" → "monitoring"
- Replace abstract verbs with concrete ones: "leverage" → "use," "utilize" → "use," "facilitate" → most often just delete
- Vary sentence length deliberately. Long sentences for reasoning chains, short sentences for landing punches. Never three medium sentences in a row.
- Punctuation as voice: a colon implies an explanation is coming; a dash implies a turn; a parenthetical implies an aside that's actually doing real work (the Levine move). Don't use them randomly.

### Phase 9 — Capture learnings

Same as columnist. The whole point of the loop is that the user's voice fingerprint sharpens over time. After the piece, write 3–5 observations:

- What voice move worked and why
- What got cut in Phase 7 that you almost shipped
- Any banned phrase that snuck into the first draft
- Any pattern about the user's preferences confirmed or contradicted
- Open questions for next time

If any observation is durable, propose a memory edit for user approval (use the memory_user_edits tool). If granular, append to columnist's `learnings.md` — writer-thinker and columnist share the log because they share the voice fingerprint.

## What the user sees

```
[Trace — 5–8 short lines:
- Thesis in one sentence (post-Phase 4, survived stress-testing)
- The alternative theses considered and why they lost
- The Phase 4 assumption or objection that mattered most
- Voice (or blend) and why
- Architecture sketch (lede → beats → kicker)
- Any revision triggered by Phase 4
- Prior learnings applied
A "Revision:" line if Phase 4 forced one.]

---

[The piece — polished prose. No headers unless venue requires them.
RFCs and decision memos may use headers; essays generally don't.
No throat-clearing. No em-dash overload. No "in conclusion."]

---

## Learnings from this piece
[3–5 numbered observations. Then any proposed memory edits or learnings.md appends.]
```

## Anti-patterns to avoid

- **Skipping Phase 4 because the thesis felt obviously right.** This is the failure mode this skill exists for. If you finish Phase 3 with one option that "obviously wins," Phase 4 is *especially* important — that's the moment you're most likely to ship a confident wrong answer in pretty prose.
- **Letting voice override reasoning.** Pretty prose with a weak thesis is worse than functional prose with a strong one. The reader can tell when the argument doesn't survive scrutiny, even if they can't articulate why.
- **Treating the steelman as performance.** If the counter-position only gets one weak sentence, you didn't steelman it. The reader notices.
- **Burying the recommendation in a memo or RFC.** TL;DR at the top. Skeptical readers scan.
- **Generic-corporate voice in internal pieces.** Internal doesn't mean voiceless. RFC prose can still be specific, alive, and unmistakable. Default-template RFCs are read once and forgotten.
- **Skipping Phase 9.** The learning loop is what makes writer-thinker compound over time instead of starting from zero on every piece.

## A worked example shape

Request: *"Write me a ~600-word decision memo on whether TTML should rip n8n out of the stack or invest in making it primary for AI pipeline orchestration. It's currently dormant."*

**Trace:**
- Inventoried: TTML, n8n dormant, 4-stage AI pipeline currently in TypeScript with OpenAI + Anthropic, pg-boss job queue handling orchestration today, Railway deployment, audience is Moiz (self) plus future contributors, venue is internal RFC.
- Candidate theses: (1) Rip n8n — the TS pipeline works, n8n adds operational surface area for no gain. (2) Invest in n8n — visual orchestration scales better when stages multiply. (3) The real question isn't n8n yes/no, it's whether AI pipeline orchestration should be code or config — and the right answer depends on how often the pipeline shape itself will change.
- Phase 4 stress-test: thesis (1) felt obviously right. But the assumption underneath was "stages won't multiply" — and the RAG-learning + anti-hallucination pipeline is already 4 stages and could become 6. If stages multiply, the code-orchestrated version becomes the bottleneck. Revision: thesis (3) is the actual argument — frame the decision on rate-of-change of the pipeline shape, not on n8n itself.
- Voice: Ben Thompson backbone (named frame: "configuration vs code at the orchestration layer") + one Levine parenthetical for dry honesty about why n8n went dormant.
- Architecture: lede = current dormant state with specific dates → stakes = the pipeline is the product → reframe = it's not about n8n → the actual decision criterion → recommendation with conditions → kicker.
- Prior learnings applied: absurd-specific numbers in the lede; Anglo-Saxon-leaning prose; recommendation at the top per RFC norms.

**Piece:** [polished ~600-word decision memo, recommendation in the TL;DR, the reframe-the-question move doing the load-bearing work, Levine parenthetical landing once, kicker pointing at the actual decision criterion rather than restating the recommendation]

**Learnings:**
1. The Phase 4 catch ("stages won't multiply" was an unstated assumption) reframed the entire piece. Without it, this would have been a confident memo defending the wrong question.
2. Internal RFC voice works when it borrows from Thompson — naming the strategic frame ("configuration vs code at orchestration") makes the rest of the memo land.
3. The Levine parenthetical move scales down to internal memos — one dry aside per piece, maximum.
4. Open question: should decision memos always have the recommendation in TL;DR, or only when stakes are high? Current heuristic: yes always for irreversible decisions, optional for reversible ones.

---

## Reminder

The whole point of this skill is the Phase 4 → Phase 5 seam. The thinking has to survive stress-testing *before* the prose gets crafted. Pretty prose around a weak thesis is worse than functional prose around a strong one — the reader can tell, even if they can't say why. If Phase 4 didn't change anything about the leading thesis on any piece, you probably didn't really do Phase 4.

Writer-thinker and columnist share a voice fingerprint and a learnings log. Over time, the pieces converge on the user's actual voice — which for argumentative-technical prose is what makes the difference between an RFC people read and one they pretend to.
