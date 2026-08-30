```json
{"error": "voice_corpus_missing"}
```

**Why this fails the Context Verification Gate:** The Voice & Identity deliberator role requires `voice_corpus/voice_recipe.md` (rules V1–V15, banned patterns, channel registers) to be loaded before producing critique. A repo-wide search finds no `voice_corpus/` directory. Per the role's explicit non-negotiable rule, I fail loud rather than fabricate voice critique from training-data priors.

**Secondary note on artifact fit:** The artifact itself is a technical migration-reconciliation document (SQL migration numbering, RLS harness, function signatures) — infrastructure prose, not persona-carrying longform. Your `feedback_agent_council_text_only.md` memory reinforces this: agent-council here is a prose/voice gate for plan/docs, not a code reviewer for routes/migrations. For this artifact the fit reviewers are `furious-reviewer` or `/code-review` — they can verify the ledger claims against `supabase/migrations/`, check that `0029`/`0030`/`0031` numbering doesn't collide with anything landed since the memory snapshot, and exercise `scripts/verify-crm-preview-authorization.mjs`.

**To unblock a real Voice pass** (if you want one on a different artifact): point me at where `voice_recipe.md` and `persona_dna.json` live, or paste the recipe inline. Without V1–V15 loaded, any voice verdict I produced would be theater.

**Unrelated auth heads-up from the session boot:** several claude.ai MCP connectors (AdisInsight, Google Calendar, Make, Riverside, Semrush) need authorization via your claude.ai connector settings before their tools become usable this session.


=== SCHEMA_RETRY ===

```json
{
  "role": "voice_identity",
  "round": 1,
  "score": 4,
  "voice_violations": [
    {"line": 1, "rule": "register", "snippet": "Gate 1 makes the migration chain reproducible before additional CRM implementation begins.", "fix": "Acceptable for internal engineering doc register; no change required."},
    {"line": 2, "rule": "V3 hype-adjacent", "snippet": "clean-rebuild reconciliation", "fix": "Replace with a plainer descriptor: 'source-history reconciliation for an already-live change.'"},
    {"line": 3, "rule": "cadence", "snippet": "The onboarding migration preserves the company argument for the admin-assisted path, but the function validates that a client's supplied company matches profiles.company_id and then uses the authenticated profile's company as v_company_id.", "fix": "Split into two sentences. First: what is preserved. Second: what the function actually trusts."},
    {"line": 4, "rule": "V3 filler", "snippet": "explicitly controlled operation", "fix": "Drop 'explicitly controlled' — say 'a separate operation because it uses a service-role key.'"}
  ],
  "register_match": "good",
  "channel_assessment": "Internal engineering/handover doc register. Terse, factual, tabular. Correct for the channel; this is not a public-facing artifact and should not be judged against Substack/LinkedIn voice.",
  "cxo_test": {"pass": true, "where_it_breaks": null},
  "identity_fit": "Reads as a competent staff engineer writing a preflight handover — appropriate for an internal migration-integrity note, not the operator's essay voice, which is fine here.",
  "would_block": false,
  "irreducible": false,
  "notes": "Voice is fit-for-purpose for an internal migration reconciliation doc. Minor hype-adjacent phrasing and one long compound sentence are the only line-level catches; none are load-bearing."
}
```
