# Production Multi-User Project CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, multi-user project CRM in the existing application where clients create categorized projects, admins assign employees, and every authorized participant collaborates through one secure real-time project thread with status tracking and file attachments.

**Architecture:** Upgrade the existing Next.js App Router application from Next.js 14/React 18 to Next.js 15/React 19, while retaining Supabase as the only identity, PostgreSQL, Realtime, Storage, and RLS boundary. Preserve the completed three-role authentication layer, replace the legacy “deal as project” behavior with a dedicated `projects` aggregate, and give every project exactly one UUID thread whose `shared` and `internal` messages are displayed as one ordered conversation while remaining separate security lanes in RLS and Realtime.

**Tech Stack:** Next.js 15 App Router, React 19, JavaScript/JSX, Supabase Auth/PostgreSQL/Realtime/Storage/RLS, PostgreSQL functions and triggers, plain CSS, Node test runner, pgTAP/Supabase CLI, Playwright, pnpm.

## Relationship to Existing Work

- This plan supersedes pending Tasks 3–7 in `docs/superpowers/plans/2026-07-30-crm-three-role-project-platform.md`.
- Preserve the completed role/portal and RBAC repair commits (`6c186db`, `2923502`, `c63a067`, `cc44a27`).
- Keep `profiles.role` as the authorization source with exact values `client`, `project_manager`, and `admin`; the product label “Employee” maps to database role `project_manager`.
- Keep sales `deals` intact. New delivery work is stored in `projects`; `projects.source_deal_id` may optionally reference one sales deal.
- Migration `0008_auth_rbac_repair.sql` remains the prerequisite. This plan creates `0009_project_realtime_crm.sql`.
- Do not apply migrations to a live Supabase project or provision live users during implementation.

## Global Constraints

- The CRM remains inside the existing application; do not create a second app, package, Supabase project, or identity store.
- Upgrade to Next.js major version 15, React/React DOM major version 19, and `@react-three/fiber` major version 9; do not upgrade to Next.js 16 or keep the React-18-only Fiber 8 renderer.
- Use `pnpm` exclusively and commit the resulting `pnpm-lock.yaml`.
- Keep JavaScript/JSX and plain CSS; do not introduce TypeScript, Tailwind, or a component framework.
- Preserve the public cinematic homepage, its single R3F Canvas, single Lenis/GSAP clock, procedural visuals, and reduced-motion behavior.
- Every domain entity uses a UUID: Supabase `auth.users.id`, `profiles.id`, `projects.id`, `project_threads.id`, `project_messages.id`, `project_assignments.id`, `project_attachments.id`, `project_status_history.id`, and `audit_events.id`.
- Canonical project categories are exactly `web_design`, `logo_creation`, `branding`, `marketing`, and `ai_automation`.
- A project category and a project title are separate fields. Titles are client-authored strings such as `ABC Website Design` or `BCD Logo`, normalized and bounded to 3–120 characters.
- Each project has exactly one row in `project_threads`, enforced by `unique(project_id)`.
- Clients see projects owned by their company, employees see only projects in `project_assignments`, and admins see all CRM projects.
- One ordered thread contains both `shared` and `internal` messages. Clients may read/post only `shared`; assigned employees and admins may read/post both.
- All protected reads fail closed on missing configuration, user, profile, role, company, assignment, or query errors.
- Project creation, assignment, status transitions, message posting, and attachment finalization go through validated server actions backed by SECURITY DEFINER RPCs with fixed `search_path`, explicit caller checks, row locks where state changes, and revoked `PUBLIC`/`anon` execution.
- Direct browser writes to protected domain tables are denied by RLS; browser Storage uploads are allowed only for a previously reserved, project-scoped path.
- Files are private, at most 10 MiB, and limited to PDF, DOCX, PNG, JPEG, and plain text. Failed metadata/finalization removes the uploaded object; stale reservations are eligible for cleanup.
- Never expose service-role keys, passwords, access tokens, invite/setup links, message bodies from internal notes, or private attachment URLs in source, logs, tests, reports, or API responses.
- Use private Supabase Realtime channels. Shared and internal transport topics are separate security lanes, but the UI merges authorized events into one thread.
- Every foreign key and every column used by RLS or primary list queries has a supporting index. RLS policies use `to authenticated` and `(select auth.uid())`.
- Each task follows RED→GREEN TDD, passes `pnpm test:crm`, and leaves `pnpm test` green. Route/import tasks also require `pnpm build`; the final build must run in a symlink-capable environment because Windows standalone packaging can otherwise fail with `EPERM`.

## File Responsibility Map

- `package.json`, `pnpm-lock.yaml`: Next.js 15/React 19, Supabase CLI, Playwright, and verification scripts.
- `app/work/[slug]/page.jsx`: Next.js 15 async `params` compatibility for the existing public site.
- `lib/crm/project-contract.mjs`: category, status, visibility, transition, validation, and Realtime-topic contracts.
- `supabase/migrations/0009_project_realtime_crm.sql`: project aggregate, one-thread invariant, assignments, messages, attachments, history, audit, RLS, Storage, Realtime authorization, indexes, and RPCs.
- `supabase/config.toml`: local Supabase/PostgreSQL test runtime with project ID `crystal-web-solution-local`.
- `supabase/tests/0009_project_realtime_crm.test.sql`: executable role matrix and database invariants.
- `lib/crm/projects.js`: server-only RLS-preserving project/thread read model and cursor pagination.
- `app/actions/project-actions.js`: validated application mutation boundary.
- `components/crm/BriefSubmissionForm.jsx`: category/title/brief project creation.
- `components/crm/ProjectThread.jsx`: one prepared thread view model plus live authorized updates.
- `components/crm/ProjectComposer.jsx`: shared/internal message composition and attachment workflow.
- `components/crm/ProjectStatus.jsx`: status history and permitted transition controls.
- `components/crm/ProjectAssignments.jsx`: admin assignment management.
- `app/dashboard/**`: client-only project list and workspace.
- `app/team/**`: assigned-employee project list and workspace.
- `app/admin/projects/**`: admin project and assignment oversight.
- `tests/crm/**`: pure contracts, source invariants, route guards, and action behavior.
- `tests/e2e/crm-projects.spec.js`: browser-level role, thread, realtime, and attachment acceptance.
- `docs/CRM-OPERATIONS.md`: migration, storage, Realtime, rollback, monitoring, and release procedures.

---

### Task 1: Upgrade the Existing App to Next.js 15 and React 19

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/work/[slug]/page.jsx`
- Create: `tests/crm/next15-upgrade.test.mjs`

**Interfaces:**
- Produces: a Next.js `>=15.0.0 <16.0.0` and React/React DOM `>=19.0.0 <20.0.0` runtime.
- Preserves: existing App Router routes, Supabase SSR cookies, standalone Docker output, public homepage behavior, and CRM portal guards.

- [ ] **Step 1: Write the failing platform contract**

Create `tests/crm/next15-upgrade.test.mjs` that reads `package.json` and `app/work/[slug]/page.jsx`, parses dependency major versions, and asserts:

```js
assert.equal(major(pkg.dependencies.next), 15);
assert.equal(major(pkg.dependencies.react), 19);
assert.equal(major(pkg.dependencies['react-dom']), 19);
assert.equal(major(pkg.dependencies['@react-three/fiber']), 9);
assert.match(caseStudy, /async function generateMetadata\(\{ params \}\)/);
assert.match(caseStudy, /const \{ slug \} = await params/);
assert.match(caseStudy, /export default async function CaseStudy\(\{ params \}\)/);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because `next` is 14, React is 18, and the case-study route reads `params` synchronously.

- [ ] **Step 3: Upgrade the pinned runtime**

Run:

```bash
pnpm add next@15 react@19 react-dom@19 @react-three/fiber@9
pnpm add -D supabase @playwright/test
```

Keep `output: 'standalone'` and `reactStrictMode: false` in `next.config.js`.

- [ ] **Step 4: Make dynamic route request APIs asynchronous**

Change both functions in `app/work/[slug]/page.jsx` to:

```jsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  // existing metadata lookup
}

export default async function CaseStudy({ params }) {
  const { slug } = await params;
  // existing project lookup and JSX
}
```

Do not change client pages that use `useParams()`.

- [ ] **Step 5: Add database and browser scripts**

Add without removing existing scripts:

```json
"test:db": "supabase test db",
"test:e2e": "playwright test tests/e2e",
"crm:verify": "pnpm test:crm && pnpm test:db"
```

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm test:crm
pnpm test
pnpm build
```

Expected: all tests pass and all existing routes build under Next.js 15. The build must be repeated in CI/Linux if Windows denies standalone symlink creation.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml app/work/[slug]/page.jsx tests/crm/next15-upgrade.test.mjs
git commit -m "chore(crm): upgrade project platform to Next 15"
```

---

### Task 2: Define the Project, Status, Visibility, and Topic Contracts

**Files:**
- Create: `lib/crm/project-contract.mjs`
- Create: `tests/crm/project-contract.test.mjs`
- Modify: `lib/projectTypes.js`

**Interfaces:**
- Produces: `PROJECT_CATEGORIES`, `PROJECT_STATUSES`, `MESSAGE_VISIBILITIES`, `ALLOWED_TRANSITIONS`, `normalizeProjectTitle(value)`, `isProjectCategory(value)`, `canTransition(from, to)`, `canPostVisibility(role, visibility)`, `sharedProjectTopic(projectId)`, and `internalProjectTopic(projectId)`.
- Consumed by: database contract tests, server actions, client forms, status controls, and Realtime subscriptions.

- [ ] **Step 1: Write failing pure-contract tests**

Assert exact immutable categories:

```js
assert.deepEqual(PROJECT_CATEGORIES, [
  { value: 'web_design', label: 'Web Design' },
  { value: 'logo_creation', label: 'Logo Creation' },
  { value: 'branding', label: 'Branding' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ai_automation', label: 'AI Automation' },
]);
```

Assert:

```js
assert.equal(normalizeProjectTitle('  ABC   Website Design  '), 'ABC Website Design');
assert.throws(() => normalizeProjectTitle('AB'), /3 to 120/);
assert.equal(canTransition('brief_submitted', 'planned'), true);
assert.equal(canTransition('client_review', 'changes_requested'), true);
assert.equal(canTransition('delivered', 'in_progress'), false);
assert.equal(canPostVisibility('client', 'internal'), false);
assert.equal(canPostVisibility('project_manager', 'internal'), true);
assert.equal(sharedProjectTopic(PROJECT_ID), `project:${PROJECT_ID}:shared`);
assert.equal(internalProjectTopic(PROJECT_ID), `project:${PROJECT_ID}:internal`);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because the contract module does not exist and the legacy taxonomy has seven values.

- [ ] **Step 3: Implement immutable contracts**

Use these statuses:

```js
export const PROJECT_STATUSES = Object.freeze([
  'brief_submitted',
  'planned',
  'in_progress',
  'client_review',
  'changes_requested',
  'approved',
  'delivered',
  'on_hold',
  'cancelled',
]);
```

Use `Object.freeze` for exported arrays and nested transition arrays. Topic helpers must accept only canonical UUID strings and throw `Invalid project id.` otherwise.

- [ ] **Step 4: Replace the legacy UI taxonomy**

Make `lib/projectTypes.js` re-export the five category values/labels from `project-contract.mjs`; remove `seo`, `smm`, and `google_ads` from new-project UI choices. The database migration maps legacy sales taxonomy as:

```text
web → web_design
logo → logo_creation
branding → branding
ai_automation → ai_automation
seo | smm | google_ads → marketing
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test
```

Then:

```bash
git add lib/crm/project-contract.mjs lib/projectTypes.js tests/crm/project-contract.test.mjs
git commit -m "feat(crm): define project collaboration contracts"
```

---

### Task 3: Create the UUID Project Aggregate, RLS Matrix, Storage Boundary, and Realtime Authorization

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0009_project_realtime_crm.sql`
- Create: `supabase/tests/0009_project_realtime_crm.test.sql`
- Create: `tests/crm/project-schema.test.mjs`

**Interfaces:**
- Produces tables: `projects`, `project_threads`, `project_assignments`, `project_messages`, `project_attachments`, `project_status_history`, and `audit_events`.
- Produces private helpers: `private.current_profile_role()`, `private.can_access_project(uuid)`, `private.can_view_internal(uuid)`, and `private.can_subscribe_project_topic(text)`.
- Produces authenticated RPCs: `create_project`, `assign_project_user`, `remove_project_assignment`, `transition_project_status`, `reserve_project_attachment`, `post_project_message`, and `finalize_project_attachment`.
- Consumes: Task 2 category/status/visibility values and migration `0008_auth_rbac_repair.sql`.

- [ ] **Step 1: Write the failing migration source contract**

`tests/crm/project-schema.test.mjs` must assert every table/helper/RPC name, UUID defaults, `unique(project_id)` on `project_threads`, RLS enablement, fixed search paths, `revoke all ... from public, anon`, foreign-key indexes, private Storage bucket policies, private Realtime policies, and audit rows in every mutation RPC.

- [ ] **Step 2: Write the failing executable database role matrix**

`supabase/tests/0009_project_realtime_crm.test.sql` must create UUID fixtures in a transaction for:

```text
client A, client B, employee assigned, employee unassigned, admin
company A project, company B project
shared message, internal message
shared attachment, internal attachment
```

Use pgTAP to prove:

```text
client A: own project/shared thread rows only
client B: no company A rows
assigned employee: assigned project/shared+internal rows
unassigned employee: no company A project rows
admin: all project rows
client: cannot insert internal messages or assign users
employee: cannot self-assign or change project company
direct status updates: denied for every browser role
```

- [ ] **Step 3: Verify RED**

Run:

```bash
pnpm exec supabase init
pnpm test:crm
pnpm test:db
```

Keep the generated local project ID as `crystal-web-solution-local`, set PostgreSQL major version 15, and keep Studio disabled for automated tests. Expected: FAIL because migration `0009` and its tables/functions do not exist.

- [ ] **Step 4: Create the schema with exact invariants**

Create:

```sql
projects(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  source_deal_id uuid unique references public.deals(id),
  category text not null,
  title text not null,
  brief text not null,
  status text not null default 'brief_submitted',
  target_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

project_threads(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
)

project_assignments(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
)

project_messages(
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.project_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  visibility text not null default 'shared',
  body text not null,
  client_generated_id uuid not null,
  created_at timestamptz not null default now(),
  unique(sender_id, client_generated_id)
)

project_attachments(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message_id uuid references public.project_messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  visibility text not null default 'shared',
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
)

project_status_history(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  visibility text not null default 'shared',
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
)

audit_events(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
)
```

Add UUID `project_status_history` and `audit_events` tables, check constraints for all enumerated values, title/body/file bounds, and one-thread uniqueness. Preserve `deals`.

The existing `project_messages` and `project_files` tables are legacy `deal_id` structures. Before replacing them:

```sql
do $$
begin
  if exists (select 1 from public.project_messages limit 1)
     or exists (select 1 from public.project_files limit 1) then
    raise exception '0009 requires an explicit legacy project message/file data migration';
  end if;
end
$$;
```

After the guard passes, rename them to `legacy_project_messages` and `legacy_project_files`, drop their browser policies, revoke their browser grants, then create the new `project_messages` and `project_attachments` tables above. This preserves the old schema for forensic rollback without leaving a second accessible collaboration channel.

- [ ] **Step 5: Add indexes and RLS**

Create this complete initial index set:

```sql
create index projects_company_created_idx on public.projects(company_id, created_at desc);
create index projects_status_created_idx on public.projects(status, created_at desc);
create index projects_source_deal_idx on public.projects(source_deal_id) where source_deal_id is not null;
create index projects_created_by_idx on public.projects(created_by);
create index project_assignments_user_project_idx on public.project_assignments(user_id, project_id);
create index project_assignments_project_idx on public.project_assignments(project_id);
create index project_assignments_assigned_by_idx on public.project_assignments(assigned_by);
create index project_messages_thread_created_idx on public.project_messages(thread_id, created_at, id);
create index project_messages_sender_idx on public.project_messages(sender_id);
create index project_attachments_project_status_idx on public.project_attachments(project_id, status);
create index project_attachments_message_idx on public.project_attachments(message_id) where message_id is not null;
create index project_attachments_uploaded_by_idx on public.project_attachments(uploaded_by);
create index project_status_history_project_created_idx on public.project_status_history(project_id, created_at, id);
create index project_status_history_changed_by_idx on public.project_status_history(changed_by);
create index audit_events_project_created_idx on public.audit_events(project_id, created_at desc);
create index audit_events_actor_idx on public.audit_events(actor_id);
```

Enable and force RLS on every new table. Use `to authenticated`, `(select auth.uid())`, indexed membership/company checks, and separate shared/internal policies. Allow admin-only reads on `audit_events`; allow no direct browser writes to audit rows.

- [ ] **Step 6: Add transactional commands**

Every SECURITY DEFINER function must:

```sql
set search_path = pg_catalog, public, private, storage
```

Schema-qualify every object, verify `(select auth.uid())`, read `profiles.role`, validate company or assignment, and write `audit_events`. Project creation inserts the project and its one thread in one transaction. Assignment accepts only profiles whose role is `project_manager` or `admin`. Status transition locks the project row `for update` and validates the Task 2 transition graph. Message posting validates visibility and attaches only ready reservations owned by the caller for the same project.

- [ ] **Step 7: Add private Storage and Realtime policies**

Use private bucket `project-files` and reserved paths:

```text
{project_id}/{attachment_id}/{safe_filename}
```

Storage RLS validates bucket, UUID path segments, project access, uploader identity, and reservation state. Do not grant overwrite/upsert.

Use private Realtime topics:

```text
project:{project_id}:shared
project:{project_id}:internal
```

Clients may receive only the shared topic for their company project. Assigned employees and admins may receive both. A database trigger broadcasts only `message_id`, `project_id`, `visibility`, and `created_at`; clients refetch message content through normal RLS, so message bodies are never trusted to transport authorization alone.

- [ ] **Step 8: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test:db
pnpm test
```

Then:

```bash
git add supabase/config.toml supabase/migrations/0009_project_realtime_crm.sql supabase/tests/0009_project_realtime_crm.test.sql tests/crm/project-schema.test.mjs
git commit -m "feat(crm): add secure realtime project aggregate"
```

---

### Task 4: Build the Server Read Model and Validated Action Boundary

**Files:**
- Create: `lib/crm/projects.js`
- Create: `app/actions/project-actions.js`
- Create: `tests/crm/project-data.test.mjs`
- Create: `tests/crm/project-actions.test.mjs`

**Interfaces:**
- Produces: `listProjectsForViewer(supabase, profile)`, `getProjectWorkspace(supabase, profile, projectId)`, and `listProjectMessages(supabase, profile, projectId, cursor, limit)`.
- Produces actions: `createProject(formData)`, `assignProject(formData)`, `removeProjectAssignment(formData)`, `transitionProject(formData)`, `reserveAttachment(formData)`, `postProjectMessage(formData)`, and `finalizeAttachment(formData)`.
- Returns from every action: `{ ok: boolean, data?: object, error?: string, requestId?: string }`.

- [ ] **Step 1: Write failing read/action tests**

Assert that read functions check and return every Supabase error, never embed `profiles(...)` below project children, map public names through one separate profile query, and paginate messages by `(created_at,id)` with a default of 50 and maximum of 100.

Assert every action:

```text
authenticates through getAuthenticatedProfile/requireRole
validates canonical UUIDs, categories, statuses, visibility, title/body/file bounds
calls only the Task 3 RPC for protected mutations
logs requestId plus safe database code only
returns generic user-facing errors
revalidates the correct /dashboard, /team, or /admin/projects path
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because the shared project modules do not exist.

- [ ] **Step 3: Implement the RLS-preserving read model**

Initial workspace reads include project, thread, assignments, status history, the newest 50 authorized messages, and ready authorized attachments. Gather actor UUIDs, then perform:

```js
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url')
  .in('id', actorIds);
```

Never return profile email, audit rows, internal data to a client, or an empty collection when the query actually failed.

- [ ] **Step 4: Implement bounded actions**

Use the pure Task 2 contract before calling RPCs. `createProject` accepts only `category`, `title`, `brief`, and `targetDate`; it never accepts `company_id`, `status`, `created_by`, or assignments from `FormData`. `assignProject` is admin-only. `postProjectMessage` generates a UUID idempotency key server-side when absent and rejects client/internal mismatches before the RPC.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test
pnpm build
```

Then:

```bash
git add lib/crm/projects.js app/actions/project-actions.js tests/crm/project-data.test.mjs tests/crm/project-actions.test.mjs
git commit -m "feat(crm): add project reads and command actions"
```

---

### Task 5: Complete Client Project Creation and Client-Safe Workspace

**Files:**
- Modify: `components/crm/BriefSubmissionForm.jsx`
- Create: `components/crm/ProjectStatus.jsx`
- Modify: `app/dashboard/page.jsx`
- Modify: `app/dashboard/projects/[id]/page.jsx`
- Create: `app/dashboard/loading.jsx`
- Create: `app/dashboard/error.jsx`
- Create: `tests/crm/client-projects.test.mjs`

**Interfaces:**
- Consumes: `PROJECT_CATEGORIES`, `createProject`, `listProjectsForViewer`, `getProjectWorkspace`, and exact client guard `requireRole(['client'], '/login/client')`.
- Produces: client project creation with category/title examples and a client-safe project status/workspace view.

- [ ] **Step 1: Write the failing client route contract**

Assert that both pages are server pages guarded before data reads, source projects only from `projects`, use the shared read model, and never render sales stage/value, audit events, assignment mutation, internal visibility controls, or notification metadata.

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because the pages still use client-side `deals` queries.

- [ ] **Step 3: Rebuild project creation**

Render the exact five category options. Use separate required fields:

```text
Category: Web Design | Logo Creation | Branding | Marketing | AI Automation
Project title: placeholder "ABC Website Design"
Brief: 1–5000 characters
Target date: optional
```

Submit to `createProject`; show the returned generic error or redirect to `/dashboard/projects/{projectId}`.

- [ ] **Step 4: Rebuild client list and detail**

Show active/completed counts, category label, status, target date, and latest shared activity. The detail page renders `ProjectStatus` plus the Task 7 thread slot from the prepared workspace. Client messages/attachments are already filtered by RLS and must be filtered again by `visibility === 'shared'` before serialization as defense in depth.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test
pnpm build
```

Then:

```bash
git add app/dashboard components/crm/BriefSubmissionForm.jsx components/crm/ProjectStatus.jsx tests/crm/client-projects.test.mjs
git commit -m "feat(crm): add client project creation workspace"
```

---

### Task 6: Add Assigned Employee and Admin Project Operations

**Files:**
- Modify: `app/team/page.jsx`
- Create: `app/team/projects/[id]/page.jsx`
- Create: `app/admin/projects/page.jsx`
- Create: `app/admin/projects/[id]/page.jsx`
- Create: `components/crm/ProjectAssignments.jsx`
- Create: `tests/crm/staff-projects.test.mjs`

**Interfaces:**
- Consumes: shared reads/actions, Task 2 transition graph, exact employee/admin guards, and Task 3 assignment RPCs.
- Produces: assigned-only employee workspaces and admin assignment/status oversight.

- [ ] **Step 1: Write failing role route tests**

Assert:

```js
assert.match(teamPage, /requireRole\(\[['"]project_manager['"]\], ['"]\/login\/employee['"]\)/);
assert.match(adminPage, /requireRole\(\[['"]admin['"]\], ['"]\/login\/admin['"]\)/);
```

Also assert employee routes query only `listProjectsForViewer`, admin assignment forms call only `assignProject`/`removeProjectAssignment`, and neither UI accepts `company_id` mutations.

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because assigned project routes and assignment controls do not exist.

- [ ] **Step 3: Build employee routes**

List only assigned projects and their next target dates/statuses. Employee detail shows shared and internal messages in one ordered thread, ready attachments, status controls limited by `ALLOWED_TRANSITIONS`, and no assignment/company/sales controls.

- [ ] **Step 4: Build admin routes**

Admin list filters by company, category, status, assigned user, target date, and overdue state. Admin detail includes assignment management, shared/internal collaboration, status controls, and safe links to the source deal when present.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test
pnpm build
```

Then:

```bash
git add app/team app/admin/projects components/crm/ProjectAssignments.jsx tests/crm/staff-projects.test.mjs
git commit -m "feat(crm): add assigned staff project operations"
```

---

### Task 7: Implement the Unified Live Thread and Attachment Workflow

**Files:**
- Modify: `components/crm/ProjectThread.jsx`
- Create: `components/crm/ProjectComposer.jsx`
- Create: `lib/crm/realtime.js`
- Create: `tests/crm/project-thread.test.mjs`
- Create: `tests/crm/project-attachments.test.mjs`

**Interfaces:**
- Consumes: prepared workspace/message view models, Task 2 topics, Task 4 actions, browser Supabase client, and private Task 3 Realtime/Storage policies.
- Produces: one ordered thread UI, authorized live message refresh, internal-note controls for staff/admin, and bounded private attachments.

- [ ] **Step 1: Write failing thread and attachment tests**

Assert:

```text
exactly one project thread ID is rendered
client subscribes only to shared topic
project_manager/admin subscribe to shared and internal topics
channel config includes private: true
subscription cleanup removes both channels
event payload is treated as an invalidation and message content is refetched
internal toggle is absent for clients
upload rejects >10 MiB and non-allowlisted MIME types before reservation
upload path is returned by reserveAttachment, never caller-constructed
failed upload/finalization removes the object
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test:crm`

Expected: FAIL because the current component reads `deal_id`, performs invalid profile embeds, and has no live subscription.

- [ ] **Step 3: Implement private live updates**

`lib/crm/realtime.js` creates channels using the Task 2 topic helpers and:

```js
supabase.channel(topic, { config: { private: true } })
  .on('broadcast', { event: 'INSERT' }, handleInvalidation)
  .subscribe();
```

On an event, refetch authorized messages or call `router.refresh()`; do not append the broadcast payload as trusted message content. Refresh the Realtime JWT after auth refresh and remove channels on unmount/project change.

- [ ] **Step 4: Implement one merged conversation**

Sort authorized messages by `(created_at,id)`. Display a visible `Internal` badge only to staff/admin. Shared and internal rows remain in one DOM list and one pagination cursor. Posting uses `client_generated_id` to prevent duplicate messages after retries.

- [ ] **Step 5: Implement attachment reservation and finalization**

Workflow:

```text
validate file locally
reserveAttachment → attachment UUID and server-generated path
authenticated direct Storage upload with upsert:false
finalizeAttachment → ready metadata
postProjectMessage with attachment UUIDs
remove Storage object if upload metadata/finalization/message linking fails
```

Downloads use 60-second signed URLs generated server-side after the same project/visibility check.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
pnpm test:crm
pnpm test:db
pnpm test
pnpm build
```

Then:

```bash
git add components/crm/ProjectThread.jsx components/crm/ProjectComposer.jsx lib/crm/realtime.js tests/crm/project-thread.test.mjs tests/crm/project-attachments.test.mjs
git commit -m "feat(crm): add unified realtime project thread"
```

---

### Task 8: Production Hardening, Responsive QA, and Release Operations

**Files:**
- Modify: `app/globals.css`
- Create: `tests/e2e/crm-projects.spec.js`
- Create: `playwright.config.js`
- Create: `docs/CRM-OPERATIONS.md`
- Create: `tests/crm/crm-release-contract.test.mjs`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: responsive acceptance evidence, security/release gates, rollback procedure, and operational monitoring.

- [ ] **Step 1: Write failing release and browser contracts**

The source contract asserts:

```text
CRM breakpoint at or below 768px
44px minimum interactive targets
wrapped action rows
scroll-contained dense tables
prefers-reduced-motion handling
operations doc contains migration, rollback, Realtime, Storage, and RLS checks
```

The browser suite covers 390×844, 768×1024, and 1440×900.

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test:crm
pnpm test:e2e
```

Expected: FAIL because the responsive contracts, browser suite, and operations guide are absent.

- [ ] **Step 3: Add browser role and realtime scenarios**

Using environment-provided local test identities only, prove:

```text
client creates "ABC Website Design" in Web Design
client sees only own-company projects and shared messages
admin assigns an employee
assigned employee sees the project without seeing unassigned projects
unassigned employee cannot navigate directly to the project
employee internal note appears live to admin but never to client
shared reply appears live to all project participants
allowed attachment uploads/downloads; blocked size/type fail safely
status changes appear to authorized participants
sign-out invalidates access
```

No password, token, signed URL, or message fixture containing personal data may be committed or printed.

- [ ] **Step 4: Add responsive CRM styling**

Desktop uses bounded content plus sidebar; tablet uses two-column summaries; mobile stacks navigation, cards, thread composer, status, and assignment actions. Thread and table regions may scroll internally, but the page must have no horizontal overflow.

- [ ] **Step 5: Document operations**

`docs/CRM-OPERATIONS.md` must include:

```text
Next.js 15/React 19 runtime and pnpm commands
role/portal matrix
five categories and title rules
status transition graph
one-thread and internal-message model
private Realtime topic authorization and subscriber monitoring
10 MiB/MIME/storage path rules and stale reservation cleanup
0008 then 0009 migration order
preflight check that legacy project message/file tables are empty
RLS policy and missing-FK-index verification queries
backup, rollback, and restore procedure
explicit operator approval before live DDL or user provisioning
```

- [ ] **Step 6: Run final security and performance review**

Run local database reset/tests, inspect every foreign key for an index, use `EXPLAIN (ANALYZE, BUFFERS)` on project lists and message pagination, and verify private Realtime channel denial for wrong-role users. Do not apply live DDL.

- [ ] **Step 7: Run the full release gate**

Run:

```bash
pnpm test:crm
pnpm test:db
pnpm test
pnpm build
pnpm test:e2e
```

Expected: all commands pass in a symlink-capable CI/Linux environment.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css tests/e2e/crm-projects.spec.js playwright.config.js docs/CRM-OPERATIONS.md tests/crm/crm-release-contract.test.mjs
git commit -m "test(crm): add production release evidence"
```

---

## Final Acceptance Gate

- [ ] Next.js 15 and React 19 are locked in `package.json`/`pnpm-lock.yaml`; Next.js 16 is not installed.
- [ ] Clients can sign up/log in through the client portal and create projects in exactly the five categories with independent bounded titles.
- [ ] Every required entity has a UUID, and every project has exactly one thread.
- [ ] Admins can assign employees/admins; employees see only assigned projects.
- [ ] Shared and internal messages appear as one ordered thread to authorized staff; clients never receive internal rows or internal Realtime events.
- [ ] Project status changes follow the validated transition graph and are audited.
- [ ] Attachments are private, bounded, project-scoped, signed for download, and cleaned up on failed finalization.
- [ ] All new tables have RLS, explicit authenticated policies, fixed-search-path helpers, revoked public execution, and indexed foreign keys/policy columns.
- [ ] `pnpm test:crm`, `pnpm test:db`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass.
- [ ] Browser checks pass at 390×844, 768×1024, and 1440×900 without page-level horizontal overflow.
- [ ] The public homepage, WebGL scene, Motion carousel, and reduced-motion behavior remain intact.
- [ ] Migrations are reviewed locally but not applied live without explicit operator approval.

## Primary References

- Next.js 15 upgrade guide: `https://nextjs.org/docs/app/guides/upgrading/version-15`
- React Three Fiber v9/React 19 compatibility: `https://github.com/pmndrs/react-three-fiber`
- Supabase Realtime database changes: `https://supabase.com/docs/guides/realtime/subscribing-to-database-changes`
- Supabase Realtime authorization: `https://supabase.com/docs/guides/realtime/authorization`
- Supabase Storage access control: `https://supabase.com/docs/guides/storage/security/access-control`
- Supabase Row Level Security: `https://supabase.com/docs/guides/database/postgres/row-level-security`
