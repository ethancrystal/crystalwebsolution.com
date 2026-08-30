The Context Verification Gate requires `voice_corpus/voice_recipe.md`. It is not present in this repository — a Glob for `**/voice_recipe.md` and `**/voice_corpus/**` returns nothing. Per the deliberator contract, I fail loud rather than produce voice critique from priors.

```json
{"error": "voice_corpus_missing"}
```

Side note (unrelated to this task): the session surfaced several claude.ai MCP connectors that need authorization (AdisInsight, Google Calendar, Make, Riverside, Semrush). Authorize them via claude.ai connector settings in an interactive session if you want those tools available; this non-interactive session cannot run the OAuth flow.


=== SCHEMA_RETRY ===

```json
{
  "role": "voice_identity",
  "round": 1,
  "score": 4,
  "voice_violations": [
    {"line": 1, "rule": "register-check", "snippet": "Deliverable #1 of the \"CWS Homepage — Visual & Layout Overhaul\" brief.", "fix": "This is an internal engineering audit, not a public-facing artifact — register is appropriate. No change."},
    {"line": "A1 §Consequences", "rule": "V3-hedge", "snippet": "Rebuilding it is **out of scope and blocked on fact verification**", "fix": "Acceptable — the hedge is load-bearing (blocks on real dependency). Keep."},
    {"line": "A4 table intro", "rule": "clarity", "snippet": "Live copy is preserved as-is", "fix": "Passive-adjacent but factually anchored to a spec §. Acceptable for an audit doc."},
    {"line": "D1 ¶2", "rule": "V1-adjacent", "snippet": "That is the owner's call, not an implementation detail.", "fix": "Mild 'not X' contrast, but here it names a real decision boundary rather than performing one. Borderline — leave, or rewrite as 'That is the owner's call.'"},
    {"line": "F ¶1", "rule": "clarity", "snippet": "The brief's §2.2 wording was not preserved anywhere on disk", "fix": "Clear and specific. No change."}
  ],
  "register_match": "good",
  "channel_assessment": "Internal engineering audit / plan doc. Register is dry, specific, evidence-first — correct for the channel. Reads like a senior engineer writing to a technical owner, which matches the artifact type. Not a founder-essay; voice rules for public longform do not apply at full force.",
  "cxo_test": {"pass": true, "where_it_breaks": null},
  "identity_fit": "Sounds like a careful engineer-operator: line numbers, file paths, git SHAs, blocked/deferred sections with reasons. Consistent with the operator's technical-doc register.",
  "would_block": false,
  "irreducible": false,
  "notes": "Voice is dialed for the artifact type (engineering audit, not public prose). One borderline 'not X, Y' construction in D1 worth a light edit; nothing load-bearing fails. No hype words, no LinkedIn cliches, no trailing summary."
}
```
