---
goal: Complete the CRM login/signup flow and user + admin dashboards on feat/interactive-card-designs
version: 1.0
date_created: 2026-07-25
last_updated: 2026-07-25
owner: Moiz Jamil
status: 'In progress'
tags: [feature, bug, crm, auth]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-in_progress-yellow)

Commit `44edd99` ("feat: implement secure CRM system with auth, dashboards, and RLS") already landed a Supabase-backed CRM: login, signup, a role-aware `middleware.js`, a user dashboard, an admin dashboard, and a `companies` table + migration with RLS. Auditing that work against the branch's own UI (dashboard/admin links, the signup success flow) surfaced two functional bugs and several dead links to pages that were never built. This plan closes those gaps so the login/signup/dashboard surface is fully navigable end-to-end, then ships the branch.

## 1. Requirements & Constraints

- **REQ-001**: Login, signup, sign-out, the user dashboard, and the admin dashboard must all work without 404s or failed requests.
- **REQ-002**: New CRUD surfaces (contacts, deals, tasks) must respect the existing role model (`client` / `staff` / `admin`) already enforced by `middleware.js` and the RLS policies in `supabase/migrations/0001_crm_schema.sql`.
- **CON-001**: No TypeScript, no Tailwind — plain JSX and `<style jsx>` blocks, per `CLAUDE.md`.
- **CON-002**: No binary/image/video assets.
- **GUD-001**: New pages mirror the two patterns already established in the codebase: server actions with `'use server'` (see `app/auth/actions.js`) for mutations, and the client-side Supabase browser query pattern (see the original `app/admin/companies/page.jsx`) for read-only list pages.
- **PAT-001**: Every new admin form follows the dark-glass `crm-*` visual style already used across the login/signup/dashboard pages.

## 2. Implementation Steps

### Implementation Phase 1 — Fix broken auth wiring

- GOAL-001: Make sign-out and signup actually complete instead of erroring.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | `app/dashboard/page.jsx` and `app/admin/page.jsx` used `<Link href="/api/auth/logout">`, a GET navigation, against a route that only exports `POST` (405 on click). Replaced both with a `<form action={signOut}>` using the existing `signOut` server action from `app/auth/actions.js`. | ✅ | 2026-07-25 |
| TASK-002 | `signUp()` in `app/auth/actions.js` called `redirect('/auth/confirm')` on success, a route that doesn't exist, and the `redirect` throw meant the client's already-built "Check Your Email" success UI in `app/signup/page.jsx` was unreachable dead code. Removed the redirect; the action now returns `{ success: true }` so the existing client UI runs. | ✅ | 2026-07-25 |

### Implementation Phase 2 — Fill in missing CRM surfaces

- GOAL-002: Every link the dashboards already render (Companies, Contacts, Deals, Tasks, and their "new" forms) resolves to a real page instead of a 404.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Added `lib/crm/tasks.js` (`createTask`/`getTasks`/`getTask`/`updateTask`/`deleteTask`) — the `tasks` table existed in the schema and was referenced by the admin dashboard, but had no CRUD module like `companies.js`/`contacts.js`/`deals.js` did. | ✅ | 2026-07-25 |
| TASK-004 | Added `app/admin/companies/new/page.jsx`, `app/admin/companies/[id]/page.jsx` (detail view with related contacts/deals/tasks), `app/admin/companies/[id]/edit/page.jsx`, and `app/admin/companies/actions.js` (`createCompanyAction`/`updateCompanyAction`/`deleteCompanyAction`). The existing `app/admin/companies/page.jsx` list linked to all three and none existed. | ✅ | 2026-07-25 |
| TASK-005 | Added `app/admin/contacts/page.jsx` + `new/page.jsx` + `actions.js`, `app/admin/deals/page.jsx` + `new/page.jsx` + `actions.js`, and `app/admin/tasks/page.jsx` + `new/page.jsx` + `actions.js`. List pages query Supabase directly (joined to `companies(name)`) mirroring the companies list pattern; "new" pages are server components that fetch `getCompanies()` for a company picker and post to a `'use server'` action. | ✅ | 2026-07-25 |

### Implementation Phase 3 — Verify and ship

- GOAL-003: Confirm the branch builds clean and land the work.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Run `npm run build` to confirm all new routes compile and no regressions were introduced. | | |
| TASK-007 | Commit the fixes and new pages with a descriptive message. | | |
| TASK-008 | Push `feat/interactive-card-designs` to origin. | | |

## 3. Alternatives

- **ALT-001**: Route sign-out through a real `/api/auth/logout` GET-capable handler instead of a form + server action. Rejected — the codebase already has a working `signOut` server action; adding a second logout code path would duplicate logic for no benefit.
- **ALT-002**: Build a dedicated `/auth/confirm` page instead of removing the premature redirect. Rejected — the signup page already has a complete, styled "Check Your Email" success state; building a second page for the same message would be redundant.
- **ALT-003**: Give contacts/deals/tasks full detail + edit pages like companies got. Deferred — out of scope for closing dead links; companies got the deeper treatment because it's the primary entity the dashboards surface first (Recent Companies, company detail linking out to its contacts/deals/tasks).

## 4. Dependencies

- **DEP-001**: `@supabase/ssr` and `@supabase/supabase-js` (already in `package.json`).
- **DEP-002**: A configured Supabase project — `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; a real `.env.local` with live values is required to actually exercise auth locally (not created by this plan — local secrets aren't committed).
- **DEP-003**: `supabase/migrations/0001_crm_schema.sql` must be applied to the target Supabase project for the `profiles`/`companies`/`contacts`/`deals`/`tasks`/`notes`/`company_members` tables and RLS policies to exist.

## 5. Files

- **FILE-001**: `app/dashboard/page.jsx` — sign-out form fix.
- **FILE-002**: `app/admin/page.jsx` — sign-out form fix.
- **FILE-003**: `app/auth/actions.js` — removed premature `/auth/confirm` redirect.
- **FILE-004**: `lib/crm/tasks.js` — new CRUD module.
- **FILE-005**: `app/admin/companies/actions.js`, `app/admin/companies/new/page.jsx`, `app/admin/companies/[id]/page.jsx`, `app/admin/companies/[id]/edit/page.jsx` — new company CRUD pages.
- **FILE-006**: `app/admin/contacts/page.jsx`, `app/admin/contacts/new/page.jsx`, `app/admin/contacts/actions.js` — new contact list + create.
- **FILE-007**: `app/admin/deals/page.jsx`, `app/admin/deals/new/page.jsx`, `app/admin/deals/actions.js` — new deal list + create.
- **FILE-008**: `app/admin/tasks/page.jsx`, `app/admin/tasks/new/page.jsx`, `app/admin/tasks/actions.js` — new task list + create.

## 6. Testing

- **TEST-001**: `npm run build` must complete with all new routes statically/dynamically analyzed with no type or import errors (no test/lint script exists in this repo per `CLAUDE.md` — build success is the correctness signal).
- **TEST-002**: Manual click-through once a real Supabase project is wired up: signup → check-email screen → login → dashboard → Sign Out actually signs out and redirects to `/`; admin → Companies/Contacts/Deals/Tasks → New forms create rows and redirect without error.

## 7. Risks & Assumptions

- **RISK-001**: None of this was exercised against a live Supabase project in this pass (no `.env.local` / credentials available in this environment) — verification is limited to a successful `npm run build`, not a runtime click-through.
- **RISK-002**: `/admin/contacts`, `/admin/deals`, `/admin/tasks` list pages query Supabase directly from the browser client rather than through `middleware.js`-style server checks; they rely entirely on RLS (`is_staff()`) to keep client-role users from seeing data, consistent with how the pre-existing `app/admin/companies/page.jsx` was already built.
- **ASSUMPTION-001**: The Supabase project already has `0001_crm_schema.sql` applied and at least one user's `app_metadata.role` set to `admin` or `staff` (per the migration's comment, this must be done via the service-role key, not signup) — otherwise `/admin/*` redirects everyone to `/dashboard` per `middleware.js`.

## 8. Related Specifications / Further Reading

- `CLAUDE.md` (repo root and worktree) — project architecture and conventions.
- `supabase/migrations/0001_crm_schema.sql` — full schema and RLS policy source of truth.
- `middleware.js` — route protection and role-gating logic.
