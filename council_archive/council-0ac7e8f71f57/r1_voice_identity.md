`★ Insight ─────────────────────────────────────`
The Voice deliberator spec has a hard "context verification gate" for a reason specific to this class of task: voice critique that lacks a reference corpus degenerates into generic prose feedback ("punchier," "tighten this"), which is exactly what the Council was designed to eliminate. The fail-loud rule prevents the deliberator from silently substituting training-data priors for the operator's actual voice DNA — a failure mode that would look like real critique but wouldn't be.
`─────────────────────────────────────────────────`

```json
{"error": "voice_corpus_missing"}
```

**Why:** the Round 1 mandate requires `voice_corpus/voice_recipe.md` (V1–V16, banned patterns, channel registers) to be loaded before producing any critique. I globbed for `voice_corpus/**`, `voice_recipe*`, and `persona_dna*` across the repo — none exist. The artifact's own internal "Profile C" voice card (banned words: *leverage, synergy, best-in-class, cutting-edge, full-service, end-to-end, seamless, robust, scalable*) is a target voice declaration inside the artifact, not the operator's external voice corpus, so it doesn't satisfy the gate.

**To unblock this review, one of:**
1. Add `voice_corpus/voice_recipe.md` (and optionally `voice_corpus/persona_dna.json`) to the repo and re-run.
2. Tell me to treat the artifact's own §"Brand Voice" block as the authoritative rule set for this artifact only — I can then critique against those declared rules, but the output will be scoped to that self-declared voice, not to a Council-grade V1–V16 audit.

---

Separately, per system reminder: the MCP servers **claude.ai AdisInsight, Google Calendar, Make, Riverside, and Semrush** need authorization before their tools work — done via claude.ai connector settings (for claude.ai connectors) or `claude mcp` / `/mcp` in an interactive session (for others). This session is non-interactive so I can't run the OAuth flow.


=== SCHEMA_RETRY ===

```json
{
  "role": "voice_identity",
  "round": 1,
  "score": 4,
  "voice_violations": [
    {"line": "Hero sub (applied)", "rule": "V3 hype-adjacent / cadence", "snippet": "Imagine a site people remember months later — faster than your old one, sharper than your competitors', and unmistakably yours.", "fix": "Cut 'Imagine a site' opener — it's throat-clearing. Open with the promise: 'A site people remember months later. Faster than your old one, sharper than your competitors, unmistakably yours.'"},
    {"line": "Services 03 (recommended)", "rule": "V-cadence", "snippet": "Flat pages get scrolled past in three seconds.", "fix": "Fine as-is, but pair with a verb-first solution — 'We build WebGL scenes...' already does this. Keep."},
    {"line": "Services 04 (recommended)", "rule": "V3 cliche", "snippet": "Hand-off is where good design goes to die.", "fix": "Cliche construction ('where X goes to die'). Replace with concrete: 'Hand-off is where the vision gets watered down. One team designs and ships — no translation loss.'"},
    {"line": "Contact recommended sub", "rule": "V1 (not X but Y adjacent) / register", "snippet": "Tell us what you're building. We'll tell you if it's worth building — and how.", "fix": "The 'if it's worth building' framing risks reading as gatekeeping-cute. Consider: 'Tell us what you're building. We'll tell you what it takes to ship it.'"},
    {"line": "Dedicated service page — Strategy", "rule": "V3 (rhetorical-question-adjacent opener)", "snippet": "Most sites get built before anyone asks why. Ours don't.", "fix": "'Ours don't' is a snappy retort that reads as ad-copy. Replace with declarative: 'We ask first. Then build.'"},
    {"line": "Dedicated service page — Brand", "rule": "V1", "snippet": "A logo isn't a brand. We build the system around it.", "fix": "'A logo isn't a brand' is a tired trope in the design world. Try: 'A mark is one asset. We build the system that makes it work.'"},
    {"line": "Section 12 microcopy rule", "rule": "voice-recursion", "snippet": "\"You\"/\"your\" ≥ 2× \"we\"/\"our\" in any paragraph copy.", "fix": "This is a style rule, not copy — fine. But audit the recommended Services descs against it: '02 Brand' uses 'we' 2x, 'you' 0x. Violates the rule the doc itself sets."}
  ],
  "register_match": "good",
  "channel_assessment": "Agency marketing site copy. Register is correct: Direct/Expert with occasional warmth. Voice profile C (Technical Consultancy) is well-executed in most places. Banned-word list is enforced. The recommended Services rewrites lean slightly more into ad-copy punch than the live copy — watch for cliche.",
  "cxo_test": {"pass": true, "where_it_breaks": "Marginal on 'Hand-off is where good design goes to die' — a CPO would say this on stage, but it's the kind of line that dates fast. Otherwise passes."},
  "identity_fit": "Sounds like a confident agency operator who has shipped work and is done proving it — matches Profile C. The self-imposed banned-word list ('leverage', 'seamless', 'robust') is being honored throughout.",
  "would_block": false,
  "irreducible": false,
  "notes": "Voice is dialed in overall. The live copy is stronger than several of the 'recommended' rewrites, which drift toward ad-copy cliche ('where good design goes to die', 'Ours don't'). Flag before shipping the rewrites verbatim."
}
```
