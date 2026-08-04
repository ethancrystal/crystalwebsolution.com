# Crystal Web Solution CRM - Implementation Status

## 📅 Last Updated: 2026-08-04
## 👤 Last Agent: Claude
## 🔗 Current Branch: `main`
## 🔑 Source of Truth
- Checked-in migrations: canonical `supabase/migrations/0001` … `0014`;
  live history intentionally omits `0007` and records the ad-hoc `0009b`
  operation before canonical `0009`–`0011` (see below)
- Project read boundary: `lib/crm/projects.js`
- Server actions: `app/actions/project-actions.js`
- Contract/read-model tests: `tests/crm/*.test.mjs`
- Supabase project ref: `wmnjosiikehsuaqucvja`

## 🗺️ Current shape of the app (2026-08-04)

**Stack:** Next.js 15 / React 19, plain JSX + global CSS (no TypeScript, no
Tailwind), Supabase (Postgres/Auth/Storage/RLS), Resend for transactional
email, GSAP/Lenis-driven scroll animation on the marketing site. `pnpm`
only; no lint script exists, don't add one.

**Two halves of one app:**
- **Marketing site** (`/`) — one fixed WebGL canvas (`components/Scene.jsx`)
  the DOM scrolls over; camera path driven by `lib/journey.js`
  `STOPS`/`CLUSTERS` against real measured beat positions
  (`lib/beatProgress.js`). Sections: Hero, About, Services, Approach,
  Stories, Mark, Lab, Motion, Contact. See `CLAUDE.md`'s "core idiom"
  section before touching anything scroll/animation-related.
- **CRM** (`/login`, `/dashboard`, `/team`, `/admin`) — three roles, gated by
  `middleware.js` at the server edge for the entire subtree of each portal
  (`/dashboard/**`→client, `/team/**`→employee, `/admin/**`→admin), backed
  by RLS. Two data-access shapes coexist deliberately (see CLAUDE.md's
  "Conventions" section): the contract-tested project-delivery path
  (`lib/crm/projects.js` + `app/actions/project-actions.js`) for
  dashboard/team/admin project pages, and direct-Supabase-client + RLS for
  companies/contacts/deals/tasks/users.

**Auth model** (as of migration `0014`, 2026-08-04): clients self-signup via
`/signup`. Signup also offers a client/employee choice, but the choice only
sets `profiles.requested_staff_access` — it can never mint a role by itself;
`handle_new_user()` still hardcodes every new account to `client`. An admin
promotes a pending request to `project_manager` via
`admin_resolve_staff_request()`. The `admin` role is pinned in the database
to a single address (`public.pinned_admin_email()` + a partial unique index
+ a `BEFORE INSERT OR UPDATE OF role` trigger) — it cannot be reached from
signup, invite, or any role-change path, by design.

**Current verification (2026-08-04):** `pnpm test` — 146/146 passing (full
suite, up from 110 at the last full check — new coverage added for the
services signal metadata, the notes/deliverables migration contract, and
the client-workspace project-scoping regex). `pnpm build` — clean, no
errors or warnings, 43 pages.

**Recent PRs merged today (2026-08-03/04), most-recent first:**
- **#54** `feat(auth): client/employee signup choice with a pinned single admin` — migration `0014`, the auth model described above, plus a fix for a live signup crash (`createAdminClient()` throwing unguarded when the service-role key is unset).
- **#53** `fix(deps): cookie override regression` — **urgent hotfix**. PR #51's dependency chore added an unbounded `pnpm.overrides["cookie"] = ">=0.7.0"`, which resolved to `cookie@2.0.1` (a completely different, incompatible API — no `parse`/`serialize`). `@supabase/ssr` needs the old API for every auth cookie it sets, so login/signup/session-refresh across all three portals would have thrown at runtime. Bounded to `>=0.7.0 <1.0.0`. **If you're reading this after `main` diverges further, verify this range hasn't been widened again.**
- **#52** About-section kicker/word-grid overlap fix (real bug: fixed-position kicker vs. viewBox-scaled SVG word grid collided on short-but-wide viewports, not just narrow phones — a width-based media query couldn't catch it) + started a shared CRM loading-state system (`components/crm/Spinner.jsx`, `Skeleton.jsx`).
- **#51** Dependency chore (see #53 — this is the PR that introduced the regression #53 fixed).
- **#49** CRM core-flow fixes: PM status transitions/task creation were calling undefined functions (completely broken), PM had no way to discover assigned projects, every client with a company got "unauthorized" instead of their project list, admin invite cleanup used the wrong Supabase client, client messaging/uploads were bypassing RLS-revoked direct table writes instead of the validated RPCs, a deal's chat/notes were wired to the wrong entity. Also migration `0013` (`post_project_note`, `create_project_deliverable` + storage policies).
- **#48** ServiceRail wireframe/rotation-speed signal-index bug (post six-to-eight-service-row split, the wireframe treatment stayed pinned to index 2 instead of following the signal it was designed for) + gated its per-frame rotation by `motionScale.value` (it was the only animated 3D actor not respecting `prefers-reduced-motion`).

**Closed as stale/superseded** (confirmed by reading their actual diffs, not assumed): #26 (pre-dates the entire current CRM architecture), #29 (redundant no-op changes), #39 (main already has a newer dependency version), #46 (~95% already on `main` verbatim; the one real gap - `lib/beacon.js`/`lib/pointerState.js` missing from CLAUDE.md's singleton list - was too small to be worth its own PR). #50 was closed after reconciliation into #49 - see the "duplicate-work incident" note below, still relevant reading before starting broad CRM audit work.

**Left alone, not stale**: #8 (`feature/trionn-visual-parity-v2`) is a deliberately parked foundation branch for a future redesign - not abandoned, just not picked up yet. #45 ("Session record...") is an audit/record artifact (base is an old baseline branch, head is `main` - backwards for a normal merge), not meant to be merged in the usual sense.

**In progress**: a CRM-wide loading-state pass (skeletons on list pages, spinners on detail/edit/workspace pages and inline button states) - `Spinner.jsx`/`Skeleton.jsx` exist and are applied to companies/contacts/deals/tasks/users list pages; the remaining ~19 detail/edit/new/workspace pages and inline button-loading text are still on plain `"Loading..."` text.

**Minor drift to reconcile**: the live database has a migration named `fix_handle_new_user_coalesce` (applied 2026-08-04, right after `0014`) with no corresponding local file. Compared its live function body against local `0014`'s `handle_new_user()` - they match, so this looks like a same-day hotfix whose content was folded directly into `0014`'s file rather than tracked as a separate `0015`. Not a functional problem, but worth a real `0015` file (or a note in `0014`) so local migration history has no unexplained gap - same category of issue the "check open branches/PRs" guidance below exists to prevent.

## ⚠️ Check open branches/PRs before starting CRM fix work

**Incident (2026-08-03):** two separate agent sessions independently ran a
CRM bug audit and both fixed largely the same findings, in the same ~12
files, without either being aware of the other (PR #49 `fix-crm-core-flows`
and PR #50 `workflow-crm-ultracode-sweep`, plus a third session that landed
its own migration `0012` directly on `main` while a fourth landed the
email/cron-drain rewrite in commits `880c4d6`/`3f76c84`). Reconciling this
took a full review pass to find PR #50's overlapping reimplementations were
independently broken in ways PR #49's tested versions weren't (a missing
`await` on an async `createClient()`, a wrong Supabase count-query
destructure, an undefined-variable `ReferenceError`, a response-shape
mismatch, incomplete role-routing) — see PR #49's merge commit for the
full comparison and PR #50's closing comment for the itemized verdict.

**Before starting any broad CRM bug-fix/audit pass:**
1. Run `git branch -a` and `gh pr list` and read anything CRM-related that's
   open before touching `app/actions/project-actions.js`, `components/crm/*`,
   `app/{dashboard,team,admin}/**`, or `supabase/migrations/*` — these are
   the files most likely to collide.
2. Check the migration number actually live on Supabase
   (`list_migrations` via MCP, or `supabase migration list`) before naming a
   new migration file — local `supabase/migrations/` and what's actually
   applied can drift when multiple sessions work in parallel worktrees.
3. If you find an open PR touching the same files you're about to fix, stop
   and reconcile rather than opening a third parallel implementation.

## 🗄️ Migrations 0012–0013 (2026-08-03)

- `0012_project_task_update_fixes.sql` — fixes `update_project_task`'s
  NULL-permissive assignee check and its silent overwrite of
  assignee_id/due_date on partial updates. Applied live directly (by a
  separate session, reconciled after the fact); now checked into `main`'s
  migration history in sequence.
- `0013_project_notes_and_deliverables.sql` — adds `post_project_note()`
  (lets `NotesPanel.jsx` post a standalone update despite
  `project_status_history.to_status` being NOT NULL) and
  `create_project_deliverable()` + matching `storage.objects` policies
  (the only INSERT path `project_deliverables` has ever had). Applied live
  via Supabase MCP `apply_migration`, verified by direct query
  (`pg_proc`/`pg_policies`) after applying. App-code wiring (server actions
  + UI) is in PR #49, gated on this migration already being live — it is.

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

**Resolved since first documented — kept here so the fix history is traceable:**
- ~~No notification delivery pipeline~~ — fixed. The email module was unified (`lib/email/resend.js`/`templates.js`) and `app/api/cron/crm-notifications/route.js` now actually drains `notifications_outbox` (claims a batch of due `channel='email'` rows, sends via Resend, records `status`/`sent_at`/`attempts`/`last_error` with backoff, fails closed when `CRM_CRON_SECRET` is unset).
- ~~`update_project_task`'s NULL-permissive authorization check~~ — fixed in migration `0012`: unassigned tasks now require `assignee_id IS NOT NULL AND assignee_id = v_user_id` instead of relying on `NULL <> x` silently evaluating false.
- ~~`update_project_task` unconditionally overwrote `assignee_id`/`due_date`~~ — fixed in `0012`: only overwrites when the caller explicitly passes a value.
- ~~`project_status_history`/`project_deliverables` had no valid write path for notes/deliverable-creation~~ — fixed in migration `0013` (`post_project_note`, `create_project_deliverable` + `storage.objects` policies), wired into `NotesPanel.jsx`/`ProjectFiles.jsx` in PR #49.
- ~~`cookie` package resolved to an incompatible major version, breaking auth cookies~~ — fixed in PR #53 (`pnpm.overrides` bounded to `>=0.7.0 <1.0.0`).

**Still open:**
- **`priority`/`client_visible` (0011) are not yet settable via RPC** and `client_visible` is not enforced anywhere — `create_project_task`/`update_project_task` don't accept them as parameters yet.
- **`budget_amount`/`currency` are not exposed to the `client` role** — `clientSafeProject()` deliberately unchanged. Conservative default, not a modeled decision; revisit if clients should see budget.
- **`revalidateAllProjectPaths` passed the wrong id** in `updateProjectTask`/`updateProjectApproval` before PR #49 fixed `updateProjectApproval`'s call site specifically (when `ProjectApprovals`' approve/reject UI was wired up). `updateProjectTask`'s equivalent call is still wrong, but `ProjectTasks.jsx` has no update UI yet, so it's unreachable today — fix it *before* adding task-edit UI, not after, to avoid shipping the same freshly-reachable bug again.
- **Companies/contacts `NotesPanel` prop mismatch**: `NotesPanel` is project-scoped (`projectId` prop) but the companies/contacts detail pages still pass `companyId`/`contactId`, so notes silently never load or save there. Unlike the equivalent deal-detail-page bug (fixed in PR #49 by looking up the deal's linked project via `source_deal_id`), a company/contact can have zero-to-many projects, not one — needs a real design decision (which project? a picker? restore company/contact-scoped notes on a different table?), not a mechanical fix.
- **CRM loading states**: in progress, see "Current shape" above.
- **Migration drift**: the `fix_handle_new_user_coalesce` live-only migration, see "Current shape" above.
- **Unconfirmed**: whether `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (flagged as missing earlier; only non-prefixed `SUPABASE_URL`/`SUPABASE_ANON_KEY` were present, which the code doesn't read for client-side Supabase init) and whether the Supabase Auth "Redirect URLs" allow-list has been populated in the dashboard (was empty; without it, GoTrue rejects every emailed auth link). Both need the owner to check/fix directly — no tool access to confirm from here.
- **Live end-to-end verification still isn't done via a logged-in browser session** — verification throughout has been direct Supabase MCP calls against the live schema (`list_tables`, `list_migrations`, `execute_sql`, `get_advisors`) plus `pnpm test`/`pnpm build`, not an actual signed-in click-through of login/signup/CRM flows in a browser.

### ✅ Verification
- `pnpm test` — 110/110 passing (full suite, includes `tests/crm/*`)
- `pnpm build` — production build passes
- Read-only Supabase inspection confirmed canonical `0009`–`0011` and all 18
  public CRM tables with RLS enabled; checked-in historical `0007` remains
  intentionally absent from live migration history.
- Historical 2026-08-01 state: deployed to Vercel production and aliased to
  `https://www.crystalwebsolution.com`. The 2026-08-02 cleanup did not deploy.

### 🚧 In Progress / Next (2026-08-04)
- Finish the CRM loading-state pass: `Spinner.jsx`/`Skeleton.jsx` exist and cover the list pages; detail/edit/new pages, the three role project-workspace pages, and inline button-loading text (Save/Submit/Sending/Uploading across ~19 files) are still plain `"Loading..."` text.
- Decide whether `priority`/`client_visible` should be exposed via `create_project_task`/`update_project_task`, and whether `client_visible` should filter task visibility for the `client` role.
- Decide whether `budget_amount`/`currency` should be client-visible.
- Resolve the companies/contacts `NotesPanel` prop mismatch (needs a design decision, not a mechanical fix — see "Known gaps" above).
- Fix `updateProjectTask`'s `revalidateAllProjectPaths` wrong-id bug before shipping any task-edit UI (currently unreachable, would become live the moment `ProjectTasks.jsx` gets an update control, same pattern as the `updateProjectApproval`/`publishDeliverable` bugs already fixed once each became reachable).
- Reconcile the `fix_handle_new_user_coalesce` live-only migration into a tracked local file.
- Confirm `.env.local`'s `NEXT_PUBLIC_SUPABASE_*` vars and the Supabase Auth "Redirect URLs" allow-list (owner action, not something verifiable from a coding session).
- Run `pnpm crm:verify` (`test:crm && test:db`) with a proper local Supabase stack once available — `test:db` still hasn't been run.
- A real, logged-in browser click-through of login/signup/CRM flows for all three roles is still outstanding — everything to date has been verified via Supabase MCP + `pnpm test`/`pnpm build`, not an actual session.

### 📋 How to Continue
1. Re-run `pnpm test` and `pnpm build`.
2. Read the "⚠️ Check open branches/PRs before starting CRM fix work" section above *before* starting any broad CRM audit/fix pass — this exact mistake has happened twice this week (PR #49/#50, and the untracked `fix_handle_new_user_coalesce` migration).
3. Update this file with any new findings/commits before ending the session.
