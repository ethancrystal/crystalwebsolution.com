# CRM End-to-End Goal Checkpoint

- **Objective:** Complete and verify the Crystal Web Solution CRM end to end, then add the approved auth switch to login and signup.
- **Status:** blocked
- **Constraints:** Preserve the existing CRM architecture, roles, RLS, storage, lifecycle, single preview/production database, and unrelated user work. Do not send real email, apply production migrations, merge, or deploy without approval.
- **Validation:** `pnpm test:crm`; `pnpm test`; `pnpm build`; `git diff --check`; live Supabase/RLS checks when safe preview credentials are available; browser checks for public and authenticated role flows.
- **Completed:** Audited the repository and live Supabase surface; created draft PR #97 on `feat/crm-end-to-end`; synchronized the branch with the latest `main` baseline; verified the removed `.agents/skills` bundle is absent from the branch and PR comparison; corrected local Supabase URL handling so invalid configuration fails closed; made sign-in return the existing safe configuration error; added admin and staff project company context; corrected the user checkout URL entries in ignored `.env.local` without changing secret values.
- **Evidence:** CRM suite passes 248 tests; full suite passes 382 tests; production build passes after the latest code slice; `git diff origin/main...HEAD --check` passes; bundle comparison reports `BUNDLE_NOT_IN_PR`; local desktop client login route renders without the previous invalid-URL 500; PR URL is https://github.com/ethancrystal/crystalwebsolution.com/pull/97.
- **Current blocker:** Authenticated client, project-manager, and admin browser verification needs disposable preview-account credentials/project IDs or an approved user takeover. Local `pnpm test:db` cannot connect because Docker/local Postgres is not running; no production migration has been applied. The approved auth-switch phase must wait until CRM acceptance is verified.
- **Retry count:** 0/3 for the current credential/database blocker; 0/10 total loop cycles for this checkpoint.
- **Next action:** Await disposable preview-account credentials/project IDs or user browser takeover, then run the authenticated client, project-manager, and admin acceptance flows.
- **Stop condition:** All acceptance checks pass, the final diff is scoped and clean, and the draft PR contains the verified CRM plus auth-switch changes; or pause if further progress requires credentials, production access, or an irreversible action.
- **Last updated:** 2026-08-23 (after main-baseline synchronization)
