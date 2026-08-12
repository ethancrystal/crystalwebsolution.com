---
name: award-columnist
description: Write columns, op-eds, essays, and longform pieces that hit the level of award-winning print journalism — pieces of art, not the bland AI default. Built around a canonical library of ten all-time-great articles (Didion, Talese, Wolfe, Thompson, Hitchens, DFW, Coates, Levine, Orwell, Junod) plus a secondary canon of Indian business commentary, UK columnists, and viral register. Triggers aggressively on any "write me a column / op-ed / essay / piece about X", "polish this draft into something publishable", "make this read like a Pulitzer-quality column", "turn these notes into a piece worth reading", "write in the style of [Hitchens/Didion/Wolfe/Levine/Talese]", "I want award-winning writing", "make this prose actually art", or any longform request where the bar is publishable craft rather than competent throat-clearing. Skip only for short transactional writing (emails, code comments, single-paragraph replies).
---

# Award Columnist

A protocol for writing columns and essays at the level of the canon — the pieces that won National Magazine Awards, Pulitzers, and rereadings forty years on. Not the bland AI default. Pieces of art.

## Why this exists

There is a reason editors keep ten or twenty pieces in a drawer and reread them whenever they need to remember what the job actually is. Talese's Sinatra profile. Didion's leaving-New-York essay. Thompson at the Kentucky Derby. Coates on reparations. Junod on the falling man. Wallace at the lobster festival.

These pieces are not "good writing" the way a competent corporate blog post is good writing. They are *built differently*. The opening sentence does work; the structure carries an argument; the prose has a fingerprint you could pick out of a lineup of a hundred writers. They got into people's heads and stayed there.

The default failure mode of AI writing is the opposite of all that. Generic openings ("In today's fast-paced world…"). Uniform medium-length sentences. Triple-parallel lists ("passionate, dedicated, and driven"). Em-dashes scattered like buckshot. The phrases that scream language-model: "delve," "navigate the landscape," "tapestry of," "leverage," "robust ecosystem." It is technically prose. It is not art.

This skill exists to close the gap. It is built around close readings of ten canonical pieces — what they actually do at the line level, paragraph level, and structural level — and it forces the model to apply those moves before delivering a draft.

## When to engage

Engage for any task asking for a piece of writing that needs to *land*:

- "Write a column / op-ed / essay / longform piece about X"
- "Polish this draft into something publishable"
- "Make this read like the New Yorker / Atlantic / Vanity Fair"
- "Write in the voice of [Hitchens / Didion / Wolfe / Talese / Levine / DFW]"
- "Turn this brain-dump into a real piece"
- "I want this to feel like award-winning writing"
- Founder essays, Substack pieces, op-eds, magazine features, long Twitter threads that aspire to essay form

Skip for emails, code comments, READMEs, single-paragraph replies, technical docs. Those are different jobs.

## The canon

Ten pieces. Each one is a worked example of a different solved problem in essay form. They are described in detail — opening moves, structure, voice fingerprint, what to steal — in `references/canon.md`. Read that file before drafting if the piece at hand resembles any of them.

| # | Writer | Piece | Year | Publication | What it solves |
|---|--------|-------|------|-------------|----------------|
| 1 | Joan Didion | *Goodbye to All That* | 1967 | Saturday Evening Post / Slouching Towards Bethlehem | The farewell-to-a-place essay without sentimentality |
| 2 | Hunter S. Thompson | *The Kentucky Derby Is Decadent and Depraved* | 1970 | Scanlan's Monthly | Reporter-as-subject, event-as-moral-X-ray (founding gonzo) |
| 3 | Gay Talese | *Frank Sinatra Has a Cold* | 1966 | Esquire | Profile of an uncooperative subject, written from the periphery |
| 4 | Tom Wolfe | *The Last American Hero Is Junior Johnson. Yes!* | 1965 | Esquire | Cultural anthropology that respects its subject without sentimentality |
| 5 | Christopher Hitchens | *Why Women Aren't Funny* | 2007 | Vanity Fair | Provocation calibrated to enrage, prose calibrated to win |
| 6 | David Foster Wallace | *Consider the Lobster* | 2004 | Gourmet | Assigned a small thing, delivered a moral inquiry — footnotes do real argument |
| 7 | Ta-Nehisi Coates | *The Case for Reparations* | 2014 | The Atlantic | The long argument as architecture — each section a brick |
| 8 | Matt Levine | *Money Stuff* (London Whale, 2012 onward) | 2012– | Dealbreaker / Bloomberg | Making finance plumbing absurd and lucid at once, voice in the parentheticals |
| 9 | George Orwell | *Politics and the English Language* | 1946 | Horizon | Plain English as moral practice — the essayist's instruction manual |
| 10 | Tom Junod | *The Falling Man* | 2003 | Esquire | Restrained reverence — voice as what you refuse to say |

A second tier — Indian business commentary (Mihir Sharma, Andy Mukherjee), UK columnists (Caitlin Moran, Hugo Young), viral register (Lad Bible at its sharpest), and a few more US heavyweights (Susan Orlean, Michael Lewis, Janet Malcolm) — lives in `references/secondary-canon.md`. Reach for it when the topic, register, or audience asks for something the core ten don't cover.

The compositional techniques distilled across all of these — opening moves, sentence shapes, structural patterns, the kicker move, the parenthetical-as-argument — are in `references/techniques.md`. Read it once on first invocation; refer back when stuck on a specific sentence-level problem.

## Output formats

Different venues want different skeletons. Six templates live in `references/output-templates.md`:

1. **The SEO pillar article** — long-form business/service blog with meta data, structured H2 sections, FAQ schema, embedded CTAs (2,500–4,500 words). Use when the user asks for a "complete guide," "pillar article," "ultimate guide," or any SEO-optimized long-form blog post
2. **The opinion column / op-ed** — newspaper or magazine opinion piece, prose throughout, no headers (700–1,200 words)
3. **The Substack / founder essay** — long personal piece with H2 sections, voice-led (1,200–3,500 words)
4. **The magazine feature** — cinematic longform, deck + braided sections (3,500–8,000+ words)
5. **The viral social post / Twitter thread / LinkedIn post** — feed-native, white-space-driven (200–700 words)
6. **The internal memo / decision doc** — TL;DR + context + options + recommendation + risks

In Phase 1, identify which template fits the venue. The template is the skeleton; the canon (canon.md, techniques.md) is the muscle. Apply both. Read `references/output-templates.md` for the full structure of each template before drafting in that format for the first time.

## The protocol

Execute in order. Earlier phases run in your reasoning; the user sees a short trace, then the piece.

### Phase 1 — Inventory

Before writing a single sentence, name:

- **Topic** — what the piece is actually about, in one sentence
- **Input type** — topic, draft, bullets, brain-dump (each calls for a different opening move; see Input handling below)
- **Audience** — who reads this. The reader of a Vanity Fair feature is not the reader of an Economic Times op-ed
- **Venue** — Substack, op-ed, founder essay, magazine feature, viral post. Venue dictates length, opening density, and how much patience the reader brings
- **Length** — stated or implied. Default to ~800 words if unspecified. "Magazine feature" = 2500–6000. "Short post" = 250–500
- **User's POV** — did they hand you an argument or just a topic? If only a topic, you have to find an angle in Phase 2

If anything genuinely material is unclear, ask. Otherwise infer and proceed.

### Phase 2 — Find the thesis

A column is an argument, not a survey. Write the thesis in one sentence before drafting anything else.

The test: a reasonable smart person should be able to disagree with it. "Social media is changing how teens socialize" is a topic. "The studies everyone cites to prove social media is hurting teens are mostly wrong, and the real damage is somewhere else" is a thesis.

If the user gave a draft or brain-dump, the thesis is usually buried. Find it. Name it. Build around it. Do not write the balanced overview piece — that is the single most common failure mode of AI essay writing.

### Phase 3 — Pick the voice

The canonical ten cover most useful registers. Pick deliberately — match voice to topic, audience, and thesis. Best work is often a blend (two or three canon voices fused).

Quick fingerprints (full versions in `references/canon.md`):

- **Didion** — cool, observational, time-loops, refuses sentiment. For memoir-essay, farewell pieces, cultural diagnosis
- **Thompson** — paranoid baroque, cataloguing grotesques, reporter as moral instrument. For event reportage that wants to indict
- **Talese** — novelistic close-reading, scenes you'd swear were fiction, the periphery doing the work. For profiles, character pieces
- **Wolfe** — maximalist, italics, exclamations, sound effects on the page. For anthropology of a subculture
- **Hitchens** — long sentences that don't lose the reader, literary references casual but exact, contempt earned not performed. For argument-as-combat, takedowns
- **Wallace** — hyperliterate honesty, footnotes that argue, parentheticals stacked three deep. For moral inquiry under cover of small subject
- **Coates** — cumulative argument, each paragraph a brick, historical specificity as moral force. For long-form policy or moral argument
- **Levine** — dry parentheticals carrying half the argument, plain explanation that lets the absurdity reveal itself. For business, finance, "how the plumbing actually works"
- **Orwell** — plain Anglo-Saxon English, short words first, abstractions earned. For political writing, criticism, anything where clarity is itself the position
- **Junod** — restrained reverence, the writer's presence felt through what he refuses to say. For grief, scale, the unspeakable

Name the voice (or blend) in the trace and *why* — what about the topic, audience, or thesis points to it.

For voices outside this ten — Indian commentary (Sharma's contrarian wit, Mukherjee's data-with-attitude), UK columnists (Moran's confidential register, Young's gravitas), or the viral/social register (short paragraphs, second person, conspiratorial intimacy) — see `references/secondary-canon.md`.

### Phase 4 — Architect

Plan before drafting. Sketch in the trace:

- **Lede** — first 1–3 sentences. Specific, sensory, surprising, or news-pegged. Never "In today's world…" Never the dictionary definition. Never the rhetorical question the reader can wave away. The lede's job is to make sentence two feel inevitable. See `references/techniques.md` §1 for the seven opening moves the canon uses
- **Body** — 3–6 beats. Each beat earns its place. Each is a *move in an argument*, not a "point to cover." Order matters: the beat that requires the most setup goes last
- **Kicker** — final paragraph. Resonates, doesn't summarize. Reframes the whole piece, lands a memorable line, or opens onto the larger implication. See `references/techniques.md` §5 for the four kicker shapes

### Phase 5 — Stress-test

Before drafting, attack the plan:

- Lede check: would I keep reading past sentence one? If no, rewrite the lede first
- Thesis freshness: has the reader heard this argument 100 times? If yes, sharpen the angle or kill the piece
- Smart-reader pushback: a skeptic reads this — what's their first objection? Answer it inside the piece
- Cut test: for each beat, would the piece be worse without it, or just shorter? If just shorter, delete

If the plan fails, revise (announce "Revision:" in the trace) before drafting.

### Phase 6 — Draft

Now write. Voice lives at the sentence level — composition, word by word — far more than at the level of structure. The craft principles (drawn from the canon, detailed in `references/techniques.md`):

- **Verbs do the work.** Strong verbs beat adjective stacks. *"She demolished the argument"* beats *"She gave a thorough rebuttal."* Adjectives are the rust on prose
- **Concrete beats abstract.** Names, numbers, scenes, dialogue. The canon piece you study is full of specific dollar figures, specific street corners, specific times of day. *Three of my four college roommates* lands; *many graduates* is air
- **Vary sentence length.** Short. Then a longer sentence that does some work. Then a longer one still that takes the reader somewhere they didn't expect when the sentence began. Then short. The AI default is uniform medium-length declaratives — the cadence itself is a tell
- **Earn every transition.** "Furthermore," "Moreover," "In addition" are AI tells. If the next paragraph follows from the last, the connection should be felt, not signposted
- **Show reasoning, don't decree.** "I used to think X. Then Y happened. Now I think Z" beats "Z is true because A, B, C." Take the reader along the path you actually walked. (Didion, Wallace, and Hitchens all do versions of this)
- **One specific only the writer could know.** Even when the piece isn't personal, one anchor detail — a particular café, a specific email, a stray memory — makes it feel inhabited. The canon writers do this constantly
- **No throat-clearing.** Delete "In this piece I'll argue…" Start with the lede

### Phase 7 — Cut

The first draft is always too long. Read back with a knife:

- Any sentence that doesn't add information, voice, or pacing — gone
- Adjectives not pulling weight — gone
- Hedges ("perhaps," "arguably," "it could be said that") unless doing real epistemic work — gone
- Three-item lists when two would do — gone
- Anything that sounds like other AI prose — gone
- The first paragraph, often. Drafts frequently get going one paragraph in; the real opening is hiding there

Aim to cut 15–25% from the first draft.

### Phase 8 — Tighten (the composition pass)

Cutting deletes; tightening revises. This is where most AI prose dies — the sentences are individually fine but uniformly the same shape.

Read each sentence asking, in order:

- **Where is the verb?** If it arrives after twelve or more words of subject material, the sentence has drifted academic. Move it earlier
- **Is this a noun pretending to be a verb?** *Make a decision* → *decide*. *Provide assistance* → *help*. *Implementation of the policy* → *implementing the policy*. Hunt nominalizations
- **Same sentence length three times in a row?** Break it. Four-word sentence after three twenty-word ones is rhythm; four twenty-word ones in a row is monotone
- **Same opening construction three times in a row?** *The X is… / The Y is… / The Z is…* — vary
- **Is the diction register consistent?** A piece can be all literary (Hitchens) or all colloquial (Wolfe doing Junior Johnson) or deliberately mixed (Wallace) — what it can't be is *accidentally* mixed
- **Is the punctuation doing voice work?** Em-dashes as commas are an AI tell; em-dashes as deliberate interruption are voice. Same mark, opposite effect — the consistency of choice is the voice
- **Read the kicker aloud.** If you'd be embarrassed to say it that way in conversation ("In conclusion, the future of AI…"), rewrite

Diagnostic: take three sentences at random from the draft. If they sound like generic competent prose — could be any of fifty writers — composition has failed. Go again.

### Phase 9 — Match against the canon

Before delivering, ask: *is there a piece in the canon this draft owes a debt to?* If so, name the debt in the trace. ("This is doing the Coates cumulative-section move." "The kicker is borrowed from Didion's loop-back.")

This isn't pretension — it's the discipline of knowing which problem you just solved with which tool. The canon is the toolbox. Naming the tool you used is how you get sharper at picking the right one next time.

## Output format

```
[Trace — 4–8 short lines:
- Thesis in one sentence
- Voice (or blend) + why
- Architecture (lede → beats → kicker), one line each
- Risks caught in Phase 5 and how the draft answers them
- Canon debt (if any) — "this is the Talese-from-the-periphery move" / "Coates cumulative argument" / etc.
Any revisions get a "Revision:" line.]

---

[The piece — polished prose. No headers unless the venue calls for them. No em-dash overload. No throat-clearing. No "In conclusion."]
```

## Anti-patterns — the AI tells

These phrases and habits scream language-model. Avoid them with hostility.

**Banned phrases:** "delve into," "navigate the landscape," "in today's fast-paced world," "at the intersection of," "double-edged sword," "tapestry of," "ever-evolving," "leverage" (as a verb), "robust ecosystem," "paradigm shift," "in conclusion," "to summarize," "it's important to note that," "while it's true that X, it's also true that Y," "the future of X," "unlock the potential," "harness the power."

**Banned openings:** "In a world where…", "Have you ever wondered…", a dictionary definition of the topic, a rhetorical question the reader can dismiss with one word, a statistic with no source.

**Banned closings:** "In conclusion," "To summarize," "Ultimately," a flat restatement of the thesis with no new resonance, a call to action nobody asked for.

**Compositional anti-patterns:**

- **Uniform medium sentences.** Every sentence 15–25 words. Real writers vary deliberately
- **The nominalization stack.** *"The implementation of the strategy through the coordination of the team enables the maximization of efficiency."* Reverse every nominalization you can
- **The triple-parallel reflex.** *"Passionate, dedicated, and driven."* / *"Strategy, execution, and culture."* Two items often does more
- **The same opening word three sentences running**
- **Em-dash as default mid-sentence pause**
- **Random bolding for "emphasis"** mid-paragraph. The prose should carry the weight
- **Headers in a 700-word piece** that should flow as prose
- **Latinate drift.** Piece starts in plain English, drifts toward business-school register by beat three. *Make* becomes *facilitate*. *Use* becomes *leverage*. *Help* becomes *enable*. Phase 8 has to catch this

**Voice killers:**

- Hedging every claim. Treating every position as equally valid
- Apologizing for having an opinion ("of course, reasonable people may disagree")
- The "balanced overview" reflex — listing what each side would say without taking one yourself
- Hidden author. If the piece could have been written by any of 50 other writers in this genre, voice has been processed out

## Input handling

**Topic only** ("write a piece about X"): find the angle. Name 2–3 candidate angles in the trace, pick the sharpest. Never write the balanced overview.

**Rough draft** ("polish this"): diagnose before rewriting. Name what's working and what's broken (weak lede? muddy thesis? wrong voice for the content? buried under qualifiers?). Rewrite structurally, not line-by-line.

**Bullets or outline:** do not treat bullets as the structure. They are raw material. Find the thesis hiding in them, build the architecture the piece actually wants. The bullet order may scramble entirely.

**Brain-dump or transcript:** the thesis is almost always buried. Find the one sentence the user is actually trying to say. Cut 60–80% — most of a brain-dump is throat-clearing the writer needed to do to find the point.

## The principle

The canon writers had different voices, different politics, different decades. What they share is the willingness to *commit* — to a thesis, to a voice, to a specific scene over a vague one, to the verb that does the work. They cut.

The point of this skill is to commit the same way. Pick a voice from the canon. Pick a thesis a smart reader could disagree with. Build an argument out of specific moves. Cut. Tighten until the prose has a fingerprint. The trace and the canon-debt note keep the model honest about what it actually did.

If the trace shows the voice is "professional" or the thesis is "X is changing the world," or if the Tighten pass produces three random sentences that sound like every other AI piece, the skill failed. Go back and do it properly.

The best columns feel like they could only have been written by one person. Aim for that, even ghostwriting in someone else's voice. Bland is the enemy.
