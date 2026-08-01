# Crystal Web Solution CRM - Implementation Status

## 📅 Last Updated: 2026-08-01
## 👤 Last Agent: Claude (Sonnet 5)
## 🔗 Current Branch: `claude/work-implementation-progress-b3e5ab`
## 🔑 Source of Truth
- Checked-in migrations: `supabase/migrations/0001` … `0010` (all now applied remotely — see below)
- Project read boundary: `lib/crm/projects.js`
- Server actions: `app/actions/project-actions.js`
- Contract/read-model tests: `tests/crm/*.test.mjs`
- Supabase project ref: `wmnjosiikehsuaqucvja`

### ✅ Completed this session
- **Fixed a real regression**: `app/dashboard/projects/[id]/page.jsx` didn't call the Phase 1 read functions (`listProjectTasks`, `listProjectApprovals`, `listProjectDeliverables`, `listNotifications`) the prior commit's own test expected. Wired them in, added `components/crm/NotificationsPanel.jsx`.
- **Fixed a real data bug**: `listProjectTasks`/`listProjectApprovals`/`listProjectDeliverables` in `lib/crm/projects.js` returned raw rows with no profile joins, so assignee/requester/reviewer names always rendered "Unknown"/"Unassigned". Added the same profile-mapping `getProjectWorkspace` already did. Also fixed `getProjectWorkspace` itself, which had the identical gap for `tasks`/`approvals` (deliverables was already fixed) — this silently broke names on the **admin and team** project pages too, not just the client one.
- **Closed the Supabase migration drift** (see below) — the live database was missing every project/workspace table before this session.

### 🗄️ Supabase migration state (verified via MCP against the live project)
Before this session, remote had only run 0001–0006 + 0008 (**0007 and 0009/0010 were never applied**), plus one ad hoc migration with no repo file: `0009b_drop_legacy_project_message_tables` (dropped the old deal-based `project_messages`/`project_files` tables outright). Net effect: **the entire `projects` schema — everything the last several commits' UI code depends on — did not exist in the live database.** `pnpm test` never catches this because every CRM test is a regex-over-SQL-text contract check; nothing in this repo has ever executed against a real database.

Actions taken:
- **0007 (`notes_creation_scoping`) — deliberately skipped, not applied.** Its target policy (`"Any authenticated user can create notes"`) no longer exists on remote; 0008 already replaced the entire notes RLS surface with a stricter, more complete model (role+deal+contact scoped policies) that fully supersedes 0007's intent. Applying 0007 would either hard-error or reintroduce weaker, already-superseded policies. Left as historical/dead in the repo.
- **0009 (`project_realtime_crm`) — patched and applied.** As written, it unconditionally required `public.project_messages`/`public.project_files` to exist (to rename them aside) — but the ad hoc 0009b already dropped them. Rewrote the guard block to be existence-safe (`to_regclass(...)`) so it works both on a fresh install (tables exist, full guard-then-rename runs) and on this already-cleaned-up remote (no-op). Updated `tests/crm/project-schema.test.mjs` to match.
- **0010 (`project_workspace`) — two real bugs fixed before applying, neither ever caught by tests or a real run:**
  1. `project_approvals` was created with a foreign key to `project_deliverables`, but `project_deliverables` was defined *after* it in the same file — would have failed immediately with "relation does not exist". Reordered.
  2. `audit_events`'s CHECK constraint (from 0009) only allowed the original 7 event types; none of 0010's 6 new event types (`project.task_created`, `project.approval_requested`, etc.) were in it. Every task/approval/deliverable/notification RPC would have failed at runtime on its own audit-log insert. Widened the constraint as part of 0010.
- Remote now has all 18 expected tables (verified via `list_tables`), RLS enabled and forced on every one. `get_advisors(security)` shows only the pre-existing, intentional pattern (SECURITY DEFINER functions callable by `authenticated`, each with its own internal auth checks) — no new findings from this session's changes. `get_advisors(performance)` shows only WARN/INFO noise (unused indexes on empty tables, etc.), no errors.

### ⚠️ Known gaps (found but intentionally not fixed this session — flagging for a decision, not silently patched)
- **Notifications have no real delivery pipeline.** `enqueue_project_notification` and `listNotifications`/`NotificationsPanel` exist and work, but nothing calls `enqueueNotification` from any UI action (task created, approval requested, etc.), and `app/api/cron/crm-notifications/route.js` is a stub that always returns `{queued: 0}` — no email sending despite the `resend` dependency being present. The outbox table will stay empty until this is built.
- **`update_project_task` (0010) has two logic nuances**, neither a migration-blocker: (1) its authorization check `v_task.assignee_id <> v_user_id` is NULL-permissive — an *unassigned* task can be updated by any project participant, not just the intended assignee, because `NULL <> uuid` evaluates to NULL/false in the `IF`. (2) `assignee_id`/`due_date` are unconditionally overwritten from the (nullable, default-null) params, unlike `title`/`description`/`status` which only update when explicitly passed — so calling the RPC to change just the status will silently clear the assignee and due date. Worth a decision on intended behavior before this ships.
- **Live end-to-end verification wasn't possible in this session** — no `.env.local` / Supabase credentials in this worktree, and provisioning test users (`pnpm crm:provision-test-users --execute`) sends real invite emails to live-looking addresses, which needs explicit go-ahead first. Everything above was verified via direct Supabase MCP calls against the live schema (`list_tables`, `list_migrations`, `execute_sql`, `get_advisors`) plus `pnpm test` / `pnpm build`, not a logged-in browser session.

### ✅ Verification
- `pnpm test` — 106/106 passing (full suite, includes `tests/crm/*`)
- `pnpm build` — production build passes
- Remote schema confirmed to match the checked-in migrations via Supabase MCP (`list_tables`, `list_migrations`)

### 🚧 In Progress / Next
- Decide whether to build the notification delivery pipeline (cron processing + actual sends) or leave it scaffolded.
- Decide intended behavior for `update_project_task`'s partial-update semantics and unassigned-task authorization, then patch if needed.
- Run `pnpm crm:verify` (`test:crm && test:db`) with a proper local Supabase stack once available — `test:db` has not been run this session.

### 📋 How to Continue
1. Re-run `pnpm test` and `pnpm build`.
2. If picking up notifications: wire `enqueueNotification` calls into the task/approval/deliverable server actions, then implement the cron route body.
3. Update this file with any new findings/commits before ending the session.
