# CD Sportswear USA CRM Master Product, UX, Architecture, and Implementation Plan

> **Status:** Planning source of truth — no further implementation should begin until this document is approved.
> **Prepared for:** CD Sportswear USA
> **Prepared by:** Manus AI
> **Planning date:** 16 August 2026
> **Repository:** `ethancrystal/crystalwebsolution.com`
> **Current implementation baseline:** `agent/client-onboarding-hardening` at commit `992e880`; the messaging/storage slice is planned but not implemented.

## 1. Purpose and planning rules

This document consolidates the CRM product plan, page-by-page UX plan, data and authorization model, implementation sequence, test strategy, and production-release gates into one source of truth. Earlier audit documents and feature-specific design notes remain historical evidence; this file is the canonical plan to review before additional implementation begins.

The CRM is not being designed as three disconnected dashboards. It is a **single project-centric operating system** with three role-shaped views over the same secure project workspace. The central product promise is that a client can move from signup to project completion without leaving the portal, while employees can execute assigned work and administrators can manage the entire operation without weakening project isolation.

> **Core invariant:** Every user-facing query, mutation, storage operation, notification, realtime event, and dashboard component must expose only records authorized through the relevant project and role boundary.

The planning sequence deliberately separates product decisions from implementation. Each implementation phase must produce a working, tested increment, but code should not begin until the master plan is approved and the relevant phase is explicitly authorized.

## 2. Current baseline and confirmed constraints

The application is a Next.js and Supabase CRM with role-gated routes for clients, project managers, and administrators. The repository already includes authentication, profiles, companies, contacts, deals, projects, unique project threads, assignments, messages, attachments, tasks, deliverables, approvals, notifications, audit events, private storage, and Realtime foundations. The current app route tree includes the public marketing pages, signup/login flows, client dashboard and project detail, employee dashboard and project detail, and admin pages for users, companies, contacts, deals, projects, and tasks.

The connected live Supabase project contains the intended three-role foundation, but production currently has limited collaboration data: two clients, one project manager, one administrator, one company, one project, one thread, six messages, no attachments, tasks, deliverables, or approvals, sixteen notification outbox rows, and eight audit events. The collaboration surface is therefore not sufficiently exercised in production; all cross-company, storage, approval, and task testing must use disposable preview data rather than experimental production records.

| Confirmed constraint or risk | Planning consequence |
|---|---|
| Production includes a Stripe-backed `public.Payments` foreign table with broad grants and RLS disabled. | Treat as a P0 security containment gate. Do not extend billing features until ownership and exposure are resolved. |
| Production migration history is ahead of the checked-in migration set through a live-only lead follow-up migration. | Reconcile exact applied SQL before applying new migrations or attempting rollback. |
| The notification drain has a missing admin-client import and stale pending rows; edited-message email template coverage is incomplete. | Notification reliability is a release gate, not a later enhancement. |
| The task client-select policy does not enforce `client_visible = true`. | Add database-level visibility before declaring the client workspace secure. |
| Project messages, attachments, storage objects, and realtime are implemented through several overlapping paths. | Consolidate around one workspace read model and protected server/RPC mutation boundary. |
| Local Supabase database tests require a running Docker-backed database on port `54322`. | Every SQL phase must run in disposable local or preview Supabase before production application. |
| Production site availability does not prove authenticated route or authorization correctness. | Add preview E2E and role-based smoke tests. |

## 3. Product definition and success criteria

The CRM should manage the complete agency relationship: a prospect becomes a client, the client submits an order or project brief, an administrator triages and assigns the project, an assigned project manager executes the work, both parties collaborate in a project-specific thread, assets remain project-scoped, deliverables move through review and approval, and the project closes with a searchable history.

The system is successful when each role can answer the questions appropriate to its job without manual database intervention. The client must know what is active, what requires review, and where to communicate. The employee must know what is assigned, what is blocked, and what action is next. The administrator must know what is happening across the business, who owns it, and where intervention is required.

| Success area | Measurable outcome |
|---|---|
| Journey completion | A test client can sign up, complete company context, submit a brief, communicate, upload an asset, review a deliverable, approve/request changes, and see completion. |
| Isolation | Client A cannot read or mutate Client B’s projects, messages, files, tasks, approvals, notifications, or internal content even when UUIDs are known. |
| Employee scope | An employee sees and mutates assigned projects only; an unassigned employee cannot use a project RPC to access another project. |
| Admin control | An admin can view and manage accounts, companies, contacts, deals, projects, assignments, workspace records, exceptions, and audit events through the application. |
| Thread integrity | Each project has exactly one thread; every message resolves to one project; retries do not create duplicate messages or threads. |
| Asset integrity | Each attachment and deliverable has one project, one controlled storage path, explicit visibility and status, and authorization-checked downloads. |
| Operational reliability | Notification events are traceable, claimed atomically, retryable, template-covered, and visible in an admin exception view. |
| Release safety | Migrations reproduce the expected schema in a clean database, role-based E2E tests pass, and no production mutation occurs without an approved rollout gate. |

## 4. Personas, roles, and permission vocabulary

The product has three user-facing areas. The internal database role remains `project_manager` because that role already exists in middleware and migrations; the UI may label it **Employee Portal** or **Project Manager Portal**.

| Persona | Primary objective | Authorized scope | Primary dashboard |
|---|---|---|---|
| Client | Submit and manage the company’s projects, communicate with the assigned team, review outputs, and retain project history. | Own profile, own company, and projects belonging to that company. Shared content only unless a dedicated client-safe policy says otherwise. | Client Dashboard at `/dashboard`. |
| Employee / project manager | Execute assigned projects, communicate with clients, manage tasks and deliverables, and keep status current. | Own profile and projects with an active assignment. Shared and internal content for assigned projects. | Employee Dashboard at `/team`. |
| Admin | Operate the business, assign work, intervene in projects, manage users/data, monitor exceptions, and audit the system. | All CRM records through protected application paths, with every mutation audited. | Admin Dashboard at `/admin`. |

The term **visibility** must be explicit and consistent. `shared` means visible to the client participants in the project and authorized staff. `internal` means visible only to authorized employees and admins. `client_visible` is used for task and workflow records where the underlying resource can be operationally internal but selectively exposed to the client. `pending`, `ready`, `failed`, and `archived` describe asset lifecycle, not viewer authorization.

## 5. Complete end-to-end journeys

### 5.1 Client journey

A client discovers the agency through the public site and selects client signup. Signup normalizes email and full name, creates a client role through the trusted auth trigger, and never accepts a browser-selected privileged role. After authentication, the client sees a company setup state if no company association exists. The client cannot submit a project until company context is complete.

Once company context exists, the client submits a project brief with service category, title, description, target date, optional budget, and optional intake assets. The system creates one project and one unique thread transactionally. The client receives a confirmation and sees the project in `brief_submitted` state. A stable client idempotency key makes retries safe.

The client then uses the project workspace to see shared status history, communicate through the project thread, upload shared assets, view client-visible tasks, review deliverables, approve work, or request changes with an explanation. When the project is delivered, the client sees the final history and assets and can return to the project later without seeing unrelated company or project records.

| Client stage | Page or surface | Required system result |
|---|---|---|
| Signup | `/signup`, `/auth/confirm`, `/login/client` | Auth identity, client profile, safe redirect, no self-promotion. |
| Company setup | `/dashboard` onboarding panel or dedicated account setup | Explicit company association and incomplete-state guidance. |
| Submit brief | Client dashboard intake form or `/dashboard/projects/new` when introduced | One project, one thread, intake validation, confirmation, audit event. |
| Track project | `/dashboard`, `/dashboard/projects/[id]` | Status, target date, unread messages, tasks, approvals, and files. |
| Collaborate | Project workspace conversation and files sections | Shared-only content for the client, project-scoped asset links. |
| Review | Workspace deliverables and approvals sections | Approve or request changes with audit event and notification. |
| Complete | Delivered project workspace and history | Final files, status, approval outcome, searchable history. |

### 5.2 Employee journey

An employee receives access only after the admin-controlled staff request process. The employee dashboard is a work queue, not a global CRM. It groups assigned projects by status, urgency, target date, unread client messages, overdue tasks, and pending approvals. The employee opens an assigned project workspace, adds tasks, sends shared or internal messages, uploads files, creates deliverable versions, responds to change requests, and advances project status only through valid transitions.

An employee must never receive an unscoped global company/contact/deal view through the `project_manager` role. If broader operations access is required later, introduce a separate role with its own permissions rather than silently broadening the project-manager role.

### 5.3 Admin journey

An admin begins at a global overview of pipeline, active projects, workload, overdue work, approvals, notifications, and failures. The admin can search users, companies, contacts, deals, projects, tasks, notifications, and audit events. The admin assigns and removes project managers, opens any project workspace, corrects metadata, handles exceptions, and intervenes in state transitions with a reason recorded in the audit log.

Admin privilege means full application-level visibility and management, not a service-role key in the browser. Every admin mutation must pass through protected server actions or authenticated RPCs and write an auditable event.

## 6. Navigation and route inventory

The following route matrix distinguishes what exists in the current repository from the target information architecture. A planned route should be added only when it carries a clear workflow that cannot be expressed cleanly in an existing workspace or list page.

### 6.1 Public and authentication routes

| Route | Current state | Target responsibility |
|---|---|---|
| `/` and marketing routes | Existing | Public agency positioning, services, work, process, contact, and clear client signup/login calls to action. |
| `/signup` | Existing | Client signup and employee access request with safe role choices and normalized input. |
| `/login`, `/login/client`, `/login/employee`, `/login/admin` | Existing | Role-specific entry points with safe redirect mapping and no privilege selection. |
| `/auth/confirm`, `/auth/callback`, `/auth/verify` | Existing | Confirm identity and establish session without exposing sensitive state. |
| `/forgot-password`, `/auth/reset-password` | Existing | Password recovery and reset. |

### 6.2 Client portal routes

| Route | State | Page specification |
|---|---|---|
| `/dashboard` | Existing | Client overview: greeting, onboarding/company state, active projects, attention queue, unread notifications, pending approvals, client-visible tasks, and start-project action. |
| `/dashboard/projects/[id]` | Existing | Canonical client project workspace with overview, timeline, shared thread, shared files, client-visible tasks, deliverables, approvals, activity, and project-scoped notifications. |
| `/dashboard/projects` | Planned if search/filter is needed | Historical project index with status/date/search filters scoped to the client company. It may be folded into the dashboard if the result set remains small. |
| `/dashboard/profile` | Planned | Personal profile, contact details, password link, and notification preferences. |
| `/dashboard/company` | Planned | Company details and members, with edits requiring explicit policy and audit. Client users should not change membership freely. |
| `/dashboard/notifications` | Planned | Notification center with unread/read state, project links, event labels, and safe payloads. |
| `/dashboard/support` | Planned | Non-project contact/support route for questions that do not belong to a project thread. |

### 6.3 Employee portal routes

| Route | State | Page specification |
|---|---|---|
| `/team` | Existing | Assigned work queue with status groups, due dates, overdue tasks, unread client messages, pending approvals, and workload summary. |
| `/team/projects/[id]` | Existing | Employee project workspace with shared/internal visibility controls, full task operations, files/deliverables, status transitions, approvals, and project activity. |
| `/team/tasks` | Planned | Assigned task index with filters for status, priority, due date, project, and client visibility. |
| `/team/tasks/[id]` | Planned | Focused task view with project context, description, assignee, due date, status, activity, and safe editing. |
| `/team/notifications` | Planned | Assigned-project notification center and read state. |
| `/team/profile` | Planned | Employee profile, notification preferences, availability/preferences, and password link. |

### 6.4 Admin routes

| Route | State | Page specification |
|---|---|---|
| `/admin` | Existing | Global overview with counts, trends, attention queues, and shortcuts to exceptions. |
| `/admin/users` and `/admin/users/invite` | Existing | User search, role/access requests, activation state, company association, invite, and safe account controls. |
| `/admin/companies`, `/admin/companies/new`, `/admin/companies/[id]`, `/admin/companies/[id]/edit` | Existing | Company CRUD, members, contacts, active projects, deals, and relationship history. |
| `/admin/contacts`, `/admin/contacts/new`, `/admin/contacts/[id]`, `/admin/contacts/[id]/edit` | Existing | Contact CRUD, company link, lead history, project/deal relationships, and communication context. |
| `/admin/deals`, `/admin/deals/new`, `/admin/deals/[id]`, `/admin/deals/[id]/edit`, `/admin/deals/pipeline` | Existing | Lead/deal pipeline, ownership, value, stage, conversion to project, and follow-up history. |
| `/admin/projects`, `/admin/projects/[id]` | Existing | Global project search and project workspace. Must join company and assignment data correctly. |
| `/admin/tasks`, `/admin/tasks/new`, `/admin/tasks/[id]`, `/admin/tasks/[id]/edit` | Existing | Global task operations with project/company/assignee context and safe visibility controls. |
| `/admin/notifications` | Planned | Failed/pending outbox queue, delivery attempts, read-state metrics, and retry controls. |
| `/admin/audit` | Planned | Immutable audit search by actor, project, company, event type, date, and target record. |
| `/admin/settings` | Planned | Service categories, upload limits/MIME policy, notification policy, status configuration, and feature flags. |

## 7. Dashboard and inner-page design system

Every authenticated page uses the same shell: persistent role-appropriate navigation, page title and context, notification affordance, profile access, a responsive content container, and consistent loading/error/empty states. The shell must communicate current scope. A client should see “Your projects”; an employee should see “Assigned work”; an admin should see “Operations”.

### 7.1 Client dashboard design

The client dashboard is a decision surface rather than a data dump. The first viewport contains a welcome/attention summary, an active-project grid, and an action panel. If company setup is incomplete, the primary card becomes a setup checklist and the project intake form is blocked. If there are no projects, the empty state explains the next step and presents “Start a project”.

| Dashboard module | Content | Primary interaction |
|---|---|---|
| Onboarding status | Company association, profile completeness, next action | Open setup/profile surface. |
| Attention queue | Unread messages, pending approvals, requested changes, overdue client-visible tasks | Deep link to exact project and section. |
| Active projects | Title, service, status, target date, manager label only when policy permits, unread indicator | Open workspace. |
| Recent activity | Shared status changes, files, messages, deliverables | Open project activity position. |
| Start project | Service selection, brief, target date, budget, intake assets | Create one idempotent project. |
| Notifications preview | Recent own notifications with read state | Open notification center. |

### 7.2 Client project workspace design

The client project page uses a stable header with project title, service, status badge, target date, and a compact action menu. The body is organized into predictable sections: overview, timeline, conversation, files, tasks, deliverables, approvals, and activity. On mobile, sections collapse into tabs or accordions but retain the same order and labels.

The conversation section uses a message composer with attachment staging, visible upload progress, retry behavior, and a clear shared-only label. Internal content is not rendered as hidden placeholders; it is absent from the client response. Files show name, type, size, version where relevant, uploader label, timestamp, and safe download action. Pending or failed assets are not shown as ready files.

### 7.3 Employee dashboard design

The employee dashboard prioritizes work ordering. The top row contains assigned active-project count, overdue tasks, unread client messages, pending reviews, and projects at risk. The main queue supports grouping by status and sorting by target date or urgency. Each row displays company, project title, status, next deadline, unread marker, and next recommended action.

The employee project page uses visible scope labels: “Shared with client” and “Internal team”. The composer lets the employee choose visibility only when the role is authorized. Task operations are directly available in the project context. Deliverable controls use an explicit lifecycle: draft, submitted for review, changes requested, approved, and delivered. The employee cannot assign work outside policy or mutate an unassigned project.

### 7.4 Admin dashboard design

The admin dashboard is an operations control center. The first viewport shows new briefs, active projects, stalled projects, overdue tasks, pending approvals, pending/failed notifications, and abandoned upload reservations. Each metric is actionable and links to a filtered list, not a decorative number.

Admin detail pages must preserve context. A project opened from a company or deal retains breadcrumbs and shows company, source deal, assigned manager, status history, thread, files, tasks, approvals, notifications, and audit activity. A destructive or high-impact action—role change, assignment removal, project cancellation, or asset cleanup—requires an explicit confirmation and reason where the event affects a client or project history.

## 8. Canonical project workspace

The project is the aggregate root for collaboration. Every role-specific project page consumes the same workspace contract, with the server shaping fields and capabilities for the viewer. UI code may hide or show controls based on capabilities, but the database and RPC must enforce the same boundary independently.

| Workspace section | Client | Employee | Admin |
|---|---|---|---|
| Overview | Shared brief, service, target date, status | Shared brief plus execution context | Full metadata, company, source deal, assignments |
| Timeline | Shared status history | Shared and internal history | Full history and audit references |
| Conversation | Shared messages and shared attachments | Shared/internal messages and attachments | All content with visibility labels |
| Files | Shared ready assets and client-approved deliverables | Shared/internal assets and version management | All asset states and cleanup controls |
| Tasks | `client_visible = true` tasks | Full assigned-project task operations | Full project/global task operations |
| Deliverables | Published shared versions and review actions | Draft/publish/respond operations | Full override and audit |
| Approvals | Client approve/request-change actions | Review state and response context | Full intervention and audit |
| Activity | Client-safe activity | Full project activity | Full audit/activity |

## 9. Domain model and relationships

The existing database model should be retained and hardened rather than replaced. The minimum canonical ownership chain is:

```text
profiles → companies → projects → project_threads → project_messages
                                      ├→ project_attachments
                                      ├→ project_tasks
                                      ├→ project_deliverables → project_approvals
                                      ├→ project_status_history
                                      ├→ notifications_outbox
                                      └→ audit_events
```

| Entity | Responsibility | Required invariant |
|---|---|---|
| `profiles` | Auth identity, role, company association, employee-access request | Role changes are admin-only and audited. |
| `companies` | Client organization | Client visibility is scoped to the company association. |
| `projects` | One order/engagement | One company, one creator, controlled status, one unique thread. |
| `project_threads` | Conversation boundary | `unique(project_id)`; creation is transactional with project creation. |
| `project_assignments` | Employee-to-project access | Only admins assign/remove; assignment is required for employee access. |
| `project_messages` | Conversation records | Message resolves to one project through thread; visibility explicit; idempotency key scoped to sender. |
| `project_attachments` | Message/project file metadata | Ready rows have a private project path; pending rows are not readable. |
| `project_tasks` | Execution work | Client reads require `client_visible = true`; mutations require project authority. |
| `project_deliverables` | Versioned output files | Visibility, version, status, and creator are explicit. |
| `project_approvals` | Review decision | Approval points to the correct project and deliverable. |
| `notifications_outbox` | Delivery intent | One event/recipient/channel with claim, retry, delivery, and read state. |
| `audit_events` | Immutable governance history | Trusted functions write events; browser cannot insert arbitrary audit records. |
| `project_notes` (planned) | Freeform notes separate from status history | Visibility and project scope explicit; internal notes are never client-readable. |

## 10. State machines and lifecycle contracts

### 10.1 Project status

The current status domain remains canonical: `brief_submitted`, `planned`, `in_progress`, `client_review`, `changes_requested`, `approved`, `delivered`, `on_hold`, and `cancelled`. Valid transitions are enforced in both the UI and database. A client uses dedicated approval/request-change actions rather than arbitrary status editing.

| From | Allowed next states |
|---|---|
| `brief_submitted` | `planned`, `cancelled` |
| `planned` | `in_progress`, `on_hold`, `cancelled` |
| `in_progress` | `client_review`, `on_hold`, `cancelled` |
| `client_review` | `changes_requested`, `approved`, `on_hold`, `cancelled` |
| `changes_requested` | `in_progress`, `on_hold`, `cancelled` |
| `approved` | `delivered`, `on_hold`, `cancelled` |
| `on_hold` | `planned`, `in_progress`, `cancelled` |
| `delivered` | terminal |
| `cancelled` | terminal |

### 10.2 Message lifecycle

A message begins as a local draft with a stable client-generated idempotency key. Attachments are staged and reserved before the message is sent. The server accepts only a trimmed body and ready attachments owned by the caller for the same project and visibility. A successful message is immutable in project and visibility; the sender may edit body text under the existing policy, which records `edited_at`, `edited_by`, audit, and notification events.

### 10.3 Asset lifecycle

An asset moves through `pending → ready`, with `failed` or cleanup deletion as controlled operational outcomes. A pending row is not readable or downloadable. Finalization verifies object identity and metadata before readiness. A ready attachment can be linked only once to a message or deliverable according to the model. A signed URL is issued only after a current authorization check and has a short expiry.

### 10.4 Task lifecycle

Tasks use `todo`, `in_progress`, `review`, `done`, and `blocked`, with priority and due date. Employees and admins have full project-authorized task operations. Clients see only tasks with `client_visible = true` and use dedicated client request actions if client-originated work is later introduced.

### 10.5 Deliverable and approval lifecycle

A deliverable is created as a draft, uploaded and finalized, published for client review, then approved or rejected/requested for changes. A client approval must include the project and deliverable IDs, decision, optional/required note according to decision, reviewer identity, and timestamp. A new version is created for material changes rather than overwriting an approved object.

## 11. Authorization, RLS, storage, realtime, notifications, and audit

### 11.1 Database authorization

The database must fail closed. Knowing a UUID is never sufficient. Client policies use the authenticated profile’s company relationship and visibility predicate. Employee policies use `project_assignments`. Admin policies use the admin role. Every security-definer function uses a fixed search path, checks `auth.uid()`, validates all target records and cross-record relationships, revokes `PUBLIC` and `anon` execution, and grants only the required authenticated role.

| Resource | Client policy | Employee policy | Admin policy |
|---|---|---|---|
| Projects | Own company | Assigned projects | All projects |
| Threads/messages | Own company, shared only | Assigned projects, shared/internal | All project content |
| Attachments/deliverables | Ready, shared, authorized project | Assigned project, shared/internal | All states where operationally needed |
| Tasks | Own project and `client_visible = true` | Assigned project | All authorized projects |
| Approvals | Own company project and own review actions | Assigned project context | All projects |
| Notifications | `user_id = auth.uid()` | `user_id = auth.uid()` | Operations views through protected path |
| Audit | Client-safe projection only if exposed | Assigned project projection | All events |
| Storage | Private project path and visibility | Same | Full project-authorized access |

### 11.2 Private asset storage

The `project-files` bucket remains private. The browser never chooses an arbitrary storage path. The database generates or validates a path under `projects/{projectId}/attachments/{attachmentId}` or a deliverable equivalent. Upload is permitted only for a pending reservation owned by the current user and exact project. Overwrite is disabled. Download is a protected server action that verifies ready status, project scope, visibility, and current viewer before creating a signed URL.

Bucket-level file size and MIME limits should be configured where supported, but browser MIME values are not trusted; the reservation RPC and server action both validate file metadata. Abandoned pending reservations are cleaned by a protected scheduled operation with audit visibility. Ready linked files are never removed by the abandoned-upload cleanup.

### 11.3 Realtime

Realtime accelerates freshness; it is not an authorization layer. The client subscribes only after the server-backed workspace returns an authorized project/thread. Events contain identifiers and visibility only, never body text or file content. The callback triggers a visibility-filtered read-model refresh and de-duplicates concurrent refreshes. Internal events remain hidden because the subsequent read applies viewer policy.

### 11.4 Notifications

Every material event creates durable outbox intent in the same transaction as the source mutation. Recipient resolution uses project assignments and client company membership plus event visibility. Internal events never create client recipients. The worker claims rows atomically with a lease, retries safely with backoff, records failures, and uses deterministic event/recipient/channel idempotency. In-app notifications have explicit read state. Email templates exist for every event type that can be enqueued, including message edits.

### 11.5 Audit and observability

Audit records identify actor, project, company, event type, target IDs, timestamp, and safe metadata. Sensitive message bodies and storage tokens are not placed in audit or realtime payloads. Admin operations expose stale pending uploads, failed notifications, failed finalizations, and projects without an assignment. The production `Payments` foreign-table exposure, anonymous `rls_auto_enable()` execution, broad grants, and migration drift remain release blockers until resolved.

## 12. Server-action and read-model contracts

The current action layer remains the mutation boundary. Components should not perform direct browser-side database writes. The central read model should be the only supported project workspace read path.

| Contract | Input | Output | Authorization |
|---|---|---|---|
| `getProjectWorkspace` | `projectId`, viewer profile | Role-shaped overview, timeline, messages, assets, tasks, deliverables, approvals, activity, capabilities | Client company, employee assignment, or admin. |
| `listProjectMessages` | `projectId`, opaque cursor, bounded limit | `threadId`, messages with authorized attachments, `nextCursor` | Same project access; visibility shaped by role. |
| `postProjectMessage` | `projectId`, body, visibility, stable client ID, attachment IDs | Message ID and client ID | Participant; client shared-only. |
| `editProjectMessage` | `messageId`, body | Message ID | Sender or explicit admin override, current project access. |
| `reserveAttachment` | `projectId`, visibility, file metadata | Pending attachment ID/path/status | Participant, policy-controlled visibility. |
| `finalizeAttachment` | `projectId`, attachment ID | Ready attachment ID/status | Reservation owner and project participant. |
| `createAttachmentDownloadUrl` | `projectId`, attachment ID | Short-lived signed URL | Current viewer can read ready asset. |
| `createProjectDeliverable` | Project, title, version metadata, file metadata | Pending deliverable ID/path | Assigned employee/admin. |
| `publishProjectDeliverable` | Deliverable ID, status | Deliverable ID/status | Creator/assigned employee/admin, current project access. |
| `createProjectApproval` | Project, deliverable, decision, note | Approval ID/status | Client review or authorized staff response. |
| `markNotificationsRead` | Notification IDs or project scope | Updated count | Current notification owner only. |

## 13. Common UX standards for every page

Every page must define six states: loading, empty, ready, validation error, authorization error, and system/temporary error. Loading states preserve the page layout and never flash unauthorized content. Empty states explain why the list is empty and provide one next action. Validation errors appear beside the relevant control and preserve entered data. Authorization errors use a generic “This item is unavailable” state rather than confirming whether another project exists. Temporary errors provide retry without losing the draft. System errors include a request ID for support but never expose raw database details.

All action buttons must have disabled/loading states, keyboard focus styles, accessible labels, and confirmation for destructive actions. File upload controls show accepted types, maximum size, selected name, progress, retry, and cancellation semantics. Message and task lists must remain usable on narrow screens and with keyboard navigation. Visibility labels must be text, not color alone. Dates and times use a consistent timezone policy and human-readable relative labels with exact timestamps available on hover/focus.

## 14. Implementation roadmap and dependency order

No implementation begins until this master plan is approved. Work proceeds in vertical, reviewable slices. Each phase ends with tests, a clean diff, and a review gate.

| Phase | Scope | Primary outputs | Dependencies |
|---|---|---|---|
| 0. Security containment | Payments foreign table, anonymous helper grants, direct-table grant matrix, credential hygiene | Reviewed containment migrations and operator runbook | Live owner decisions; no feature work first. |
| 1. Migration integrity | Recover live-only migration, reconcile applied history, preview database setup | Reproducible migration chain | Phase 0 findings and live SQL recovery. |
| 2. Authorization kernel | RLS predicates for tasks/messages/assets/deliverables/approvals; RPC grant review; negative tests | Database contract and role-isolation test suite | Phase 1 clean schema. |
| 3. Workspace read kernel | Central `getProjectWorkspace`, company/assignment joins, message pagination, attachment joins, notes/activity projection | One role-shaped workspace loader | Phase 2 policies. |
| 4. Client journey | Signup/onboarding, project intake, client dashboard, project list/search, shared messaging/assets, client tasks, deliverable review, approvals, notifications | Complete client path | Phases 2–3. |
| 5. Employee operations | Work queue, assigned project workspace, task CRUD, shared/internal messaging, asset/deliverable lifecycle, deadlines, approvals | Complete employee path | Phases 2–4. |
| 6. Admin control center | Global dashboard, user/company/contact/deal/project/task operations, assignments, exceptions, audit, reporting | Complete admin path | Phases 2–5. |
| 7. Notification and operations | Atomic outbox worker, templates, read state, retries, failed queue, stale-upload cleanup, monitoring | Observable reliable operations | Workspace events from phases 4–6. |
| 8. UX and accessibility hardening | Responsive layout, shared components, loading/empty/error states, keyboard/a11y, visual consistency | Cross-role UI quality pass | Functional paths complete. |
| 9. Release verification | Preview E2E, local DB/RLS/storage tests, migration diff, Vercel env/cron/auth checks, rollback rehearsal | Production approval package | All previous phases. |

### Planned commit boundaries

Each vertical slice should use small commits: specification/contract tests, database migration, server actions/read model, UI wiring, then verification and documentation. Avoid mixing unrelated marketing-page or animation changes into CRM commits. The messaging/storage slice currently in the worktree must remain unimplemented until this master plan is approved; its feature-specific spec becomes an input to Phase 4, not a parallel source of truth.

## 15. Acceptance matrix

| Boundary or workflow | Acceptance test |
|---|---|
| Client signup | Client receives client role, safe redirect, normalized profile fields, and cannot self-promote. |
| Employee access | Employee request remains pending until admin approval; inactive/unassigned employee cannot access project data. |
| Company isolation | Client A cannot read Client B data by route, query, RPC, storage path, notification ID, or realtime topic. |
| Project creation | Valid client intake creates one project and one unique thread; retry with same key is idempotent. |
| Messaging | Shared message appears to authorized client/staff; internal message never appears in client read model or client outbox/email. |
| Message edit | Sender can edit own body; project/visibility remains immutable; audit and notification are recorded. |
| Asset upload | Reservation path belongs to project; pending file is not readable; finalization requires owner/project/metadata checks. |
| Asset download | Signed URL is issued only for ready authorized asset and expires after short TTL; direct storage bypass fails. |
| Asset cleanup | Stale pending reservation can be cleaned; ready linked asset cannot be removed by cleanup. |
| Task policy | Client direct query returns only `client_visible` tasks; employee mutation is assignment-scoped; admin mutation is audited. |
| Deliverable review | Client reviews the correct version; approval/change request links to project and deliverable and notifies assigned staff. |
| Admin control | Admin can search and manage all CRM areas; high-impact actions require explicit confirmation/reason and audit. |
| Notifications | Outbox rows are atomically claimed, retried, template-covered, idempotent, and individually readable/markable by owner. |
| Realtime | Event payload contains identifiers only; refresh remains project/visibility-scoped; channel cleanup works. |
| Route integrity | All current and planned role routes render without missing imports, redirect loops, dead links, or unhandled errors. |
| Migration integrity | Clean local/preview database from committed migrations matches the live contract after drift reconciliation. |
| Production readiness | Payments exposure, grant matrix, cron secret/import, bucket limits, migration history, and rollback plan are explicitly approved. |

## 16. Definition of done

The CRM is ready for controlled production rollout when the three roles can complete their full journeys without manual database intervention; the project workspace is shared across portals and shaped by role capabilities; every message, attachment, task, deliverable, approval, notification, and audit event resolves to the correct project; all browser mutations use protected server/RPC boundaries; private storage and signed URLs pass negative tests; notifications are observable and retryable; the live migration chain is reproducible; and the acceptance matrix passes in local database, preview browser, and production preflight checks.

## 17. Explicit non-goals and later backlog

The first complete CRM release does not include broad accounting, trust accounting, time tracking, calendar synchronization, e-signature, advanced document generation, or a separate sales-operations role. Payment integrations remain blocked until the live `Payments` foreign-table exposure is resolved. A future phase may introduce richer reporting, client feedback/reviews, templates, recurring work, and external calendar/email integrations after the project-isolation and workflow kernel is stable.

## 18. Review and approval process

The next step is plan review, not coding. Review this document as the single CRM blueprint. Approval should confirm the three-role model, project-centric isolation, page inventory, workspace composition, data/state contracts, security gates, roadmap order, and definition of done. Once approved, each implementation slice may create a short execution checklist under this master plan, but the master plan remains the authority for product and architecture decisions.

## 19. Reconciliation with updated MEMORY.md and repository operating rules

The updated project memory and repository instructions introduce several operational rules that are now part of this master plan. The following rules take precedence over older feature notes and must be checked before each implementation slice.

| Operating rule | Master-plan consequence |
|---|---|
| `main` is the Vercel production branch; merging into `main` deploys production. | Work must use a feature branch and reviewed pull request. Never deploy with `vercel --prod`. |
| CRM visibility is controlled by the build-time `NEXT_PUBLIC_CRM_ENABLED` environment variable, not by a historical `preview` or `production` branch. | Treat CRM launch as an owner-controlled Vercel setting and redeploy requirement. Do not invent a branch-promotion workflow. |
| The project-delivery path is intentionally contract-based: `lib/crm/projects.js` for reads and `app/actions/project-actions.js` for writes. | All new project, message, attachment, deliverable, approval, and workspace work extends this path. Do not create duplicate per-table CRM modules. |
| Companies, contacts, deals, tasks, and users currently use direct browser Supabase reads under RLS. | Preserve this deliberate split unless a future migration explicitly moves one domain onto the contract/server-action path. |
| Database roles are assigned by trusted database paths; the browser never selects `admin` or promotes itself. | Keep signup and invite flows role-safe, and test role changes through database-backed paths. |
| Source tests are mostly regex-based contract checks and do not execute real RPCs or RLS. | A green `pnpm test` is necessary but insufficient for database changes. Run `pnpm test:db` with an isolated Supabase stack or use approved read-only live verification. |
| Before changing an existing function, table, policy, or migration contract, fetch the live definition with `pg_get_functiondef` or the equivalent catalog query. | Never reconstruct live SQL from an old migration or pattern-match a function body. Record the fetched definition in the implementation ledger. |
| The memory file records migration `0024` as unmerged, while `docs/CRM-OPERATIONS.md` describes an older `0001`–`0011` canonical chain and the prior live audit found production-only migration drift. | Migration status is unresolved until `list_migrations` and the local migration directory are rechecked together. No new production migration is approved before exact drift reconciliation. |
| The ship loop is build → commit → push → reviewed PR into `main` → Vercel auto-deploy → authenticated browser spot-check. | Every implementation phase must include fresh build evidence, review, and preview/production verification appropriate to the risk. |
| Vercel dashboard settings and owner-only environment mutations remain the owner’s responsibility. | Prepare exact settings instructions and verification steps, but do not mutate Vercel project configuration without explicit owner authorization. |
| `docs/CRM-OPERATIONS.md`, `docs/ux/`, `STATUS.md`, `docs/superpowers/specs/`, and `docs/superpowers/plans/` are supporting records. | The master plan remains the product/architecture source of truth; supporting docs provide evidence and phase-specific execution detail. |

### Skill-driven execution protocol

Future CRM work follows this sequence: **UX framing and state inventory → written specification → executable plan → test-first contract → failing-test verification → minimal implementation → full build/test verification → focused code review → branch packaging → reviewed PR → preview/browser verification**. The implementation must stop if a design decision, live database definition, or owner-controlled deployment setting is unresolved.

## References

[1]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/middleware.js "CRM route middleware"

[2]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/lib/auth/roles.mjs "Role and portal definitions"

[3]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/lib/crm/project-contract.mjs "Project status, visibility, and task contracts"

[4]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/lib/crm/projects.js "Central CRM project read model"

[5]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/app/actions/project-actions.js "CRM protected server actions"

[6]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/supabase/migrations/0009_project_realtime_crm.sql "Project messaging, attachment, storage, and realtime foundation"

[7]: https://github.com/ethancrystal/crystalwebsolution.com/blob/26fa1c5/supabase/migrations/0010_project_workspace.sql "Project workspace schema and policies"

[8]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security documentation"

[9]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control"

[10]: https://supabase.com/docs/guides/storage/buckets/fundamentals "Supabase Storage bucket fundamentals"

[11]: https://supabase.com/docs/guides/database/database-advisors "Supabase Database Security Advisors"

[12]: https://www.crystalwebsolution.com/ "CD Sportswear USA production site"
