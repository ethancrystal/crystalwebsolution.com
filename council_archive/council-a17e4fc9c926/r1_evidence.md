```json
{
  "role": "evidence",
  "round": 1,
  "score": 3,
  "claim_tier_map": [
    {
      "claim": "The application uses Next.js 15, React 19, JSX, Supabase, server actions, RPCs, plain global CSS, and the existing project contract.",
      "tier": "T4",
      "status": "verified",
      "fix": "Verifiable against CLAUDE.md and package.json in-repo. No change needed, though a one-line pointer (e.g. 'per CLAUDE.md §Architecture') would let a reader confirm without hunting."
    },
    {
      "claim": "Bring the existing Supabase-backed CRM to verified end-to-end working status without replacing its mature project aggregate, role model, or security boundaries.",
      "tier": "T6",
      "status": "underspecified",
      "fix": "The word 'mature' is asserted, not evidenced. Either drop the adjective (the constraint 'do not replace' is what matters) or cite the artifacts that define maturity — migration head (currently 0023, per project memory), lib/crm/project-contract.mjs, and tests/crm/."
    },
    {
      "claim": "Make the smallest change within the current server-action/RPC/UI boundaries.",
      "tier": "T4",
      "status": "verified",
      "fix": "Boundaries are documented in CLAUDE.md (app/actions/project-actions.js, lib/crm/projects.js, RLS). Consider naming those paths in the plan so 'current boundaries' isn't reader-inferred."
    },
    {
      "claim": "The implementation branch is intentionally based on the merged `main` state and will accumulate only CRM changes.",
      "tier": "T5",
      "status": "asserted_without_evidence",
      "fix": "Name the branch and its base commit SHA so a reviewer can `git merge-base` to verify. As written, the reader has to trust the claim."
    },
    {
      "claim": "Acceptance matrix rows — e.g. 'Client... Can submit a valid project brief and see it in the dashboard', 'Sees assigned staff read-only', 'Sees status and client-visible history'.",
      "tier": "T6",
      "status": "underspecified",
      "fix": "These are the spine of the plan and are stated without reference to the tests, RPCs, or migration objects that define them. Each row should cite the contract entry, test file, or RLS policy that is the source of truth (e.g. 'per lib/crm/project-contract.mjs field X', 'per tests/crm/<file>.test.mjs'). Otherwise 'permitted', 'eligible', 'visible', 'shared vs internal' are reader-interpreted at review time and the acceptance gate is undefined."
    },
    {
      "claim": "`pnpm test:crm`, `pnpm test`, `pnpm build`, `git diff --check`, and available database/browser verification pass",
      "tier": "T4",
      "status": "verified",
      "fix": "Commands exist per CLAUDE.md §Commands. Note that `git diff --check` catches whitespace/conflict markers only — if the intent is a broader diff review, say so; if it's literally the whitespace lint, leave as is."
    },
    {
      "claim": "Do not apply production migrations, alter production schedulers, send real email, or merge the pull request without explicit owner approval.",
      "tier": "T4",
      "status": "verified",
      "fix": "Consistent with CLAUDE.md's 'never run vercel --prod' and release-versioning rules. No change needed."
    }
  ],
  "calibration_issues": [
    "Confidence-vs-evidence is mostly well-calibrated — this is a plan, not an argumentative essay, so most statements are prescriptive rather than truth-claims. The visible miscalibration is the acceptance matrix: rows are written with the confidence of a spec ('Can', 'Cannot', 'permitted', 'eligible') while the underlying source-of-truth (contract fields, RLS policies, test names) is not cited. Reviewers will apply their own reading of 'permitted' and disagreements will surface post-hoc.",
    "The word 'mature' (Objective paragraph) is doing rhetorical work with no support — high-confidence adjective on T6 characterization. Either remove or ground it in a specific artifact (migration head, contract file, coverage of tests/crm/).",
    "'available database/browser verification' in the Verification Gate is a floating qualifier — 'available' silently downgrades the gate from T4 (verified) to T5 (operator judgment about what was available). Either enumerate what is required and what is optional, or acknowledge the gate is partly discretionary."
  ],
  "p11_p17_p54_flags": [
    "P54-adjacent: the plan is a single-source specification. The acceptance matrix cannot be independently verified without pointers to the contract/tests/RLS that back each row. As written, 'the plan says X is required' is the only source that X is required."
  ],
  "would_block": false,
  "irreducible": false,
  "notes": "The artifact is a work plan, not an evidence-heavy argument, so the evidence surface is small. The one real risk is that the acceptance matrix — the artifact's spine — treats itself as its own source; ground each row in an existing contract/test/RLS reference or the gate is reader-interpreted."
}
```
