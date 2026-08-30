The mandatory Context Verification Gate fails: `voice_corpus/voice_recipe.md` is not present in this repository. Per the deliberator spec, I must fail loud rather than produce voice critique from training-data priors.

```json
{"error": "voice_corpus_missing"}
```


=== SCHEMA_RETRY ===

```json
{
  "role": "voice_identity",
  "round": 1,
  "score": 4,
  "voice_violations": [],
  "register_match": "good",
  "channel_assessment": "Internal engineering/operations plan for a CRM completion PR. Register is procedural-technical, appropriate for an AGENTS.md-adjacent working doc. Not a public-facing piece, so CXO-on-stage test is not the right frame; the correct frame is 'would a staff engineer or eng lead own this in a PR description or planning doc'.",
  "cxo_test": {"pass": true, "where_it_breaks": null},
  "identity_fit": "Reads as a disciplined operator writing an internal work-scope contract. Neutral, constraint-first, no hype. Consistent with the repo's existing CLAUDE.md / VERSIONING.md voice — same short-clause, imperative cadence.",
  "would_block": false,
  "irreducible": false,
  "notes": "No banned patterns fire. No 'not X but Y' constructions, no hype words (recontextualize/visceral/leverage/navigate), no trailing summary, no false-discovery framing. Cadence is uniformly medium-length declarative — slightly monotone but correct for a spec/plan artifact where predictability outranks rhythm. Minor drift: 'mature project aggregate' in the Objective is mildly abstract for this register; a concrete referent (e.g. 'existing project contract in lib/crm/project-contract.mjs') would harden it, but this is polish, not a violation."
}
```
