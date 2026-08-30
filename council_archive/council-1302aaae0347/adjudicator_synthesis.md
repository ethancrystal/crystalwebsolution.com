```json
{
  "verdict": "INCOMPLETE",
  "reasoning": "All four R1 critiques and all four R2 rebuttals are empty in the context bundle. Zero deliberators returned parseable output, so the verdict policy (which counts would_block flags after R2) cannot be applied. Per the Context Verification Gate, fewer than min_deliberators_for_verdict succeeded — the verdict is INCOMPLETE.",
  "revision_brief": "1. Re-run all four deliberators (Skeptic, Voice & Identity, Evidence, Strategy) against this artifact — the R1 and R2 packs arrived empty and no would_block flags are available to apply the policy against.\n2. Confirm the Council runner is passing the artifact body (the CD Sportswear USA Migration Plan between the BEGIN/END ARTIFACT markers) to each deliberator, not just the adjudicator.\n3. Once R1+R2 return with parseable JSON, re-invoke the Adjudicator with the full pack.\n4. If deliberators repeatedly return empty, check the runtime — the prior verdict pack shows five successful runs on other artifacts today, so this is likely a per-invocation transport failure, not a systemic outage.",
  "dissent_summary": "No deliberator output to summarize. R1 and R2 sections are structurally present but contain no critique bodies, no would_block booleans, no irreducible flags. Cannot distinguish between deliberator silence, parse failure, or upstream transport loss without re-running.",
  "convergence_notes": "No convergence to report — the deliberator pack is empty. Prior verdicts on adjacent artifact_types today show the pattern is working elsewhere, which localizes the failure to this invocation."
}
```


=== SCHEMA_RETRY ===

```json
{
  "verdict": "HOLD",
  "reasoning": "All four Round 1 and Round 2 deliberator slots are empty — Skeptic, Voice & Identity, Evidence, and Strategy each returned no content across both rounds. With zero deliberators successfully producing critiques, the verdict policy cannot be applied (0 of 4 present is below any reasonable min_deliberators_for_verdict threshold). Defaulting to HOLD is the only safe call: SHIP would rubber-stamp an unreviewed artifact, and REVISE would fabricate a brief from critiques that do not exist.",
  "revision_brief": "1. Re-run the Council with all four deliberators (Skeptic, Voice & Identity, Evidence, Strategy) — the current run returned empty R1 and R2 packs for every role, so no synthesis is possible.\n2. Confirm the deliberator subagents are wired to the correct model/prompt and not silently erroring; check council_log.jsonl for parse failures or timeouts on this artifact sha.\n3. Once deliberators return non-empty critiques, re-invoke the Adjudicator against the same artifact to produce a real verdict.\n4. Separately: this artifact re-uses M-numbers already resolved in prior verdicts (M1 removeProjectAssignment was falsified against deployed main in Prior 3/5) — before the next Council run, reconcile the M-list against current main to avoid re-blocking on stale claims.",
  "dissent_summary": "No deliberator dissent to summarize — all four R1 and R2 slots are empty. This is a Council infrastructure failure, not a substantive disagreement. Prior verdicts on this artifact_type show high variance (SHIP, REVISE, HOLD, HOLD, REVISE across the last five), so a real deliberator pass is required before any ship decision. Treating empty critiques as implicit SHIP would violate the verdict policy's evidentiary basis."
}
```
