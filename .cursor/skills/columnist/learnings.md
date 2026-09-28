# Columnist Learnings Log

A running record of what the `columnist` skill has learned about this user's voice, preferences, and patterns over time. The skill reads this file in Phase 1 (Inventory) before drafting any new piece, and appends new entries in Phase 8 after each piece is delivered.

**How to maintain this file:**
- Each piece written through the `columnist` skill adds one entry below.
- Entries are dated and titled by topic.
- Each entry is 3–5 bullets — observations, not essays.
- The user reviews proposed entries before they go in. Bad learnings poison future pieces; only approved ones land here.
- Stable, recurring preferences should additionally be proposed as persistent memory edits (Channel 1 in Phase 8).

---

## 2026-05-13 — Canon seeded (skill setup, not a piece)

- **Canon contents.** Four Pulitzer-grade feature pieces added to `references/user-canon/`: Hannah Dreier on migrant child labor (NYT, 2024 Pulitzer Investigative), Gene Weingarten's "Pearls Before Breakfast" (Washington Post, 2008 Pulitzer Feature), Lane DeGregory's "Girl in the Window" original (St. Petersburg Times, 2009 Pulitzer Feature), and her 10-year follow-up (Tampa Bay Times, 2017).
- **What the canon signals about the user's taste.** All four are *narrative feature journalism* — heavily reported, scene-driven, dispassionate at the sentence level, anchored in one or more specific people. The user gravitates toward writing that earns its emotional weight through observed specifics rather than declared argument. This is a register, not just a style.
- **Implication for the voice library.** The opinion-essayist tradition (Graham, Housel, Klein, Hitchens, etc.) and the narrative-journalism tradition (Dreier, Weingarten, DeGregory) are different registers and largely don't blend. When picking voices in Phase 3, check first whether the piece is opined or reported, and pick from the matching register.
- **New voice fingerprint added.** `voice-fingerprints.md` now includes a "Narrative journalism / feature longform" section drawn from these four pieces — opening with a scene, naming the specifics, burying the thesis mid-piece, returning to the anchor image at the end.
- **Next.** No piece written yet. First real entry will be appended after the first piece is drafted.

---

## 2026-05-13 — Composition lens (taste signal, not a piece)

- **Correction from the user.** First version of canon craft notes was too structure-focused (opening move, structural arc, where the thesis lands). User correctly flagged this — what matters more is *composition*: how sentences are built, word choice, clause stacking, rhythm, where the verb sits, punctuation as voice signature.
- **All canon files rewritten.** Replaced "Craft notes — what this piece teaches" with "Composition notes — how this prose actually works" on every canon entry. New format: opening sentence close-read (word-by-word), diction register and where it shifts, sentence shapes, paragraph architecture, punctuation as voice, specific compositional moves to steal, the line you'd remember a year later.
- **Burrough piece added to canon.** "Vanity Fair's Heyday" — a personal-memoir essay in literary-magazine register. Different voice register than the four narrative-journalism pieces already in the canon. Note: user uploaded the same file twice; the intended *second* additional reference is pending re-upload.
- **New voice fingerprint added.** "Personal-memoir essay (literary magazine register)" added to `voice-fingerprints.md` — Burrough's compositional signatures (register-switching, em-dashes-and-parentheticals as voice, absurd-specific numbers, anaphoric closers, named specifics as texture).
- **Implication for future pieces.** When picking a voice in Phase 3, weight composition (line-level craft) over structure (architecture). When drafting in Phase 6, attend to sentence shape variation, diction register shifts, and punctuation choices as the carriers of voice — not just paragraph architecture.

---

## 2026-05-13 — Full skill upgrade (intelligence pass, not a piece)

User asked for the full intelligence applied to the skill itself. The following changes shipped:

- **Academic piece added as canon #6.** An untitled essay on AI and organizational intelligence (likely California Management Review register). Added with honest composition notes naming what the academic-management register IS, what it does well within its genre, and which of its moves are anti-patterns when imported into columnist work (meta-statement opening, nominalization stacks, inline numbered citations, the *actor* abstraction, defined-term loops, bullet lists in body prose). This piece functions as a *register-to-avoid* diagnostic.
- **voice-fingerprints.md fully rewritten.** Every one of the 10 named writers (Graham, Urban, Housel, Thompson, Brooks, Klein, Hitchens, Levine, Naval, Petersen) now leads with *Signature compositional move* — the single line-level signature that makes a writer recognizable. The earlier version led with structural moves (opening / argument architecture) which mattered less than composition. Added formal blend recommendations within and across register boundaries.
- **Academic / management thought-leadership register added** to `voice-fingerprints.md` Part II. Includes a *diagnostic* — specific signals that indicate a draft has drifted into the academic register and Phase 8 should pull it back.
- **Phase 8 added: Tighten (sentence-level revision).** Was a real gap. Phase 7 (Cut) deletes whole paragraphs that didn't earn their place; the new Phase 8 (Tighten) revises remaining sentences at the line level. Each pass asks specific questions: where is the verb, is this a noun pretending to be a verb, is every sentence the same length, does every sentence start the same way, is the diction register consistent, is the punctuation doing voice work, what does the kicker sound like read aloud.
- **Phase 9 = Capture learnings (renumbered).** All references updated.
- **Compositional anti-patterns subsection added** to the anti-patterns section. The earlier version listed banned *phrases* but not banned *sentence-level patterns* — which is the harder category to catch because each sentence is individually grammatical. New list names: uniform medium sentences, nominalization stacks, subject-verb distance, triple-parallel reflex, repeated opening word/phrase, em-dash-as-comma, random bolding, headers in prose pieces, Latinate drift mid-piece, wrong-register imports.
- **Worked example expanded into a complete one.** Earlier version had only the trace and a "[the actual 700 words follow]" placeholder. New version is a full 300-word piece on AI startups vs incumbents with trace, prose, and learnings block — so the skill knows what its output should look like end-to-end.

**Net effect on the skill.** The skill now has a 9-phase protocol, 13 voice profiles across 3 registers, 6 canon pieces with sentence-level composition notes, the learning loop (memory + learnings.md), and explicit anti-patterns at both the lexical and compositional levels. It's ready to be tested on a real piece.
