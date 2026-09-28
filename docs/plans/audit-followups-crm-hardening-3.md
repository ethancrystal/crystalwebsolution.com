---
goal: Close every item the 2026-09-02 refactor and CRM audits left open — verified against code first, then fixed in three small production PRs
version: 3.0
date_created: 2026-09-03
last_updated: 2026-09-03
owner: Crystal Web Solution
status: In Progress — see the per-task ✅ column; PRs land as v1.27 (docs), v1.28 (frontend), v1.29 (database)
tags: [refactor, crm, rls, cleanup, docs]
---

# Audit follow-ups & CRM hardening (plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`
> (or `superpowers:subagent-driven-development`) to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax. **Before acting on any
> row below, re-read the cited file:line in the current checkout** — every
> audit that fed this plan had claims that did not survive a real code
> review (see §0), and this plan will drift the same way.

**Goal:** Resolve the ten open items surfaced by the refactor plan v2 close-out
and the two 2026-09-02 CRM audits (`crmfrontendqueryinventory.md`,
`crmdatamapbyrole.md`), correcting the audit claims that turned out to be
wrong so the next agent doesn't re-litigate them.

**Architecture:** Three independent PRs, ordered lowest-risk first. PR 1 is
docs-only (plan index, status corrections, Lighthouse report). PR 2 touches
frontend/read-model code with contract tests updated in the same commits.
PR 3 is migration `0041` plus its tests; applying it to production is a
separate owner-approved operation, not part of the merge.

**Tech stack:** Next.js 15 / React 19 (JSX, styled-jsx), Supabase Postgres
RLS, Node test runner (`tests/**/*.test.mjs`), vitest/jsdom
(`tests/marketing`, `tests/crm/*.test.jsx`), pgTAP (`supabase/tests`).

**Spec:** the two audit files on the owner's Desktop (not committed) and
`docs/plans/refactor-architecture-cleanup-2.md` §"open items". The owner's
decisions per item (2026-09-03) are recorded in each task's header.

## Global constraints

- Every PR into `main` bumps `VERSION` and adds a `CHANGELOG.md` entry, titled
  `vX.NN — <summary>` (`VERSIONING.md`). Numbers below are provisional;
  whichever PR merges later takes the next free number at merge time.
- `pnpm test`, `pnpm test:marketing`, `pnpm build` green after every task.
- `tests/crm/*.test.mjs` are regex-over-source contract tests. Grep `tests/`
  for every symbol you touch **before** editing, and update the test in the
  same commit.
- No production database change from a Claude session. Migration 0041 is
  written, tested, and reviewed here; the owner applies it
  (`docs/CRM-OPERATIONS.md` §Migrations).
- Another session is merging to `main` concurrently (PRs #174/#175 landed
  during this plan's investigation). `git pull --ff-only origin main` before
  every branch, and re-check `gh pr list` for overlapping files.

---

## 0. Audit claims re-verified (read this before touching anything)

| Audit claim | Verdict on 2026-09-03 | Evidence |
|---|---|---|
| `private.shares_project_with(uuid)` has no EXECUTE grant while a live `profiles` policy calls it | **Already fixed.** Live catalog shows `authenticated=X`; migration `0040` (PR #170, v1.18) restored it | `pg_proc.proacl` query; `supabase/migrations/0040_restore_shares_project_with_grant.sql:37-38` |
| Nine `project_*` tables have policies but no `ENABLE ROW LEVEL SECURITY` in any migration | **False.** All eleven have enable **and** force, in lowercase SQL the audit's grep missed | `0009:242-255`, `0010:114-121`; live `relrowsecurity=true, relforcerowsecurity=true` on all of them |
| `project_approvals` SELECT has no visibility filter | **True.** Clients read every approval incl. reviewer `note` | `0010:138-142`; live policy `private.can_access_project(project_id)` only |
| `notifications_outbox` SELECT has no channel filter | **True**, and the UI renders every channel, so the panel shows each event twice (`in_app` + `email`) | `0010:162-166`; `components/crm/NotificationsPanel.jsx:36-47` |
| Clients can read `deals.value` via a never-dropped 0001 policy | **True.** Also a 0003 client INSERT policy. No non-admin page reads or writes `deals`; `create_project` is SECURITY DEFINER and `can_access_deal` is SECURITY DEFINER, so dropping both is safe | `0001:189`, `0003:37-41`; grep `from('deals')` → `app/admin/**` only |
| `loadNewestMessages` has zero consumers | **True**, but it is 3 call sites inside `getProjectWorkspace`, not one, and there is no "profile join" | `lib/crm/projects.js:374-387, 425-429, 473, 499, 501` |
| Companies fetched then discarded on `/dashboard` | **Partly.** Discarded for clients only; admin/PM list UI and a test consume it | `lib/crm/projects.js:270-279`; `tests/crm/crm-read-model-hardening.test.mjs:248-261` |
| Assignments fetched then forced to `[]` on `/dashboard/projects/[id]` | **True** for clients; RLS already returns zero rows, so skipping the query is behaviour-preserving | `lib/crm/projects.js:409-415, 465`; `0009:362-365` |
| `blog-actions.js:158-162` read is only for revalidation | **Not dead.** It revalidates the *old* slug on rename; a contract test pins it | `app/actions/blog-actions.js:156-183`; `tests/crm/blog-authoring-contract.test.mjs:68` |
| `getUserProfile` has no callers | **True.** Single definition, zero references | `app/auth/actions.js:162-179` |
| `NotesPanel` renders whatever RLS returns with no filter | **Correct by design.** The shared/internal policy pair on `project_status_history` already scopes clients | `0009:413-428` |
| Custom cursor is an "unbuilt feature" | **False.** `components/Cursor.jsx` shipped in the initial commit and was removed in PR #10 (`1a2807c`, 2026-07-13) "per design feedback that it cluttered the page." The 51 `data-cursor` attributes, `app/styles/cursor-loader.css:1-40`, and `app/styles/reset.css:19` are leftovers of that removal | `git show 1a2807c --stat` |

---

## PR 1 — v1.27 — plan ledger, audit corrections, Lighthouse report (docs only)

### Task 1: Plan index for agents

**Files:**
- Create: `docs/plans/README.md`
- Modify: `docs/plans/refactor-architecture-cleanup-1.md:1-9` (frontmatter `status`)
- Modify: `docs/plans/refactor-architecture-cleanup-2.md:1-9` (frontmatter `status`) and every blank `Completed`/`Date` cell in Phases 1–4

- [ ] **Step 1:** Write `docs/plans/README.md` with: a status table of every file in `docs/plans/` (Complete / In progress / Planned / Superseded / Reference, with the PR or version that closed it), the "where results live" map (`CHANGELOG.md` → `docs/reports/` → `STATUS.md`), and an **Agent protocol** section requiring a real code review of each cited file:line before acting on any plan row.
- [ ] **Step 2:** Fill Phases 1–4 of `refactor-architecture-cleanup-2.md` from `CHANGELOG.md` v1.18/v1.19/v1.20/v1.23 and the three `docs/reports/phase-*.md` files. Mark TASK-004 (cursor) and TASK-008 (Lighthouse) as "carried to plan 3, Tasks 5 and 3". Set `status: Complete — shipped v1.17–v1.23; open items carried to audit-followups-crm-hardening-3.md`.
- [ ] **Step 3:** Set plan v1 `status: Complete — Phases 0–3 shipped (PR #133/#136/v1.09); Phases 4–5 carried into refactor-architecture-cleanup-2.md and shipped as v1.18/v1.19`.
- [ ] **Step 4:** Commit `docs: plan index + close refactor plans v1/v2`.

### Task 2: Correct the propagated audit errors

**Files:**
- Modify: `docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md:79-118` (cursor section)
- Modify: `docs/CRM-OPERATIONS.md:101` (migration head)

- [ ] **Step 1:** Replace the "unbuilt magnetic cursor" framing with the PR #10 history (built → removed by design decision) and point to Task 5 for the removal.
- [ ] **Step 2:** Update the CRM-OPERATIONS migrations paragraph: chain now runs through `0040` (and `0041` once PR 3 merges), keep the manual-apply rule verbatim.
- [ ] **Step 3:** Commit `docs: correct cursor history and migration head`.

### Task 3: Real Lighthouse baseline

**Files:**
- Create: `docs/reports/lighthouse-baseline-2026-09-03.md`

- [ ] **Step 1:** Run Lighthouse 13.x (headless Chrome, `--preset=desktop` and default mobile) against production `https://www.cdsportswearinc.com` on `/`, `/work`, `/services`, `/login` (`/admin` redirects unauthenticated users to `/login`, so `/login` is the CRM entry point that can be measured). Keep JSON+HTML in the session scratchpad; commit only the summary table (four categories × route × form factor) plus the top three performance opportunities per route.
- [ ] **Step 2:** Compare against the Phase 0 bundle baseline (`228 kB` shared First Load JS, `/` = `378 kB`) and record whether the score is bundle-bound or network/render-bound.
- [ ] **Step 3:** Commit `docs: Lighthouse baseline on production`.

### Task 4: Version bump

- [ ] `VERSION` → `v1.27`; `CHANGELOG.md` entry; PR titled `v1.27 — plan ledger, audit corrections, production Lighthouse baseline`.

---

## PR 2 — v1.28 — frontend follow-ups (cursor, admin forms, read-model waste)

### Task 5: Remove the custom-cursor leftovers (owner: "implement if little, else remove" → removal, see §0)

**Files:**
- Modify: 21 JSX files carrying `data-cursor=` (list: `grep -rl 'data-cursor' app components`)
- Modify: `app/styles/cursor-loader.css` (delete lines 1–40, keep the loader rules) and rename to `app/styles/loader.css`; update the import in `app/globals.css:20`
- Modify: `app/styles/reset.css:19` (delete the `html.has-cursor` rule)
- Test: `tests/no-dead-cursor-markup.test.mjs` (new)

- [ ] **Step 1:** Write the failing test: read every `.jsx` under `app/` and `components/` and every `.css` under `app/styles/`; assert no `data-cursor`, `data-hover`, `.cursor-dot`, `.cursor-ring`, `.cursor-label`, `has-cursor` remains. Run `node --test tests/no-dead-cursor-markup.test.mjs` → FAIL listing 51 sites.
- [ ] **Step 2:** Remove the attributes. Three are JSX expressions (`Nav.jsx:69`, `SubpageNav.jsx:57,82`), so do it by hand or with a regex that handles both `data-cursor="…"` and `data-cursor={…}`; never blind-sed. `Services.jsx:186` also carries `data-hover` — remove it too (only the deleted `Cursor.jsx` read it).
- [ ] **Step 3:** CSS: delete the cursor block, rename the file, fix the `@import`. Run `pnpm test:marketing` (component snapshots don't include these attributes; confirm).
- [ ] **Step 4:** Run the new test → PASS. `pnpm build`. Commit `chore: remove custom-cursor leftovers (PR #10 follow-through)`.

### Task 6: Unify AdminFormShell chrome (owner: "unify them")

**Files:**
- Modify: `components/crm/AdminFormShell.jsx` (drop `variant`, one `.crm-form-frame`, merged field CSS)
- Modify: 8 pages `app/admin/{companies,contacts,deals,tasks}/{new,[id]/edit}/page.jsx` (remove `variant=` prop only)
- Modify: `tests/crm/admin-form-shell.test.jsx:129,148-154,161-215,229`

Decisions (from the Phase 3 report's variant table): width **800px**; label `0.9rem` unweighted; input padding `0.75rem 1rem`; focus border `#64c8ff` (stronger affordance); actions row `gap 1.5rem; margin-top 2rem; align-items center`. Keep both `.crm-field*` and `.crm-form*` selector families and both cancel controls — renaming markup classes would break the byte-identity tests for no visual gain.

- [ ] **Step 1:** Update the test first: `normalize()` strips ` crm-admin-form` only; `expectSameMarkup` loses the `variant` param and its `toContain` assertion; drop `variant:` keys and `variant="card"`. Run `pnpm test:marketing` → the shell tests FAIL (markup still emits `crm-admin-form--card`).
- [ ] **Step 2:** Edit the shell per the decisions; delete `variant` from all eight pages. Run → PASS.
- [ ] **Step 3:** Delete `tests/crm/fixtures/admin-forms-pre-phase3/` and the old/new comparison blocks? **No** — keep them this PR (they still prove markup didn't move); note in CHANGELOG that they can go once a browser check confirms the unified look.
- [ ] **Step 4:** `pnpm build`. Commit `refactor(admin): one form chrome for all four entities`.

### Task 7: Admin edit/new gaps (owner: "fix this too, add both")

**Files:**
- Modify: `app/admin/contacts/[id]/edit/page.jsx:90-94`, `app/admin/tasks/[id]/edit/page.jsx:136-140`
- Modify: `app/admin/tasks/new/page.jsx` (import `useUserRole`, guard effect, `loading=`)
- Test: `tests/crm/admin-crud-guards.test.mjs` (new, regex contract)

- [ ] **Step 1:** Write the failing test: all four `[id]/edit/page.jsx` contain `.select()` after `.update(payload)` and the literal `Update failed - no rows changed (check permissions).`; all four `new/page.jsx` import `useUserRole` and contain `router.replace('/admin/<entity>')`. Run → FAIL on contacts/tasks edit and tasks/new.
- [ ] **Step 2:** Contacts/tasks edit: replace the single-line update with the companies/deals four-liner (`const { data, error } = … .select(); if (error) throw error; if (!data || data.length === 0) throw new Error('Update failed - no rows changed (check permissions).');`).
- [ ] **Step 3:** Tasks/new: mirror `contacts/new/page.jsx:52-58`, citing `0005_pm_scoping_and_project_type.sql:120` (task INSERT is `is_admin()`), and set `loading={isLoadingCompanies || isRoleLoading || !isAdmin}`.
- [ ] **Step 4:** Run → PASS. `pnpm test:marketing` (shell byte-identity still passes; the mock returns `isAdmin: true`). Commit `fix(admin): rows-changed check on contacts/tasks edit; admin guard on tasks/new`.

### Task 8: Read-model waste (owner: "fix it too")

**Files:**
- Modify: `lib/crm/projects.js:270-273` (gate companies on role), `:374-387, 425-429, 473, 499, 501` (delete `loadNewestMessages` + `messages`/`nextMessageCursor` from the workspace), `:409-415, 465` (skip assignments for clients)
- Modify: `app/dashboard/projects/[id]/page.jsx:7-14, 32-34, 69-84, 117-125` (render `workspace.tasks/approvals/deliverables`; drop the three list calls and the unused `listProjectMessages` import)
- Modify: `app/auth/actions.js:162-179` (delete `getUserProfile`)
- Modify: `tests/crm/workspace-phase1.test.mjs:73-76`, `tests/crm/client-workspace.test.mjs:11`

- [ ] **Step 1:** `grep -rn "loadNewestMessages\|nextMessageCursor\|workspace\.messages\|getUserProfile\|listProjectMessages" app components lib tests` and confirm the consumer list matches §0.
- [ ] **Step 2:** Update the two contract tests: `workspace-phase1` asserts the page matches `/workspace\.tasks|data\.tasks/` etc. instead of the three list functions; `client-workspace` drops the `listProjectMessages` assertion (the thread component owns that read).
- [ ] **Step 3:** Edit `projects.js`: `viewer.role === 'client' ? new Map() : loadProjectCompanies(...)`; `const assignments = viewer.role === 'client' ? [] : await loadAssignments(...)` (extract the existing query into a helper so `from('project_assignments')` stays greppable); remove `loadNewestMessages`, pass `[]` where `messages` fed `collectActorIds`, drop the two return keys. **Keep** `nextMessageCursor`, `attachMessageProfiles`, `sharedOnly`, `clientVisibleOnly` — other tests pin them.
- [ ] **Step 4:** Edit the dashboard page; delete `getUserProfile`. `pnpm test` → all green (expect the two edited contract tests to be the only changes). `pnpm build`.
- [ ] **Step 5:** Commit `perf(crm): drop unused workspace message page, dedupe dashboard reads, gate client-irrelevant fetches`.

### Task 9: Version bump + review

- [ ] `furious-reviewer` pass on the branch; fix real findings.
- [ ] `VERSION` → `v1.28`; `CHANGELOG.md`; PR `v1.28 — remove cursor leftovers, unify admin form chrome, close admin gaps, trim CRM reads`.

---

## PR 3 — v1.29 — migration 0041: approvals visibility, in_app-only outbox reads, drop client deal policies

### Task 10: Migration + source tests

**Files:**
- Create: `supabase/migrations/0041_client_read_scope_hardening.sql`
- Create: `tests/crm/migration-0041-client-read-scope-hardening.test.mjs`
- Modify: `components/crm/NotificationsPanel.jsx:36, 46` (drop the `channel === 'in_app'` guard and the channel label — every row is now in_app)
- Modify: `supabase/tests/0009_project_realtime_crm.test.sql` or new `supabase/tests/0041_client_read_scope.test.sql` (pgTAP, same fixture idiom)

Policy decisions:
- `project_approvals` SELECT → `private.can_access_project(project_id) and (private.can_view_internal(project_id) or deliverable_id is null or exists (select 1 from public.project_deliverables d where d.id = deliverable_id and d.visibility = 'shared'))`. A NULL `deliverable_id` is a first-class project-level approval (`0010:358, 382`) and is also produced by `on delete set null` (`0010:51`), so it stays client-visible. Rename to `"Project participants can view visible approvals"` (the 0027 convention: rename when semantics change).
- `notifications_outbox` SELECT → `user_id = (select auth.uid()) and channel = 'in_app'`. Matches `mark_notifications_read` (`0027:56-60`) and the `(user_id, channel, read_at, created_at)` index. The service-role cron worker is RLS-exempt and unaffected.
- `deals`: `drop policy if exists "Company members can view deals"`; `drop policy if exists "Company members can submit a project brief"`.
- Keep the first `private.` call adjacent to `using (` so `tests/crm/migration-0040-*.test.mjs`'s grant-audit regex still sees it.

- [ ] **Step 1:** Write the source test (template: `migration-0040-*.test.mjs`): asserts the three policy names/predicates above, the two `drop policy if exists`, header comment cites the live verification date, and `NotificationsPanel.jsx` no longer contains `notification.channel`.
- [ ] **Step 2:** Run → FAIL (file missing). Write `0041` in the `0040` header style with the live-catalog evidence block from this session. Write the pgTAP file: client sees project-level and shared-deliverable approvals but not internal-deliverable ones; client sees only `in_app` outbox rows; client `select count(*) from deals` = 0.
- [ ] **Step 3:** Edit `NotificationsPanel.jsx`. Run `pnpm test` → PASS. `pnpm test:db` **cannot run here** (no Docker/Supabase CLI) — record that in the PR and CHANGELOG; the owner runs it or applies on an isolated branch first.
- [ ] **Step 4:** `furious-reviewer`; `VERSION` → `v1.29`; CHANGELOG entry must say the migration is **checked in but not applied**; PR `v1.29 — migration 0041: client read-scope hardening (approvals, outbox, deals)`.

### Task 11: Production application (owner only)

- [ ] Owner reviews the exact SQL, then applies via the Supabase dashboard SQL editor or CLI; re-runs the `pg_policies` query from this session to confirm; a client-role smoke check on `/dashboard/projects/[id]` confirms approvals and notifications still render.

---

## Self-review

- Spec coverage: ten owner items → Tasks 1 (plan files), branch deletion (done outside the PR, 2026-09-03), 5 (cursor), 6 (unify), 7 (two gaps), 3 (Lighthouse), §0 row 1 (shares_project_with: investigated, already fixed), 10 (three RLS holes), §0 row 2 (RLS enable: investigated, nothing to enable), 8 (dead fetches). ✔
- Placeholders: none. Every step names the file, the lines, and the assertion.
- Type consistency: `loadAssignments(supabase, projectId)` is introduced in Task 8 Step 3 and used nowhere else. `crm-form-frame` is introduced in Task 6 and referenced only there.
