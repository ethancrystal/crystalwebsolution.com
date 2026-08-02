# Crystal Web Solution CRM - Implementation Status

## 📅 Last Updated: 2026-08-02
## 👤 Last Agent: Codex
## 🔗 Current Branch: `main`
## 🔑 Source of Truth
- Checked-in migrations: canonical `supabase/migrations/0001` … `0011`;
  live history intentionally omits `0007` and records the ad-hoc `0009b`
  operation before canonical `0009`–`0011` (see below)
- Project read boundary: `lib/crm/projects.js`
- Server actions: `app/actions/project-actions.js`
- Contract/read-model tests: `tests/crm/*.test.mjs`
- Supabase project ref: `wmnjosiikehsuaqucvja`

### 🧹 Repository preservation cleanup (2026-08-02)

- Removed only explicitly approved generated residue, 12 reverified
  runtime-unreachable source files, their dead CSS, unused direct dependencies,
  and three rejected untracked migration alternatives.
- Restored historical migration `0007` to its committed bytes; canonical
  `0009`–`0011` were retained unchanged.
- Preserved the current public design, one-Canvas animation architecture,
  Lab DOM/CSS-3D carousel and fallbacks, Motion selected-work rail, all CRM
  routes/actions/read models, every branch, and every recovery stash.
- Repaired the `/login` portal chooser and linked `/signup` page without
  changing copy, routes, forms, or authentication behavior: both CWS marks are
  intrinsically bounded and centered, and the three intended portal controls
  render correctly through Next Link's styled-jsx boundary.
- Restored the generic `sendEmail` export already called by signup confirmation,
  password reset, and staff invite actions; the existing invite helper now
  shares that tested Resend boundary. No live email was sent during verification.
- Ended with one canonical worktree. Full worktree/stash recovery evidence is
  in `docs/WORKTREE-STATE.md`; the exact cleanup and retention manifest is in
  `docs/REPOSITORY-CLEANUP-2026-08-02.md`.
- Current verification: CRM tests 59/59, full suite 110/110, production build
  43/43 pages, desktop/mobile/browser CRM smoke checks with no console errors.
- Read-only live Supabase checks confirmed canonical migrations 0009–0011 and
  18 public CRM tables with RLS enabled. No database write or deployment was
  performed. Local `test:db` remains unavailable until Docker Desktop runs.

### 📌 Git checkpoint and remote boundary (2026-08-02)

- The reviewed cleanup/auth/documentation checkpoint is commit `aa50610`
  (`chore: preserve and consolidate repository state`). It contains no merge,
  rebase, cherry-pick, database write, or deployment.
- A pre-push fetch found that `origin/main` had independently advanced from
  `c5a922f` to `540887d` while this checkpoint was being finished. That remote
  commit changes only `CLAUDE.md` and was not merged or copied into the local
  checkpoint.
- Local `main` and `origin/main` therefore each have one unique commit. A
  force-push is prohibited; the preserved publication target for this exact
  checkpoint is `origin/codex/repository-cleanup-2026-08-02` until a future,
  explicitly authorized reconciliation decision is made.
- The newly requested Services-scene synchronization and responsive navigation
  overlap repairs were deliberately not mixed into this checkpoint. They remain
  the next public-UI work after this clean recovery point.

### 🔀 Branch reconciliation with `origin/main` (2026-08-01)

`origin/main` had diverged with a second, independent implementation of the same feature (commit `5b90c3c`, authored `ethancrystal`, file `supabase/migrations/0009_project_workspace.sql`, "Task 3: Project Delivery Aggregate"). It defined a different schema for the same aggregate: `project_members` instead of `project_assignments`, `create_delivery_project()`/`record_project_approval()` instead of `create_project()`/`update_project_approval()`, auth helpers in `public` instead of `private`.

Facts established before resolving:
- That file was **never applied to the live Supabase database**. `list_migrations` against the live project shows no matching entry.
- Its own `public.can_access_project()` calls `public.is_project_manager()`, which `0008_auth_rbac_repair.sql` never defines. The function would raise on first call — it could not have worked if invoked.
- This branch's migrations (`0009_project_realtime_crm.sql`, `0010_project_workspace.sql`) **are** applied to the live database (confirmed via `list_tables` — `project_assignments`, `create_project`, etc. exist; `project_members`, `create_delivery_project` do not).

Resolution: this branch's schema was kept as the base (it is what the live database and the already-deployed app code both run on). `supabase/migrations/0009_project_workspace.sql` was removed from the merge — keeping two files both claiming to be "0009" with contradictory content would misrepresent what's actually applied. `origin/main`'s version remains reachable in git history via commit `5b90c3c` if anyone needs to consult it.

Four things in `origin/main`'s design were genuinely stronger and were ported forward as a new additive migration, `0011_workspace_hardening_from_main.sql`, rather than editing the already-applied 0009/0010 files:
1. `projects.budget_amount` / `projects.currency` — projects had no budget tracking.
2. `project_tasks.priority` / `.client_visible` / `.completed_at` — tasks had no priority or completion tracking.
3. `project_deliverables.version` — deliverables had no version field.
4. `notifications_outbox` rebuilt as a retryable queue (`status`, `attempts`, `available_at`, `last_error`) instead of a bare `sent_at` timestamp.
5. **Automatic notification fan-out** — `origin/main`'s `transition_project_status`/`record_project_approval`/`publish_project_deliverable` each inserted a `notifications_outbox` row for every other project member on the affected action. This branch's equivalent functions (`transition_project_status`, `update_project_approval`, `publish_project_deliverable`) never did this — `enqueue_project_notification` existed but nothing called it. Ported the same fan-out pattern into all three, addressed to `project_assignments` rows instead of `project_members`.

Explicitly **not** ported, as a documented decision rather than an oversight:
- `priority` and `client_visible` are schema columns with defaults; they are **not** yet exposed as `create_project_task`/`update_project_task` parameters, so nothing can set them to a non-default value through the RPC surface yet. `completed_at` **is** wired — `update_project_task` sets/clears it automatically based on `p_status`.
- `client_visible` filtering is not enforced anywhere (no RLS policy or read-model filter checks it). Every project participant currently sees every task regardless of this flag, same as before this migration.
- `budget_amount`/`currency` are not exposed to the `client` role — `clientSafeProject()` in `lib/crm/projects.js` was deliberately left unchanged, so these two columns stay admin/PM-visible only. This is a conservative default, not a modeled business decision — revisit if clients should see budget.

### ✅ Completed 2026-08-01
- **Fixed a real regression**: `app/dashboard/projects/[id]/page.jsx` didn't call the Phase 1 read functions (`listProjectTasks`, `listProjectApprovals`, `listProjectDeliverables`, `listNotifications`) the prior commit's own test expected. Wired them in, added `components/crm/NotificationsPanel.jsx`.
- **Fixed a real data bug**: `listProjectTasks`/`listProjectApprovals`/`listProjectDeliverables` in `lib/crm/projects.js` returned raw rows with no profile joins, so assignee/requester/reviewer names always rendered "Unknown"/"Unassigned". Added the same profile-mapping `getProjectWorkspace` already did. Also fixed `getProjectWorkspace` itself, which had the identical gap for `tasks`/`approvals` (deliverables was already fixed) — this silently broke names on the **admin and team** project pages too, not just the client one.
- **Closed the Supabase migration drift** — the live database was missing every project/workspace table before this session (see next section).
- **Reconciled with `origin/main`'s competing implementation** and cherry-picked its stronger schema/notification ideas — see above.

### 🗄️ Supabase migration state (verified via MCP against the live project)
Before this session, remote had only run 0001–0006 + 0008 (**0007 and 0009/0010 were never applied**), plus one ad hoc migration with no repo file at the time: `0009b_drop_legacy_project_message_tables` (dropped the old deal-based `project_messages`/`project_files` tables outright). Net effect: **the entire `projects` schema — everything the last several commits' UI code depends on — did not exist in the live database.** `pnpm test` never catches this because every CRM test is a regex-over-SQL-text contract check; nothing in this repo has ever executed against a real database.

Actions taken:
- **0007 (`notes_creation_scoping`) — deliberately skipped, not applied.** Its target policy (`"Any authenticated user can create notes"`) no longer exists on remote; 0008 already replaced the entire notes RLS surface with a stricter, more complete model (role+deal+contact scoped policies) that fully supersedes 0007's intent. Applying 0007 would either hard-error or reintroduce weaker, already-superseded policies. Left as historical/dead in the repo.
- **0009 (`project_realtime_crm`) — patched and applied.** As written, it unconditionally required `public.project_messages`/`public.project_files` to exist (to rename them aside) — but the ad hoc 0009b had already dropped them. Rewrote the guard block to be existence-safe (`to_regclass(...)`) so it works both on a fresh install (tables exist, full guard-then-rename runs) and on this already-cleaned-up remote (no-op). Updated `tests/crm/project-schema.test.mjs` to match.
- **0010 (`project_workspace`) — two real bugs fixed before applying, neither ever caught by tests or a real run:**
  1. `project_approvals` was created with a foreign key to `project_deliverables`, but `project_deliverables` was defined *after* it in the same file — would have failed immediately with "relation does not exist". Reordered.
  2. `audit_events`'s CHECK constraint (from 0009) only allowed the original 7 event types; none of 0010's 6 new event types (`project.task_created`, `project.approval_requested`, etc.) were in it. Every task/approval/deliverable/notification RPC would have failed at runtime on its own audit-log insert. Widened the constraint as part of 0010.
- **0011 (`workspace_hardening_from_main`) — applied.** See "Branch reconciliation" above.
- Remote now has all 18 tables from 0009/0010 (verified via `list_tables`), RLS enabled and forced on every one, plus 0011's column additions. `get_advisors(security)` shows only the pre-existing, intentional pattern (SECURITY DEFINER functions callable by `authenticated`, each with its own internal auth checks) — no new findings from this session's changes. `get_advisors(performance)` shows only WARN/INFO noise (unused indexes on empty tables, etc.), no errors.

### ⚠️ Known gaps carried forward
- **Notifications are enqueued automatically now** (0011), but there is still no delivery pipeline that reads `notifications_outbox` and sends anything. `app/api/cron/crm-notifications/route.js` is a stub that always returns `{queued: 0}` — no email sending despite the `resend` dependency being present. Rows will accumulate with `status = 'pending'` and never move to `'sent'`.
- **`update_project_task`'s authorization check is NULL-permissive**: `v_task.assignee_id <> v_user_id` evaluates to `NULL`/false when `assignee_id` is `NULL`, so an *unassigned* task can be updated by any project participant, not just an assignee. Unchanged this session — a decision, not a bug fix, since it may be intentional (letting anyone claim an unassigned task).
- **`update_project_task`'s `assignee_id`/`due_date` are unconditionally overwritten** from the (nullable, default-null) params, unlike `title`/`description`/`status` which only update when explicitly passed — calling the RPC to change just the status will silently clear the assignee and due date. Unchanged this session.
- **`priority`/`client_visible` (0011) are not yet settable via RPC** and `client_visible` is not enforced anywhere — see "Branch reconciliation" above.
- **Live end-to-end verification wasn't possible in this session** — no `.env.local` / Supabase credentials in this worktree, and provisioning test users (`pnpm crm:provision-test-users --execute`) sends real invite emails to live-looking addresses, which needs explicit go-ahead first. Everything above was verified via direct Supabase MCP calls against the live schema (`list_tables`, `list_migrations`, `execute_sql`, `get_advisors`) plus `pnpm test` / `pnpm build`, not a logged-in browser session.

### ✅ Verification
- `pnpm test` — 110/110 passing (full suite, includes `tests/crm/*`)
- `pnpm build` — production build passes
- Read-only Supabase inspection confirmed canonical `0009`–`0011` and all 18
  public CRM tables with RLS enabled; checked-in historical `0007` remains
  intentionally absent from live migration history.
- Historical 2026-08-01 state: deployed to Vercel production and aliased to
  `https://www.crystalwebsolution.com`. The 2026-08-02 cleanup did not deploy.

### 🚧 In Progress / Next
- Build the notification delivery pipeline (cron processing + actual sends) that consumes the now-retryable `notifications_outbox`.
- Decide intended behavior for `update_project_task`'s partial-update semantics and unassigned-task authorization, then patch if needed.
- Decide whether `priority`/`client_visible` should be exposed via `create_project_task`/`update_project_task`, and whether `client_visible` should filter task visibility for the `client` role.
- Decide whether `budget_amount`/`currency` should be client-visible.
- Run `pnpm crm:verify` (`test:crm && test:db`) with a proper local Supabase stack once available — `test:db` has not been run this session.

### 📋 How to Continue
1. Re-run `pnpm test` and `pnpm build`.
2. If picking up notifications: implement the cron route body to process `notifications_outbox` rows (`status = 'pending' AND available_at <= now()`), sending via Resend and updating `status`/`attempts`/`last_error`.
3. Update this file with any new findings/commits before ending the session.
