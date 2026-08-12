---
name: voice-dna
description: "Advanced writing style guide for high-impact, human-centric prose. Use whenever drafting or rewriting newsletters, essays, op-eds, feature articles, blog posts, founder essays, or social content, or whenever asked to make writing sound less like AI and more human. Strips AI-isms and applies a 'Voice DNA' framework backed by a deep canon of the most celebrated and most-shared writing that spans the political spectrum left to right (progressive flagships, conservative and libertarian masters, plus a register on persuading people who disagree), with runnable tools to purge cliches and check rhythm. Trigger even if the user only says 'make this sound human,' 'punch this up,' 'give it more voice,' or 'make this appeal to everyone.'"
---

# Voice DNA

Turn AI-generated text into sharp, human-centric prose. The framework prioritizes rhythm, specificity, and emotional resonance while ruthlessly purging "AI-isms." The goal is writing a reader can't tell a model touched.

## How this skill is organized

Three layers, used in order of need:

1. **This file** — the rules, the formatting laws, the banned list, and a Voice Palette for picking a voice fast. Read it every time.
2. **`references/`** — the deep canon. In-depth voice analysis of ~30 of the most celebrated and most-shared pieces ever written, each dissected for the one move worth stealing. Open the relevant file when you've chosen a register and want to study the voice. Two files: `canon-longform.md` (literary, journalism, criticism, polemic) and `canon-internet.md` (the great internet essayists, the aphorists, and the pieces humans actually forward).
3. **`scripts/`** — runnable tools that automate the tedious checks. Use them on anything longer than a few paragraphs, or whenever you're unsure. Details in the Tools section below.

## Writing Rules

- **Write like a sharp human, not a model.** Use contractions naturally (don't, can't, won't).
- **Short paragraphs.** 1-3 sentences max.
- **No throat-clearing.** Skip the preamble. Get to the point.
- **Be specific.** Use names, numbers, and concrete details. "The 1989 Loma Prieta quake" beats "a major earthquake."
- **Vary sentence length.** Mix short punchy lines with longer ones. (The rhythm tool measures this.)
- **Natural transitions.** Avoid "Furthermore" or "Additionally." Use logical flow or direct shifts.
- **Embrace uncertainty.** Say "I think," "probably," or "kinda."
- **Physical verbs for abstract concepts.** "Sanded down" not "improved," "bolted on" not "added," "stripped back" not "simplified."
- **Humor from specificity.** Be unexpectedly precise.
- **Parenthetical asides.** Use them for editorial commentary, honest reactions, or quick tangents (like this).

## Formatting Rules

- **Paragraphs:** 1-2 sentences default, 3 max.
- **Numbers:** Use digits (7, 42, 100).
- **Contractions:** Always.
- **Punctuation:** NO em dashes. Use commas, periods, colons, semicolons, or parentheses.
- **Bold:** Sparingly (1-2 moments per section).
- **Code blocks:** For specific prompts or tool outputs.

## Banned Phrases (FATAL)

`scripts/aiism_purge.py` catches this entire list automatically, but know it cold so you don't write it in the first place.

### Dead AI Language
- "In today's [anything]..."
- "It's important to note..." / "It's worth noting..."
- "Delve" / "Dive into" / "Unpack" / "Harness" / "Leverage" / "Utilize"
- "Landscape" / "Realm" / "Robust" / "Game-changer" / "Cutting-edge"
- "I'd be happy to help" / "In order to"

### Dead Transitions
- "Furthermore" / "Additionally" / "Moreover" / "Moving forward"
- "At the end of the day" / "To put this in perspective..."
- "The implications here are..." / "In other words..."

### Engagement Bait & AI Cringe
- "Let that sink in" / "Read that again" / "Full stop"
- "Supercharge" / "Unlock" / "Future-proof" / "10x your productivity"
- "The AI revolution" / "In the age of AI"

### The Big One (FATAL NEGATION)
- NEVER use "This isn't X. This is Y." or "Not X. Y."
- Avoid any sentence that negates one framing to assert another. Just state the positive claim. (The purge tool flags these as REVIEW because they occasionally have a legitimate use, but the default is cut.)

## Voice Palette

Pick a voice by what you're trying to do, then go read its full breakdown in the canon. **One voice per draft, usually**, mixing two registers is how you get mush. The table is the index; the *move to steal* for each piece lives in the reference files.

| Your intent | Register | Model voices | Where |
| :--- | :--- | :--- | :--- |
| Profile / scene-driven feature | Immersive Narrative | Talese, **Saslow**, Orlean, Junod | canon-longform.md (A) |
| Explainer that lands in the gut | Explanatory | **Schulz**, Wallace (Federer) | canon-longform.md (B) |
| Cultural criticism, personal + political | Criticism | **Morris**, Wallace (Lobster), Baldwin | canon-longform.md (C) |
| Review with teeth / hot take | Provocation | **Saltz**, Bourdain | canon-longform.md (D) |
| Argument that changes a mind | Polemic | Orwell, Coates, Buckley, Scalia, Hitchens, Krauthammer | canon-longform.md (E) |
| Voice-forward, first-person, a little unhinged | Gonzo | Thompson, O'Rourke, Didion, Wolfe | canon-longform.md (F) |
| Quiet, lyric, transcendent | Lyric Essay | Dillard, Lewis, J.J. Sullivan | canon-longform.md (G) |
| Essay that explains a hard idea simply | Internet Essay | Graham, Urban, Ford, McKenzie, A. Sullivan | canon-internet.md (H) |
| A line built to be screenshotted | Aphoristic | Naval, Kelly, Housel, Sivers | canon-internet.md (I) |
| Something built to be shared and felt | Viral Heart | Schmich, Kreider, Deresiewicz, Ware, Solnit | canon-internet.md (J) |
| Reaching readers who already disagree | Bridging the Spectrum | Haidt, Noonan, Orwell | canon-longform.md (K) |

The four bolded voices (Saslow, Schulz, Morris, Saltz) are the original core models, anchored by the Quick Samples below. The other ~30 broaden the range across genre *and* politics, study them when the four don't fit the job.

## Writing Across the Spectrum

Most writing has to land with people who don't share the author's politics. The canon is balanced left to right on purpose so the skill can model any voice, but balance in the reading list isn't enough. The draft itself has to reach across. Apply these whenever the audience is mixed (which is most of the time):

- **Steelman before you strike (Haidt).** State the other side's view in a form its own believers would accept, *then* make your case. Nobody listens to a writer who clearly hasn't understood them.
- **Cut the tribal shibboleths.** Every camp has applause lines, the phrases that make your side cheer and signal "enemy" to everyone else. Unless you're writing explicitly for one camp, delete them. They feel powerful and they quietly lose half the room.
- **Lead with concrete humans, not ideological abstractions.** "Clyde Ross was denied a mortgage" travels across the aisle; "systemic structures of oppression" only travels within one. A named person and a specific fact are the most bipartisan things on the page.
- **Appeal to shared moral foundations.** Fairness, loyalty, liberty, care, sanctity, different readers weight these differently. Frame the point so it lands on more than one.
- **Let the evidence and the story carry it.** State the facts cleanly and let the reader draw the conclusion. People defend a verdict they reached themselves; they resist one they were handed.
- **When in doubt, default to Orwell's plainness.** Clear, concrete, jargon-free prose is the most ecumenical style there is, it hides no team colors.

## Quick Samples (paraphrased anchors)

Short paraphrased excerpts of the four core voices, for instant calibration. Full source details and the rest of the canon are in the reference files.

### Model 1: The Saslow Narrative (Feature)
> Suna Karabay touched up her eye makeup in the rearview mirror and leaned against the steering wheel. "Please, let me be patient," she said. She walked through the bus for her final inspection: floor swept, seats cleaned, gas tank full. She opened the doors at exactly 5:32 a.m.

### Model 2: The Schulz Scientific (Explanatory)
> Take your hands and hold them palms down, middle fingertips touching. Your right hand is the North American plate. Your left is the Juan de Fuca. Slide your left hand under your right. That's what's happening beneath us right now. It's stuck.

### Model 3: The Morris Critique (Commentary)
> I found myself doubled over the kitchen sink on Sunday, bawling into a bowl of greens. I was doubled over because Patti LaBelle had wrecked me. This is a lovers-at-a-crossroads jam, and she's working the crowd. She's preaching about a much bigger love.

### Model 4: The Saltz Provocation (Art/Review)
> Christie's is selling this painting for $100 million. They say it's by Leonardo. I have doubts. Big doubts. It's not about the money. It's about the soul of the thing, which feels missing.

## Tools

Two scripts automate the manual workflow steps. Run them on any draft longer than a few paragraphs, or whenever you're unsure. They take a file path or read stdin, and need nothing but Python 3 (no installs), so they work on Windows, WSL2, macOS, or Linux.

### `scripts/aiism_purge.py` — the automated Purge
Scans for every banned phrase, dead transition, engagement-bait term, em-dash, and negation-framing construction, and reports each with a line number.

```bash
python scripts/aiism_purge.py draft.md
# or
cat draft.md | python scripts/aiism_purge.py
```
Exits 1 if it finds FATAL hits (banned phrases or em-dashes), so it can gate a pre-publish check. It's a linter, not an auto-editor: it flags, you cut. A flagged word can be legitimate inside a quote or when you're naming the cliche on purpose, which is why a human stays in the loop.

### `scripts/rhythm.py` — the automated Rhythm Check
Measures sentence-length variety (the thing that separates human cadence from flat machine uniformity), prints a distribution histogram, and flags monotonous runs, paragraphs over the 3-sentence max, and a total absence of short punchy lines.

```bash
python scripts/rhythm.py draft.md
```
Heuristics, not laws, a uniform stretch can be deliberate. The tool points; you decide. It never blocks (always exits 0). The real test is still reading aloud.

## Workflow: Applying Voice DNA

1. **Draft.** Write the core content focusing on facts and structure. Don't worry about voice yet.
2. **Pick a voice.** Use the Voice Palette to choose a register by intent, then read that piece's breakdown in the canon and absorb the move to steal.
3. **The Purge.** Run `scripts/aiism_purge.py` (or scan by hand for short text). Cut every FATAL hit. Decide each REVIEW flag.
4. **The Rhythm Check.** Run `scripts/rhythm.py`. Break up monotonous runs, split fat paragraphs, add a short line where the prose has no punch.
5. **The Specificity Pass.** Replace "many people" with "three construction workers." Replace "improved" with "sanded down." Swap every abstraction for a concrete, named thing.
6. **Read it aloud.** The final gate. If a sentence sounds like a model wrote it, or makes you run out of breath, kill it.

## The Canon (reference library)

Two files hold the deep voice analysis. Don't read them end to end, jump to the register you picked.

- **`references/canon-longform.md`** — literary longform, journalism, criticism, polemic, lyric essay, and cross-spectrum persuasion. Spans the political spectrum on purpose: Talese, Saslow, Orlean, Junod, Schulz, Wallace, Morris, Baldwin, Saltz, Bourdain, Orwell, Coates, Buckley, Scalia, Krauthammer, Hitchens, Thompson, O'Rourke, Didion, Wolfe, Dillard, Lewis, J.J. Sullivan, plus Haidt and Noonan in the bridging register. Organized by register A-G and K, with a register→intent map at the top.
- **`references/canon-internet.md`** — the great internet essayists (Graham, Urban, Ford, McKenzie, Andrew Sullivan), the aphorists (Naval, Kelly, Housel, Sivers), and the most-shared-by-humans pieces (Schmich's "Wear Sunscreen," Kreider's "The Busy Trap," Deresiewicz, Ware, Solnit). Organized by register H-J. This set leans libertarian/market-friendly, which balances the longform canon's progressive flagships.

Politics aside, the rule is the same: study every voice for its **craft**, not its position. The canon spans left to right so the skill can write convincingly for any reader, see the Writing Across the Spectrum section above.

Each entry gives the source (author, outlet, year, link), a short voice-DNA breakdown, and the single move to steal. The four core models from the Quick Samples have their full, verified source details in `canon-longform.md` (note: Model 3 is Morris's "The Song That Knows Our Rage," NYT 2020, on Patti LaBelle's 1985 cover of "If You Don't Know Me by Now").

*Citation note: the canon files describe and analyze published work for instructional purposes, with minimal attributed quotation. To absorb a voice fully, read the original at the link.*
