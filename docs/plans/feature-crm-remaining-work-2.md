---
goal: Close the remaining CRM completion gaps on `preview` — verified end-to-end via browser, RPC parameter exposure, a latent task-edit bug, a notes-panel design decision, loading states, and migration/environment housekeeping
version: 1.0
date_created: 2026-08-09
owner: Hermes (pick up from here — see "How to start" below)
status: 'Planned'
tags: [feature, crm, notifications, verification, tasks, migrations]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan continues directly from `docs/plans/feature-crm-website-completion-1.md`
(PR #60, now merged into `preview`) and `STATUS.md`'s "Still open" /
"In Progress / Next" sections as of 2026-08-08. It does not re-scope or
re-litigate anything already shipped — it closes the specific, named gaps
that were still open when this plan was written, plus two items closed
*during* the session that wrote this plan (recorded in Section 0 so the
next session doesn't redo them).

**Read `STATUS.md` in full before starting** — it has the incident history
(PR #49/#50 collision, the untracked-migration drift) that motivates the
"check open branches/PRs first" discipline in GUD-001 below. This plan
assumes that discipline; it does not repeat the full incident writeup.

## 0. Already done — do not repeat

These were verified/closed in the session that wrote this plan (2026-08-09),
after `STATUS.md`'s last update but before this plan was pushed. Recorded
here so Hermes doesn't redo them:

- **Migration `0015_project_notifications_and_message_editing.sql` is now
  applied to the live database.** Verified via direct query: `project_messages`
  has `edited_at`/`edited_by`, `public.update_project_message` exists,
  `project_messages` is in the `supabase_realtime` publication. This was the
  single highest-priority blocker in the prior plan — it is now closed.
  **Everything in Phase 1 below (the browser verification pass) was
  previously blocked on this and is now unblocked.**
- **PR #58, #61, #60 are merged into `preview`**, in that order, with #61's
  conflict against #58/#62's entrance-reveal work on `app/work/[slug]/page.jsx`
  hand-resolved additively (both narrative-beats content and entrance
  animation survive). `pnpm test` (157/158, 1 pre-existing unrelated failure)
  and `pnpm build` both verified clean after each merge.
- **A separate SEO remediation PR (#64, `seo/screaming-frog-remediation`) is
  also merged into `preview`.** Not CRM-scoped — mentioned only because it
  touched `app/reviews/page.jsx` and `app/work/[slug]/page.jsx`, the same
  files Phase 1's browser pass will exercise, so don't be surprised to see
  `BreadcrumbSchema`/JSON-LD markup on those routes; it's expected and unrelated
  to CRM behavior.
- **Phase 1 (below) has been run.** Full detail in `STATUS.md`'s "Session
  update (2026-08-09, Phase 1 CRM verification)". Summary: post-message and
  edit-message are now verified end-to-end through the real browser UI
  (previously impossible — see the three bugs below), PM-assignment and
  cross-session Realtime delivery are **not yet verified** (owner-only admin
  account, tooling limitation respectively — see that section for exact next
  steps). Two real test accounts + a test project were deliberately left in
  the live database to make the remaining verification easy — see
  `STATUS.md` for credentials and cleanup instructions.
- **Three real, previously-undetected bugs were found and fixed**, all in
  code that had existed for days-to-weeks without ever being exercised
  through a real database call: `ProjectThread.jsx` passed a fake viewer
  object missing `id`/`company_id`, so message loading has *never* worked,
  for any role, on any project, since 2026-08-03 (fixed in app code);
  `post_project_message`/`onboard_client_company` used
  `pg_catalog.coalesce`/`nullif`, which is invalid Postgres syntax (COALESCE/
  NULLIF can't be schema-qualified) — no message has ever been postable
  through the live RPC endpoint since migration `0009` (fixed in migration
  `0016`); `audit_events_event_type_check` never included
  `'project.message_edited'`, the exact same class of gap already documented
  for migration `0010` (fixed in migration `0017`). Full detail, including
  why none of this was ever caught by `pnpm test` or code review, is in
  `STATUS.md`.
- **New highest-priority finding, not yet fixed — see Implementation Phase 0
  below (inserted ahead of the original Phase 1):** RLS on `public.profiles`
  has no policy letting project participants see each other's profiles, only
  their own row (plus admin, plus a deal-owner exception). This silently
  breaks name resolution — sender names, task assignees, approval/deliverable
  actors — across the *entire* project workspace for every role whenever the
  target isn't the viewer. Confirmed directly via a scoped JWT query, not
  inferred.
- **Production's Vercel deployment pipeline was broken independently of all
  CRM work** — `main`'s `vercel.json` still had a `*/15 * * * *` cron the
  Hobby plan rejects, so every deploy from `main` had been failing since
  PR #56; fixed and confirmed live. Also: `NEXT_PUBLIC_CRM_ENABLED` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` did not exist at all in Vercel's env vars
  (not missing a value — the keys themselves didn't exist), which is why the
  CRM was fully public on `www.crystalwebsolution.com` regardless of app
  code. Both now exist; `NEXT_PUBLIC_CRM_ENABLED=false` is scoped to
  Production only (confirmed via live HTTP check: `/login`, `/dashboard`,
  `/admin` all redirect home on production; CRM stays reachable on `preview`).
  This is `production`-branch/Vercel-config housekeeping, not CRM app code —
  recorded here only so it isn't mistaken for still-open work.

## 1. Requirements & Constraints

- **REQ-001**: A real, logged-in browser click-through of all three roles
  (client / project_manager / admin) against a live `preview` deployment —
  **never done**; every verification to date has been Supabase MCP queries
  plus `pnpm test`/`pnpm build`, not an actual session. Now unblocked by
  Section 0's migration fix. Minimum script: post a project message, confirm
  an email arrives; edit that message, confirm an edit email arrives; assign
  a PM from the admin UI, confirm both the email and the projects-list
  "Project Manager" column populate; open the same project in two browser
  sessions (e.g. two roles) and confirm a posted message appears live in the
  second session without a manual reload (Realtime).
- **REQ-002**: Decide whether `priority`/`client_visible` (schema columns
  since migration `0011`, still unexposed) should be settable via
  `create_project_task`/`update_project_task`, and whether `client_visible`
  should filter task visibility for the `client` role. If yes: add the RPC
  parameters, add the read-model filter, add UI controls. If no: document
  the decision in `STATUS.md` the same way `budget_amount`/`currency`'s
  "not yet" decision is already documented, so it stops appearing as an
  open question every session.
- **REQ-003**: Same decide-or-document treatment for `budget_amount`/
  `currency` client visibility — `clientSafeProject()` in `lib/crm/projects.js`
  currently strips both for the `client` role, deliberately but not as a
  modeled business decision.
- **REQ-004**: Fix `updateProjectTask`'s `revalidateAllProjectPaths` wrong-id
  bug (`app/actions/project-actions.js`) **before** any task-edit UI is added
  to `ProjectTasks.jsx` — it's currently unreachable (no update control
  exists yet), which is exactly the state `updateProjectApproval`'s
  equivalent bug was in before it shipped broken. Fix it first, then build
  the task-edit UI on top of the fixed call site, not the other way around.
- **REQ-005**: Resolve the companies/contacts `NotesPanel` prop mismatch —
  `NotesPanel` is `projectId`-scoped but `app/admin/companies/[id]/page.jsx`
  and the contacts equivalent still pass `companyId`/`contactId`, so notes
  silently never load or save there. This needs a design decision first
  (a company/contact can have zero-to-many linked projects, unlike the
  deal-detail-page case PR #49 already fixed by resolving `source_deal_id`
  to a single project) — do not apply a mechanical fix without picking one
  of: (a) a project picker on the page, (b) a new company/contact-scoped
  notes table, (c) something else. Record the chosen option in `STATUS.md`.
- **REQ-006**: Finish the CRM loading-state pass. `Spinner.jsx`/`Skeleton.jsx`
  exist and already cover the list pages (companies/contacts/deals/tasks/
  users). Remaining: detail/edit/new pages, the three role project-workspace
  pages, and inline button-loading text (Save/Submit/Sending/Uploading)
  across roughly 19 files still showing plain `"Loading..."` text.
- **REQ-007**: Reconcile the `fix_handle_new_user_coalesce` live-only
  migration (applied 2026-08-04, no corresponding local file) into a tracked
  migration file. Its live function body already matches local `0014`'s
  `handle_new_user()` (previously verified) — this is bookkeeping, not a
  functional change. **Numbering note**: local migrations now go up to
  `0017` (`0016`/`0017` were used this session for the two live bugs found
  during Phase 1 — see Section 0) — name this reconciliation file
  `0018_track_handle_new_user_coalesce_hotfix.sql`
  and make it a no-op/idempotent `create or replace` of the same function
  body, not a fresh change, so applying it against the live database (which
  already has the fix) is safe.
- **REQ-008**: Confirm the Supabase Auth "Redirect URLs" allow-list is
  populated. As of the last check it was empty, which means GoTrue rejects
  every emailed auth link (signup confirmation, password reset, staff
  invite) regardless of anything in this repo's code. **This is an owner-only
  Supabase Dashboard action, not fixable from a coding session** — if it's
  still empty when Phase 1's browser pass runs, expect auth-email links to
  fail and don't misdiagnose it as an app bug.
- **REQ-009**: Confirm local `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`/
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the browser Supabase client in
  `lib/supabase/browser.js` reads these specific names, not the non-prefixed
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` variants). This was fixed in Vercel's
  Production/Preview env vars this session (Section 0) but local dev
  parity hasn't been separately checked.
- **CON-001**: `pnpm` only; no lint script exists — don't add one.
- **CON-002**: All work in this plan lands on `preview`. Do not touch
  `production` (the git branch) or trigger any production deploy as part
  of this plan — that is out of scope and was handled separately this
  session (Section 0).
- **GUD-001**: Before starting Phase 2, 3, or 4 below (anything touching
  `app/actions/project-actions.js`, `components/crm/*`, `app/{dashboard,
  team,admin}/**`, or `supabase/migrations/*`), run `git branch -a` and
  `gh pr list` and read anything CRM-related that's open. `STATUS.md`
  documents a real incident (PR #49/#50) where two sessions independently
  fixed the same ~12 files without either knowing about the other — the
  reconciliation cost a full review pass.
- **GUD-002**: Every new migration file gets applied via the Supabase MCP
  and verified with a direct schema query (`pg_proc`/`information_schema.
  columns`/`pg_publication_tables` as appropriate) in the same session that
  writes it — don't leave a written-but-unapplied migration for a future
  session to discover, the way `0015` sat unapplied for a day.

## 2. Implementation Steps

### Implementation Phase 0: Cross-role profile visibility — DONE (2026-08-09)

- GOAL-000: Add an RLS policy on `public.profiles` letting project participants see each other's `id`/`full_name`/`avatar_url` when they share a project, without over-broadening read access to unrelated profiles or exposing fields (email, phone, role internals) that shouldn't travel with it.
- **Closed same day it was found.** `supabase/migrations/0018_profiles_shared_project_visibility.sql` — `private.shares_project_with()` mirroring `private.can_access_project()`'s logic exactly, full-row policy (checked the column list first: `id`/`role`/`full_name`/`company_id`/`avatar_url`/timestamps/`requested_staff_access` — nothing sensitive enough to need column restriction). Verified both directions: PM's JWT now sees the co-participant client's row (was invisible before); the same JWT still sees zero rows for two unrelated profiles (a different client, the real admin), confirming the policy didn't over-broaden. Confirmed visually in the browser too — the PM's conversation view now shows the real sender name instead of "Unknown".

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-P0-1 | Write a `SELECT` policy on `public.profiles` mirroring `private.can_access_project()`'s logic. | ✅ | 2026-08-09 |
| TASK-P0-2 | Decide row-vs-column scoping. | ✅ full-row — no sensitive columns present | 2026-08-09 |
| TASK-P0-3 | Apply + verify via scoped-JWT query and browser re-check. | ✅ | 2026-08-09 |
| TASK-P0-4 | Spot-check no over-exposure. | ✅ two unrelated profiles confirmed still invisible | 2026-08-09 |

### Implementation Phase 1: Live three-role verification (REQ-001) — DONE except one owner-only item

- GOAL-001: Prove PR #60's notification/messaging/PM-assignment work actually functions end-to-end, not just in code review.
- **Status as of 2026-08-09: TASK-001 through TASK-003, TASK-005, and TASK-006 are all done** — see `STATUS.md`'s "Session update (2026-08-09, Phase 1 CRM verification)" for full detail, including three bugs found and fixed along the way, the Phase 0 RLS gap (found and closed same day), and Realtime cross-session delivery confirmed via a standalone script (the browser tool's tabs share cookies, so that specific method couldn't prove it — a two-independent-client Node script did). **Only TASK-004 remains open**, and only because it needs the real, pinned admin account — no session running as an agent can complete it. Pick up there; don't redo anything else.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-001 | Get (or create) one test account per role — client, project_manager, admin — against the live Supabase project. Confirm REQ-008 (Redirect URLs) first; if it's still empty, use `admin_resolve_staff_request()`/direct profile role updates via SQL to bypass broken email-based signup confirmation rather than blocking this phase on an owner-only dashboard fix. | ✅ (client + PM; admin can't be created — pinned to a single real email) | 2026-08-09 |
| TASK-002 | As the client, post a project message. As the assigned staff/admin, confirm an email arrives (check Resend's dashboard or the `notifications_outbox` table's `status`/`attempts` columns if inbox access isn't available). | ✅ verified through the real browser UI; both `in_app`/`email` outbox rows confirmed | 2026-08-09 |
| TASK-003 | Edit that message as its author. Confirm a second, distinct email fires for the edit (not a duplicate of the post email — check `event_type = 'project.message_edited'` in the outbox). | ✅ verified through the real browser UI; "edited" indicator renders, distinct outbox pair confirmed | 2026-08-09 |
| TASK-004 | As admin, assign a project_manager to a project via `app/admin/projects/[id]/page.jsx`'s assignee picker. Confirm the assigned user gets an email, and confirm the admin projects list's "Project Manager" column now shows a name instead of "—". | **Open — needs the real admin account** (`ethan@crystalwebsolution.com`, pinned by DB trigger; no way to create a test admin). The test project + PM test user are already set up for this — see `STATUS.md`. | |
| TASK-005 | Open the same project in two separate browser sessions (e.g. incognito + normal, or two roles). Post a message in one; confirm it appears in the other without a manual reload (Realtime subscription working). | ✅ verified via a standalone Node script (`@supabase/supabase-js`, two independently-authenticated clients) since the browser tool's tabs share one cookie jar — PM subscribed, client posted via the real RPC, PM's channel received the INSERT event with full row data in ~5–12s. | 2026-08-09 |
| TASK-006 | Record the full verification result in `STATUS.md`, including anything that *didn't* work — this phase's entire point is to catch what code review can't. | ✅ | 2026-08-09 |

### Implementation Phase 2: RPC parameter exposure decisions (REQ-002, REQ-003)

- GOAL-002: Resolve two "not yet decided" schema columns so they stop recurring as open questions every session.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-007 | Decide `priority`/`client_visible` exposure (REQ-002). If exposing: add parameters to `create_project_task`/`update_project_task` (new migration, applied + verified per GUD-002), add a `client_visible` RLS/read-model filter for the `client` role, add the UI controls. If not: write the decision and rationale into `STATUS.md`'s "Known gaps" section, matching the existing `budget_amount`/`currency` entry's style. | | |
| TASK-008 | Decide `budget_amount`/`currency` client visibility (REQ-003). Same decide-or-document pattern as TASK-007. | | |

### Implementation Phase 3: Fix the latent task-edit bug before it ships (REQ-004)

- GOAL-003: Close `updateProjectTask`'s wrong-id bug while it's still unreachable, so it doesn't repeat the `updateProjectApproval`/`publishDeliverable` pattern of shipping broken the moment UI reaches it.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-009 | Read `updateProjectTask`'s `revalidateAllProjectPaths` call site in `app/actions/project-actions.js`, compare against `updateProjectApproval`'s already-fixed call site (PR #49) to confirm the exact same wrong-id pattern, and fix it the same way. | | |
| TASK-010 | Add a regression test asserting the correct id is passed (mirroring whatever test PR #49 added for `updateProjectApproval`, if one exists — if not, add one for both while here). | | |

### Implementation Phase 4: Notes-panel design decision + fix (REQ-005)

- GOAL-004: Make companies/contacts notes work, with a deliberate design choice recorded.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-011 | Pick one: (a) a project picker on the company/contact detail page that scopes `NotesPanel` to the selected project, (b) a new company/contact-scoped notes table + RPC, separate from `project_notes`, (c) another option if one surfaces during investigation. Record the choice and why in `STATUS.md` before implementing. | | |
| TASK-012 | Implement the chosen option. If (b), follow GUD-002 for the new migration. | | |

### Implementation Phase 5: Finish the CRM loading-state pass (REQ-006)

- GOAL-005: Replace remaining plain `"Loading..."` text with the existing `Spinner.jsx`/`Skeleton.jsx` components.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-013 | Enumerate the ~19 remaining files (detail/edit/new pages across companies/contacts/deals/tasks/users, the three role project-workspace pages, and inline button states) — `grep -rl "Loading\.\.\." app/ components/` as a starting point. | | |
| TASK-014 | Apply `Skeleton.jsx` to detail/edit/new page loading states and `Spinner.jsx` to inline button-loading text (Save/Submit/Sending/Uploading), matching the pattern already used on the list pages. | | |

### Implementation Phase 6: Migration and environment housekeeping (REQ-007, REQ-009)

- GOAL-006: Close the remaining bookkeeping gaps so local migration history and local dev env match what's actually live.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-015 | Write `0018_track_handle_new_user_coalesce_hotfix.sql` as an idempotent `create or replace function public.handle_new_user()` matching the already-live body (REQ-007). Apply and verify per GUD-002 — expect a true no-op against the live database, which is the point (it's tracking history, not changing behavior). | | |
| TASK-016 | Check local `.env.local` for `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (REQ-009). Add if missing, sourced from the same values now correctly set in Vercel. | | |

## 3. Alternatives

- **ALT-001**: Skip Phase 1's manual browser verification and trust the code review + `pnpm test` coverage instead. Rejected — `STATUS.md` explicitly flags this as never having been done, and this repo's own history (the 0009/0010 migration bugs that `pnpm test`'s regex-over-SQL-text contract checks never caught) is the direct argument against trusting static checks alone for this class of change.
- **ALT-002**: Apply a mechanical fix to the `NotesPanel` prop mismatch (REQ-005) without a design decision, e.g. just picking the company/contact's most-recently-created project. Rejected — `STATUS.md` explicitly calls this out as needing a real decision, unlike the deal-detail-page case where `source_deal_id` gives an unambiguous single project.

## 4. Dependencies

- **DEP-001**: Supabase MCP access for Phase 2/4/6's migrations (`apply_migration`, `execute_sql` for verification).
- **DEP-002**: A live `preview` Vercel deployment and test accounts for Phase 1's browser pass.
- **DEP-003**: Owner action on REQ-008 (Supabase Auth Redirect URLs) if Phase 1 needs working auth-email links rather than a SQL-level role-assignment workaround.

## 5. Files

- **FILE-001**: `STATUS.md` — updated after every phase per this repo's existing convention.
- **FILE-002**: `app/actions/project-actions.js` — Phase 2 (task RPC params), Phase 3 (revalidate-path fix).
- **FILE-003**: `components/crm/NotesPanel.jsx`, `app/admin/companies/[id]/page.jsx`, contacts equivalent — Phase 4.
- **FILE-004**: `components/crm/Spinner.jsx`, `Skeleton.jsx`, and the ~19 files consuming them — Phase 5.
- **FILE-005**: `supabase/migrations/0018_track_handle_new_user_coalesce_hotfix.sql` (new) — Phase 6.
- **FILE-007**: `supabase/migrations/0016_fix_pg_catalog_coalesce_syntax.sql`, `0017_add_message_edited_audit_event_type.sql` — already applied and committed this session (Section 0), listed here for completeness.
- **FILE-006**: `.env.local` — Phase 6 (local-only, not committed).

## 6. Testing

- **TEST-001**: Phase 1's manual browser script (TASK-002 through TASK-005) is the primary verification for this plan — it's the one thing every prior CRM session has deferred.
- **TEST-002**: `pnpm test` and `pnpm build` after every code change, same as every phase in the prior branch-consolidation plan.
- **TEST-003**: Direct schema verification (`pg_proc`/`information_schema.columns`/`pg_publication_tables`) immediately after every new migration, per GUD-002.

## 7. Risks & Assumptions

- **RISK-001**: REQ-008 (Redirect URLs allow-list) may still be unresolved when Phase 1 starts, since it's an owner-only action outside this plan's control. TASK-001 has an explicit fallback (SQL-level role assignment) so Phase 1 isn't fully blocked on it.
- **RISK-002**: Phase 4's design decision (REQ-005) has real scope uncertainty — option (b) is a schema change, option (a) is UI-only. Scope Phase 4's time budget after TASK-011's decision, not before.
- **ASSUMPTION-001**: `preview` remains the single active integration branch for all of this plan's work — no new parallel CRM-fix branch should be opened without first checking `gh pr list` per GUD-001.

## 8. Related Specifications / Further Reading

- [STATUS.md](../STATUS.md) — full incident history, current verification state, and the section this plan's Section 0 updates.
- [docs/plans/feature-crm-website-completion-1.md](feature-crm-website-completion-1.md) — the plan this one continues from (PR #60, now merged).
- [docs/archive/process-branch-consolidation-1.md](process-branch-consolidation-1.md) — the branch-consolidation plan executed earlier the same session that produced this one; not CRM-scoped but explains why `preview` is in its current merged state.
