`★ Insight ─────────────────────────────────────`
This is an internal runbook, so most "sources" are code files in the same repo — that shifts many claims to T4 (operator's own public work) rather than T5. The interesting calibration wrinkle: the doc is repeatedly *cautious* in the right places (fails-open warnings, "test suite is not a substitute for DB verification", numeric filenames "not proof of production application"), which raises the bar on the few unqualified claims that remain.
`─────────────────────────────────────────────────`

```json
{
  "role": "evidence",
  "round": 1,
  "score": 4,
  "claim_tier_map": [
    {"claim": "Notifications queue keeps three statuses (pending/sent/failed) and three channels (email/in_app/realtime)", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Worker claims at most 25 due email rows via claim_notification_email_batch", "tier": "T4", "status": "underspecified", "fix": "Cite the migration/function definition (e.g. supabase/migrations/0033_...) where the 25 bound is set."},
    {"claim": "Provider idempotency key is 'outbox-{id}'", "tier": "T4", "status": "underspecified", "fix": "Reference the route file line that constructs the key so a reviewer can verify format stability."},
    {"claim": "Live pg_cron drain-crm-outbox runs every five minutes and calls the production route via pg_net, loading crm_cron_secret from Vault", "tier": "T5", "status": "asserted_without_evidence", "fix": "This describes live infrastructure state not visible from the repo. Either link an inspection query/output (cron.job row) or hedge as 'configured to run every five minutes; verify against cron.job before trusting.'"},
    {"claim": "Vercel Cron daily backstop at '0 13 * * *' hits /api/cron/crm-notifications", "tier": "T4", "status": "underspecified", "fix": "Point to vercel.json (or wherever the schedule is declared) so the reader can verify without leaving the repo."},
    {"claim": "Rate limit of 5 requests per 10 minutes on signUp/resendConfirmationEmail/requestPasswordReset via lib/rateLimit.mjs", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Limiter fails open when Upstash credentials absent or Redis unavailable", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Checked-in migration chain currently ends at 0033_notification_claim_leases.sql with historical numbering gaps", "tier": "T4", "status": "underspecified", "fix": "Runbooks that name a specific migration head go stale; add 'verify with ls supabase/migrations/ before trusting' or a dated 'as of YYYY-MM-DD' stamp."},
    {"claim": "0033 is additive — adds lease/failure metadata, bounded claim index, atomic claim/reclaim, lease-owned success/failure, fixed search_path, trusted-worker grants; no 'processing' status", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "The live Supabase migration ledger uses timestamped versions and has previously diverged from the checked-in chain", "tier": "T5", "status": "asserted_without_evidence", "fix": "Either cite one dated instance of divergence (even a commit SHA + date is enough) or soften to 'may diverge — reconcile before applying.' As written, this is a load-bearing warning resting on unverifiable operator memory."},
    {"claim": "Delivery is at-least-once; ambiguous provider response or lease loss can cause reclaim, but the stable provider key prevents duplicate provider send", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "handle_new_user() hardcodes every new account to 'client' and admin role is pinned via pinned_admin_email() + partial unique index + BEFORE trigger (migration 0014)", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "First x-forwarded-for value is used as client IP; deployment edge must overwrite/sanitize", "tier": "T4", "status": "verified", "fix": null}
  ],
  "calibration_issues": [
    "The two live-infrastructure claims (pg_cron schedule wired to pg_net + Vault; migration-ledger divergence history) are stated with the same declarative confidence as the in-repo claims, but they describe external state the reader cannot verify from the checked-in code. Either add an inspection command or hedge — do not present unverifiable operational state as flat fact.",
    "The migration-head number ('0033') is written as a present-tense fact in a document that will be read months from now. This is not a confidence-vs-evidence miscalibration so much as a durability miscalibration; a dated stamp or 'check the directory' hedge (as the project CLAUDE.md itself does) would fix it.",
    "Positive calibration to preserve: fails-open warning on Upstash, 'test suite is not a substitute for DB verification', 'Repository numeric filenames are not proof of production application', and the final owner-approval clause. These are correctly hedged and should not be softened further."
  ],
  "p11_p17_p54_flags": [
    "P54 (unverifiable single-source): 'live pg_cron job runs every 5 min... loading from Vault crm_cron_secret' rests entirely on operator assertion; a reader has no way to confirm without database access the runbook does not describe how to obtain.",
    "P54 (unverifiable single-source): 'live ledger has previously diverged' — no instance cited, no verification path offered."
  ],
  "would_block": false,
  "irreducible": false,
  "notes": "Evidence posture is generally strong for an internal runbook — most claims map to in-repo files (T4) and the doc explicitly refuses to authorize destructive operations without owner sign-off. Two live-infrastructure claims and one numeric-migration-head claim should either be hedged or paired with an inspection command, but none rise to a blocker."
}
```
