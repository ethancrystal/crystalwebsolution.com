# Crystal Web Solution CRM — Canonical Product, UX, Security, and Implementation Plan

> **For implementation agents:** This is the single CRM planning source of truth. Read this document before changing CRM code, migrations, storage policies, routes, notifications, or deployment configuration. Steps use checkbox syntax and every implementation slice follows the red-test → minimal implementation → full verification → review → pull-request sequence.

**Goal:** Deliver a secure, project-centric CRM in which a client can progress from signup through company onboarding, project-brief submission, project-specific messaging and asset exchange, deliverable review, change requests, approval, and completion, while employees operate only on assigned projects and administrators operate the complete business workspace.

**Architecture:** Preserve the existing Next.js App Router application, Supabase Auth/Postgres/Storage/Realtime, plain JSX, and the three persisted roles `client`, `project_manager`, and `admin`. The project is the aggregate root and authorization boundary. All three portals consume the same role-shaped project workspace; they do not create parallel chat, asset, or project models.

**Tech stack:** Next.js 15, React 19, plain JSX and global CSS, Supabase Auth/Postgres/Storage/Realtime, Node test runner, Vitest-style contract tests already represented by `tests/crm/*.test.mjs`, and `pnpm`. No TypeScript, Tailwind, second frontend, or second identity store.

**Repository source of truth:** `docs/CRM-MASTER-PLAN.md` on the planning branch. The workspace copy `/home/ubuntu/CRM-MASTER-PLAN.md` is an export for review and must not become a competing document.

**Current planning date:** 16 August 2026.

## Global constraints and operating rules

The following rules apply to every phase. A later feature plan cannot override them without an explicit update to this document.

| Rule | Required behavior |
|---|---|
| Production branch | `main` is the Vercel production branch. Use a feature branch and reviewed PR; never run `vercel --prod`. |
| CRM feature flag | CRM visibility is controlled by build-time `NEXT_PUBLIC_CRM_ENABLED`; changing it is an owner-controlled Vercel setting and requires a redeploy. |
| Roles | Use only `client`, `project_manager`, and `admin`. The UI may label `project_manager` as Employee. The browser never selects or promotes a role. |
| Authorization source | `profiles.role` and trusted database paths are authoritative. Do not authorize from stale or browser-controlled `app_metadata.role`. |
| Project boundary | Every read, mutation, storage operation, notification, realtime event, and dashboard surface must resolve to an authorized project and viewer role. UUID knowledge is never authorization. |
| Assignment | Only an administrator assigns or removes a project manager. A project manager can operate only on actively assigned projects. |
| Client isolation | A client can access only the client’s company and its projects; shared visibility is explicit. Internal messages, files, notes, tasks, notification payloads, and audit records never enter the client read model. |
| Admin authority | Admin means complete application-level visibility and management through protected server actions/RPCs, with audit events. Never expose a service-role key in browser code. |
| Data-access split | Project delivery reads use `lib/crm/projects.js`; project writes use `app/actions/project-actions.js` and protected RPCs. Companies, contacts, deals, tasks, and users may retain direct browser reads under RLS only where the current architecture deliberately does so. Do not add a third pattern casually. |
| SQL safety | Before changing a live function, table, policy, grant, trigger, or migration contract, fetch the live definition with the catalog equivalent of `pg_get_functiondef`, inspect its signature and grants, and record the result. |
| Production database | No production Supabase mutation without explicit owner approval. Preview/local verification, migration-history reconciliation, and exact SQL review precede every production migration. |
| Migration history | Never reuse a migration number or name from another branch. Reconcile `list_migrations` with the checked-in directory before creating or applying the next migration. |
| TDD | Write a focused failing contract first, run it red, implement the smallest change, run it green, then run the full suite and production build. |
| Verification | `pnpm test` green is necessary but does not prove RLS/storage/database correctness. SQL slices also require disposable local/preview Supabase verification or approved read-only live verification. |
| Packaging | Each slice ends with `pnpm test`, `pnpm build`, `git diff --check`, focused review, clean branch, documentation, and reviewed PR. |
| Public site | CRM work must not regress the public cinematic homepage, one R3F canvas, Lenis/GSAP clock, existing procedural visuals, reduced-motion behavior, or marketing routes. |

## 1. Consolidated source inventory and authority order

This plan absorbs the product, UX, architecture, audit, operations, and feature-specific work that previously lived in separate documents. Those documents remain evidence and implementation detail, not competing roadmaps.

| Source | Role in the consolidated plan | Status |
|---|---|---|
| `docs/CRM-MASTER-PLAN.md` | Canonical source of product, UX, architecture, security, roadmap, and acceptance decisions. | This document. |
| `/home/ubuntu/CRM-PRODUCT-AND-TECHNICAL-PLAN.md` | Original end-to-end journey, role matrix, project isolation, dashboards, notification design, and P0–P7 sequence. | Absorbed. |
| `/home/ubuntu/CRM-LIVE-SUPABASE-RECONCILIATION-AUDIT.md` | Live production facts, P0 findings, migration drift, storage/notification gaps, and release gates. | Absorbed; live status updated below. |
| `docs/CRM-OPERATIONS.md` | Portal URLs, operator commands, migration caution, and release verification commands. | Supporting runbook; must be updated when operations change. |
| `docs/ux/crm-flow.md`, `docs/ux/crm-journey.md`, `docs/ux/crm-jtbd.md` | UX flow and jobs-to-be-done evidence. | Supporting UX records. |
| `docs/superpowers/plans/2026-07-30-crm-three-role-project-platform.md` | Detailed historical implementation plan for roles, project aggregate, shared workspace, staff/admin operations, notifications, and responsive verification. | Historical implementation detail absorbed into phases. |
| `docs/superpowers/plans/2026-08-09-crm-remaining-decisions.md` | Eight focused gap fixes: task visibility/priority, delivered notifications, notes, budget, templates, and task UI. | Mostly implemented in current source; preview/database verification remains. |
| `docs/superpowers/plans/2026-08-16-client-onboarding-project-intake.md` and its design spec | Signup normalization, explicit company state, idempotent intake, one thread, and private intake files. | Implemented on commit `992e880` in an unmerged branch; must be integrated with migration renumbering. |
| `docs/superpowers/specs/2026-08-16-project-messaging-asset-storage-hardening-design.md` | Message/attachment lifecycle, protected signed downloads, realtime discipline, cleanup, pagination, and negative tests. | Approved; implementation remains a dedicated next slice. |
| `plans/audits/crm-auth-rbac-audit.md` | Auth/RBAC risks: invite acceptance, split role authority, fail-open routing, dead logout, PM overreach, redirect allowlists, and abuse controls. | Historical findings; unresolved items are explicit below. |
| `plans/audits/crm-client-workspace-audit.md` and `plans/audits/crm-operations-data-audit.md` | Historical rationale for project-vs-deal separation, tenant isolation, author links, files, tasks, approvals, and operations. | Absorbed as architecture rationale and regression requirements. |

**Authority rule:** The live catalog and current branch state determine implementation status. A checked-in plan or open PR is not evidence that production has changed.

## 2. Current state and reconciliation ledger

### 2.1 Application and branch state

The application has the broad foundation: Auth, role-gated routes, profiles, companies, contacts, deals, projects, unique project threads, assignments, messages, attachments, tasks, deliverables, approvals, notifications, audit events, private storage, and Realtime. The canonical project read model is `lib/crm/projects.js`; the canonical project mutation boundary is `app/actions/project-actions.js`.

The current security branch is `agent/security-containment` at `e0fd3ec`, with PR [#77](https://github.com/ethancrystal/crystalwebsolution.com/pull/77). PR [#76](https://github.com/ethancrystal/crystalwebsolution.com/pull/76) contains the underlying P0 workspace hardening at `c28ef0d`. The onboarding implementation is at `992e880` on `agent/client-onboarding-hardening` and `agent/messaging-asset-hardening`; it is not merged into `main` or the security branch. The messaging branch currently shares that onboarding commit and does not yet contain the full messaging/asset-hardening implementation described by its approved specification.

The current route and component surface includes the client dashboard and project workspace, employee dashboard and project workspace, admin dashboard and administrative lists/details, portal login routes, signup/auth routes, `WorkspaceShell`, `ProjectOverview`, `ProjectTimeline`, `ProjectThread`, `ProjectFiles`, `ProjectTasks`, `ProjectApprovals`, `ProjectOperations`, `NotificationsPanel`, `EntityNotes`, and `BriefSubmissionForm`. Existence of a route is not completion; functional and authorization acceptance remains the gate.

### 2.2 Production Supabase state after the approved security rollout

The production project is `wmnjosiikehsuaqucvja` in `us-west-1`. Owner-approved migrations 0027 and 0028 were applied and verified. Their exact local filenames are `0027_security_and_notification_hardening.sql` and `0028_notification_read_grant_hardening.sql` on the security branch.

| Production control | Verified state |
|---|---|
| `project_tasks` client visibility | Database policy includes `client_visible = true` while preserving the internal staff/admin bypass. |
| Notification read state | `notifications_outbox.read_at` exists. |
| Notification read RPC | `anon` execution is revoked; `authenticated` execution is retained; the body checks `auth.uid()` and caller ownership. |
| Internal helper functions | `anon` and `authenticated` execution is revoked for `private.project_notification_recipients`, `private.shares_project_with`, `public.pinned_admin_email`, and `public.rls_auto_enable`. |
| `public."Payments"` | Foreign table is preserved. Direct API-role SELECT/INSERT access is revoked; trusted `service_role` SELECT remains. No deletion was performed. |
| Migration ledger | 0027 and corrective 0028 are recorded exactly once under the applied migration names. |
| Remaining production concern | The live-only `lead_capture_review_followups` migration is not represented by a checked-in local file and must be recovered before the next schema migration. |

The `Payments` table is backed by `Stripe_server` and mapped to Stripe `public.charges`. Repository and database dependency checks found no current CRM code or dependent schema object using it, but an external billing process cannot be excluded solely by source inspection. Billing remains a controlled review item; do not delete or re-expose the foreign table without an owner decision.

### 2.3 Status of previously separate implementation plans

| Workstream | Current status | Canonical treatment |
|---|---|---|
| Role-specific portals and guards | Broad implementation exists. | Complete only after real role-matrix/browser verification, invite acceptance, fail-closed behavior, logout, and stale-session checks. |
| Onboarding and project intake | Commit `992e880` contains normalization, no-company state, idempotency, and tests. | Integrate after migration-history reconciliation; do not reuse its migration number blindly. |
| P0 workspace/read-model hardening | Commit `c28ef0d` and security branch contain attachment joins, task visibility handling, notification read UI/action, cron import correction, and contracts. | Treat as code ready for integration review, not as merged production application code until PR review/merge. |
| Security containment | Migrations 0027 and 0028 were applied to live Supabase with approval and final scalar verification. | Production gate complete; source integration and audit evidence remain. |
| Remaining-decisions fixes | Entity notes, task priority/client-visible read/display contracts, budget visibility, delivered template, and edited-message template exist in current hardening source. | Verify against preview/live function definitions and include in regression matrix. |
| Messaging and asset storage | Existing foundation plus partial joins; approved full hardening spec remains. | Next feature slice after migration-integrity and authorization gates. |
| Notification operations | Cron import and template coverage exist in source; production stale rows, claiming semantics, retry behavior, read state, and admin exception visibility need verification/completion. | Operations gate remains open. |
| Employee operations | Assigned project routes, task/deliverable operations, and project controls exist. | Work queue, task UX, deadlines, approval queues, and negative isolation tests remain. |
| Admin control center | CRUD foundations and admin project routes exist. | Global search, assignments, exceptions, audit, reporting, and complete intervention flows remain. |

## 3. Product definition and non-negotiable invariants

The CRM is one project-centric operating system with three role-shaped views. A client enters through signup, establishes company context, submits a brief, receives one project and one unique thread, exchanges project-specific messages and assets with the assigned project manager, reviews deliverables, approves or requests changes, and sees completion and searchable history. An employee sees only assigned work and can execute it. An admin sees and manages all CRM records through auditable controls.

> **Core invariant:** No user-facing query, mutation, storage operation, notification, realtime event, or dashboard component may expose data outside the viewer’s authorized project and role boundary.

| Invariant | Required proof |
|---|---|
| One project, one thread | `unique(project_threads.project_id)` plus transactional creation and duplicate-intake idempotency. |
| One project asset namespace | Every attachment/deliverable has one project, one validated private path, explicit visibility, and controlled lifecycle. |
| One authorization model | Client company membership, employee assignment, and admin role are enforced in database/RPC/server paths, not only UI filters. |
| One shared workspace | Client, employee, and admin pages consume one read-model contract with role-shaped capabilities. |
| Admin full privilege | Admin can search, view, manage, assign, intervene, and audit all CRM areas without browser service-role credentials. |
| Employee assignment-only | Unassigned employees fail closed on project reads, mutations, storage, realtime, tasks, approvals, and notifications. |
| Client shared-only | Clients never receive internal messages/assets/notes/tasks, admin payloads, or unrelated company records. |
| Durable operations | Material state changes create auditable outbox intent; delivery, retry, read state, and failure are observable. |

## 4. Personas and permission model

The persisted role `project_manager` is the employee role. The browser never selects `admin`, never self-promotes, and never treats signup account type as an authorization grant. Public signup may express client or employee intent; employee access remains pending until an admin approves it.

| Capability | Client | Employee / project manager | Admin |
|---|---:|---:|---:|
| View own profile | Yes | Yes | Yes |
| View own company | Own company | Only assigned-project context | All |
| Create project brief | Yes, own company | No by default | Yes for controlled assisted intake |
| View projects | Own company | Assigned projects | All |
| View messages | Shared in own projects | Shared/internal in assigned projects | All authorized content |
| Post message | Shared only | Shared or internal | Shared or internal |
| Edit message | Own message | Own message | Override with audit |
| Upload assets | Shared assets where enabled | Shared/internal assets in assigned projects | All project-authorized assets |
| View tasks | `client_visible = true` only | Assigned project full task scope | All, with audit |
| Review deliverables | Approve/request changes | See state and respond operationally | Intervene/override with reason |
| Transition status | Dedicated approval/change actions | Valid assigned-project transitions | Any valid transition or documented intervention |
| Assign project manager | No | No | Yes only |
| Manage users/roles | No | No | Yes only |
| Manage companies/contacts/deals | No | No | Yes; employee receives only needed assigned context |
| View audit/operations | Client-safe project activity | Assigned project activity | Global audit and exceptions |

## 5. Complete role journeys

### 5.1 Client journey

1. The client discovers the agency, selects client signup, enters normalized identity data, confirms email, and signs in through `/login/client`.
2. The client sees a company-context state. If `profiles.company_id` is absent, project intake is blocked and the dashboard explains how the agency/admin completes setup. The browser cannot fabricate a company ID.
3. The client submits a bounded category/title/brief, optional target date/budget/currency, and optional intake assets. The action derives company from the authenticated profile and forwards a stable client-generated idempotency key to the canonical project RPC.
4. The database creates exactly one project in `brief_submitted`, exactly one unique thread, the required status/audit records, and no project-manager assignment until an admin assigns one.
5. The client opens the project workspace, sees shared status history, communicates in the project thread, uploads shared assets, and sees only client-visible tasks and ready shared files.
6. The client reviews the correct deliverable version, approves it or requests changes with an explanation, and sees resulting notifications.
7. The client sees `delivered`, final assets, approval history, and searchable project history without seeing other projects or internal content.

### 5.2 Employee journey

An employee is approved by an admin and receives an assigned-project work queue. The queue groups projects by status, urgency, target date, unread shared messages, overdue tasks, and pending approvals. The employee opens an assigned workspace, adds and updates tasks, sends shared/internal messages, reserves/finalizes assets, creates deliverable versions, responds to changes, and advances status through valid transitions. The employee never receives an unscoped global company/contact/deal dashboard through `project_manager`.

### 5.3 Admin journey

An admin starts at an operations overview of new briefs, active/stalled projects, workload, overdue tasks, pending approvals, failed/stale notifications, and abandoned uploads. The admin searches users, companies, contacts, deals, projects, tasks, notifications, and audit events; assigns managers; opens any project; corrects metadata; handles exceptions; and records reasons for high-impact interventions. Full privilege remains application-level, protected, and audited.

## 6. Route and inner-page contract

Every authenticated page uses a consistent role shell with role-appropriate navigation, scope label, page context, notifications, profile access, responsive content, and six explicit states: loading, empty, ready, validation error, authorization/unavailable, and temporary/system error.

| Route | Required responsibility | Completion gate |
|---|---|---|
| `/login`, `/login/client`, `/login/employee`, `/login/admin` | Portal-specific entry, exact-role check, safe redirect, mismatch rejection. | Wrong-role session is rejected server-side and no protected data flashes. |
| `/signup`, `/auth/confirm`, `/auth/callback`, `/auth/verify` | Normalized signup, safe confirmation, employee-pending semantics, allowlisted return. | No self-promotion, no enumeration leak, no open redirect. |
| `/dashboard` | Client onboarding state, attention queue, active/history projects, notifications, start-project action. | Client sees own-company data only; no-company intake is blocked. |
| `/dashboard/projects/[id]` | Client workspace: overview, shared timeline, thread, shared files, visible tasks, deliverables, approvals, activity. | Internal data absent from response, not merely hidden in JSX. |
| `/dashboard/projects` | Search/filter historical projects if dashboard result set requires it. | Query is company-scoped and bounded. |
| `/dashboard/profile`, `/dashboard/company`, `/dashboard/notifications`, `/dashboard/support` | Account, company context, read state, and non-project support. | Mutations have explicit policy and audit where needed. |
| `/team` | Assigned-project queue, urgency, overdue tasks, unread messages, pending approvals, workload. | Unassigned project cannot be opened or inferred through list filters. |
| `/team/projects/[id]` | Employee workspace with shared/internal controls, task operations, deliverables, status, approvals. | Assignment is enforced in read and write paths. |
| `/team/tasks`, `/team/tasks/[id]`, `/team/notifications`, `/team/profile` | Focused employee work and settings. | All results remain assignment-scoped. |
| `/admin` | Global operations dashboard with actionable metrics and exception queues. | Counts link to accurate filtered lists. |
| `/admin/users`, invite, companies, contacts, deals | Full admin CRUD, approvals, role/access controls, relationship context. | Role and membership changes are protected, audited, and last-admin safe. |
| `/admin/projects`, `/admin/projects/[id]` | Global project search, company/assignment joins, full workspace, intervention. | Admin can access every project through protected app paths. |
| `/admin/tasks`, `/admin/notifications`, `/admin/audit`, `/admin/settings` | Global task operations, outbox exceptions, immutable audit search, policy/settings. | No sensitive payload leakage; high-impact actions require reason. |

## 7. Canonical shared project workspace

The project is the aggregate root. `getProjectWorkspace` is the role-shaped read contract; project mutations remain in `app/actions/project-actions.js` and protected RPCs. UI capabilities are informative, never authoritative.

| Section | Client | Employee | Admin |
|---|---|---|---|
| Overview | Shared brief, service, target date, approved budget | Shared brief plus execution context | Full metadata, company, source deal, assignments |
| Timeline | Shared status history | Shared/internal history | Full history and audit references |
| Conversation | Shared messages and shared ready attachments | Shared/internal messages and attachments | All content with visibility labels |
| Files | Shared ready assets and published deliverables | Shared/internal files and versions | All states and cleanup controls |
| Tasks | `client_visible = true` tasks | Full assigned-project operations | Full authorized operations |
| Deliverables | Published versions and review actions | Draft/publish/respond operations | Full intervention/audit |
| Approvals | Approve/request changes | Review state and response context | Full intervention/audit |
| Activity | Client-safe activity | Full project activity | Full audit/activity |
| Notifications | Own notifications | Own assigned-project notifications | Operations view through protected path |

### Message and attachment contract

The message lifecycle is draft → staged attachments → ready reservations → atomic post → editable body under policy. Each active send has one stable client-generated UUID preserved across retries. `postProjectMessage` accepts only trimmed bounded body, authorized visibility, ready same-project caller-owned unlinked attachments, and a stable idempotency key. Project and visibility are immutable after creation; edits record `edited_at`, `edited_by`, audit, and notification intent.

The asset lifecycle is pending → ready, with failed/cleanup outcomes. Reservation generates a path under a validated project namespace such as `projects/{projectId}/attachments/{attachmentId}`. The browser uploads only to that reserved private path with overwrite disabled. Finalization verifies caller, project, path/object identity, metadata, and pending status. The browser never generates signed URLs directly; a protected server action checks ready state, project scope, visibility, and current viewer before issuing a short-lived URL.

Realtime is an acceleration layer, not authorization. Subscribe only after the authorized workspace establishes the exact thread/project identifier. Events carry identifiers and visibility, never message bodies or file content. The callback re-reads through the visibility-filtered read model, de-duplicates refreshes, ignores other projects, and cleans up on unmount.

## 8. Domain model and state machines

The canonical ownership chain is:

```text
profiles → companies → projects → project_threads → project_messages
                                      ├→ project_attachments
                                      ├→ project_tasks
                                      ├→ project_deliverables → project_approvals
                                      ├→ project_status_history
                                      ├→ notifications_outbox
                                      └→ audit_events
```

| Entity | Required invariant |
|---|---|
| `profiles` | Role and company relationship are trusted; role changes are admin-only and audited. |
| `companies` | Client access is restricted to the profile’s company. |
| `projects` | One company, one creator, controlled status, unique thread, idempotent intake. |
| `project_threads` | `unique(project_id)`; creation is transactional. |
| `project_assignments` | Only admins assign/remove; assignment is required for employee access. |
| `project_messages` | Resolves to one project; visibility explicit; sender/idempotency constraints enforced. |
| `project_attachments` | One project; ready status; private path; visibility; controlled message/deliverable linkage. |
| `project_tasks` | Status, priority, due date, assignee, `client_visible`; client SELECT policy enforces visibility. |
| `project_deliverables` | Versioned output with explicit visibility/status and protected publication. |
| `project_approvals` | Points to the correct project and deliverable; decision identity/timestamp/note recorded. |
| `notifications_outbox` | One source event/recipient/channel; delivery state, retry, lease/claim, and read state are distinct. |
| `audit_events` | Immutable trusted records; no arbitrary browser insert. |

Project statuses remain `brief_submitted`, `planned`, `in_progress`, `client_review`, `changes_requested`, `approved`, `delivered`, `on_hold`, and `cancelled`.

| From | Allowed next states |
|---|---|
| `brief_submitted` | `planned`, `cancelled` |
| `planned` | `in_progress`, `on_hold`, `cancelled` |
| `in_progress` | `client_review`, `on_hold`, `cancelled` |
| `client_review` | `changes_requested`, `approved`, `on_hold`, `cancelled` |
| `changes_requested` | `in_progress`, `on_hold`, `cancelled` |
| `approved` | `delivered`, `on_hold`, `cancelled` |
| `on_hold` | `planned`, `in_progress`, `cancelled` |
| `delivered` | Terminal |
| `cancelled` | Terminal |

Tasks use `todo`, `in_progress`, `review`, `done`, and `blocked`; priority is `low`, `medium`, or `high`. Deliverables use draft → submitted for review → changes requested/approved → delivered. A material revision creates a new version rather than overwriting an approved object.

## 9. Security, RLS, storage, realtime, notification, and audit contract

### 9.1 Authentication and RBAC

Use a canonical `AuthenticatedPrincipal { userId, canonicalRole, companyId }` from trusted server lookup. Protected routes fail closed on missing configuration, missing session, profile lookup failure, or role mismatch. Implement the remaining auth hardening from the RBAC audit: invite acceptance/password setup, transactional role changes, last-admin/self-demotion protection, session revocation or forced refresh after role changes, dead logout replacement with POST/server action, safe portal-specific redirects, allowlisted relative `next`, and rate/abuse controls for public signup/reset/resend flows.

### 9.2 RLS and RPC grants

Every project table fails closed. Client policies require own-company project access plus explicit shared/client-visible predicates. Employee policies require active assignment. Admin policies require the canonical admin role. Security-definer functions use fixed search paths, call `auth.uid()`, validate every target and cross-record relationship, and revoke unnecessary execution from `PUBLIC` and `anon`; only intentional authenticated entry points remain.

The authorization matrix must cover projects, threads, messages, attachments, status history, tasks, deliverables, approvals, notifications, notes, audit projections, and every RPC. Add negative tests for known UUIDs, cross-company IDs, unassigned projects, internal visibility, pending attachments, already-linked files, visibility mismatches, and invalid transitions.

### 9.3 Private storage

`project-files` remains private. Upload and download operations use project-scoped records and protected server/RPC checks. Browser MIME values are advisory; reservation and server-side checks enforce size and allowed types. Configure bucket limits where appropriate. Abandoned pending reservations are cleaned by an idempotent protected operation with audit visibility; ready linked objects are never removed by orphan cleanup.

### 9.4 Notifications and operations

Source mutations enqueue durable outbox intent in the same transaction. Recipient resolution uses project assignment and company membership plus visibility. Internal events never create client recipients. The worker atomically claims due rows with a lease, sends allowlisted templates, uses deterministic idempotency, updates attempts/status/error, retries with backoff, and exposes stale/failed rows to admin operations. `read_at` is user read state, not delivery state. Templates cover every event inserted by database functions, including `project.message_edited` and `project.delivered`.

### 9.5 Audit and observability

Audit records include actor, project/company, event type, target IDs, timestamp, safe metadata, and reason for high-impact admin intervention. Do not store message bodies, storage tokens, or sensitive notification payloads in audit/realtime events. Admin exception views expose failed notifications, stale pending rows, failed finalizations, abandoned uploads, projects without assignment, and migration/worker health.

## 10. Consolidated implementation roadmap

Work proceeds in dependency order. A phase may contain multiple PRs, but each PR must be a vertical, independently testable slice. The phase is not complete when the UI exists; it is complete when its database, server, UI, negative tests, preview verification, documentation, and review gates pass.

### Gate 0 — Production security containment and source integration

**Status:** Production database containment complete after explicit owner approval. Source integration remains open.

**Delivered:** Migrations 0027 and corrective 0028; task client visibility policy; notification read state; helper/API-role revokes; Payments API-role privilege removal without deletion; runbook; contract tests; final production evidence.

**Exit actions:** Review and merge the containment PR; reconcile its base with any merge of PR #76; update `docs/CRM-OPERATIONS.md` to reflect applied migrations and current worker state; preserve the final production evidence. Do not create another migration that reuses 0027 or 0028.

### Gate 1 — Migration integrity and live-schema reconciliation

**Objective:** Make a clean database reproduce the live contract before adding new schema changes.

**Required tasks:**

- [ ] Query `list_migrations` and compare it with `supabase/migrations`; record every version/name mismatch.
- [ ] Recover exact SQL for live-only `lead_capture_review_followups` using catalog definitions and commit a checked-in migration with the repository naming convention.
- [ ] Compare the onboarding branch’s `0028_idempotent_client_project_intake.sql` against the live ledger; renumber it to the next unused migration number after reconciliation. Do not apply it under `0028`.
- [ ] Fetch exact live definitions for `create_project`, `transition_project_status`, `create_project_task`, attachment RPCs, and notification helpers before modifying any of them.
- [ ] Build an isolated/preview database from the reconciled migration chain and compare tables, functions, policies, constraints, storage policies, indexes, and grants with production.
- [ ] Add migration contract tests for idempotency, fixed search paths, exact signatures, revokes, policy replacement, and no accidental duplicate overloads.

**Files:** `supabase/migrations/*`, `tests/crm/migration-*.test.mjs`, `docs/CRM-OPERATIONS.md`, `docs/reports/` or equivalent evidence ledger.

**Exit criteria:** No live-only untracked SQL remains unexplained; no migration-number collision exists; clean replay reaches the expected schema; preview verification passes; no production mutation occurs during reconciliation.

### Gate 2 — Authorization kernel and negative-test suite

**Objective:** Prove project isolation independently of React filters and read-model shaping.

**Required tasks:**

- [ ] Define a role/resource grant matrix for direct table access and RPC execution.
- [ ] Verify all project-related RLS policies for client company scope, employee assignment scope, admin scope, visibility, ready-state, notification ownership, and audit restrictions.
- [ ] Add real disposable-Supabase tests with two client companies, two employees, one admin, at least two projects, shared/internal messages, pending/ready assets, tasks, deliverables, approvals, and notifications.
- [ ] Test known-UUID reads/writes, cross-project attachment reserve/finalize/download, internal-message/client denial, unassigned employee denial, notification ownership, invalid transitions, and direct API-role RPC denial.
- [ ] Review security-definer functions for `auth.uid()`, fixed `search_path`, qualified references, input validation, cross-record consistency, and least-privilege grants.
- [ ] Confirm `Payments` remains non-readable to `anon`/`authenticated`; keep external billing ownership as an explicit decision before any future removal.

**Files:** `supabase/migrations/*`, `tests/crm/*-rls*.test.mjs`, `tests/crm/*-authorization*.test.mjs`, disposable seed/verification scripts, `docs/CRM-OPERATIONS.md`.

**Exit criteria:** Cross-company and cross-assignment negative tests pass against real Supabase; grant matrix has no unexplained public/API exposure; security advisors have no unexplained high-risk findings.

### Gate 3 — Shared workspace read kernel

**Objective:** Make one role-shaped workspace contract authoritative for all portals.

**Required tasks:**

- [ ] Complete `getProjectWorkspace` with company, assignment, source-deal, capabilities, timeline, messages, attachments, tasks, deliverables, approvals, notes, notifications, and activity joins.
- [ ] Keep profile resolution bounded and separate where PostgREST relationships are unreliable; never expose profile email or internal metadata to clients.
- [ ] Add cursor-based message pagination with stable ordering and duplicate suppression during realtime refresh.
- [ ] Remove direct component-level project reads that bypass authorization shaping, including direct signed URL generation.
- [ ] Add explicit loading, empty, validation, unavailable, temporary-error, and retry-preserving states to the shared workspace.
- [ ] Add a canonical project activity projection or a documented composition of status, message, asset, task, deliverable, approval, and audit-safe events.

**Files:** `lib/crm/projects.js`, `components/crm/WorkspaceShell.jsx`, workspace sections, `app/dashboard/projects/[id]/page.jsx`, `app/team/projects/[id]/page.jsx`, `app/admin/projects/[id]/page.jsx`, contract tests.

**Exit criteria:** All three portals consume the same workspace shape; no role receives forbidden records; pagination and state contracts pass; build has no runtime route/import errors.

### Gate 4 — Messaging, asset storage, and realtime hardening

**Objective:** Make each project’s thread and asset namespace operationally safe and retryable.

**Required tasks:**

- [ ] Write failing contracts for message idempotency, cursor pagination, attachment ownership/project/visibility checks, pending/ready lifecycle, protected download, and identifiers-only realtime.
- [ ] Implement stable message attempt IDs in the composer and preserve drafts/staged attachments on retry.
- [ ] Enforce atomic ready-attachment linking in `post_project_message`; reject pending, foreign-project, foreign-owner, already-linked, and visibility-mismatched attachments.
- [ ] Implement `createAttachmentDownloadUrl` server action and remove direct browser `storage.createSignedUrl` calls from `ProjectThread` and `ProjectFiles`.
- [ ] Validate reservation path/object identity at finalization, disable overwrite, and enforce bounded file metadata/MIME/size rules.
- [ ] Implement idempotent stale-pending cleanup that cannot remove ready linked assets.
- [ ] Scope realtime subscriptions to the authorized project/thread, include identifiers only, refresh through the workspace read model, and clean up channels.
- [ ] Run real preview tests with two projects and two clients/employees before production approval.

**Files:** `app/actions/project-actions.js`, attachment RPC migrations with reconciled names, `lib/crm/projects.js`, `components/crm/ProjectThread.jsx`, `components/crm/ProjectFiles.jsx`, storage policies, realtime code, tests, operations docs.

**Exit criteria:** The twelve acceptance behaviors in `docs/superpowers/specs/2026-08-16-project-messaging-asset-storage-hardening-design.md` pass, including cross-project denial, retry idempotency, protected downloads, cleanup, and realtime redaction.

### Gate 5 — Client journey completion

**Objective:** Deliver the client’s complete portal journey on top of the secure workspace.

**Required tasks:**

- [ ] Integrate commit `992e880` after reviewing it against the reconciled migration chain. Rename its idempotency migration to the next unused number and update all tests/docs.
- [ ] Verify signup normalization, confirmation, safe redirects, employee-pending semantics, and no self-promotion.
- [ ] Verify the explicit no-company onboarding state and block intake until company context exists.
- [ ] Implement/verify idempotent project brief submission, derived company authorization, one thread, `brief_submitted`, audit/history, confirmation, and intake-file lifecycle.
- [ ] Complete client dashboard attention queue, active/history project search, unread notifications, client-visible tasks, and start-project action.
- [ ] Complete client workspace messaging/assets, deliverable review, approval/change-request actions, project activity, and safe signed downloads.
- [ ] Add client profile/company/notification settings only within explicit ownership and audit policies.
- [ ] Add browser tests for a client journey and negative cross-company access using disposable accounts.

**Files:** `app/auth/actions.js`, `app/signup/page.jsx`, `components/crm/BriefSubmissionForm.jsx`, client dashboard/routes, `app/actions/project-actions.js`, intake migration, client workspace components, tests, operations docs.

**Exit criteria:** A test client completes signup → confirmation → company state → brief → unique thread → message/assets → review → approve/change request → delivered/history without manual database intervention.

### Gate 6 — Employee/project-manager operations

**Objective:** Make `/team` a complete assigned-work operating surface.

**Required tasks:**

- [ ] Complete assigned-project queue with status, urgency, target date, unread shared messages, overdue tasks, pending approvals, and workload metrics.
- [ ] Complete employee workspace visibility controls for shared/internal messages, files, notes, activity, tasks, deliverables, and approvals.
- [ ] Wire task creation fields for title, description, status, priority, assignee, due date, and client visibility; add edit/reassign/status/done/blocked/delete/archive operations according to policy.
- [ ] Complete deliverable draft/version/publish/respond-to-change workflow and valid project transitions.
- [ ] Add deadline/reminder indicators and employee notification preferences.
- [ ] Verify an unassigned employee cannot read or mutate any target project even with known IDs.

**Files:** `app/team/page.jsx`, `app/team/projects/[id]/page.jsx`, planned task routes, `components/crm/ProjectTasks.jsx`, `ProjectOperations.jsx`, `ProjectApprovals.jsx`, actions/RPCs, tests.

**Exit criteria:** Employee can execute an assigned project end-to-end and cannot access unassigned projects, global company/contact/deal data, or client-internal boundaries.

### Gate 7 — Admin control center

**Objective:** Make `/admin` a complete, auditable operations center.

**Required tasks:**

- [ ] Complete actionable global metrics for briefs, active/stalled projects, workload, overdue tasks, approvals, notifications, and abandoned uploads.
- [ ] Complete user search, employee-request approval, safe invitations/password setup, activation/deactivation, company association, role changes, last-admin protection, and audit events.
- [ ] Complete company/contact/deal CRUD, relationship history, lead conversion, and follow-up visibility.
- [ ] Correct project/company/assignment joins and add project search/filter by client, company, status, manager, service, date, source deal, and overdue state.
- [ ] Complete admin assignment/removal with validation for active authorized employees and auditable reason.
- [ ] Complete global task, notification exception, audit, and settings routes. Destructive/high-impact actions require explicit confirmation and reason.
- [ ] Keep admin “view any project” as a role-shaped workspace capability, not browser impersonation.

**Files:** `app/admin/*`, admin actions, `lib/crm/projects.js`, admin components, protected RPCs/migrations, tests.

**Exit criteria:** Admin can search and manage every required CRM domain and intervene in any project with an auditable trail, while browser code never receives service-role credentials.

### Gate 8 — Notification and operations reliability

**Objective:** Make delivery, read state, retry, cleanup, and exceptions observable and reliable.

**Required tasks:**

- [ ] Confirm one primary scheduler plus safe backstop, consistent cron secret, and Vercel/Supabase invocation contract.
- [ ] Replace select-then-update races with atomic claim/lease behavior; preserve bounded batches and deterministic idempotency.
- [ ] Define retryable versus terminal failures, backoff, max attempts, stale-lease recovery, and safe status transitions.
- [ ] Verify every database-enqueued event has a template and recipient policy; include `project.message_edited`, `project.delivered`, shared/internal message, file, approval, task, assignment, and status events.
- [ ] Distinguish delivery fields from `read_at`; complete client/employee/admin notification centers and owner-only mark-read behavior.
- [ ] Add admin exception views for stale pending, failed, skipped, and repeatedly retrying rows; define approved handling for historical stale production rows.
- [ ] Add abandoned attachment cleanup and project-without-assignment monitoring.

**Files:** `app/api/cron/crm-notifications/route.js`, notification migrations/RPCs, `lib/email/templates.js`, `lib/email/*`, notification panels/routes, cleanup job, tests, operations docs.

**Exit criteria:** Due rows are claimed once per lease, retried safely, template-covered, observable, and readable only by the intended user/operations role. A controlled scheduler smoke test passes.

### Gate 9 — UX, accessibility, and responsive quality

**Objective:** Make all role journeys usable and consistent at mobile, tablet, and desktop sizes.

**Required tasks:**

- [ ] Standardize authenticated shell, navigation, breadcrumbs, scope labels, cards, tables, form controls, dialogs, and status/visibility badges.
- [ ] Define and implement loading, empty, ready, validation, unavailable, temporary error, permission-denied, partial/offline states where applicable.
- [ ] Ensure keyboard focus, accessible labels, minimum 44px targets, text-based visibility distinctions, dialog focus management, and readable narrow-screen message/file/task layouts.
- [ ] Test 390×844, 768×1024, and 1440×900 with no page-level horizontal overflow.
- [ ] Preserve reduced-motion behavior and keep CRM motion independent of the public R3F/marketing animation system.

**Files:** `app/globals.css`, shared CRM components, route shells, accessibility tests, browser test evidence.

**Exit criteria:** Role flows are usable and accessible at target viewports; no public-site visual regression is introduced.

### Gate 10 — Release and controlled production rollout

**Objective:** Prove the complete CRM in isolated data, preview, and approved production checks.

**Required tasks:**

- [ ] Run `pnpm test`, `pnpm build`, `git diff --check`, and focused contract suites on the final branch.
- [ ] Run `pnpm test:db` or the approved disposable Supabase equivalent with two companies, two employees, one admin, multiple projects, messages, assets, tasks, deliverables, approvals, notifications, and audit events.
- [ ] Run authenticated browser smoke/E2E for all three roles and all core journeys; record route, viewport, and authorization results without secrets or personal data.
- [ ] Review migration diff, exact live definitions, RLS/storage/grant matrix, cron secrets, sender verification, environment variables, feature flag, and rollback steps.
- [ ] Open focused PRs or one clearly scoped final PR; obtain code review and owner approval. Merge to `main` for Vercel auto-deploy; never use `vercel --prod`.
- [ ] Apply production migrations only through the reviewed migration channel after explicit owner approval and exact live-ledger preflight. Verify post-apply catalog state and preserve evidence.
- [ ] Keep CRM disabled through `NEXT_PUBLIC_CRM_ENABLED=false` until the owner explicitly approves launch after preview and production smoke tests.

**Exit criteria:** All acceptance rows below pass in real database and preview browser checks; production rollout has an approved runbook, evidence, and rollback plan.

## 11. Acceptance matrix

| Boundary/workflow | Passing condition |
|---|---|
| Signup and confirmation | Client normalizes inputs, confirms safely, lands in the client portal, and cannot self-promote; employee intent remains pending. |
| Login portals | Wrong-role portal access is rejected before protected data is fetched; safe relative redirects only. |
| Invite and role change | Admin invitation includes password setup; role change is trusted, transactional, last-admin-safe, session-consistent, and audited. |
| Company isolation | Client A cannot read or mutate Client B’s projects, messages, files, tasks, approvals, notifications, or company data with known IDs. |
| Employee isolation | Employee A cannot read or mutate Employee B’s unassigned project or global CRM records. |
| Admin access | Admin can view/manage all accounts, companies, contacts, deals, projects, assignments, workspace records, notifications, and audit events through protected application paths. |
| Project intake | Valid brief creates one project, one unique thread, `brief_submitted`, correct company/creator, audit/history, and no automatic manager assignment. |
| Intake retry | Same client idempotency key returns one project and one thread; no duplicate message or asset linkage. |
| Thread integrity | Every message resolves to exactly one project; project A content never appears in project B. |
| Message visibility | Client sees shared only; assigned employee/admin see policy-allowed internal content; internal events never create client recipients. |
| Message edit | Sender can edit own body only; project/visibility remain immutable; audit and template-covered notification are recorded. |
| Asset upload | Reservation, upload, finalization, linkage, and download all verify project, owner, visibility, ready status, exact path, metadata, and overwrite rules. |
| Asset isolation | Cross-project reserve/finalize/download fails; direct storage-path guessing does not bypass authorization. |
| Asset cleanup | Failed/stale pending reservations are cleanup-eligible; ready linked assets are not removed. |
| Task integrity | Client direct reads return only `client_visible`; employee operations are assignment-scoped; admin operations are audited. |
| Deliverable review | Client reviews the correct version, approves or requests changes with the correct project/deliverable link, and employee receives the intended event. |
| Status machine | Invalid transitions fail in UI and database; `delivered` and `cancelled` are terminal. |
| Notifications | Outbox intent is transactional, recipient/visibility-safe, atomically claimed, retried, template-covered, idempotent, observable, and separately readable/markable by owner. |
| Realtime | Events contain identifiers only; subscriptions are project/thread-scoped; refresh is authorized and de-duplicated. |
| Migration integrity | Clean preview replay matches live functions, policies, constraints, storage, grants, and ledger after drift recovery. |
| Payments | No direct `anon`/`authenticated` access to `public."Payments"`; future deletion/replacement waits for billing-owner decision. |
| Route integrity | Current/planned routes render without missing imports, redirect loops, dead links, runtime errors, or unauthorized flashes. |
| Responsive/accessibility | 390×844, 768×1024, and 1440×900 pass layout, keyboard, focus, label, and reduced-motion checks. |
| Release safety | Full tests/build, focused review, preview E2E, approved PR, owner-controlled flag, and migration/rollback evidence are complete. |

## 12. Definition of done

The CRM is ready for controlled launch only when all three roles complete their complete journeys without manual database intervention; the project workspace is shared across portals and shaped by capabilities; every message, attachment, task, deliverable, approval, notification, and audit event resolves to the correct project; browser mutations use protected boundaries; private storage and signed URLs pass negative tests; notifications are observable and retryable; migration history is reproducible; the live Payments exposure is contained; and the acceptance matrix passes in local/preview database and browser checks.

## 13. Explicit non-goals for the first complete CRM release

Do not expand the first release into broad accounting, trust accounting, time tracking, calendar synchronization, e-signatures, advanced document generation, recurring work, a separate sales-operations role, or a new payment integration. Those may be future products after project isolation and the workflow kernel are stable. Do not create a second message table, public asset bucket, parallel intake endpoint, browser service-role path, or UI-only authorization model.

## 14. Execution protocol for every slice

Each slice must use this exact order:

- [ ] Inventory the affected UX states and read/write paths.
- [ ] Read the relevant feature specification and live function/table/policy definitions.
- [ ] Create or update a focused written spec and executable checklist under this plan.
- [ ] Write failing source/contract/database tests first and run them red.
- [ ] Implement the smallest code/migration change that satisfies the contract.
- [ ] Run focused tests, then the full `pnpm test` suite and `pnpm build`.
- [ ] Run `git diff --check`, inspect the diff, and perform an authorization/SQL review.
- [ ] Verify database changes in disposable/preview Supabase; do not infer success from source tests.
- [ ] Package documentation, rollback instructions, and evidence.
- [ ] Push a feature branch and open a reviewed PR; merge to `main` only after approval.
- [ ] Perform authenticated preview/browser spot-checks after deployment.
- [ ] Apply live DDL only after explicit owner approval and exact live-ledger preflight; verify and preserve post-apply evidence.

## 15. Immediate implementation starting gate

The next implementation should **not** start by adding more UI. The correct first slice is migration-integrity reconciliation plus authorization regression setup because two branches use conflicting `0028` meanings and production contains a live-only lead-follow-up migration. This prevents a future onboarding migration from silently colliding with the already-applied notification grant correction.

The first executable checklist is:

- [ ] Rebase or merge the reviewed security branch and PR #76 into a clean integration branch without changing production SQL.
- [ ] Fetch the current live migration ledger and exact live definitions for the onboarding/project functions.
- [ ] Recover and check in `lead_capture_review_followups` from the live database.
- [ ] Rename the onboarding idempotency migration to the next available number and update its tests, documentation, and apply name.
- [ ] Create real preview seed data for two companies, two clients, an assigned and unassigned employee, an admin, two projects, messages, attachments, tasks, deliverables, approvals, notifications, and audit events.
- [ ] Run the first cross-company/cross-assignment negative test suite against preview.
- [ ] Only after this slice is green, implement the approved messaging/asset hardening slice (Gate 4), then integrate the onboarding slice (Gate 5) if the migration chain is clean.

## References

[1]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/docs/CRM-MASTER-PLAN.md "Canonical CRM master plan"
[2]: https://github.com/ethancrystal/crystalwebsolution.com/blob/main/docs/CRM-OPERATIONS.md "CRM operations runbook"
[3]: https://github.com/ethancrystal/crystalwebsolution.com/blob/main/lib/crm/projects.js "Canonical project read model"
[4]: https://github.com/ethancrystal/crystalwebsolution.com/blob/main/app/actions/project-actions.js "Canonical protected project actions"
[5]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[6]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control"
[7]: https://supabase.com/docs/guides/database/database-advisors "Supabase database security advisors"
[8]: https://www.crystalwebsolution.com/ "Crystal Web Solution production site"
