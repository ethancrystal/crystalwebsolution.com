# CRM Client Workspace Audit

Date: 2026-07-30  
Scope: client signup/onboarding through project brief, project status and PM display, conversation, files, approvals/deliverables, notifications, billing, responsive UX, and the client/PM/admin integration contract.

## Executive assessment

The repository has a credible CRM scaffold, but the client workspace is **not release-ready**. The production build succeeds, role gates and the basic dashboard routes exist, and migrations 0004-0007 materially improve the original authorization model. However, the primary first-run path cannot complete, the shared conversation/files query is invalid against the schema, the client-visible delivery status cannot be advanced anywhere in the UI, and the PM update contract permits cross-client project reassignment.

The most important architectural issue is that `deals` is simultaneously an internal sales opportunity and a client project. Every deal receives a client delivery status and every company member can see every deal for that company. That makes it impossible to reliably separate internal pipeline records from client-ready projects.

## Verification performed

- Read `AGENTS.md`, all client/auth/project workspace code, the relevant admin/PM screens, and migrations `0001` through `0007`.
- `npm run build`: **pass** on Next.js 14.2.35; all 37 routes were generated.
- Live schema inspection confirmed:
  - all CRM tables and profiles were empty, so no realistic authenticated data journey could be exercised;
  - `project_messages.sender_id` and `project_files.uploaded_by` reference `auth.users`, not `public.profiles`;
  - the deployed onboarding function and profile-change trigger have the same conflict described below.
- This checkout had no Supabase/Resend environment variables in the process. Authenticated browser testing and live file/email/payment behavior therefore remain unverified.
- The existing port-3000 development process returned HTTP 500 during this audit, and a second isolated server could not start because the local Next package payload was incomplete. Responsive conclusions below are code-backed, not screenshot-backed.

## What is present and structurally sound

- Signup, login, email confirmation, password reset, and role-aware redirects are implemented. The redirect exception is re-thrown correctly in the client auth forms (`app/signup/page.jsx:23-36`, `app/login/page.jsx:20-33`, `app/auth/reset-password/page.jsx:22-36`).
- Middleware separates client routes from admin/PM routes and makes `/admin/users` admin-only (`middleware.js:40-69`).
- The client dashboard lists company deals and exposes a project brief form (`app/dashboard/page.jsx:23-35`, `app/dashboard/page.jsx:114-139`).
- Project type uses one shared taxonomy and is carried through brief creation and project detail display (`components/crm/BriefSubmissionForm.jsx:20-26`, `components/crm/BriefSubmissionForm.jsx:75-85`, `app/dashboard/projects/[id]/page.jsx:160-165`).
- A private Storage bucket, signed downloads, and deal-scoped message/file RLS are defined (`supabase/migrations/0003_project_delivery.sql:67-126`, `components/crm/ProjectThread.jsx:157-169`).
- Migrations 0004-0006 correctly separate the enum change, introduce `project_manager`, restrict deal/task creation, and make destructive operations admin-only (`supabase/migrations/0004_project_manager_role.sql:4-13`, `supabase/migrations/0005_pm_scoping_and_project_type.sql:66-83`, `supabase/migrations/0005_pm_scoping_and_project_type.sql:140-159`, `supabase/migrations/0006_admin_only_company_contact_creation.sql:11-17`).

## Findings

### P0 — Brand-new client onboarding rolls back

**Evidence**

- A new client has no company and the UI calls `onboard_client_company()` before allowing a brief (`components/crm/BriefSubmissionForm.jsx:7-17`, `components/crm/BriefSubmissionForm.jsx:31-45`).
- The function updates `profiles.company_id` (`supabase/migrations/0003_project_delivery.sql:147-173`).
- The earlier trigger rejects any `company_id` change by a non-admin (`supabase/migrations/0002_crm_security_hardening.sql:19-36`).
- `SECURITY DEFINER` bypasses RLS, not row triggers. The function's comment claiming it bypasses the trigger is incorrect (`supabase/migrations/0003_project_delivery.sql:141-146`).
- The form labels company email optional and passes `NULL` when blank (`components/crm/BriefSubmissionForm.jsx:121-128`, `components/crm/BriefSubmissionForm.jsx:38-41`), but `companies.email` is `NOT NULL` (`supabase/migrations/0001_crm_schema.sql:23-33`).

**Impact**

The normal signup → company setup → first brief flow cannot complete. Even after fixing the trigger conflict, leaving the visibly optional email blank still fails.

**Fix**

Create a new migration that replaces the onboarding function and trigger contract. Use a narrowly scoped, authenticated-only RPC that validates `role = client`, creates the company/membership, and performs the profile link through an explicit trusted path understood by the trigger (for example, a transaction-local guard checked by the trigger). Revoke function execution from `PUBLIC` and grant only `authenticated`. Derive company email from the authenticated user's email or make the field required in both UI and SQL. Add an integration test proving atomic rollback and successful first brief creation.

### P0 — Conversation/files and admin notes use relationships that do not exist

**Evidence**

- `ProjectThread` requests `profiles(full_name)` while selecting `project_messages` and `project_files` (`components/crm/ProjectThread.jsx:52-63`).
- Those tables reference `auth.users`, not `public.profiles` (`supabase/migrations/0003_project_delivery.sql:55-60`, `supabase/migrations/0003_project_delivery.sql:77-85`).
- `NotesPanel` makes the same embed from `notes` (`components/crm/NotesPanel.jsx:32-44`), while `notes.created_by` also references `auth.users` (`supabase/migrations/0001_crm_schema.sql:85-94`).
- Live schema inspection confirmed PostgREST has no direct relationship for those embeds.

**Impact**

The shared thread load fails before messages or files render, and the admin/PM notes panel fails for the same reason. This is not merely an `"Unknown"` display-name fallback; the nested select itself errors.

**Fix**

Add explicit, unambiguous relationships to `public.profiles(id)` for message sender, file uploader, and note author, or expose a purpose-built participant/author view or RPC returning only safe display fields. Update queries to the named relationship. Test client, assigned PM, and admin reads separately.

### P1 — PMs can move an assigned project to another client company

**Evidence**

- PM deal UPDATE only checks that `owner_id` remains the acting PM (`supabase/migrations/0005_pm_scoping_and_project_type.sql:78-83`); it does not protect `company_id`, `contact_id`, value, stage, probability, or project type.
- The PM-visible edit form submits `company_id` and all of those fields (`app/admin/deals/[id]/edit/page.jsx:60-71`, `app/admin/deals/[id]/edit/page.jsx:115-138`).
- PMs receive every company in the company selector (`app/admin/deals/[id]/edit/page.jsx:38-50`, `app/admin/deals/[id]/edit/page.jsx:181-195`).
- Redefining `is_staff()` to admin-or-PM leaves the original blanket company/contact SELECT and UPDATE policies active (`supabase/migrations/0005_pm_scoping_and_project_type.sql:32-35`, `supabase/migrations/0001_crm_schema.sql:160-183`). The PM-facing list pages fetch all rows and show Edit links (`app/admin/companies/page.jsx:14-34`, `app/admin/companies/page.jsx:70-84`, `app/admin/contacts/page.jsx:14-34`, `app/admin/contacts/page.jsx:72-94`).

**Impact**

A PM can re-home a project to another company while remaining owner. Because message/file access follows the deal's current company, this can grant the wrong client access and revoke the original client's access. PMs also see and can alter unrelated companies and contacts.

**Fix**

Add `can_manage_company(company_id)` based on admin or an assigned deal, then replace blanket PM company/contact policies. Prevent PM changes to `company_id`, `contact_id`, and `owner_id` with a trigger or a whitelisted SECURITY DEFINER RPC/server action; RLS row predicates alone do not provide column-level authorization. Render the PM edit surface with only explicitly allowed project fields.

### P1 — Delivery status is display-only and permanently defaults to Brief Submitted

**Evidence**

- Migration 0003 adds the four-state timeline and defaults every row to `brief_submitted` (`supabase/migrations/0003_project_delivery.sql:23-31`).
- The client renders that timeline (`app/dashboard/projects/[id]/page.jsx:10-17`, `app/dashboard/projects/[id]/page.jsx:121-147`).
- Admin/PM deal edit state and update payload omit `project_status` entirely (`app/admin/deals/[id]/edit/page.jsx:60-71`, `app/admin/deals/[id]/edit/page.jsx:125-136`).
- Repository-wide references to `project_status` are limited to the migration and client display; there is no update action.

**Impact**

No employee can move a client project to In Progress, In Review, or Delivered. The primary project-status promise is non-functional.

**Fix**

Implement an explicit status transition action with server-side role and transition validation, history (`project_status_events`), timestamps, actor, optional note, and notifications. Keep sales `stage` separate. Add PM/admin controls and client-readable history.

### P1 — Internal sales deals are automatically exposed as client projects

**Evidence**

- Migration 0003 explicitly makes a deal double as a project and adds `project_status` to all deals (`supabase/migrations/0003_project_delivery.sql:5-16`, `supabase/migrations/0003_project_delivery.sql:23-31`).
- Company members can select every deal for their company (`supabase/migrations/0001_crm_schema.sql:185-196`).
- The dashboard loads all company deals without a client-visible/project filter and labels them My Projects (`app/dashboard/page.jsx:23-35`, `app/dashboard/page.jsx:114-133`).

**Impact**

An admin-created prospecting opportunity or lost deal can appear to the client as a project at “Brief Submitted.” Internal description, value, and dates also become client-readable.

**Fix**

Prefer a separate `projects` aggregate created only when a deal is won/accepted. A smaller interim fix is `client_visible`, `promoted_at`, and `submitted_by` fields with RLS requiring `client_visible = true` for company-member reads. Do not default internal deals into the client lifecycle.

### P1 — Internal CRM notes are client-readable; PM company notes are cross-client

**Evidence**

- `NotesPanel` is an employee CRM surface on company/contact/deal admin pages (`components/crm/NotesPanel.jsx:20-25`; usage at `app/admin/deals/[id]/page.jsx:266-272`).
- The original policy lets company members read every note for their company (`supabase/migrations/0001_crm_schema.sql:211-219`).
- Migration 0007 additionally lets clients create company notes and lets a PM select every company-level note, not only notes for assigned companies (`supabase/migrations/0007_notes_creation_scoping.sql:42-57`).

**Impact**

Internal sales/operations commentary can be queried by client accounts. PMs can query company-level notes across unrelated clients.

**Fix**

Make notes internal by default with a `visibility`/`audience` field and policies that require explicit client sharing. Scope PM access through assigned projects/companies. Keep client collaboration in `project_messages` rather than reusing internal notes.

### P1 — Role changes are non-atomic across two authorization sources

**Evidence**

- Database helper functions grant privileges if either JWT metadata or `profiles.role` matches (`supabase/migrations/0005_pm_scoping_and_project_type.sql:27-45`).
- Middleware uses JWT app metadata (`middleware.js:46-60`).
- `changeUserRole` updates `profiles` first, then app metadata; failure of the second operation leaves the first privilege change in place (`app/admin/users/actions.js:104-131`).
- Invitations send email before either role store is updated, and role/profile updates are also separate (`app/admin/users/actions.js:47-92`).

**Impact**

A partial promotion can grant database-level admin privileges while middleware still treats the account as a PM. A partial demotion can leave stale privileges. Failed invites can create a client-role account after the invite email has already been sent.

**Fix**

Choose one authorization source of truth. Perform role mutation through one privileged server transaction/RPC with compensation on auth-admin failure, and do not grant elevated database access from `profiles.role` as an OR fallback. Assign the role before sending an invite and expose a recoverable resend path.

### P1 — The project manager display initially identifies the client as their own PM

**Evidence**

- Brief submission sets `owner_id` to the submitting client because the column is `NOT NULL` (`components/crm/BriefSubmissionForm.jsx:75-85`; schema at `supabase/migrations/0001_crm_schema.sql:52-65`).
- The project page loads that profile and renders it under “Project Manager” (`app/dashboard/projects/[id]/page.jsx:57-64`, `app/dashboard/projects/[id]/page.jsx:149-153`).

**Impact**

Until admin assignment, the client sees their own name as the project manager. `owner_id` currently conflates submitter and assigned employee.

**Fix**

Add `submitted_by` and a nullable `project_manager_id` (or move to a projects table). PM authorization should key off the PM field. Render “Not yet assigned” when it is null.

### P1 — Sign out is a dead link

**Evidence**

- Client and admin dashboards link to `/api/auth/logout` (`app/dashboard/page.jsx:88-95`, `app/admin/page.jsx:68-76`).
- No `app/api/auth/logout/route.js` exists.
- A working `signOut()` server action exists but is unused (`app/auth/actions.js:79-83`).

**Impact**

Sign Out navigates to a 404 and leaves the session active.

**Fix**

Use a small form bound to the existing `signOut` server action, or add a POST-only logout route. Add a test that the auth cookie is cleared and the user returns to `/`.

### P1 — Missing project completion capabilities

The following requested capabilities do not exist in schema or application code:

- approval/request-changes decisions;
- deliverable classification, versioning, final-deliverable designation, and acceptance history;
- notifications, unread/read state, or email triggers for new message/file/status;
- billing accounts, estimates, invoices, payment state, receipts, or Stripe/payment-provider integration.

`deals.value` is only a budget/value field (`supabase/migrations/0001_crm_schema.sql:52-65`), and `project_files` is generic attachment metadata (`supabase/migrations/0003_project_delivery.sql:76-99`). These are not approval or billing systems.

**Fix**

Add purpose-built project tables: `deliverables`, `deliverable_versions`, `approval_requests`, `approval_decisions`, `project_status_events`, `notifications`, `notification_preferences`, `billing_accounts`, `invoices`, and `payments`. Drive email/in-app notifications from durable outbox events. Make approval and invoice state visible to client, assigned PM, and admin under explicit RLS.

### P1 — Auth middleware fails open when configuration is missing

**Evidence**

- When Supabase URL/key are absent, middleware logs a warning and allows every request through, including `/admin` and `/dashboard` (`middleware.js:5-14`).

**Impact**

A deployment configuration mistake removes route protection instead of stopping the app safely.

**Fix**

Fail closed: return a 503 for protected routes or make the deployment fail at startup/build when required secrets are missing. Never bypass authorization on protected paths.

### P2 — Thread/file collaboration is stale and uploads are weakly bounded

**Evidence**

- Thread data loads on mount and after the current user sends/uploads only; there is no realtime subscription or poll (`components/crm/ProjectThread.jsx:43-83`, `components/crm/ProjectThread.jsx:85-113`, `components/crm/ProjectThread.jsx:115-155`).
- The full message/file history is loaded without pagination (`components/crm/ProjectThread.jsx:52-63`).
- Upload has no client/server file-size, type, quota, or malware policy. Storage is written before metadata; if metadata insert fails, the object is left orphaned (`components/crm/ProjectThread.jsx:129-150`).
- The bucket migration sets only `public = false`; it sets no maximum size or MIME restrictions (`supabase/migrations/0003_project_delivery.sql:101-108`).

**Impact**

Participants do not see new activity until reload, large threads degrade, and storage can accumulate unbounded/orphaned objects.

**Fix**

Add Realtime or bounded polling, unread cursors, pagination, bucket-level limits, server-side MIME/size validation, and cleanup on metadata failure. Model deliverables separately from casual attachments.

### P2 — Several mutations and reads can look successful after failure

**Evidence**

- Dashboard project loading ignores the Supabase error and renders an empty list (`app/dashboard/page.jsx:28-35`).
- Deal edit performs an UPDATE without selecting/checking the affected row, then immediately navigates away (`app/admin/deals/[id]/edit/page.jsx:138-145`). An RLS mismatch can therefore appear as a successful save.
- Owner profile load ignores its error (`app/dashboard/projects/[id]/page.jsx:57-64`).

**Fix**

Use shared query/mutation wrappers that require `{ data, error }` handling, check exactly one affected row, map permission/not-found states to stable user messages, and retain failed form input.

### P2 — Client workspace is not responsive by construction

**Evidence**

- The client/dashboard/project/thread/brief inline CSS contains no mobile media query.
- Dashboard uses 2rem page padding and a grid with a 280px minimum card width (`app/dashboard/page.jsx:184-190`, `app/dashboard/page.jsx:237-241`). At a 320px viewport, the content box is narrower than 280px.
- Global `body { overflow-x: hidden; }` clips overflow instead of allowing recovery (`app/globals.css:37-43`).
- Project header and four-step timeline remain a single horizontal flex row (`app/dashboard/projects/[id]/page.jsx:189-197`, `app/dashboard/projects/[id]/page.jsx:226-240`).
- Composer remains one horizontal row with a non-wrapping send button (`components/crm/ProjectThread.jsx:414-448`).

**Impact**

At small widths, project cards, header actions, status labels, and the composer can clip, compress, or become hard to operate. Auth cards also use full-width cards without page padding (`app/signup/page.jsx:111-128`).

**Fix**

Add shared CRM layout primitives and breakpoints: 1rem mobile page padding, `minmax(min(100%, 280px), 1fr)`, wrapping/stacked headers, a scrollable or vertical timeline, stacked composer/buttons, 44px touch targets, and table-to-card or horizontal-scroll treatment. Validate at 320, 375, 768, and desktop widths with real authenticated data.

## Migration-by-migration assessment

| Migration | Assessment |
|---|---|
| `0001_crm_schema.sql` | Useful baseline, but role/data scopes are overly broad for clients and PMs. `profiles.company_id` is not a foreign key, and author/sender fields point to `auth.users`, which breaks current PostgREST profile embeds. |
| `0002_crm_security_hardening.sql` | Correctly blocks self-role/company escalation and adds delete/created-by controls, but its trigger is incompatible with 0003 onboarding. |
| `0003_project_delivery.sql` | Adds the delivery scaffold, private files, and deal-scoped collaboration. Onboarding is broken, deal/project conflation is unsafe, and the status is display-only. |
| `0004_project_manager_role.sql` | Correct sequencing for a new enum value. |
| `0005_pm_scoping_and_project_type.sql` | Strong improvement for deal/task selection and deletes; fixes assigned-owner visibility. It does not restrict PM-updatable columns, retains dual role sources, and its profile policy is insufficient for message/file author names. |
| `0006_admin_only_company_contact_creation.sql` | Correctly makes creation admin-only. It explicitly leaves company/contact read/update blanket-wide for PMs, which violates assignment scoping. |
| `0007_notes_creation_scoping.sql` | Closes arbitrary note insertion, but preserves client visibility of internal notes and adds blanket PM visibility for all company-level notes. |

Migration application status should be checked in deployment before release. The July 28 handoff said 0002/0003 were not yet applied at that time (`HANDOFF-2026-07-28-crm-completion.md:34-41`); repository presence alone does not prove that 0001-0007 are all applied in production.

## Intended versus actual role contract

| Role | Intended contract | Actual contract requiring correction |
|---|---|---|
| Client | Own company, explicitly client-visible projects, shared thread/files, approvals, billing | Sees all company deals and all company notes through RLS; onboarding fails; no approval/billing/notifications; thread query fails |
| Project Manager | Assigned projects and their participating client records; update delivery work, not assignment/security fields | Assigned deals/tasks, but all companies/contacts and all company-level notes; can alter a deal's company and other sensitive fields |
| Administrator | Global CRUD, user roles, PM assignment, lifecycle/billing oversight | Mostly present, but role changes are non-atomic and no lifecycle/approval/billing/notification administration exists |

## Recommended remediation order

1. Fix onboarding transaction/trigger/email and add a first-client integration test.
2. Fix author relationships so messages, files, and notes can load.
3. Lock PM updates to whitelisted project fields and scope company/contact/note access by assignment.
4. Split projects from sales deals, or add an explicit client-visibility promotion boundary.
5. Add status transition history and PM/admin controls.
6. Separate internal notes from client communication.
7. Make role changes atomic and use one authorization source.
8. Fix logout and PM assignment display.
9. Implement deliverable approval, notifications, and billing as first-class domains.
10. Add responsive layouts and authenticated mobile/browser E2E coverage.

## Release gate

Do not release the client workspace until items 1-8 above are fixed and verified with four test identities: admin, PM-A, PM-B, and one client. The gate should prove PM-to-PM isolation, company immutability for PMs, client-only visibility of promoted projects, working thread/file attribution, status transitions, successful first-run onboarding, and real sign-out. Approval, notification, and billing scope should be explicitly accepted as implemented or intentionally deferred before calling the portal end-to-end complete.
