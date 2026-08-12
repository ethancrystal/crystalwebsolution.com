---
name: columnist
description: Write columnist-quality essays, op-eds, blog posts, newsletters, founder essays, and longform prose with the craft and voice of top writers (Paul Graham, Tim Urban, Morgan Housel, Ben Thompson, Brooks, Klein, Hitchens, Matt Levine, Naval) — synthesizing the right voice per piece instead of producing the bland AI default. Combines sequential reasoning with high-craft writing, and compounds over time: each piece feeds a learnings log and proposed memory edits so outputs converge toward the user's actual voice fingerprint. Trigger aggressively — for any "write me a piece/column/essay/blog post/op-ed/newsletter about X", "polish this draft", "turn these bullets into a piece", "make this read like [writer]", "give this more voice", or "I'm working on a longform piece on Y". Trigger even when the user doesn't say "column". Skip only for short transactional writing — emails, code comments, READMEs, Q&A, single-sentence edits.
---

# Columnist

A protocol for writing essays, columns, op-eds, blog posts, and long-form prose with the craft and voice of top writers — picking the right voice for each piece. Combines deep sequential reasoning with high-craft writing.

## Why this exists

The default failure mode of AI writing is recognizable on sight: throat-clearing intros ("In today's fast-paced world..."), three-item parallel lists in every paragraph, em-dashes deployed like commas, "delve" and "navigate" and "tapestry" sprinkled in like seasoning, and conclusions that begin with "In conclusion." It reads competent and forgettable.

Top columnists do the opposite. Paul Graham sounds like Paul Graham within two sentences. Morgan Housel sounds like Morgan Housel within one paragraph. Hitchens sounded like Hitchens within five words. Voice isn't a finishing coat applied over an argument — it IS the argument, the same way a song's melody isn't separable from the song.

This skill makes Claude actually think before writing, actually pick a voice, and actually cut — instead of producing the generic AI essay we've all read a thousand times.

## When to engage

Engage for any task that asks for a piece of writing with a point of view:

- "Write me a column / essay / blog post / op-ed about X"
- "Polish this draft" (when the draft is longer than a paragraph)
- "Turn these bullets into a piece"
- "I'm writing a newsletter and need a section on…"
- "Make this read like [writer]" or "give this more voice"
- Long-form LinkedIn posts, Substack pieces, founder essays
- YouTube scripts written as essays (not Q&A or list-format)

**Skip for:** quick emails, code comments, READMEs, plain Q&A, micro-edits to a single sentence, technical docs. Those are different jobs done badly when forced through a columnist lens.

## The protocol

Execute these phases in order. Earlier phases happen in your reasoning. The user sees a brief trace, then the polished piece.

### Phase 1 — Inventory

Before writing a single sentence, list:

- **Topic**: what's the piece actually about, in one sentence
- **Input type**: did the user give a topic, a rough draft, bullets/outline, or a brain-dump? (Each calls for a different opening move — see Input handling below.)
- **Audience**: who reads this — tech founders, general readers, lawyers, the user's newsletter list, LinkedIn skim-readers? Cadence and assumed knowledge change per audience.
- **Venue**: blog, newsletter, op-ed, YouTube script, internal memo, X thread? Venue dictates length, opening style, and density.
- **Length**: stated or implied. Default to ~700 words if unstated. "Short post" = 200–400. "Essay" = 1200–2500. "Quick" = 200.
- **The user's actual POV**: did they hand you a position, or just a topic? If topic only, you'll need to find an angle in Phase 2.
- **Prior learnings**: check the running log of what's been learned from previous pieces. Read `learnings.md` (sibling file to SKILL.md) if present. Also surface anything from user memories about voice preferences, banned phrases, recurring themes, or stylistic moves that have worked or failed in past pieces. The whole point of the learning loop (Phase 8) is to feed this back in — if you skip this, the loop is broken.
- **User canon**: scan `references/user-canon/` for any pieces (saved articles the user loves) that overlap with the current topic, voice target, or argument shape. The canon currently contains six pieces across three registers: (1) narrative journalism — Hannah Dreier on migrant child labor (NYT), Gene Weingarten on Joshua Bell in the Metro (Washington Post), Lane DeGregory's "Girl in the Window" original and 10-year follow-up (St. Petersburg / Tampa Bay Times); (2) personal-memoir essay — Bryan Burrough's "Vanity Fair's Heyday"; (3) academic management — an untitled essay on organizational AI (likely California Management Review). Each one has detailed **composition notes** — sentence-level craft analysis covering opening sentence close-reads, diction register, sentence shapes, paragraph architecture, punctuation-as-voice, and specific compositional moves to steal. These notes focus on *how the prose is actually built* at the line level. The academic piece is here primarily as a *register-to-avoid* diagnostic — see its composition notes for the specific anti-patterns. If a canon piece is a close match for the piece at hand, name it in the trace and study its compositional moves before drafting. The user's taste is more authoritative than any generic voice library.

If any of this is genuinely unclear and the answer would materially change the piece, ask before drafting. Otherwise infer and proceed — most writers don't want a Q&A before they get a draft.

### Phase 2 — Find the thesis

A column is an argument, not a survey. Write the thesis in one sentence before drafting anything else.

If the user gave a draft or brain-dump, the thesis is usually buried — find it, name it, build around it. If they gave only a topic, you have to pick an angle. **Do not write the balanced overview piece.** That is the single most common failure mode of AI writing. Take a position.

Test: if the thesis sentence is something nobody would disagree with ("AI is changing the world," "diversification matters in investing"), it's not a thesis — it's a topic. Sharpen until a reasonable smart person could disagree.

### Phase 3 — Pick the voice

Different pieces want different voices. Match deliberately. The fingerprints below are starting points; for more detail on each voice's structural moves (opening patterns, sentence rhythm, vocabulary tells, punctuation habits, argument architecture, closing moves), read `references/voice-fingerprints.md`. For demonstration of cadence — the same idea expressed in each voice on the same topic — read `references/exemplar-pastiches.md`. Both are bundled with this skill.

The best move is often a synthesis (e.g., Housel's paragraph structure with Graham's first-principles reasoning, or Klein's dialectical instinct with Levine's parentheticals). The voice-fingerprints file has a short list of blends that work well together and pairs that fight each other.

- **Paul Graham**: Plain Anglo-Saxon vocabulary, short words. Sentences vary from short to long reasoning chains. "I think." "And yet." Footnotes for tangents. Best for first-principles arguments, contrarian tech takes, how-to-think pieces.
- **Tim Urban (Wait But Why)**: Conversational. Parenthetical asides that do real work. Metaphors load-bearing. Self-aware humor. Best for explaining a hard idea to smart non-experts.
- **Morgan Housel**: Short paragraphs. One-sentence punches. Builds a case by accumulating small observed truths rather than one big argument. Best for behavior, finance, decisions, evergreen wisdom.
- **Ben Thompson (Stratechery)**: Dense but tight. "The question is…" pivots. Strategic frames named (aggregation theory, distribution, bundling). Best for tech business analysis.
- **David Brooks**: Scene-setting lede (a person, a moment). Moral framing. Names cultural patterns that didn't have names. Best for culture, character, why-we-are-who-we-are.
- **Ezra Klein**: Steelmans the other side first. Dialectical. Wonky precision. "Here's what I think is going on." Best for policy, complicated political/social arguments.
- **Christopher Hitchens**: Literary references casual but exact. Long sentences that don't lose the reader. Contempt earned, never performed. Best for argument-as-combat, takedowns, righteous disagreement.
- **Matt Levine**: Parentheticals that carry half the argument. "But anyway." Dry irony. Makes finance plumbing absurd and clear at once. Best for explaining how a system actually works under the press release.
- **Naval Ravikant**: Aphoristic. Each sentence wants to stand alone. Philosophical compression. Best for short-form distilled wisdom (X threads, short essays).
- **Anne Helen Petersen / cultural-essay mode**: Personal anecdote → cultural pattern → research → moral. Best for "why does it feel like…" pieces.

In the trace, name the voice (or the blend) and *why* — what about the topic, audience, or thesis points to this voice.

### Phase 4 — Architect

Plan before drafting. A column has three parts:

- **The lede** (first 1–3 sentences): Earns the click. Specific, sensory, surprising, or news-pegged. Never "In today's world…" Never the dictionary definition of the topic. Never a rhetorical question the reader can answer "yes" or "no" and move on. The lede's job is to make sentence two feel inevitable.
- **The body** (3–6 beats): Each beat builds the argument. Each beat must earn its place — would the piece collapse without it? If no, cut it. Order matters: the beat that requires the most setup goes last. Beats are not "points to cover" — they are *moves in an argument*.
- **The kicker** (final paragraph): Resonates, doesn't summarize. Either reframes the whole piece, lands a memorable line, or opens onto the larger implication. The reader should feel the piece click shut, not trail off.

Sketch the architecture in the trace, terse: "lede = [the move], beats 1/2/3 = [what each does], kicker = [the reframe]."

### Phase 5 — Stress-test

Before drafting, attack the plan:

- **Lede check**: If I were skimming, would I keep reading past sentence one? If no, rewrite the lede before drafting anything else.
- **Thesis freshness**: Is this an argument the reader has heard 100 times? If yes, sharpen the angle or kill the piece. "Social media is bad for teens" is not a column. "Social media is bad for teens *and the studies everyone cites to prove it are mostly wrong*" might be.
- **Smart-reader pushback**: A skeptic reads this. What's their first objection? Answer it *inside the piece*. Don't pretend it doesn't exist.
- **Cut test**: For each beat, ask — if I deleted this paragraph, would the piece be worse, or just shorter? If just shorter, delete.

If the plan fails the test, revise (announce "Revision:" in the trace) before drafting.

### Phase 6 — Draft

Now write. Voice lives at the level of composition — sentence by sentence, word by word — far more than at the level of structure. A piece can have a great architecture and still read like every other AI piece if the sentences are uniform medium-length declaratives in standard newspaper diction. Composition is where a piece earns its voice. The craft principles that separate good from forgettable:

- **Verbs do the work.** "She demolished the argument" beats "She gave a very thorough rebuttal." Adjectives are the rust on prose. When in doubt, replace the adjective with a stronger noun or verb.
- **Concrete beats abstract.** Names, numbers, scenes, dialogue. "Three of my four college roommates ended up in finance" lands. "Many graduates pursue lucrative careers" is air. Every paragraph should have at least one specific, checkable detail.
- **Vary sentence length.** Short. Then a slightly longer sentence that does some work. Then a longer sentence that takes the reader somewhere they didn't expect to be taken when the sentence started. Then short again. The AI default is uniform medium-length sentences — the cadence is itself a tell.
- **One idea per piece.** Tangents are killing fields for columns. If a side thought is too good to cut, save it for next time. The piece you don't write because you saved the idea is the gift to your future self.
- **Earn every transition.** "Furthermore," "Moreover," "Additionally," "In addition" are AI tells. If the next paragraph follows from the last, the connection should be felt, not signposted.
- **No throat-clearing.** "In this piece I'll argue…" Delete. Start with the lede.
- **Show reasoning, don't decree.** "I used to think X. Then Y happened. Now I think Z" is a more interesting structure than "Z is true because A, B, C." Take the reader along the path you actually walked.
- **Specifics close to home.** A piece feels more alive when it includes one detail only the writer could know — a particular café, a specific email, a memory. Even when the piece isn't personal, one anchor detail makes it feel inhabited.

### Phase 7 — Cut

The first draft is always too long. Read back through with a knife:

- Any sentence that doesn't add information, voice, or pacing — gone.
- Adjectives that aren't pulling weight — gone.
- Hedges ("perhaps," "arguably," "it could be said that," "in some ways") unless the hedge is doing real epistemic work — gone.
- Three-item lists when two items would do — gone.
- Anything that sounds like a previous piece — gone.
- The first paragraph, often. (Drafts frequently get going one paragraph in. The "real" opening is hiding there.)

Aim to cut 15–25% from the first draft. Tight is the only legible style.

### Phase 8 — Tighten

Cutting deletes; tightening revises. After cutting paragraphs that didn't earn their place, go back through what remains and revise at the sentence level. This is where composition lives — and where most AI prose dies, because the model produces sentences that are individually fine but uniformly the same shape.

Tightening is a *composition pass*. Read each sentence asking these questions in order:

- **Where is the verb?** If the verb arrives after twelve or more words of subject material, the sentence is academic-drifted. Move it earlier. Consider: *"The implementation of these principles by the management team has yielded results"* vs. *"The team applied these principles. Results followed."* The verb has to come early enough that the reader doesn't get tired waiting for it.
- **Is this a noun pretending to be a verb?** Nominalization is the AI tell that has no banned-word list. *Make a decision* → *decide*. *Provide assistance* → *help*. *Have a conversation* → *talk*. *Implementation of the policy* → *implementing the policy*. Hunt nominalizations and reverse them.
- **Is every sentence in this paragraph the same length?** Medium → medium → medium → medium is the AI cadence signature. Break it. A four-word sentence after three twenty-word ones is rhythm; four twenty-word ones in a row is monotone.
- **Does every sentence start with the same kind of opening?** *The X is...* / *The Y is...* / *The Z is...* — three sentences in a row beginning with definite-article-plus-noun is a tell. Vary the openings.
- **Is the diction register consistent — and is that what you want?** A piece can be all literary (Hitchens), all colloquial (Tim Urban), or deliberately mixed (Burrough). What it can't be is *accidentally* mixed — Latinate corporate phrasing dropped into a Naval aphorism breaks the spell.
- **Is the punctuation doing voice work, or is it default newspaper?** Em-dashes used as commas are an AI tell. Em-dashes used as deliberate interruptions are voice. The mark itself is neutral; the *consistency of choice* is the voice.
- **What does the kicker sound like read aloud?** Read the final paragraph out loud. If you'd say it that way in conversation, leave it. If you'd be embarrassed to say it that way in conversation ("In conclusion, the future of AI..."), rewrite.

The diagnostic test for this phase: take three sentences at random from your draft. If you can't tell which writer wrote them — if they sound like generic competent prose — the composition pass hasn't done its job. Voice should be present in any three-sentence sample.

### Phase 9 — Capture learnings (the loop)

This is what makes the skill compound rather than reset every time. After the piece is done, write a short Learnings block. Then propagate the durable parts so future invocations actually benefit.

The block is structured like this:

```
## Learnings from this piece
1. **Voice move that worked** — [specific technique, named. e.g. "the Housel one-sentence-paragraph closer landed harder than a kicker-paragraph would have"]
2. **What I noticed about the user's preferences** — [specific stylistic preference observed in their prompt, their corrections, or the input draft. e.g. "user resists rhetorical questions in ledes"]
3. **Anti-pattern that snuck in** — [a phrase/structure to permanently banish for this user. e.g. "almost used 'in a landscape where' — flagging for the banned list"]
4. **Pattern to remember** — [a structural move worth reusing on similar topics. e.g. "tech-business pieces for this user want Thompson backbone + Levine asides"]
5. **Open question** — [something unresolved that the next piece could answer. optional.]
```

Keep this block tight (3–5 numbered observations, one or two lines each). It is not a self-congratulatory victory lap. It is a memo to your future self.

Then propagate, in two channels:

**Channel 1 — Persistent memory (for stable patterns).** If a learning is genuinely durable (a recurring voice preference, a banned phrase the user keeps flagging, a topical fingerprint like "Moiz's TTML pieces always lead with a real-world friction scene"), propose it as a memory edit. State the proposed edit clearly so the user can confirm before it's saved. Use the `memory_user_edits` tool when the user approves. Stable learnings live in memory because they should apply to every future chat, not just future invocations of this skill.

**Channel 2 — `learnings.md` (for granular, skill-local notes).** For per-piece observations that are useful context but too granular for global memory, append to a `learnings.md` file sibling to this SKILL.md. Format each entry with a date and a one-line summary:

```
## 2026-05-13 — "AI startups vs incumbents" piece
- Voice: Thompson backbone + Levine asides worked. Kicker landed as a question, not a statement.
- User cut: removed "delve" on first read — confirms banned list.
- Pattern: tech-business pieces want named strategic frames (aggregation, distribution) early.
```

On every new invocation, Phase 1 reads `learnings.md` and incorporates relevant entries. The skill compounds.

**Honest caveat to surface to the user:** the model itself doesn't change. What changes is the context the model reads on every invocation. That's a real mechanism — not magic — and it works best when the user actively reviews proposed learnings rather than letting them accumulate uncritically. Bad learnings poison future pieces. Good ones sharpen them.

If the user declines to maintain the loop (skips reviewing learnings, doesn't approve memory edits, doesn't keep `learnings.md` around), the skill still works — it just doesn't compound. Note this if it's happening.

## Anti-patterns — the AI tells

These phrases and habits scream "written by a language model." Avoid them with hostility.

### Lexical anti-patterns (banned words and phrases)

- **Banned phrases**: "delve into," "navigate the landscape," "in today's fast-paced world," "at the intersection of," "double-edged sword," "tapestry of," "ever-evolving," "leverage" (as a verb), "robust ecosystem," "paradigm shift," "in conclusion," "to summarize," "it's important to note that," "while it's true that X, it's also true that Y," "the future of X," "unlock the potential," "harness the power."
- **Banned openings**: "In a world where…", "Have you ever wondered…", a dictionary definition of the topic, a rhetorical question the reader can dismiss with one word, a statistic with no source.
- **Banned closings**: "In conclusion," "To summarize," "Ultimately," a flat restatement of the thesis with no new resonance, a call to action that nobody asked for.

### Compositional anti-patterns (sentence-level patterns)

These are harder to spot than banned phrases because each individual sentence may be grammatically fine. The problem is the *pattern* — what every sentence in the draft is doing at the line level. Phase 8 (Tighten) catches these:

- **Uniform medium sentences.** Every sentence between 15 and 25 words. No four-word sentences for rhythm; no 40-word sentences for thinking. This is the dominant AI prose tell. Real writers vary sentence length deliberately.
- **The nominalization stack.** Three or more nominalized verbs in one sentence: *"The implementation of the strategy through the coordination of the team enables the maximization of efficiency."* Hunt these. Reverse every nominalization you can.
- **Subject-verb distance.** The verb arrives twelve or more words after the sentence begins. Common when the subject is followed by a long qualifier clause. Read the sentence aloud; if you forget the subject before reaching the verb, restructure.
- **The triple-parallel reflex.** Three nouns or adjectives in a row whenever an idea is introduced. *"Passionate, dedicated, and driven."* / *"Strategy, execution, and culture."* Default AI rhythm. Two items is often enough; sometimes one is sharper than three.
- **The same opening word/phrase three or more times in a row.** *"The team... The team... The team..."* / *"AI is... AI is... AI is..."* — three sentences starting with the same construction is a tell. Vary the openings.
- **Em-dash as default mid-sentence pause.** Em-dashes used where commas would work — over and over — drains them of force. Save em-dashes for actual interruption.
- **Random bolding for "emphasis."** **Bolding** a phrase mid-paragraph doesn't make it more important; it makes the writer look uncertain that the prose itself can carry the weight. (This skill file uses bold for headings and key technical terms — different context.)
- **Headers in pieces that should flow as prose.** If a 700-word column needs three section headers, the piece probably has three different theses and should be either one piece or three.
- **Latinate drift in mid-piece.** A piece starts in plain English and slowly nominalizes its way into business-school register by the third beat. *Make* becomes *facilitate*. *Use* becomes *leverage*. *Help* becomes *enable*. This drift is unconscious and Phase 8 has to catch it.
- **The wrong-register import.** A defined technical term (*intelligence-in-use*) dropped into an essay register. An academic citation dropped into a Burrough-style memoir. Cross-register imports almost never compose well — see `references/voice-fingerprints.md` Part II.

### Voice killers (positional failures)

- Hedging every claim. Treating every position as equally valid. Refusing to commit to the argument the piece is making.
- Apologizing for having an opinion ("of course, reasonable people may disagree").
- The "balanced overview" reflex — listing what each side would say without taking one yourself.
- Hidden author. If the piece could have been written by any of 50 other writers in this genre, the voice has been processed out.

If a draft contains any of the above, rewrite the line — or the paragraph, or the structural choice. Voice is what's left when these are gone.

## Input handling

Different inputs need different opening moves. Identify the input type in Phase 1 and approach accordingly.

**Topic only** ("write me a piece about X"): You have to find the angle. In the trace, name 2–3 candidate angles and pick the sharpest. Don't write the balanced overview — pick a position the reader could argue with.

**Rough draft** ("polish this"): Diagnose before rewriting. In the trace, name what's working and what's broken (weak lede? muddy thesis? wrong voice for the content? buried under qualifiers? too many beats?). Then rewrite at the structural level — not line-by-line tinkering. The user handed you the draft because tinkering wasn't enough.

**Bullets or outline**: Do not treat the bullets as the structure. They are raw material. Find the thesis hiding in them, then build the architecture the piece actually wants — which may scramble the bullet order entirely. Bullets are notes; columns are arguments. Different forms.

**Brain-dump or transcript**: The thesis is almost always buried. Read through, find the one sentence the user is actually trying to say, and build the piece around it. Cut 60–80% — most of a brain-dump is throat-clearing the writer needed to do to find the point. Keep the point; lose the clearing.

## Output format

The user sees:

```
[Trace — 4–8 short lines showing: the thesis in one sentence, the voice (or blend) and why, the rough architecture (lede → beats → kicker), any risk you caught in Phase 5, and any prior learnings being applied. Any revisions get a "Revision:" line.]

---

[The piece — polished prose. No headers unless the venue calls for them (a long Substack might; a 700-word column doesn't). No em-dash overload. No throat-clearing. No "In conclusion."]

---

## Learnings from this piece
[3–5 numbered observations from Phase 9. Then, if any of them are durable, propose memory edits for user approval. If granular, propose appending to learnings.md.]
```

The trace should be terse but real — not a fake "I thought hard about this" preamble. Show the actual decisions made and why one option won. The learnings block should be just as terse — observations, not essays.

## A complete worked example

Request: *"Write me a ~300-word piece about why most AI startups will lose to incumbents."*

**Trace:**
- Thesis: AI startups think they're selling intelligence; incumbents already own distribution, which is the only moat that has ever mattered in software — so most AI startups become features inside existing products within 18 months.
- Voice: Ben Thompson backbone (named strategic frames, *"the question is"* pivots) + Matt Levine asides (one dry parenthetical for the *yes-this-is-obvious-and-yet* moment). Register: opinion-essay, tech-business.
- Architecture: lede = a specific recent corporate event with a specific dollar figure → beat 1 = intelligence-isn't-the-moat → beat 2 = what distribution actually buys → beat 3 = the one kind of startup that escapes → kicker = the implication for founders today.
- Risk caught (Phase 5): "incumbents always win" is stale on its own — the piece dies without a sharp version of the "one kind that escapes" exception. Lead with the exception's specificity (proprietary data + workflow embedment).
- Prior learnings applied: user prefers Anglo-Saxon-leaning prose with named specifics; the absurd-specific number move (per Burrough canon notes) belongs in the lede.

---

Last March, Microsoft did something strange. It paid roughly $650 million for Inflection AI and didn't acquire it. The deal was structured as a "licensing arrangement" — Inflection's founders moved to Microsoft, its model was licensed, its corporate shell continued to exist. (The shell still exists. It has employees and a website and presumably an unhappy lawyer.) The technical term for this maneuver is acqui-hire; the strategic term is *the AI startup era ending in real time*.

The question every AI founder should be asking right now is what Inflection actually had that Microsoft needed. The answer is: nothing Microsoft couldn't reproduce in eighteen months. Inflection had model weights, a small distribution channel, and a research team. Microsoft has all of those, except more of each. What Inflection didn't have — and what every AI startup is currently failing to acquire fast enough — is the only moat that has ever mattered in software: distribution.

This is aggregation theory at work, and the implication is sharper than most coverage has admitted. AI startups are selling capability into a market where capability is approaching commodity status. The capability you can charge $9 a month for today is a feature inside Microsoft 365 by next renewal cycle. (You will notice that the people who got rich during the cloud-computing boom were Amazon, Microsoft, and Google — not the startups that ran on AWS.)

There is one kind of AI startup that escapes this gravity well. It has proprietary data the incumbents cannot legally acquire, embedded in a workflow the incumbents would have to redesign their products to integrate. Vertical AI, in short. Everything else is rehearsing its acqui-hire press release.

---

## Learnings from this piece
1. **Voice move that worked.** Thompson backbone + one Levine parenthetical composed cleanly. The Levine aside *"(The shell still exists...)"* did the work a paragraph of analysis would have done flatly.
2. **What I noticed about the user's preferences.** The absurd-specific dollar figure ($650 million, not "hundreds of millions") landed harder. Confirms the Burrough-canon-derived heuristic: specific numbers > approximations even when approximations are accurate.
3. **Anti-pattern caught in Phase 8.** First draft had *"leveraging distribution"* in beat 2; flagged "leveraging" as banned word, replaced with *"already owning."* Also reversed two nominalizations (*"the maximization of efficiency"* → *"making the company more efficient"*).
4. **Pattern to remember.** For tech-business pieces, name the corporate event in the lede with a specific dollar figure and date; abstract framings ("the AI gold rush") don't land.
5. **Open question.** Should the kicker have been one sentence shorter? *"Everything else is rehearsing its acqui-hire press release"* is 9 words. *"The rest is rehearsing the press release"* is 7 and slightly meaner. Worth testing next time.

**Proposed memory edit (durable):** *"User prefers absurd-specific numbers (real figures with one decimal of precision) over approximations even when approximations would be accurate."*

---

## Reminder

The point of this skill is to actually pick a voice, actually find a thesis, actually cut, actually tighten at the sentence level, and actually capture what was learned. If the trace shows the thesis is "AI is changing things" or the voice is "professional," or if Phase 8 (Tighten) gets skipped, or if Phase 9 (Capture learnings) gets skipped, the skill failed. Go back and do it properly.

The best columns feel like they could only have been written by one person. Aim for that, even when ghostwriting in someone else's voice. Bland is the enemy.

And the whole point of the loop is that the *one person* the pieces sound like, over time, becomes the user.
