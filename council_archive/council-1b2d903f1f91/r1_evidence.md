```json
{
  "role": "evidence",
  "round": 1,
  "score": 3,
  "claim_tier_map": [
    {"claim": "Live ledger row 20260815135817 named lead_capture_review_followups exists in project wmnjosiikehsuaqucvja", "tier": "T5", "status": "asserted_without_evidence", "fix": "Paste the read-only query and its row output (or link the artifact/log), or explicitly mark as 'operator query, unverified in this document.'"},
    {"claim": "Normalized PL/pgSQL body of recovered 0029 matched live pg_get_functiondef result (normalized_body_equal=true)", "tier": "T5", "status": "underspecified", "fix": "Include the normalization script/command, both hashes, or the diff summary. A boolean assertion of equality without the comparison artifact is P54."},
    {"claim": "Migrations 0027 and 0028 are already applied to production with owner approval", "tier": "T5", "status": "asserted_without_evidence", "fix": "Link the approval trail (commit, PR comment, or written owner confirmation). 'Owner approval' is exactly the claim that must be sourced."},
    {"claim": "The ledger has no numeric 0024 row", "tier": "T5", "status": "underspecified", "fix": "Show the ledger listing (or its filtered projection) rather than asserting a negative from private query state."},
    {"claim": "Current live create_project signature is the six-argument form shown", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "0031 replaces the exact live six-argument create_project with a seven-argument form adding p_client_generated_id", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "PR #69 contains an unmerged 0028_transition_project_status_visibility_recipients.sql; onboarding branch contains a different 0028_idempotent_client_project_intake.sql", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "scripts/verify-crm-preview-authorization.mjs refuses to run unless CRM_PREVIEW_ENVIRONMENT=preview and never accepts SUPABASE_SERVICE_ROLE_KEY", "tier": "T4", "status": "underspecified", "fix": "Point to the specific guard block/line in the script, or include the failing-closed test output. Currently the doc asserts the behavior; a reviewer must go read the file."},
    {"claim": "The preview harness passes syntax validation and fails closed when the environment is not explicitly preview", "tier": "T5", "status": "asserted_without_evidence", "fix": "Paste the node --test summary lines for the four listed test files, or link the CI run."},
    {"claim": "The ten role-based network checks (Client A/B, employee assigned/unassigned, admin) are the correct authorization contract", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "The actual role-based network checks remain a preview-environment gate and require the variables above", "tier": "T4", "status": "verified", "fix": null}
  ],
  "calibration_issues": [
    "Report-level assertions ('normalized_body_equal=true', 'the harness passes syntax validation', 'ledger has no 0024 row') are stated with high confidence but rest entirely on operator-run queries whose outputs are not in the artifact. From the doc alone, none of these are verifiable — every reviewer must re-run the queries or trust the operator.",
    "Calibration is correct at the production boundary: 'Do not apply local migrations 0029, 0030, or 0031 to production from this branch yet' and 'The next production preflight must verify the current ledger, exact live function bodies, index existence' — this is well-tiered hedging in the one place it most matters.",
    "'Owner approval' for 0027/0028 is asserted without a citation. This is exactly the kind of governance claim that must be linkable to a written approval (PR comment, ticket, message). Currently it is single-source unverifiable.",
    "No under-claiming detected — the artifact does not hedge things it has verified."
  ],
  "p11_p17_p54_flags": [
    "P54 (unverifiable single-source): the whole reconciliation rests on the operator's own read-only queries and hashing/normalization results, none of which are exhibited. For an internal implementation report this is acceptable IF the audience is the operator's own future preflight; for a Gate document reviewed by others it is a defect. Recommend attaching a machine-readable comparison log next to this markdown."
  ],
  "would_block": false,
  "irreducible": false,
  "notes": "Well-calibrated where it matters (production boundary is explicitly gated for re-verification), but internal factual claims — ledger contents, body-equality result, owner approvals, harness passing — are uniformly T5 asserted-without-evidence. Reducible: paste query outputs, hashes, and test summaries; link the approval trail."
}
```
