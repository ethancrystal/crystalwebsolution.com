# Three-Role Project CRM Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing CRM as a secure, responsive, project-centered workspace where clients, employees, and administrators use distinct login portals while collaborating on the same projects.

**Architecture:** Keep the CRM inside the existing Next.js App Router application and keep Supabase as its shared authentication, database, storage, and row-security boundary. Treat `profiles.role` as the authoritative role source, separate delivery projects from sales deals, and expose project changes through validated server actions/RPCs that write an immutable event trail.

**Tech Stack:** Next.js 14 App Router, React 18 JSX, Supabase Auth/Postgres/Storage/RLS, plain global CSS, Node test runner, pnpm as the repository package runner.

## Execution Status

- Task 1: complete at commits `6c186db` and `2923502`; task review clean.
- Task 2: complete at commits `c63a067` and `cc44a27`; task review clean.
- Task 3: next task. Two local RED-test drafts may exist in the originating worktree, but they are intentionally not part of the portable checkpoint and must not be treated as implemented.
- Tasks 4–7: pending.
- The unchecked task-step boxes below preserve the original, independently reviewable implementation instructions. This status section and the SDD ledger are authoritative for execution progress.

## Global Constraints

- The CRM remains part of the existing Next.js frontend; do not create a second app, second identity store, or separate package.
- Use `pnpm` only to install, test, run, and build this repository. Do not rewrite CRM code merely to make it “pnpm-based.”
- Preserve the public cinematic homepage, its one R3F Canvas, one Lenis/GSAP clock, existing procedural visuals, and reduced-motion fallbacks.
- Keep JSX and plain CSS; do not add TypeScript, Tailwind, or a component framework.
- Use one Supabase identity per human and exactly one authoritative role: `client`, `project_manager`, or `admin`.
- Use `profiles.role` for every authorization decision; `auth.users.app_metadata.role` may be mirrored for display but is never an authorization source.
- Exact test identities are role-distinct: `ethan@crystalwebsolution.com` is admin, `ethan+employee@crystalwebsolution.com` is project manager, and `ethan+client@crystalwebsolution.com` is client.
- Never put passwords, service-role keys, invite links, or access tokens in source, tests, logs, commits, or reports.
- All protected routes fail closed when Supabase configuration, authentication, profile lookup, or role lookup fails.
- Clients can access only their company and projects; project managers can access only projects assigned through `project_members`; admins can access all CRM records.
- Internal notes, audit events, and notification delivery metadata are never client-readable.
- Project status, client company, member assignment, approvals, and deliverable publication change only through server actions or SECURITY DEFINER RPCs with fixed `search_path` and revoked public execution.
- Storage paths are project-scoped and file metadata is inserted only after a successful bounded upload; failed metadata writes delete the uploaded object.
- Do not apply migrations to the live Supabase project during implementation. Produce and test migration files locally, then require a final reviewed deployment decision.
- Each task must leave `pnpm test` and `pnpm build` passing before commit.

## File Responsibility Map

- `lib/auth/roles.mjs`: pure portal/role contract shared by middleware, server guards, and tests.
- `lib/auth/require-role.js`: server-only session/profile lookup and exact-role guards.
- `components/auth/PortalLoginForm.jsx`: one reusable form configured by a portal descriptor.
- `app/login/**`: portal chooser and dedicated client, employee, and admin entry routes.
- `supabase/migrations/0008_auth_rbac_repair.sql`: authoritative roles, onboarding repair, legacy CRM isolation, and safe role mutation.
- `supabase/migrations/0009_project_workspace.sql`: delivery-project aggregate, membership, collaboration, approvals, notifications, audit events, RLS, and commands.
- `lib/crm/project-contract.mjs`: pure project statuses, transitions, and visibility rules.
- `lib/crm/projects.js`: server-side read model that maps actor IDs to public profiles without invalid PostgREST joins.
- `app/actions/project-actions.js`: validated project mutation boundary.
- `components/crm/**`: shared responsive workspace components used by all three portals.
- `app/dashboard/**`: client-only project workspace.
- `app/team/**`: project-manager-only workspace.
- `app/admin/projects/**`: admin project oversight.
- `scripts/provision-crm-test-users.mjs`: idempotent, secret-safe test-user provisioning.
- `tests/crm/**`: contract, migration, action, route, and source-invariant tests.

---

### Task 1: Authoritative Role Contract and Three Login Portals

**Files:**
- Create: `lib/auth/roles.mjs`
- Create: `lib/auth/require-role.js`
- Create: `components/auth/PortalLoginForm.jsx`
- Create: `app/login/client/page.jsx`
- Create: `app/login/employee/page.jsx`
- Create: `app/login/admin/page.jsx`
- Create: `app/team/page.jsx`
- Create: `tests/crm/auth-portals.test.mjs`
- Modify: `app/login/page.jsx`
- Modify: `app/auth/actions.js`
- Modify: `middleware.js`
- Modify: `app/dashboard/page.jsx`
- Modify: `app/admin/page.jsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `PORTALS`, `ROLES`, `getPortal(name)`, `homeForRole(role)`, `portalForPath(pathname)`, and `isRoleAllowed(portal, role)` from `lib/auth/roles.mjs`.
- Produces: `getAuthenticatedProfile()`, `requireRole(allowedRoles, loginPath)`, and `redirectHomeForRole(role)` from `lib/auth/require-role.js`.
- Produces: `signIn(formData)` accepting `portal`, `email`, `password`, and an allowlisted `next`; `signOut()` invalidates the session and redirects to `/login`.
- Consumes: existing `lib/supabase/server.js` and browser Supabase clients.

- [ ] **Step 1: Add the failing portal contract test and test scripts**

Create `tests/crm/auth-portals.test.mjs` with assertions equivalent to:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PORTALS, homeForRole, isRoleAllowed, portalForPath } from '../../lib/auth/roles.mjs';

test('each portal maps to one exact role and home', () => {
  assert.deepEqual(PORTALS.client, { role: 'client', login: '/login/client', home: '/dashboard', label: 'Client' });
  assert.deepEqual(PORTALS.employee, { role: 'project_manager', login: '/login/employee', home: '/team', label: 'Employee' });
  assert.deepEqual(PORTALS.admin, { role: 'admin', login: '/login/admin', home: '/admin', label: 'Admin' });
  assert.equal(isRoleAllowed('employee', 'admin'), false);
  assert.equal(homeForRole('project_manager'), '/team');
  assert.equal(portalForPath('/admin/projects'), 'admin');
});

test('middleware and pages do not use app_metadata as role authority', async () => {
  const middleware = await import('node:fs/promises').then((fs) => fs.readFile('middleware.js', 'utf8'));
  assert.doesNotMatch(middleware, /app_metadata\??\.role|userMetadata\??\.role/);
  assert.match(middleware, /from\(['"]profiles['"]\)/);
});
```

Add these scripts to `package.json` without altering dependencies:

```json
"test": "node --test tests/*.test.mjs tests/crm/*.test.mjs",
"test:crm": "node --test tests/crm/*.test.mjs"
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `pnpm test:crm`

Expected: FAIL because `lib/auth/roles.mjs` and the portal routes do not exist.

- [ ] **Step 3: Implement the pure role/portal contract**

Implement the exact descriptors in the test, return `null` for unknown roles or paths, and match protected route prefixes `/dashboard`, `/team`, and `/admin`. `isRoleAllowed()` must compare one exact role rather than treating admin as an implicit employee.

- [ ] **Step 4: Implement fail-closed middleware and server guards**

In both middleware and `require-role.js`:

```js
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) redirectOrRespondWithPortalLogin();
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, role, company_id, full_name')
  .eq('id', user.id)
  .single();
if (profileError || !profile || !allowedRoles.includes(profile.role)) redirectOrRespondWithoutRenderingProtectedContent();
```

Missing environment variables must redirect protected requests to the matching portal login with `error=configuration`, not call `NextResponse.next()`. Add `/team/:path*` and all three portal paths to `config.matcher`. An authenticated user opening the wrong portal is redirected to their role home.

- [ ] **Step 5: Implement the three portal pages and reusable login form**

Each page passes its fixed portal descriptor to `PortalLoginForm`. The form posts hidden `portal` and optional allowlisted `next` values to `signIn`. `signIn` authenticates, reads `profiles.role`, signs out immediately on a portal-role mismatch, and redirects to that portal with a generic error. On success, it redirects only to the expected role home or a same-role relative `next` path.

Create an initial `/team` employee landing page guarded by `requireRole(['project_manager'], '/login/employee')`. It must render a real signed-in employee shell with the user name, a safe empty state explaining that no projects are currently assigned, and the working `signOut()` form. It must not expose `/admin` navigation or query unscoped CRM records. Task 6 expands this route with assigned-project operations.

- [ ] **Step 6: Replace dead logout URLs**

Replace every link to `/api/auth/logout` with a form that invokes the existing server `signOut()` action. Keep `/login` as a three-choice portal selector and preserve password reset links.

- [ ] **Step 7: Run authentication tests and the full build**

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm build`

Expected: Next.js production build PASS with `/login/client`, `/login/employee`, `/login/admin`, and `/team` listed.

- [ ] **Step 8: Commit**

```bash
git add package.json middleware.js app/login app/team/page.jsx app/auth/actions.js app/dashboard/page.jsx app/admin/page.jsx components/auth lib/auth tests/crm/auth-portals.test.mjs
git commit -m "feat(crm): add role-specific secure login portals"
```

---

### Task 2: Repair Onboarding, Role Mutation, and Legacy CRM Isolation

**Files:**
- Create: `supabase/migrations/0008_auth_rbac_repair.sql`
- Create: `tests/crm/auth-rbac-migration.test.mjs`
- Modify: `app/admin/users/actions.js`

**Interfaces:**
- Produces SQL RPC `public.admin_set_user_role(p_user_id uuid, p_role text) returns public.profiles`.
- Produces SQL RPC `public.onboard_client_company(p_company_name text, p_contact_name text, p_phone text default null) returns uuid`.
- Produces helper `public.current_profile_role() returns text` and assignment predicates used by later RLS.
- Consumes `requireRole(['admin'], '/login/admin')` from Task 1.

- [ ] **Step 1: Write migration contract tests**

Create a test that reads `0008_auth_rbac_repair.sql` and asserts:

```js
assert.match(sql, /create or replace function public\.admin_set_user_role/i);
assert.match(sql, /create or replace function public\.onboard_client_company/i);
assert.match(sql, /set search_path = pg_catalog, public/i);
assert.match(sql, /revoke all on function .* from public/i);
assert.match(sql, /grant execute on function .* to authenticated/i);
assert.match(sql, /old\.role is distinct from new\.role/i);
assert.match(sql, /is_admin\(\)/i);
assert.doesNotMatch(sql, /grant execute .* to anon/i);
```

Also assert that legacy PM company/contact policies require ownership of a related sales deal (`deals.owner_id = auth.uid()`) and client note policies require `visibility = 'client'`. Task 3 replaces delivery access with explicit project membership once `project_members` exists.

- [ ] **Step 2: Verify the migration test fails**

Run: `pnpm test:crm`

Expected: FAIL because migration `0008_auth_rbac_repair.sql` does not exist.

- [ ] **Step 3: Write the deterministic repair migration**

The migration must:

1. Replace the profile-protection trigger so a user cannot change their own `role` or `company_id`, while SECURITY DEFINER onboarding and admin role RPCs can perform their validated changes.
2. Make client onboarding one transaction: validate authenticated `client`, create company/contact/member rows, assign `profiles.company_id`, and return the company ID.
3. Make contact email nullable or always populate it from the authenticated user so optional onboarding input cannot violate `NOT NULL`.
4. Make `admin_set_user_role` reject unknown roles, self-demotion, and demotion of the last admin; check the caller from `profiles.role`; update `profiles.role` atomically.
5. Replace PM company/contact policies with `exists` checks through `deals.owner_id = auth.uid()` instead of `is_staff()`; Task 3 uses explicit project membership for delivery projects.
6. Restrict client notes to client-visible notes in their own company and PM notes to assigned projects/companies.
7. Prevent client or PM updates from changing ownership/company/financial fields by routing permitted changes through commands and removing broad UPDATE policies.
8. Set fixed search paths, revoke execution from `PUBLIC` and `anon`, and grant only the two user-facing RPCs to `authenticated`.
9. Reconcile the live `0007` drift using idempotent `drop policy if exists` / `create policy` statements so a fresh database and the observed live database converge.

- [ ] **Step 4: Make admin role changes use only the RPC**

Replace the current split profile/Auth Admin update with:

```js
const { data, error } = await supabase.rpc('admin_set_user_role', {
  p_user_id: userId,
  p_role: role,
});
if (error) return { ok: false, error: 'Unable to update this role.' };
return { ok: true, profile: data };
```

Do not update `auth.users.app_metadata.role` as a separate authorization action.

- [ ] **Step 5: Run focused and full verification**

Run: `pnpm test:crm`

Expected: PASS.

Run: `pnpm test && pnpm build`

Expected: all tests and production build PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0008_auth_rbac_repair.sql tests/crm/auth-rbac-migration.test.mjs app/admin/users/actions.js
git commit -m "fix(crm): repair onboarding and tenant role isolation"
```

---

### Task 3: Add the Project Delivery Aggregate and Command Boundary

**Files:**
- Create: `lib/crm/project-contract.mjs`
- Create: `supabase/migrations/0009_project_workspace.sql`
- Create: `tests/crm/project-schema.test.mjs`
- Create: `tests/crm/project-contract.test.mjs`

**Interfaces:**
- Produces: `PROJECT_STATUSES`, `ALLOWED_TRANSITIONS`, `canTransition(from, to)`, and `canViewInternal(role)` from `lib/crm/project-contract.mjs`.
- Produces tables `projects`, `project_members`, `project_status_history`, `project_tasks`, `project_approvals`, `project_deliverables`, `notifications_outbox`, and `audit_events`.
- Rebinds existing `project_messages` and `project_files` to `projects.id` through `project_id`.
- Produces RPCs `create_delivery_project`, `transition_project_status`, `record_project_approval`, and `publish_project_deliverable`.

- [ ] **Step 1: Write failing status and schema tests**

Use this status contract:

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

Test that `brief_submitted -> planned -> in_progress -> client_review -> approved -> delivered` is allowed, `client_review -> changes_requested -> in_progress` is allowed, and `delivered -> in_progress` is rejected. The schema test must assert every table/RPC name, RLS enabled on every new table, fixed search paths, revoked public execution, event insertion, and notification-outbox insertion.

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm test:crm`

Expected: FAIL because the contract module and `0009` migration do not exist.

- [ ] **Step 3: Implement the pure project contract**

Export immutable status values and transition arrays. `canTransition` returns `false` for unknown values. `canViewInternal` returns `true` only for `project_manager` and `admin`.

- [ ] **Step 4: Create the project-centered schema**

Use UUID primary keys and timestamps. Required fields:

```sql
projects(id, company_id, source_deal_id, name, summary, project_type, status,
         target_date, budget_amount, currency, created_by, created_at, updated_at)
project_members(project_id, user_id, member_role, assigned_by, created_at)
project_status_history(id, project_id, from_status, to_status, note, changed_by, created_at)
project_tasks(id, project_id, title, description, status, priority, client_visible, assignee_id, due_at, created_by, completed_at, created_at, updated_at)
project_approvals(id, project_id, deliverable_id, requested_by, decided_by, decision, comment, decided_at, created_at)
project_deliverables(id, project_id, title, version, storage_path, mime_type, size_bytes, published_by, published_at)
notifications_outbox(id, recipient_id, project_id, event_type, payload, status, attempts, available_at, sent_at, last_error, created_at)
audit_events(id, actor_id, project_id, company_id, event_type, metadata, created_at)
```

Keep sales `deals` intact. `projects.source_deal_id` is optional and unique, so a won opportunity can create one project without exposing every deal to clients.

- [ ] **Step 5: Add RLS and validated commands**

Policies must encode:

- client: own-company projects and client-visible collaboration only;
- project manager: projects with a matching `project_members.user_id`;
- admin: all project rows;
- internal audit/outbox: admin reads only, no direct browser writes;
- messages/files/deliverables: project membership/ownership checks;
- no direct status/company/member mutation.

Each command locks the project row, validates caller role/membership, validates transitions or decision state, writes the domain row and `audit_events`, and enqueues affected users in `notifications_outbox` within one transaction.

- [ ] **Step 6: Run verification**

Run: `pnpm test:crm`

Expected: PASS.

Run: `pnpm test && pnpm build`

Expected: all tests and production build PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/crm/project-contract.mjs supabase/migrations/0009_project_workspace.sql tests/crm/project-contract.test.mjs tests/crm/project-schema.test.mjs
git commit -m "feat(crm): add secure project delivery aggregate"
```

---

### Task 4: Build the Shared Project Read Model and Server Actions

**Files:**
- Create: `lib/crm/projects.js`
- Create: `app/actions/project-actions.js`
- Create: `tests/crm/project-data.test.mjs`
- Modify: `components/crm/BriefSubmissionForm.jsx`
- Modify: `components/crm/ProjectThread.jsx`
- Modify: `components/crm/NotesPanel.jsx`

**Interfaces:**
- Produces: `listProjectsForViewer(supabase, profile)`, `getProjectWorkspace(supabase, profile, projectId)`, and `mapProfilesById(supabase, ids)`.
- Produces server actions: `submitProjectBrief`, `postProjectMessage`, `uploadProjectFile`, `createProjectTask`, `transitionProject`, `requestApproval`, `decideApproval`, and `publishDeliverable`.
- Consumes Task 1 `requireRole`, Task 3 project contract, and Task 3 RPCs.

- [ ] **Step 1: Write failing source-contract tests**

The test reads these modules and asserts that:

- no query contains `profiles(` embedded beneath notes/messages/files;
- author IDs are collected and resolved using one separate `profiles` query;
- every action calls `requireRole`, validates UUID/text/file inputs, checks returned Supabase errors, and returns `{ ok, data?, error? }`;
- file uploads reject more than 10 MiB and reject MIME types outside PDF, DOCX, PNG, JPEG, and plain text;
- a metadata failure invokes storage removal for the just-uploaded path;
- the client brief action supplies only project brief fields and never accepts budget, company, status, or membership from `FormData`.

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm test:crm`

Expected: FAIL because the shared read model and action module do not exist.

- [ ] **Step 3: Implement the read model without invalid relationships**

Fetch each workspace table by `project_id`, gather unique actor IDs from `created_by`, `sender_id`, `uploaded_by`, `assignee_id`, and `published_by`, then run:

```js
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, full_name')
  .in('id', [...actorIds]);
```

Map names in JavaScript and expose no profile email or internal metadata to client components. Let RLS remain the final row boundary and treat every query error as a failed request rather than an empty result.

- [ ] **Step 4: Implement validated server actions**

Normalize strings, enforce length limits, parse UUIDs, and call only the RPCs from Task 3 for protected lifecycle changes. Return generic user-facing errors and log only request IDs plus safe error codes. Revalidate the correct role route after success.

For upload:

```js
const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;
const upload = await supabase.storage.from('project-files').upload(storagePath, file, { upsert: false, contentType: file.type });
if (upload.error) return fail('Upload failed.');
const metadata = await supabase.from('project_files').insert({ project_id: projectId, storage_path: storagePath, /* bounded metadata */ });
if (metadata.error) {
  await supabase.storage.from('project-files').remove([storagePath]);
  return fail('Upload could not be saved.');
}
```

- [ ] **Step 5: Rewire existing components**

`BriefSubmissionForm` calls `submitProjectBrief`. `ProjectThread` accepts a prepared workspace view model rather than performing invalid profile embeds. `NotesPanel` shows internal notes only when `canViewInternal(profile.role)` and labels client-visible updates explicitly.

- [ ] **Step 6: Run verification**

Run: `pnpm test:crm`

Expected: PASS.

Run: `pnpm test && pnpm build`

Expected: all tests and production build PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/crm/projects.js app/actions/project-actions.js components/crm tests/crm/project-data.test.mjs
git commit -m "feat(crm): add secure project reads and commands"
```

---

### Task 5: Complete the Client Project Workspace

**Files:**
- Create: `components/crm/WorkspaceShell.jsx`
- Create: `components/crm/ProjectOverview.jsx`
- Create: `components/crm/ProjectTimeline.jsx`
- Create: `components/crm/ProjectTasks.jsx`
- Create: `components/crm/ProjectFiles.jsx`
- Create: `components/crm/ProjectApprovals.jsx`
- Create: `tests/crm/client-workspace.test.mjs`
- Modify: `app/dashboard/page.jsx`
- Modify: `app/dashboard/projects/[id]/page.jsx`

**Interfaces:**
- Consumes `requireRole(['client'], '/login/client')`, `listProjectsForViewer`, `getProjectWorkspace`, and client-safe actions from Task 4.
- Produces a responsive client dashboard with project list, overview, visible status history, tasks, messages, files, deliverables, and approval decisions.

- [ ] **Step 1: Write the failing client-workspace test**

Assert that both client pages invoke an exact client guard before reading data, use the shared read model, contain empty/error/loading-safe states, and never import admin clients or render `internal_notes`, `audit_events`, `notifications_outbox`, budget, or sales stages.

- [ ] **Step 2: Verify the test fails**

Run: `pnpm test:crm`

Expected: FAIL because the shared workspace components and exact client guard are absent.

- [ ] **Step 3: Build the client dashboard**

Show company greeting, active/completed project counts, next action, and project cards sourced from `projects`, never from `deals`. A new brief creates a delivery project through `submitProjectBrief`.

- [ ] **Step 4: Build the client project detail**

Compose:

```jsx
<WorkspaceShell role="client">
  <ProjectOverview project={workspace.project} />
  <ProjectTimeline history={workspace.statusHistory} />
  <ProjectTasks tasks={workspace.tasks.filter((task) => task.client_visible)} readOnly />
  <ProjectThread messages={workspace.messages} canPost />
  <ProjectFiles files={workspace.files} deliverables={workspace.deliverables} canUpload />
  <ProjectApprovals approvals={workspace.approvals} canDecide />
</WorkspaceShell>
```

Only pending approval requests display approve/request-changes controls. Delivered files use short-lived signed URLs generated server-side.

- [ ] **Step 5: Run verification**

Run: `pnpm test:crm`

Expected: PASS.

Run: `pnpm test && pnpm build`

Expected: all tests and production build PASS.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard components/crm tests/crm/client-workspace.test.mjs
git commit -m "feat(crm): complete the client project workspace"
```

---

### Task 6: Complete Employee/Admin Operations and Safe Test-User Provisioning

**Files:**
- Create: `app/team/projects/[id]/page.jsx`
- Create: `app/admin/projects/page.jsx`
- Create: `app/admin/projects/[id]/page.jsx`
- Create: `components/crm/ProjectOperations.jsx`
- Create: `scripts/provision-crm-test-users.mjs`
- Create: `tests/crm/staff-workspaces.test.mjs`
- Create: `tests/crm/test-user-provisioning.test.mjs`
- Modify: `app/admin/users/actions.js`
- Modify: `app/admin/page.jsx`
- Modify: `app/team/page.jsx`

**Interfaces:**
- Consumes exact role guards, shared project reads/actions, and project contract from Tasks 1–4.
- Produces employee assignment/task/status/deliverable operations and admin all-project oversight.
- Produces idempotent provisioning command `pnpm crm:provision-test-users -- --dry-run` and explicit `--execute`.

- [ ] **Step 1: Write failing staff and provisioning tests**

Assert:

```js
assert.match(teamPage, /requireRole\(\[['"]project_manager['"]\], ['"]\/login\/employee['"]\)/);
assert.match(adminPage, /requireRole\(\[['"]admin['"]\], ['"]\/login\/admin['"]\)/);
assert.match(script, /ethan@crystalwebsolution\.com/);
assert.match(script, /ethan\+employee@crystalwebsolution\.com/);
assert.match(script, /ethan\+client@crystalwebsolution\.com/);
assert.match(script, /--dry-run/);
assert.match(script, /--execute/);
assert.doesNotMatch(script, /password\s*[:=]\s*['"][^'"]+['"]/i);
```

Also assert the employee UI exposes assigned projects only and the admin UI exposes member assignment plus all projects.

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm test:crm`

Expected: FAIL because `/team`, `/admin/projects`, and the provisioning script do not exist.

- [ ] **Step 3: Build the employee workspace**

The employee dashboard lists only assigned projects and overdue/next tasks. Its detail page can post internal/client-visible updates, create/assign tasks within the project, move status only along `ALLOWED_TRANSITIONS`, request client approval, and publish versioned deliverables. It cannot change project company, budget, sales deal, or membership.

- [ ] **Step 4: Build admin project oversight**

The admin list filters by company, status, project manager, target date, and overdue state. Detail includes all client and operational components plus project-member assignment, lifecycle controls, and safe links to the related company/source deal. Account management remains admin-only.

- [ ] **Step 5: Make invitations role-safe**

Create the auth user without emailing, provision `profiles.role` through the authoritative database path, generate an invite/setup link only after provisioning succeeds, and send the branded email through Resend. If role provisioning or email generation fails, delete the newly-created auth user. Never accept a caller-supplied redirect host.

- [ ] **Step 6: Add idempotent test-user provisioning**

The script loads secrets only from environment variables, requires an explicit mode, and uses:

```js
const TEST_USERS = Object.freeze([
  { email: 'ethan@crystalwebsolution.com', role: 'admin', fullName: 'Ethan Admin' },
  { email: 'ethan+employee@crystalwebsolution.com', role: 'project_manager', fullName: 'Ethan Employee' },
  { email: 'ethan+client@crystalwebsolution.com', role: 'client', fullName: 'Ethan Client' },
]);
```

`--dry-run` prints only email and target role. `--execute` upserts only these three identities, sets one role each, and sends password-setup invitations rather than storing or printing passwords. Existing matching users are updated safely and never duplicated. Add:

```json
"crm:provision-test-users": "node scripts/provision-crm-test-users.mjs"
```

- [ ] **Step 7: Run verification**

Run: `pnpm test:crm`

Expected: PASS.

Run: `pnpm crm:provision-test-users -- --dry-run`

Expected: three emails and roles, no secret values, no database writes.

Run: `pnpm test && pnpm build`

Expected: all tests and production build PASS.

- [ ] **Step 8: Commit**

```bash
git add app/team app/admin/projects app/admin/page.jsx app/admin/users/actions.js components/crm/ProjectOperations.jsx scripts/provision-crm-test-users.mjs tests/crm/staff-workspaces.test.mjs tests/crm/test-user-provisioning.test.mjs package.json
git commit -m "feat(crm): add staff operations and safe test users"
```

---

### Task 7: Responsive Integration, Notification Worker, and Release Evidence

**Files:**
- Create: `app/api/cron/crm-notifications/route.js`
- Create: `lib/email/crm-notifications.js`
- Create: `tests/crm/notifications.test.mjs`
- Create: `tests/crm/responsive-contract.test.mjs`
- Create: `docs/CRM-OPERATIONS.md`
- Modify: `app/globals.css`
- Modify: `components/crm/WorkspaceShell.jsx`
- Modify: `components/crm/ProjectOverview.jsx`
- Modify: `components/crm/ProjectTimeline.jsx`
- Modify: `components/crm/ProjectTasks.jsx`
- Modify: `components/crm/ProjectFiles.jsx`
- Modify: `components/crm/ProjectApprovals.jsx`
- Modify: `components/crm/ProjectOperations.jsx`

**Interfaces:**
- Consumes `notifications_outbox` from Task 3 and existing Resend wrapper.
- Produces authenticated, idempotent delivery of pending CRM notifications and documented operational/release procedure.
- Produces responsive CRM layouts at 390, 768, and 1440 CSS pixels without page-level horizontal overflow.

- [ ] **Step 1: Write failing notification and responsive tests**

Notification tests assert the route verifies `CRON_SECRET`, claims a bounded batch, increments attempts, marks successful sends, preserves failed rows with `last_error`, and never returns payload/email contents. Responsive source tests assert CRM grid/table/action styles have breakpoints at or below 768px, touch targets of at least 44px, wrapped action rows, scroll-contained data tables, and no fixed CRM content width wider than the viewport.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:crm`

Expected: FAIL because the notification route and responsive contracts are absent.

- [ ] **Step 3: Implement outbox delivery**

Require `Authorization: Bearer ${CRON_SECRET}`. Claim at most 25 pending rows whose `available_at <= now()` using a database command that prevents double-send. Render allowlisted event templates only, send through the existing Resend wrapper, and update `status`, `attempts`, `sent_at`, or `last_error`. Retry with increasing `available_at`; mark permanently failed after five attempts.

- [ ] **Step 4: Implement cohesive responsive CRM styles**

At desktop, use sidebar plus bounded content. At tablet, collapse dense grids to two columns. At mobile, stack navigation/summary/actions, allow project tables to scroll inside their own region, keep dialogs/forms inside `100dvw`, and make timeline/messages/files readable without horizontal page overflow. Respect `prefers-reduced-motion`; do not attach CRM animation to the public R3F scene.

- [ ] **Step 5: Document operations and release gates**

`docs/CRM-OPERATIONS.md` must document:

- portal URLs and exact role behavior;
- invitation, demotion, last-admin, and logout behavior;
- project status and approval lifecycle;
- storage bounds and orphan cleanup;
- outbox retry/monitoring;
- local `pnpm` commands;
- dry-run and execute test-user commands;
- reviewed migration order `0008` then `0009`;
- explicit instruction that production migration application and `--execute` provisioning require operator approval;
- rollback and verification queries that do not expose credentials.

- [ ] **Step 6: Run complete automated verification**

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm build`

Expected: production build PASS with client, employee, and admin project routes.

- [ ] **Step 7: Run real browser verification**

Run: `pnpm dev`.

Verify at 390x844, 768x1024, and 1440x900:

- `/login`, `/login/client`, `/login/employee`, `/login/admin` have no page overflow;
- unauthenticated protected routes redirect to their matching portals;
- wrong-role logins are rejected and signed out;
- client sees only client-safe project data;
- employee sees only assigned projects and operational controls;
- admin sees all project/member controls;
- sign out invalidates the session and returns to `/login`;
- public homepage visuals and Motion carousel remain intact.

Record exact viewport results in the task report; do not use screenshots containing tokens, invite links, or personal data.

- [ ] **Step 8: Run security and migration review without applying live DDL**

Review both migrations for fixed search paths, grants, RLS coverage, unindexed foreign keys, multiple permissive policies, and idempotence against the known `0007` drift. Do not call a live migration tool.

- [ ] **Step 9: Commit**

```bash
git add app/api/cron/crm-notifications lib/email/crm-notifications.js components/crm app/globals.css tests/crm docs/CRM-OPERATIONS.md
git commit -m "feat(crm): finish responsive operations and notifications"
```

---

## Final Acceptance Gate

- [ ] Every task-specific reviewer reports no unresolved critical, high, or medium finding.
- [ ] A final whole-branch reviewer verifies the implementation against all three audit reports.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Browser checks pass at 390x844, 768x1024, and 1440x900.
- [ ] The public homepage and selected-work Motion carousel still pass their existing tests.
- [ ] Migration files are reviewed but not applied to live Supabase.
- [ ] `pnpm crm:provision-test-users -- --dry-run` is secret-free and idempotent.
- [ ] After explicit operator approval, apply `0008` then `0009`, run the three-user `--execute` command, and confirm each invitation is role-correct without displaying invite links or passwords.
