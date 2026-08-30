```json
{
  "role": "evidence",
  "round": 2,
  "score": 4,
  "concessions": [
    "Voice_identity's read that this is an internal runbook (not a public claim-making essay) is correct — evidence bar shifts from 'external citations required' to 'internal-authority citations required' (migration file paths, PR references, verified catalog queries)."
  ],
  "escalations": [
    "One residual T5 pattern voice_identity did not catch: 'Migration 0032 is staged in this branch and has not been applied to production' — verifiable by inspecting the branch, but the runbook never names the file's location relative to `supabase/migrations/` nor gives a git ref. Fix: cite the exact path (`supabase/migrations/0032_project_asset_lifecycle_hardening.sql`) and the branch head SHA at time of writing.",
    "'The full evidence record is maintained at `/home/ubuntu/crm-messaging-live-contracts-2026-08-16.md`' is P11-adjacent (citation-as-decoration): the path is on a machine no reviewer can access. Either inline the constraint-query output into the runbook or move the evidence file into the repo under `docs/`. As written, the citation is unverifiable by the PR reviewer — the exact P54 pattern.",
    "'A read-only catalog query confirmed...' — T4 operator-work claim, but the query itself is not shown. For a runbook whose entire purpose is gating a production migration, the verifying SQL should be inline (it's three lines) so the reviewer can re-run it, not narrated.",
    "'The live message and attachment RPC signatures match the function signatures replaced by the staged migration' — T5 assertion. The `pg_get_functiondef` output referenced in the Rollback section should be captured and linked BEFORE migration application, not just named as a future step. Runbook currently promises the archive; it should contain or link the archive."
  ],
  "would_block": false,
  "irreducible": false
}
```
