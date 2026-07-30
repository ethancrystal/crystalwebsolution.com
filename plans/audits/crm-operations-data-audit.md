# CRM Operations and Data Audit

**Date:** 2026-07-30  
**Scope:** employee/project-manager and admin operations; companies, contacts,
deals, tasks, notes, users; sales pipeline and project delivery; reporting,
auditability, notifications, schema, RLS, Storage, and client-project
connections.

## Executive verdict

The repository has a credible CRM prototype: authenticated client, project
manager (PM), and admin surfaces; CRUD screens; an assignment-scoped deal
policy; client brief submission; project threads; private file Storage; and
RLS on every public CRM table.

It is **not safe or operationally complete for production use**. Four release
blockers dominate:

1. Brand-new client company onboarding rolls back because its privileged
   function updates `profiles.company_id` through a trigger that expressly
   rejects that update for clients.
2. PMs can read/update every company and contact, read every company-level
   note, and create a note against any company. Company members can read the
   same internal CRM notes.
3. Client and PM write policies authorize rows, not permitted fields. A client
   can submit arbitrary sales/delivery fields, and an assigned PM can move a
   deal to another company while retaining ownership.
4. Notes and project threads request an author relationship that the schema
   does not define, so their PostgREST embedded-profile queries fail.

The current model also overloads `deals` as both sales opportunity and delivery
project. That is the root of several permission, lifecycle, reporting, and data
integrity problems.

## Verification boundary

- Source review covered migrations `0001` through `0007`, all CRM pages,
  shared CRM components, Supabase clients, middleware, and user actions.
- Read-only inspection of the configured Supabase project on 2026-07-30 found
  migrations `0001`-`0006` in migration history. The policies introduced by
  `0007` exist, but `0007` is absent from migration history: the live schema
  has untracked drift.
- Every live CRM table currently contains **zero rows**. The schema is present,
  but no real-data end-to-end behavior has been proven in this project.
- The live `project-files` bucket is private, but has no file-size or MIME-type
  limit.
- A local build could not run because `node_modules/next/dist/bin/next` is
  missing. Dependencies were not installed because this was an audit-only
  task.
- Existing unrelated edits in `app/globals.css` and
  `tests/latestFeatures.test.mjs` were left untouched.

## What currently works

| Area | Working foundation | Evidence |
|---|---|---|
| Global roles | New users default to client and the auth trigger reads service-controlled `raw_app_meta_data`, not user metadata. | `supabase/migrations/0001_crm_schema.sql:234-252` |
| Route gates | `/admin` admits admin/PM; `/admin/users` is admin-only; `/dashboard` requires authentication. | `middleware.js:40-69` |
| Core records | Companies, contacts, deals, tasks, notes, memberships, messages, and file metadata exist with RLS enabled. | `supabase/migrations/0001_crm_schema.sql:11-129`; `supabase/migrations/0003_project_delivery.sql:54-99` |
| Admin CRUD | List/new/detail/edit surfaces exist for companies, contacts, deals, and tasks; deal pipeline stage updates verify that an RLS update actually returned a row. | `app/admin/deals/pipeline/page.jsx:59-89` |
| Assignment isolation | Admin sees all deals; a PM selects only deals whose `owner_id` is their user id. Project messages/files reuse the same assignment-aware helper. | `supabase/migrations/0005_pm_scoping_and_project_type.sql:71-95` |
| Destructive access | Deal/task/company/contact and delivery-record deletes are admin-only in the final policies. | `supabase/migrations/0005_pm_scoping_and_project_type.sql:140-159` |
| Client project access | Company members can see company deals, and message/file inserts bind the actor id to `auth.uid()`. | `supabase/migrations/0001_crm_schema.sql:185-196`; `supabase/migrations/0003_project_delivery.sql:67-99` |
| UI role framing | Admin-only create/user controls are hidden in several major lists and the deal assignment control is admin-only. | `app/admin/page.jsx:65-128`; `app/admin/deals/[id]/edit/page.jsx:297-315` |

These are useful building blocks, but RLS remains the security boundary because
all business data is queried directly from the browser Supabase client.

## Findings

### CRITICAL-1 — New-client onboarding cannot complete

`onboard_client_company()` creates a company and membership, then updates
`profiles.company_id` (`0003:147-175`). The pre-existing profile trigger raises
whenever a non-admin changes `company_id` (`0002:19-36`). `SECURITY DEFINER`
bypasses RLS; it does **not** suppress row triggers. The final update therefore
raises and rolls back the whole transaction for a normal client. The UI depends
directly on this RPC (`components/crm/BriefSubmissionForm.jsx:31-50`).

**Fix:** make `company_members` the canonical client-company relationship and
remove `profiles.company_id` from onboarding/dashboard decisions. Replace the
function with a narrowly granted authenticated command that:

- rejects a null `auth.uid()`;
- validates required name/email server-side;
- refuses users with an existing membership;
- inserts the company and owner membership atomically;
- is `REVOKE`d from `PUBLIC`/`anon` and granted only to `authenticated`.

If `profiles.company_id` must remain, add a deliberately scoped internal setter
and make the trigger recognize only that trusted path; do not generally weaken
the trigger.

### CRITICAL-2 — PM and client note/company isolation is broken

After `is_staff()` was redefined as admin-or-PM, the old company/contact
policies still give every PM global select/update access. Migration `0006`
explicitly preserves that blanket access while describing it as access to
records “tied to” assigned deals (`0006:19-21`). The policies contain no such
tie (`0001:159-183`).

Notes widen the leak:

- any PM may insert a company-level note for any `company_id`
  (`0007:42-47`);
- any PM may read every note with `deal_id IS NULL`, regardless of company
  (`0007:49-50`);
- every company member may read every note in their company, including notes
  written in the internal admin CRM (`0001:211-219`);
- the client is also expressly allowed to create company notes (`0007:52-57`).

This exposes internal account commentary and all client PII to unrelated PMs.

**Fix:** separate `internal_notes` from client-visible project messages. Give
internal notes an explicit `project_id`/`company_id` and `visibility`, then
authorize:

- admin: all;
- PM: only notes/companies/contacts on a project they are assigned to (or an
  explicit account-team membership);
- client: no internal notes; client-visible communication remains in project
  messages.

Replace `is_staff()` company/contact policies with a single
`can_access_company(company_id)` predicate based on admin, company membership,
assigned project, or explicit account team.

### CRITICAL-3 — Client/PM policies protect ownership but not writable fields

The client brief policy checks only company membership and
`owner_id = auth.uid()` (`0003:33-41`). A direct Data API request can also set
`stage`, `probability`, `value`, `project_status`, `contact_id`, and dates. It
can mark a just-submitted project delivered or set a sales deal closed-won.

The PM update policy checks only that `owner_id` remains the PM
(`0005:78-83`). It does not prevent changing `company_id`, attaching a contact
from another company, rewriting sales value/stage, or altering audit-relevant
fields. The edit UI sends almost the entire row (`app/admin/deals/[id]/edit/page.jsx:115-142`);
UI omissions are not a database control.

**Fix:** revoke client/PM direct broad `INSERT`/`UPDATE` and expose explicit
commands:

- `submit_project_brief(title, description, project_type, budget, target_date)`;
- `assign_project_manager(project_id, pm_id)` (admin only);
- `transition_project_status(project_id, expected_version, new_status)`;
- `update_project_brief(...)` and `update_sales_opportunity(...)` as separate,
  role-specific commands.

Enforce immutable tenant keys for non-admins, allowed state transitions,
optimistic version checks, probability/value bounds, PM-role assignment, and
same-company contact/project constraints in the database.

### CRITICAL-4 — Notes and project conversation queries use a nonexistent relation

`NotesPanel` requests `notes -> profiles`
(`components/crm/NotesPanel.jsx:32-45`), and `ProjectThread` requests both
`project_messages -> profiles` and `project_files -> profiles`
(`components/crm/ProjectThread.jsx:43-69`).

The corresponding actor columns reference `auth.users`, not `profiles`
(`0001:85-95`; `0003:55-60`; `0003:77-85`). PostgREST cannot embed a
transitive relationship through the unexposed `auth.users` table. Because the
thread loads messages/files together and throws if either errors, the entire
conversation/files panel fails.

**Fix:** add direct FKs from author/uploader ids to `profiles(id)` (or add
separate `author_profile_id` fields), then use explicit relationship names in
selects. Alternatively expose a `security_invoker` reader view that joins the
authorized rows to safe profile fields. Add an integration test that runs the
exact PostgREST selects as admin, assigned PM, member client, and unrelated PM.

### HIGH-1 — Role changes are split-brain and demotions remain privileged

Authorization is duplicated in `profiles.role` and JWT `app_metadata.role`.
Both `is_admin()` and `is_pm()` accept either copy (`0005:26-45`). Role-change
code updates the profile first and metadata second
(`app/admin/users/actions.js:104-131`).

Consequences:

- if metadata sync fails after profile promotion, direct RLS access is already
  elevated;
- after demotion, the old JWT still satisfies `is_admin()` until refresh;
- a demoted admin can simultaneously satisfy admin (stale JWT) and PM (profile);
- admins can demote themselves or the last admin; no audit event is written.

Invites are also emailed before both role stores are synchronized
(`app/admin/users/actions.js:49-92`).

**Fix:** use one canonical database role for RLS and have server-side route
authorization read it after `getUser()`. Perform role changes through one
service-side command with compensation, revoke the target user’s sessions on
demotion, block last-admin/self-demotion, assign the role before sending an
invite, and append an audit event.

### HIGH-2 — The delivery lifecycle cannot be advanced in the UI

The client displays `project_status`
(`app/dashboard/projects/[id]/page.jsx:121-165`), but the admin/PM edit payload
has no `project_status` field (`app/admin/deals/[id]/edit/page.jsx:125-136`).
The only interactive board changes the sales `stage`
(`app/admin/deals/pipeline/page.jsx:59-83`). Projects therefore remain
`brief_submitted` unless someone mutates the Data API/database manually.

**Fix:** add a project-focused workspace and a transition action that records
actor, old/new status, timestamp, reason, and version. Keep sales stage and
delivery status in different entities and UIs.

### HIGH-3 — Task creation/assignment contradicts its own access model

RLS makes task creation admin-only and lets the assignee update an existing
task (`0005:110-126`). Yet the PM sees “Add Task”
(`app/admin/tasks/page.jsx:48-55`), while the create form always assigns the
new task to the current user (`app/admin/tasks/new/page.jsx:93-126`). An admin
can only create a task for themselves; a PM is invited to a form that RLS will
reject. Delete is likewise shown to PMs although it is admin-only
(`app/admin/tasks/[id]/page.jsx:219-230`).

**Fix:** require `project_id`, give admins an assignee picker limited to active
project participants, and decide explicitly whether an assigned PM may create
subtasks for their own project. Align UI controls with that policy and restrict
PM task edits to execution fields (status, due date, description), not tenant,
project, creator, or assignee.

### HIGH-4 — File delivery is non-atomic, unbounded, and leaks orphans

The browser uploads the Storage object first and inserts metadata second
(`components/crm/ProjectThread.jsx:115-154`). A metadata failure leaves an
orphan. Deleting a company/deal cascades metadata but cannot cascade to Storage
objects (`0001:52-66`; `0003:77-108`). Direct object deletion can conversely
leave broken metadata. The live bucket has no size/MIME limit.

**Fix:** introduce an upload-session state (`pending -> ready -> quarantined /
deleted`), server-issued paths, size/MIME allowlists, malware scanning where
appropriate, a finalize command, and a retryable cleanup job for unmatched
objects/rows. Delete/archive projects through one service operation that
removes objects and records the outcome.

### HIGH-5 — Migration history and live schema have diverged

The July 28 handoff recorded `0002`/`0003` as undeployed
(`HANDOFF-2026-07-28-crm-completion.md:35-41`). Read-only live inspection now
shows `0001`-`0006` tracked and `0007` policy definitions present, but no
`0007` migration-history entry. This means schema state cannot be reproduced or
audited solely from migration history.

**Fix:** reconcile live SQL against the repository, establish an authoritative
baseline without reapplying destructive statements, then require all DDL via
versioned migrations in CI. CI should build a clean database from zero, run RLS
role tests, compare migration history, and run Supabase security/performance
advisors.

### HIGH-6 — Public privileged functions have excessive execution grants

All helper/trigger/onboarding functions are created in `public` as
`SECURITY DEFINER`; migrations do not revoke default execute
(`0001:131-147`; `0002:19-36`; `0003:47-52,147-177`; `0005:26-52,85-95`).
The live security advisor confirms `anon` and `authenticated` can call them as
RPCs. `handle_profile_updated()` also retains a mutable search path.

**Fix:** move policy helpers into a non-exposed private schema, set
`search_path = ''`, schema-qualify objects, and revoke direct execution.
Trigger functions should not be API-callable. Keep only a strict public RPC
wrapper when browser invocation is intentional, with explicit authenticated
grant and actor checks.

### MEDIUM — Operational gaps and data-quality debt

- **Broken logout:** both dashboards link to removed
  `/api/auth/logout` (`app/dashboard/page.jsx:86-96`;
  `app/admin/page.jsx:68-77`) even though the only implementation is the
  `signOut` server action (`app/auth/actions.js:79-83`).
- **No usable project reporting:** the only report is four counts
  (`app/admin/page.jsx:29-42`); individual Supabase response errors are ignored
  and become zeros. There is no revenue/conversion, status aging, delivery SLA,
  overdue trend, PM capacity, or client-response reporting.
- **No notifications/realtime:** messages/files are reloaded only on mount or
  after the current user writes (`ProjectThread.jsx:43-83,85-154`). There is no
  unread state, notification table, outbox, retry, or event email.
- **No audit history:** `updated_at` records only the last write
  (`0001:254-294`). There is no actor/action/before/after record, stage/status
  history, assignment history, deletion reason, or correlation id.
- **Hard deletes:** admin deletes cascade core records without archive/restore
  or retention controls; Storage is not part of the cascade.
- **Relational drift:** `profiles.company_id` is a bare UUID, not an FK
  (`0001:12-20`), and duplicates `company_members`; contact/deal/task/note FKs
  do not guarantee all related records belong to the same company
  (`0001:36-95`).
- **Weak domain constraints:** stage/status/priority/contact status are free
  text; probability has no 0-100 database check; monetary and employee values
  have no non-negative check (`0001:22-82`).
- **Scale:** list pages select all rows with no pagination/search
  (`app/admin/companies/page.jsx:14-34`;
  `app/admin/deals/page.jsx:69-89`). Live advisors also flag unindexed FKs and
  per-row `auth.uid()` evaluation.
- **User operations:** the users page lacks email, account state, invite state,
  company memberships, deactivate/revoke, resend invite, and last-login data
  (`app/admin/users/page.jsx:34-75,96-143`).
- **Documentation drift:** `CRM-SETUP.md` still describes `staff`, says the
  policies are comprehensive, and lists reporting/notifications as future
  work (`CRM-SETUP.md:21-45,238-259,322-328`).

## Proposed unified project-centered architecture

### Data model

```text
organizations
  ├─ organization_memberships ─ users/profiles
  ├─ contacts
  ├─ opportunities (sales pipeline only)
  └─ projects
       ├─ project_members (PM, client, collaborator, observer)
       ├─ project_status_events
       ├─ milestones
       │    └─ tasks
       ├─ project_messages (client-visible)
       ├─ internal_notes (staff-only, explicit visibility)
       ├─ project_files / deliverables
       └─ activity_events ─ notification_outbox ─ notifications
```

`projects` becomes the tenant and authorization center:
`organization_id`, optional `opportunity_id`, `primary_contact_id`,
`project_manager_id`, `project_type`, `status`, `budget/currency`,
`target_date`, lifecycle timestamps, and `version`. A won opportunity creates
a project; a self-service brief can create a project directly without
inventing a sales deal.

Every task, milestone, message, note, and file has a mandatory `project_id`.
Cross-company references are prevented with composite FKs or validation
triggers. `organization_memberships` replaces `profiles.company_id` as the
membership source of truth.

### Authorization

| Actor | Project access | Permitted mutations |
|---|---|---|
| Admin | All projects | create, assign, transition, archive, manage members |
| Assigned PM | Explicit `project_members`/manager assignment only | delivery fields, milestones/tasks, messages/files; no tenant/owner/sales rewrites |
| Client member | Projects for their organization where membership permits | submit brief, client messages/files, approve/reject deliverables |
| Unrelated user/PM | None | None |

Use one private `can_access_project(project_id, capability)` policy helper with
indexes on every membership/assignment key. Keep global system role separate
from project membership. Target policies `TO authenticated`; revoke privileged
function execution from other roles.

### Command and event boundary

Browser reads may remain RLS-backed. Business mutations should use server
actions or strict RPC commands, not unrestricted table updates. Each command
validates actor, tenant, allowed fields, legal transition, and expected
version, then writes an immutable `activity_event` in the same transaction.

The same event feeds:

- a transactional notification outbox with idempotency keys, retries, and
  Resend delivery;
- in-app unread notifications and optional Realtime refresh;
- status/assignment history and audit exports;
- reports for pipeline conversion, project aging, SLA, workload, overdue
  tasks, revisions, and client responsiveness.

Views used for reporting must be `security_invoker` or reside in an unexposed
schema with controlled server access.

## Remediation sequence

1. **Containment:** disable self-onboarding and internal notes in production
   until fixed; reconcile migration `0007`; revoke unintended privileged RPC
   execution; add file limits.
2. **Security migration:** canonicalize roles/memberships; implement
   project/company capability helpers; close PM/client field-level write
   holes; add same-company and domain constraints.
3. **Runtime repair:** add author-profile relationships; replace logout links;
   add the delivery-status command/UI; make tasks genuinely assignable.
4. **Project split:** create `projects`, project members/events/milestones;
   backfill delivery-bearing deals; retain opportunities separately; switch
   reads/writes; remove the dual-purpose deal behavior.
5. **Operations:** add audit events, notification outbox, file finalization and
   cleanup, pagination/search, reports, archives/retention.
6. **Proof:** seed admin, two PMs, two client organizations, and cross-tenant
   adversarial tests. Verify direct Data API access—not only hidden UI
   controls—plus clean-database migration replay and live advisor results.

Production promotion should wait until steps 1-3 pass role-matrix integration
tests. The architectural split in step 4 should precede reporting work;
otherwise reports will encode the current deal/project ambiguity.
