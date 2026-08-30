`★ Insight ─────────────────────────────────────`
- The Evidence & Calibration role is deliberately narrow: it does not judge whether the fixes are correct, only whether the artifact supplies enough evidence to earn the confidence it projects.
- This artifact is a critique-of-a-codebase, which creates a specific evidence trap: every "K1: corrupted function body" claim needs a quoted excerpt with line numbers, not just a file path and a severity tag. Assertions about code are only Tier 4 (operator's own prior work) when the code is actually quoted or linked.
- Note the meta-pattern: the artifact repeats numeric precision (`~26 files`, `~19 files`, `225+ tests`, `1/18`) without pointing to how those counts were derived. Precise numbers without a derivation path are a classic P17 tell — pattern-matched estimates dressed as measurements.
`─────────────────────────────────────────────────`

```json
{
  "role": "evidence",
  "round": 1,
  "score": 2,
  "claim_tier_map": [
    {"claim": "K1: removeProjectAssignment has malformed code — 'const visibility) ||' is a syntax error waiting to happen (project-actions.js:300-320)", "tier": "T5", "status": "underspecified", "fix": "Quote the full function body with line numbers; a 12-char fragment can't distinguish real syntax error from redacted excerpt. If it is a real syntax error the build would fail — verify against `pnpm build` output."},
    {"claim": "K7: updateProjectTask has wrong revalidation ID (latent bug)", "tier": "T6", "status": "asserted_without_evidence", "fix": "No line, no quote, no repro. Either quote the offending revalidatePath call and the expected ID, or drop 'latent bug' framing."},
    {"claim": "R2: profile?.company_id is unnecessary in ProjectThread.jsx:65 useCallback deps (not used in callback body)", "tier": "T5", "status": "underspecified", "fix": "Quote the callback body to demonstrate the dep is truly unused; a stale-closure risk here is subtle enough that the assertion needs the code."},
    {"claim": "pnpm test runs 225+ tests with 1 pre-existing failure (auth-portals)", "tier": "T5", "status": "underspecified", "fix": "Attach the test runner output or a commit SHA the count was taken at; test counts drift weekly per project CLAUDE.md."},
    {"claim": "tests/crm/*.test.mjs is ~26 files; tests/marketing/*.test.jsx is ~8 files; CRM loading states incomplete across ~19 files", "tier": "T6", "status": "asserted_without_evidence", "fix": "Replace tildes with either an exact count from `ls | wc -l` or a range. '~19 files' with no enumeration is a pattern-matched guess."},
    {"claim": "fix_handle_new_user_coalesce migration has no local file — create 0016_fix_handle_new_user_coalesce.sql", "tier": "T5", "status": "mis-tiered", "fix": "Project CLAUDE.md warns migration numbering drifts weekly and to check the directory for the current head. The artifact hardcodes 0016 without confirming the current head — could easily collide."},
    {"claim": "public/*.csv (~30 files) are untracked SEO audit exports", "tier": "T5", "status": "underspecified", "fix": "'Untracked' and '30 files' both need verification against `git status --porcelain public/*.csv`. Also 'publicly downloadable' is a security framing that needs the actual file list."},
    {"claim": "Migration numbering 0001-0023 with gaps; 0007 skipped, 0009b ad-hoc", "tier": "T5", "status": "verified", "fix": "STATUS.md is cited as source; acceptable if STATUS.md actually contains this — the artifact does not quote it (P11 risk if not verified)."},
    {"claim": "tests/marketing/serviceEmblem3d.test.jsx has a pre-existing vitest/jsdom harness quirk causing 1/18 test failure", "tier": "T5", "status": "underspecified", "fix": "Quote the failing test name and the harness error. 'Harness quirk' is a dismissal, not a diagnosis."},
    {"claim": "Cron secret hardcoded in app/api/cron/crm-notifications/route.js", "tier": "T5", "status": "asserted_without_evidence", "fix": "Security-flavored claim — must quote the offending line. If it's actually reading from process.env this is a false positive that damages the reviewer's credibility."},
    {"claim": "Tasks 1-8 from all 4 plans are implemented (docs/plans/*.md ready to archive)", "tier": "T6", "status": "asserted_without_evidence", "fix": "Which 4 plans? Enumerate. 'Ready to archive' is a decision with blast radius; needs a plan-by-plan checklist."},
    {"claim": "44px touch targets per WCAG (D3)", "tier": "T6", "status": "mis-tiered", "fix": "WCAG 2.1 SC 2.5.5 (Target Size, Level AAA) specifies 44x44 CSS pixels; SC 2.5.8 (AA) is 24x24. Citing 'WCAG' without version/level is P11 — citation-as-decoration."}
  ],
  "calibration_issues": [
    "K1 tagged URGENT with a 12-character fragment as its only evidence — high confidence on T5. If this were a real syntax error, `pnpm build` would fail and the codebase wouldn't deploy; the artifact does not reconcile with deployed state.",
    "K7 called a 'latent bug' with zero code shown — max confidence on T6.",
    "Numeric precision (~26, ~19, ~30, 225+, 1/18) applied without derivation across the document — reads as measurement but is estimation.",
    "'Immediate Actions (This Week)' list at Section 8 promotes three T5/T6 claims (K1, K3, K2) to action items — the calibration inversion is structural, not incidental.",
    "R2 unnecessary-dep claim risks the opposite inversion: removing a Realtime subscription dep without confirming closure semantics could introduce a stale-subscription bug — under-hedged fix."
  ],
  "p11_p17_p54_flags": [
    "P11: WCAG citation with no version/level; STATUS.md and docs/plans/*.md referenced without quotation across at least four claims.",
    "P17: The entire 'Known Issues' section (K1-K11) is a pile of unsourced assertions styled as findings. Table format lends false structure to what is largely operator estimation.",
    "P54: The '1 pre-existing unrelated failure (auth-portals)' claim is single-source (the artifact itself) and unverifiable without the test output."
  ],
  "would_block": true,
  "irreducible": false,
  "notes": "The artifact's evidence base is the codebase itself, which is reachable — this is fixable by quoting code and running the tests. Block until K1/K4/K7-class code claims include line-anchored excerpts; do not ship an 'Immediate Actions' list built on T5/T6 assertions."
}
```
