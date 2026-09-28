---
title: Portal workings — client, employee and admin dashboards
status: Planned
date: 2026-09-28
owner: Moiz (admin)
priority: client portal first
---

# Portal workings — client, employee and admin dashboards

**Mission (CLAUDE.md):** accommodate incoming and current clients and collaborate
efficiently with them while their project is ongoing.

This plan describes how the inside of each portal should work, what already
exists, and the phased work to close the gap. It was written from a code read on
2026-09-28 (main at v1.82, migrations head `0045`). Follow the agent protocol in
`docs/plans/README.md`: re-verify every `file:line` before editing.

Portal hosts: all three portals live on `https://app.cdsportswearinc.com`
(v1.78). Login routes are `/login/client`, `/login/employee`, `/login/admin`.

---

## 1. The client journey the owner wants (2026-09-28)

In the owner's words, condensed:

1. A **salesperson talks to the client** and sends them the portal link.
2. The client **signs up**, **verifies their email** by clicking the link, and is
   redirected into the **client dashboard**.
3. The first time, the dashboard runs an **onboarding tutorial** that shows:
   how to create a project, how to fill in the brief, how to message in the
   project thread, and how to upload images.
4. **Creating a project starts with choosing its type**: Website, Logo, Branding,
   Marketing or Automation.
5. **Each type opens its own brief** (different questions per service).
6. The project then runs in the project workspace: thread, files, updates.

## 2. What exists today

### Client (`app/dashboard/**`, `app/onboarding`)

| Step | Today | Where |
|---|---|---|
| Sign up, verify, land on dashboard | Works (reset/invite flows verified live 2026-09-28) | `app/auth/actions.js`, `app/auth/callback` |
| Company details | `/onboarding` form runs when the client has no company | `app/onboarding/page.jsx`, RPC `onboard_client_company` (`0008`) |
| Tutorial | **Missing** | — |
| Choose project type | Service cards for **Logo, Website, SEO, PPC** + "Something else" free text | `app/dashboard/page.jsx`, `lib/crm/brief-templates.mjs:663` |
| Brief per type | Guided wizard with autosave, submit creates or joins a project | `BriefWizard.jsx`, `app/actions/brief-actions.js`, `0043` |
| Branding / Automation / Marketing briefs | **Missing.** DB allows only `logo, website, seo, ppc` | `0043_project_briefs.sql:56` check constraint |
| Project thread + image upload | Works (shared messages, attachments via reserve → upload → finalize) | `useProjectThread.js`, `ProjectThread` |
| Approve / request changes | **Missing** for clients (staff-only action and RLS) | `project-actions.js:693`, `0015:474` |
| "Needs your action", project team card, notifications inbox | **Missing**; notifications only per project, "Mark read" doesn't refresh | `NotificationsPanel.jsx:53` |

### Employee (`app/team/**`, role `project_manager`)

- `/team` is a flat list of assigned projects (title — status). No due dates,
  tasks, pending approvals, unread messages or notifications.
- `/team/projects/[id]` works: status transitions from the contract, create
  task, upload deliverables, decide approvals, thread, notes, briefs (read-only).
- Missing: internal/shared toggle (messages, notes, deliverables always
  `shared`), task edit/complete (`updateProjectTask` has no caller), request an
  approval (`createProjectApproval` has no caller), in-app notifications,
  pending-staff-request status for employees who signed up.
- Company/contact visibility for PMs follows **deal ownership**, not project
  assignment, so `project.company` can be null in the workspace.

### Admin (`app/admin/**`)

- Home shows four total counts (companies, contacts, deals, tasks), Manage
  Users and five quick actions. It does **not link to projects, briefs, the
  pipeline or the blog**; `/admin/projects` is reachable only from the
  brief-submitted email.
- Companies/contacts/deals/tasks CRUD, pipeline stage moves, users & invites,
  staff-request resolution and blog are wired.
- Projects: assign/remove PM works. Status transitions use a hardcoded
  `NEXT_OPTIONS` list (`app/admin/projects/[id]/page.jsx:167-173`) that
  disagrees with `ALLOWED_TRANSITIONS` (`lib/crm/project-contract.mjs:77-86`):
  no Cancel, no On hold, nothing from `brief_submitted`, and one option that
  always fails.
- No admin "create project" or "convert won deal to project"; briefs are
  read-only (no accept/decline); `audit_events` and the notification outbox have
  no UI.
- Layout: admin pages use their own inline styles; only the project page uses
  the shared `WorkspaceShell`.

---

## 3. Target workings per portal

### Client — "I always know what's happening and what you need from me"

1. **Arrive:** salesperson link → sign up → verify → `/onboarding` (company) →
   dashboard. One screen per step, no dead ends.
2. **First-run tutorial** on the dashboard: 4 short steps with Next / Skip,
   replayable from a "How it works" button. Steps: (1) start a project,
   (2) fill in the brief, (3) message the team, (4) upload images.
3. **Start a project = pick a service** (cards): Website, Logo, Branding,
   Marketing, Automation, plus "Something else". Each opens its own brief.
4. **Dashboard home:** "Needs your action" list first (approvals waiting,
   unanswered questions), then projects with status and last activity, then
   drafts.
5. **Project workspace:** status + next step ("who has the ball"), your
   project team card, thread with image previews, files, approvals the client
   can **Approve** or **Request changes** on, and project updates.
6. **Notifications:** bell with unread count across all projects; mark read
   works immediately. Emails continue as today.

### Employee — "my work queue, in order"

1. `/team` becomes a queue: grouped by status, due dates, overdue tasks, unread
   client messages, approvals waiting on the client, new briefs.
2. Project workspace adds: **Internal / Client-visible** toggle on messages,
   notes and uploads; task edit / complete / reassign; **Request approval** on a
   deliverable; client company and contacts shown for assigned projects.
3. Notifications bell (same component as the client's).

### Admin — "run the studio from one screen"

1. Admin home becomes a control room: **new briefs awaiting assignment**, active
   projects by status, pending staff requests, new leads (last 7 days),
   overdue tasks, approvals waiting on clients; links to Projects, Pipeline,
   Blog, Users.
2. Projects: create a project for a client; convert a won deal into a project;
   status transitions driven by the contract (fixes the hardcoded list);
   accept/decline a brief.
3. Shared layout: admin pages move onto the same shell and navigation as the
   other portals.
4. Activity log (read-only) from `audit_events`.

---

## 4. Phases

Client first, per the owner. Each phase is one or more PRs, each with its own
`vX.NN`. SQL phases add a migration, a `tests/crm/migration-00NN-*` contract and
pgTAP tests (`aidd_docs/memory/testing.md`).

### Phase C1 — Client arrival and tutorial (no SQL)

| Task | Detail |
|---|---|
| C1.1 | Verify the salesperson-link path end to end on `app` host: signup → verify email → `/auth/callback` → `/onboarding` → `/dashboard`. Fix any dead end. |
| C1.2 | First-run tutorial component on `/dashboard`: 4 steps, keyboard accessible, focus-managed, respects `prefers-reduced-motion`, Skip and Replay. |
| C1.3 | Remember completion per user. Default: `localStorage` now, DB flag later if needed (see D2). |
| C1.4 | Empty-state dashboard: one clear "Start your first project" action. |
| Accept | New account reaches the dashboard, sees the tutorial once, can replay it; vitest covers step order, Skip, Replay, reduced motion. |

### Phase C2 — Project types and briefs (migration `0046`)

| Task | Detail |
|---|---|
| C2.1 | Service cards: Website, Logo, Branding, Marketing, Automation, Something else (final list per D1). |
| C2.2 | New brief templates in `lib/crm/brief-templates.mjs`: **Branding** and **Automation**; **Marketing** absorbs SEO and PPC as sub-choices (per D1). |
| C2.3 | Migration `0046`: widen `project_briefs.brief_type` check to the new types; keep existing `seo`/`ppc` rows valid. |
| C2.4 | Tests: template shape tests, migration contract, pgTAP for the constraint. |
| Accept | Each card opens its own brief; submitting creates the project; admin and assigned staff are notified (existing `project.brief_submitted`). |

### Phase C3 — Client workspace: actions and approvals (migration `0047`)

| Task | Detail |
|---|---|
| C3.1 | "Needs your action" panel on dashboard and project page. |
| C3.2 | Client can **Approve** / **Request changes** on shared approvals: new client-scoped RPC (company member, shared approval only), audit event, notification to staff. Staff-only `updateProjectApproval` stays as is. |
| C3.3 | "Your project team" card (assigned staff names; data already visible via `shares_project_with`). |
| C3.4 | Image previews in the thread for image attachments (signed URLs, existing 60 s TTL). |
| Accept | pgTAP proves a client can decide only their own company's shared approvals; UI shows the decision to staff in real time. |

### Phase C4 — Notifications for everyone (no SQL expected)

| Task | Detail |
|---|---|
| C4.1 | Bell + inbox in `WorkspaceShell` for all roles, unread count, mark read that refreshes. |
| C4.2 | Enqueue the three silent events (`task_created`, `task_updated`, `approval_requested`); templates already exist in `lib/email/templates.js`. |

### Phase E1 — Employee queue and controls

| Task | Detail |
|---|---|
| E1.1 | `/team` queue: status groups, due dates, overdue tasks, unread messages, approvals waiting. |
| E1.2 | Internal / Client-visible toggle for messages, notes, deliverables (contract already allows it: `canPostVisibility`). |
| E1.3 | Task edit / complete (wire `updateProjectTask`); Request approval (wire `createProjectApproval`). |
| E1.4 | Company/contact visibility for assigned projects (RLS change, migration). |
| E1.5 | Employee who requested staff access sees "request pending" instead of the client dashboard. |

### Phase A1 — Admin control room

| Task | Detail |
|---|---|
| A1.1 | Admin home: new briefs, projects by status, staff requests, new leads, overdue tasks, approvals waiting; links to Projects, Pipeline, Blog. |
| A1.2 | Fix project status transitions to use `ALLOWED_TRANSITIONS` (bug; small, can ship early). |
| A1.3 | Create project for a client; convert won deal → project (`create_project` with `p_source_deal_id`). |
| A1.4 | Accept / decline a brief. |
| A1.5 | Move admin pages onto the shared shell; activity log from `audit_events`. |

### Cross-cutting

- One Playwright golden path per role once `tests/e2e/` exists (`pnpm test:e2e`
  is a planned gate today).
- Every change keeps the current look (CLAUDE.md goal) and respects reduced
  motion.

---

## 5. Decisions needed from the owner

| # | Question | Default if unanswered |
|---|---|---|
| D1 | Final service list. Is **Logo** separate from **Branding**? Does **Marketing** cover SEO + PPC (+ social?) as sub-choices? What does **Automation** mean for your clients (e.g. CRM/email workflows, Zapier/Make, AI chat)? | Six cards: Website, Logo, Branding, Marketing (SEO / PPC / Social), Automation, Something else |
| D2 | Tutorial shown once per **account** (all devices) or per **browser**? | Per browser first (no SQL); upgrade to per account if clients use several devices |
| D3 | Does the salesperson have a portal account? Should the link they send credit them and auto-assign them to the client's first project? | No attribution in phase C1; revisit after C4 |
| D4 | Should clients approve / request changes inside the portal? (`docs/ux/crm-journey.md` says yes.) | Yes (Phase C3) |
| D5 | Can admin create projects directly (e.g. from a won deal), or only clients via a brief? | Both (Phase A1.3) |

## 6. Verification per phase

`pnpm test`, `pnpm test:components`, the CI placeholder build, and for SQL
phases `pnpm test:db`. Browser check on the Vercel preview with the three
provisioned test accounts (`pnpm crm:provision-test-users`). Migrations are
applied to production only by the owner (`docs/CRM-OPERATIONS.md`).
