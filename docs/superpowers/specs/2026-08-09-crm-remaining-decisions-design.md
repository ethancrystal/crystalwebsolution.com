# Design: CRM remaining-decisions batch (notes, task exposure, budget, review nudge)

## Status: Approved for planning (pending final spec review)

## Context

`plan/feature-crm-remaining-work-2.md` (written 2026-08-09, after Phase 1 CRM
verification) named two items as "decide, don't just implement":
`NotesPanel`'s companies/contacts bug, and `priority`/`client_visible` task
exposure. This design resolves both, plus two adjacent decisions raised in
the same brainstorm (budget/currency client visibility, a delivered-project
review-request email) — all four are small, independent, and share no code
paths with each other, so they ship as one batch but remain separable if
priorities change mid-implementation.

Every design decision below is grounded in reading the actual current code,
not assumption — see the "Traced" note under each item.

## 1. Company/contact notes → wire to the existing `public.notes` table

**Traced:** `NotesPanel.jsx` only ever queries `project_status_history` and
only accepts a `projectId` prop. `app/admin/companies/[id]/page.jsx` and
`app/admin/contacts/[id]/page.jsx` pass `companyId`/`contactId` instead —
props the component never reads — so the panel silently no-ops on both
pages (empty list, submit is a dead click). Separately, `public.notes`
already exists (`company_id` required, `contact_id`/`deal_id` optional,
`content`, `visibility`) with full RLS from migration `0008`: admin sees
all; PM sees companies where they own a deal (`deals.owner_id = auth.uid()`);
client sees their own company's `visibility = 'client'` notes. Zero
application code references this table today — confirmed via repo-wide
grep. `/admin/companies` and `/admin/contacts` are gated to the `admin`
role at the middleware level (`config.matcher` includes `/admin/:path*`),
so the PM/client RLS branches are unreachable through any UI that exists
today — they're pre-built for a future team-facing companies view, not
something this change needs to activate.

**Design:** Add `components/crm/EntityNotes.jsx`, a sibling to
`NotesPanel.jsx` (not a replacement — `NotesPanel` is correctly
project-scoped, effectively a "Project Updates" feed, and stays exactly as
it is). `EntityNotes` takes `companyId` (required) and `contactId`
(optional) props, and reads/writes `public.notes` directly via
`createClient()` from `lib/supabase/browser.js` — matching this codebase's
existing companies/contacts/deals pattern (direct Supabase client + RLS,
no RPC/server-action layer), not the project-delivery RPC pattern
`NotesPanel` uses. Visual style matches `NotesPanel`'s existing card
(reuse its CSS, adjust only the title: "Notes" instead of "Project
Updates"). `visibility` defaults to `'internal'` for admin-authored notes
(matching the RLS policies' implicit model — admin/PM notes aren't
`client`-visible unless explicitly marked so); no UI toggle for visibility
in this pass, since there's no client-facing consumer of it yet.

Swap the two broken call sites:
- `app/admin/companies/[id]/page.jsx`: `<NotesPanel companyId={company.id} />` → `<EntityNotes companyId={company.id} />`
- `app/admin/contacts/[id]/page.jsx`: `<NotesPanel companyId={contact.company_id} contactId={contact.id} />` → `<EntityNotes companyId={contact.company_id} contactId={contact.id} />`

No migration needed — schema and RLS are already correct and untouched.

## 2. Task `priority` — creation-only

**Traced:** `app/team/projects/[id]/page.jsx` already has a
`<select name="taskPriority">` (Low/Medium/High) in its task-creation
form, but `handleAddTask` never reads it or appends it to the `FormData`
sent to `createProjectTask`. The server action (`app/actions/
project-actions.js`) and the underlying `create_project_task` RPC both
accept `(p_project_id, p_title, p_description, p_status, p_assignee_id,
p_due_date)` — no priority parameter exists anywhere below the dead UI
control. `lib/crm/projects.js`'s `TASK_FIELDS` already selects `priority`
from `project_tasks` on every read, but `ProjectTasks.jsx` never renders
it. `project_tasks.priority` defaults to `'medium'` at the column level.

**Design:**
- `handleAddTask` in `app/team/projects/[id]/page.jsx`: read
  `form.taskPriority.value`, `formData.set('priority', ...)`.
- `createProjectTask` (`app/actions/project-actions.js`): accept
  `priority` from the form, validate against `['low', 'medium', 'high']`,
  pass as `p_priority` to the RPC.
- New migration: extend `create_project_task` with `p_priority text
  default 'medium'` (item 2) and `p_client_visible boolean default false`
  (item 3, see below) in the same migration — one signature change, not
  two. **Requires `DROP FUNCTION IF EXISTS public.create_project_task(uuid,
  text, text, text, uuid, date);` before the `CREATE OR REPLACE`.** The
  live signature already has defaults on 4 of its 6 params (confirmed via
  `pg_get_function_arguments`); Postgres identifies a function by its full
  parameter *type* list regardless of defaults, so appending two new
  trailing params via a plain `create or replace` would create a second,
  distinct 8-arg overload alongside the existing 6-arg one — not replace
  it. Both would stay live, and named-parameter PostgREST calls could
  resolve ambiguously (`42725`) or inconsistently between them. This is
  the same category of RPC-signature landmine as three separate bugs
  found during Phase 1 verification the same day this spec was written —
  drop-then-recreate is the safe pattern here, confirmed via
  `pg_get_function_identity_arguments` before applying and re-verified
  after.
- `ProjectTasks.jsx`: render a priority badge next to the existing status
  badge, reusing the `.crm-task-status` badge pattern with a parallel
  `.crm-task-priority` class (three color variants, low/medium/high, same
  visual language as the existing status colors).
- **Explicitly not included:** no edit UI, no `update_project_task`
  change. Priority is set once at creation. This keeps the already-known
  `revalidateAllProjectPaths` wrong-id bug in `updateProjectTask` out of
  scope — it stays latent and unreachable until a real task-edit UI is
  designed, at which point it becomes a prerequisite fix for that work,
  not this one.

## 3. Task `client_visible` — creation-only, with a required backfill

**Traced:** `project_tasks.client_visible` defaults to `false` at the
column level, but no code path filters on it — `listProjectTasks` and
`getProjectWorkspace` (both in `lib/crm/projects.js`) fetch and return
every task to every viewer regardless of role, identical to the
`priority` situation. Critically: **because the column already defaults
to `false` but nothing enforces it, today's actual behavior is "every
client sees every task."** Turning on a naive `client_visible = true`
filter without a backfill would make every task created before this
ships vanish from every client's view simultaneously — a real regression
disguised as a bug fix.

**Design:**
- Migration: `alter table project_tasks alter column client_visible set
  default true;` is wrong (it would flip the *intent* — new tasks should
  default hidden, matching the schema's original design intent from
  migration `0011`). Instead: **one-time backfill only** —
  `update project_tasks set client_visible = true where client_visible =
  false;` — bringing every *existing* row in line with today's observed
  behavior, without touching the column's default for future inserts.
  Same migration adds the RPC parameter (below).
- `create_project_task(..., p_client_visible boolean default false)` —
  matches the column's original intent: new tasks are staff-only until a
  PM explicitly marks one client-visible.
- UI: a "Visible to client" checkbox next to the priority `<select>` in
  the same form, unchecked by default (matching the RPC default).
- `handleAddTask` + `createProjectTask` action: thread the checkbox value
  through the same way as `priority`.
- `lib/crm/projects.js`: add `clientVisibleOnly(tasks, role)`, mirroring
  the existing `sharedOnly(rows, role)` helper already used for messages/
  history/attachments/deliverables — `role === 'client' ? tasks.filter(t
  => t.client_visible) : tasks`. Apply at both task-read call sites
  (`listProjectTasks`, `getProjectWorkspace`).
- Same creation-only scope note as `priority` — no edit UI this pass.

## 4. Budget/currency visible to the client role

**Traced:** `clientSafeProject()` in `lib/crm/projects.js` strips a
project down to an explicit allowlist (`id`, `company_id`, `category`,
`title`, `brief`, `status`, `target_date`, `created_at`, `updated_at`) for
the `client` role. `budget_amount`/`currency` aren't in it. This is the
only place they're excluded — no RLS policy restricts them, they're
already scoped per-project (a client can only reach their own company's
projects via `can_access_project`), so there's no cross-client leakage
risk in exposing them.

**Design:** Add `budget_amount` and `currency` to `clientSafeProject()`'s
returned object. No migration. Display: add a labeled field to
`ProjectOverview.jsx` (wherever category/status/target date already
render) — format as `${currency} ${budget_amount}` when `budget_amount`
is non-null, omit the row entirely when null (a project without a set
budget shouldn't show a blank/zero figure to the client). `currency` is
`NOT NULL DEFAULT 'USD'` at the column level (confirmed via
`information_schema.columns`), so "budget set but currency null" is
structurally impossible — no fallback string needed for that half; the
only null case that exists is `budget_amount` itself, already handled by
omitting the row.

## 5. Delivered-project review-request email

**Traced (and corrected mid-brainstorm):** The original idea was to
auto-populate the marketing site's `/reviews` page from delivered
projects. That's not feasible as a small change: `lib/reviews.js`'s
`REVIEWS` array is static, hand-transcribed content — including genuine
negative reviews, kept deliberately for the page's stated "Transparency"
promise — with no submission, moderation, or database table anywhere in
the codebase. Building real review collection is a separate, materially
larger project (form, storage, moderation workflow, publish step) and is
explicitly out of scope here.

What *is* small: `transition_project_status` already fans out a generic
`project.status_transitioned` notification (both `in_app` and `email`
channels, via `notifications_outbox` → the existing Resend-backed cron
drain) on every status change, including the transition into `delivered`
(reachable only from `approved`, per the existing status machine). No new
plumbing needed — just a distinct, better-templated event for this one
specific transition.

**Design:**
- `transition_project_status`: when `p_to_status = 'delivered'`, additionally
  enqueue a `project.delivered` event (alongside, not instead of, the
  existing generic `project.status_transitioned` event — the generic one
  still drives any UI/other logic keyed on it). **Not** via
  `private.project_notification_recipients()` — that helper returns both
  assigned staff and client-company profiles, and a "please leave us a
  review" email must go to the client only, never staff. Address it
  directly: `select profile.id from public.profiles as profile where
  profile.company_id = v_project.company_id`, `channel = 'email'` only
  (no `in_app` — this is a one-off nudge, not an ongoing notification
  worth a bell-icon entry).
- New email template in `lib/email/templates.js`'s
  `NOTIFICATION_TEMPLATES` map: `'project.delivered': projectDeliveredEmail`
  — short, thanks the client, links to `SITE_ORIGIN + '/reviews'` (per
  your call — the static page, not an external platform; still useful for
  driving traffic there even without self-service submission) with a
  clear call to action.
- Migration: `create or replace function transition_project_status(...)`
  adding the one extra conditional `notifications_outbox` insert branch.

## Implementation order

Schema before app code that depends on it, independent items in whatever
order — none of the five share a code path:

1. Migrations first, applied and verified via the Supabase MCP before any
   app code lands (matches this repo's established discipline): the
   `create_project_task` drop/recreate (items 2+3 combined, one migration),
   the `client_visible` backfill (same migration), and the
   `transition_project_status` replace for `project.delivered` (item 5) —
   three separate `apply_migration` calls, each verified with a direct
   schema/data query immediately after, not batched blind.
2. `EntityNotes.jsx` + the two page swaps (item 1) — no migration
   dependency, can happen in parallel with step 1.
3. `handleAddTask` + `createProjectTask` action changes (items 2+3) — only
   after step 1's migration is live, otherwise the RPC call fails against
   the old signature.
4. `clientVisibleOnly()` + the two read-path call sites, `ProjectTasks.jsx`
   priority badge (items 2+3 read side).
5. `clientSafeProject()` + `ProjectOverview.jsx` budget field (item 4) —
   fully independent, any point.
6. `project.delivered` email template registration (item 5's app-side
   half) — after step 1's `transition_project_status` migration is live.
7. `pnpm test` / `pnpm build`, then the scoped-JWT/curl verification pass
   below, for everything together.

## Testing

- `pnpm test` / `pnpm build` after every change, same gate every prior
  session in this repo has used.
- Each of the four items is independently verifiable via the same
  scoped-JWT-curl technique used during Phase 1 verification (sign in as
  each test role, hit the relevant RPC/table directly, confirm the
  expected shape) before trusting the browser UI.
- `EntityNotes`: verify all three RLS branches with real test accounts —
  admin sees everything, a PM with a deal on the company sees company
  notes, a PM *without* a deal on that company sees nothing.
- `client_visible` backfill: verify row counts before/after
  (`select count(*) from project_tasks where client_visible = false`
  before running, confirm it drops to 0 immediately after the backfill
  statement, before the default-for-new-rows takes effect).
- Review-request email: trigger a real `delivered` transition on a test
  project, confirm exactly one `project.delivered` row and one
  `project.status_transitioned` row land in `notifications_outbox`, not a
  duplicate of either.

## Explicitly out of scope

- Task edit UI (and the `revalidateAllProjectPaths` bug it would surface).
- Any review submission/moderation/self-service pipeline.
- A team-facing (`/team/companies`) view — the notes RLS already supports
  it, but no route exists to build it into right now.
