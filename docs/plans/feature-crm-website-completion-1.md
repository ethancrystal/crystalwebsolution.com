---
goal: Full completion of the CRM (three-role auth, project delivery, per-project messaging with email mirroring, admin PM assignment) and parity of website inner pages with the homepage's animation language
version: 1.0
date_created: 2026-08-08
last_updated: 2026-08-08
owner: ethancrystal
status: 'In progress'
tags: [feature, crm, notifications, auth, website, animation]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

CD Sportswear USA is a Next.js 15 marketing site with an attached
three-role Supabase CRM (client / project_manager / admin). This plan
closes the gap between the CRM's actual current state — verified via a
live-code audit and a live-database audit (Supabase MCP:
`list_tables`, `list_migrations`, `get_advisors`, `execute_sql` against
function bodies), cross-checked against `STATUS.md`'s own change history —
and the target shape: a client signs up, creates a project, an admin
assigns a project manager, and every project has one dedicated message
thread (client + assigned staff + admin, file attachments supported) that
also mirrors every message to email, instantly, per message. In parallel,
the website's inner marketing pages (About/Services/Contact/Process/Work/
Reviews/embroidery case study) reach entrance-animation parity with the
homepage, which already ships this session in a companion branch.

**Headline finding:** most of the target CRM shape already exists and is
already shipped — three-role auth, project creation, the status lifecycle,
and the entire per-project messaging UI/backend (`components/crm/
ProjectThread.jsx`, `post_project_message` RPC, wired into all three
portals) are built and working today. The real gap is four specific,
verified items (REQ-002, REQ-004, REQ-005, SEC items below), not a ground-
up build.

## 1. Requirements & Constraints

- **REQ-001**: A client can sign up, create a company record, and submit a
  project under one of the existing 5 categories (`web_design`,
  `logo_creation`, `branding`, `marketing`, `ai_automation`). **Status:
  already implemented** (`app/signup`, `onboard_client_company`,
  `BriefSubmissionForm.jsx` → `createProject` → `create_project` RPC).
- **REQ-002**: An admin can assign a project_manager to a project from the
  UI. **Status: RPC/action layer exists (`assign_project_user`,
  `assignProject`); no UI calls it.** This is a real gap — see Phase 2.
- **REQ-003**: Every project has one message thread visible to the client,
  assigned staff, and admin, supporting shared/internal visibility and
  file attachments. **Status: already implemented end-to-end**
  (`project_threads`, `project_messages`, `project_attachments`,
  `post_project_message` RPC, `ProjectThread.jsx` wired into
  `app/dashboard/projects/[id]`, `app/team/projects/[id]`,
  `app/admin/projects/[id]`).
- **REQ-004**: Every posted project message triggers an instant (not
  digest/batched) email to the project's other participants. **Status:
  not implemented.** `post_project_message`'s live function body (read via
  `execute_sql`/`pg_get_functiondef`) inserts the message and an audit
  event only — no `notifications_outbox` insert, no call to
  `enqueue_project_notification`. Confirmed as a genuine gap, not a
  regression, by cross-referencing `STATUS.md`'s 2026-08-01 entry, which
  documents porting the notification fan-out pattern into exactly
  `transition_project_status`, `update_project_approval`, and
  `publish_project_deliverable` — `post_project_message` did not exist
  yet at that time and was never added to the pattern afterward.
- **REQ-005**: The three notification types that already fan out
  (status/approval/deliverable) must reach the recipient's inbox, not only
  their in-app notification panel, and must reach the client (project
  owner), not only assigned staff. **Status: not implemented.**
  `transition_project_status`'s live body hardcodes
  `channel: 'in_app'` in its `notifications_outbox` insert and only
  targets rows in `project_assignments` (assigned staff), which
  structurally excludes the client (scoped by `company_id`, not present in
  `project_assignments`). The outbox-drain cron
  (`app/api/cron/crm-notifications`) only ever delivers `channel='email'`
  rows by design — so today, zero CRM events reach any inbox.
- **REQ-006**: Website inner pages (About, Contact, Process, Services
  index + all `/services/[slug]`, Work index, Work case study, Reviews,
  embroidery case study — 9 route templates total) render with the same
  scroll-entrance-animation coverage the homepage already has (0 of 9 had
  any entrance animation before this session; a companion branch,
  `agent/marketing-inner-pages-polish`, closes this — see Dependencies).
- **SEC-001**: `public.pinned_admin_email()` has a mutable `search_path`
  (live `get_advisors(security)` WARN) — must be pinned per standard
  Postgres `SECURITY DEFINER` hardening.
- **SEC-002**: Supabase Auth leaked-password protection is currently
  disabled (live `get_advisors(security)` WARN) — must be enabled.
- **SEC-003**: The Supabase Auth "Redirect URLs" allow-list is currently
  empty (confirmed via a live screenshot of the Supabase dashboard taken
  this session) — every emailed auth link (signup confirmation, password
  reset, staff invite) is rejected by GoTrue until at least one URL is
  added. Owner-only action (dashboard config), not app code.
- **CON-001**: No lint script exists in `package.json`; do not add one
  (explicit repo convention, `CLAUDE.md`).
- **CON-002**: `pnpm` only; do not switch package managers.
- **CON-003**: No TypeScript, no Tailwind anywhere in this repo — plain
  JSX and global CSS with the existing design-token system.
- **CON-004**: All CRM table writes go through `SECURITY DEFINER` RPCs
  only — `authenticated` has zero direct `INSERT`/`UPDATE`/`DELETE`
  privilege on any CRM table (confirmed live). New notification-triggering
  logic must extend existing RPCs or add new ones; it must never attempt a
  direct table write from application code.
- **GUD-001**: Match the existing notification fan-out shape exactly
  (insert into `notifications_outbox` with `project_id`, `user_id`,
  `channel`, `event_type`, `payload`) rather than inventing a new
  mechanism — the outbox-drain cron and email-template lookup
  (`NOTIFICATION_TEMPLATES` in `lib/email/templates.js`) already expect
  this shape and already have a template registered for
  `project.message_posted`.
- **GUD-002**: Every new/modified `SECURITY DEFINER` function must set
  `search_path` explicitly (the existing convention throughout
  `supabase/migrations/`, e.g. `SET search_path TO 'pg_catalog', 'public',
  'private', 'storage'`), per SEC-001's finding that at least one existing
  function currently omits this.
- **PAT-001**: New CRM UI mutations always go through a `'use server'`
  action in `app/actions/project-actions.js` (or the equivalent
  `app/admin/users/actions.js` for user/role actions) wrapping a
  `client.supabase.rpc(...)` call — never a direct Supabase client query
  for a write, matching every existing action in that file.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Wire project-event notifications (messages, status changes,
  approvals, deliverables) to actually reach email inboxes, addressed to
  both assigned staff and the client company — closing REQ-004 and
  REQ-005. Instant per-event email, no digest/batching (confirmed
  decision).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Write a migration adding a `notifications_outbox` insert (channel `'email'`) to `post_project_message`, addressed to every project participant except the sender (assigned staff via `project_assignments` + the client company's members via `company_members`/`profiles.company_id`) | | |
| TASK-002 | In the same migration, change `transition_project_status`'s existing `notifications_outbox` insert from `channel: 'in_app'`-only to also insert a `channel: 'email'` row, and extend its recipient query to include the client company alongside `project_assignments` | | |
| TASK-003 | Apply the same two changes (email channel + client-inclusive recipients) to `update_project_approval` and `publish_project_deliverable` | | |
| TASK-004 | Apply the migration to the live Supabase project via `apply_migration`; verify with `get_advisors(security)` (no new findings) and a direct `pg_get_functiondef` read confirming each function's new body | | |
| TASK-005 | Manually trigger one message post, one status transition, one approval, and one deliverable-publish against a real (test) project as a signed-in user; confirm each produces a `notifications_outbox` row with `channel='email'` and the correct recipients | | |
| TASK-006 | Confirm the `crm-notifications` cron drains those rows and Resend's dashboard/API shows a successful send for each of the 4 event types | | |

### Implementation Phase 2

- GOAL-002: Give admins a UI to assign a project_manager to a project,
  closing REQ-002.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Fix `listProjectsForViewer`/`PROJECT_FIELDS` in `lib/crm/projects.js` to join `project_assignments` so the existing "Project Manager" column in `app/admin/projects/page.jsx` stops always rendering "—" | | |
| TASK-008 | Add an assignee picker (dropdown of `project_manager`-role profiles) to `app/admin/projects/[id]/page.jsx`, calling the existing `assignProject`/`removeProjectAssignment` server actions | | |
| TASK-009 | Confirm the existing `project.user_assigned` email template (`projectAssignedEmail` in `lib/email/templates.js`) fires correctly once TASK-001-003's outbox pattern is extended to `assign_project_user` (add this as a 4th function to Phase 1's migration if not already covered) | | |
| TASK-010 | Manual verification: as admin, assign a PM to a real test project; confirm the PM sees it appear in `app/team/page.jsx`'s list and receives the assignment email | | |

### Implementation Phase 3

- GOAL-003: Close SEC-001, SEC-002, SEC-003 — the three verified security/
  config gaps blocking reliable auth email delivery and hardening the one
  weak `SECURITY DEFINER` function.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Migration: `ALTER FUNCTION public.pinned_admin_email() SET search_path = 'pg_catalog', 'public';` (or rewrite the function definition with the pin inline, matching GUD-002) | | |
| TASK-012 | Enable "Leaked Password Protection" in Supabase Auth settings (dashboard, not code) | | |
| TASK-013 | Add the production and preview deployment URLs to Supabase Auth's Redirect URLs allow-list (dashboard, owner action — the plan can only recommend and verify, not perform, since this is a live account setting) | | |
| TASK-014 | Verify TASK-013 by triggering one real signup-confirmation email and confirming the link resolves instead of erroring | | |

### Implementation Phase 4

- GOAL-004: Close the remaining `STATUS.md`-tracked CRM gaps (pre-existing,
  independently discovered by prior sessions, not rediscovered by this
  plan's audit — carried forward here so this plan is the single current
  source of truth).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Finish the CRM-wide loading-state pass — apply `Spinner.jsx`/`Skeleton.jsx` to the ~19 remaining detail/edit/new/workspace pages still showing plain "Loading..." text | | |
| TASK-016 | Decision + implementation: expose `priority`/`client_visible` as `create_project_task`/`update_project_task` parameters, and decide + implement whether `client_visible` filters task visibility for the `client` role | | |
| TASK-017 | Decision + implementation: whether `budget_amount`/`currency` become client-visible in `clientSafeProject()` (`lib/crm/projects.js`) | | |
| TASK-018 | Fix the companies/contacts `NotesPanel` prop mismatch (`projectId` vs `companyId`/`contactId`) — requires a design decision first (which project does a company-level note attach to, given a company can have zero-to-many projects) | | |
| TASK-019 | Fix `updateProjectTask`'s `revalidateAllProjectPaths` wrong-id bug before any task-edit UI ships (currently unreachable dead code path, per `STATUS.md`) | | |
| TASK-020 | Add a real `0015` migration file for the live-only `fix_handle_new_user_coalesce` migration so local migration history has no gap | | |

### Implementation Phase 5

- GOAL-005: Merge the in-flight website entrance-animation branch and
  confirm website-wide animation parity, closing REQ-006.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Land the final-review fix wave already dispatched on `agent/marketing-inner-pages-polish` (eyebrow markup unification, `PageHero` children wrap, closing-plate CTA glow clip, delay-ladder order) | | |
| TASK-022 | Run the plan's own outstanding Final Verification step: a live-browser pass across all 9 route templates confirming entrance plays once, no layout shift, no console errors, and `prefers-reduced-motion` shows everything immediately | | |
| TASK-023 | Open/merge the PR for `agent/marketing-inner-pages-polish` into `preview` | | |

### Implementation Phase 6

- GOAL-006: The verification step nobody has done yet — a real, logged-in,
  end-to-end click-through of the full described flow for all three
  roles. Nothing in this plan is "done" by its own goal statement until
  this happens at least once.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Client: sign up, create a company, submit a project, confirm brief appears in `app/dashboard` | | |
| TASK-025 | Admin: see the new project, assign a project_manager (TASK-008's UI), confirm the assignment email arrives | | |
| TASK-026 | PM: see the assigned project in `app/team`, post a message with a file attachment | | |
| TASK-027 | Client + admin: confirm the message appears in the thread and an email notification arrives for each | | |
| TASK-028 | Run `pnpm test` (full suite) and `pnpm build` one final time after all phases; confirm no regressions | | |

## 3. Alternatives

- **ALT-001**: Batch/digest email instead of instant per-message — considered and rejected per the user's explicit confirmation this session ("instant, per message").
- **ALT-002**: Build a new, separate notification mechanism instead of extending `notifications_outbox` — rejected; the existing outbox + cron-drain + Resend + template-registry pipeline is already fully built and working for other event types, and `project.message_posted` already has a registered template. Extending it is strictly less work and more consistent (GUD-001).
- **ALT-003**: Give the client role its own `project_assignments`-style row so the existing recipient query "just works" without a separate client-inclusion branch — rejected for this plan; would require a schema/RLS redesign of how client access is modeled (`company_id`-scoped, not assignment-scoped) for a benefit (a slightly simpler recipient query) that doesn't outweigh touching a core access-control primitive. The additive `company_members`-based recipient join (TASK-001/002/003) achieves the same result without redesigning access control.

## 4. Dependencies

- **DEP-001**: Live Supabase Postgres project (ref `wmnjosiikehsuaqucvja`) — all Phase 1-3 migrations apply here via the connected Supabase MCP.
- **DEP-002**: Resend (transactional email) — already integrated via `lib/email/resend.js`; Phase 1/3 depend on it being correctly configured (API key present) for TASK-006/TASK-014's verification steps to succeed.
- **DEP-003**: `app/api/cron/crm-notifications` — the existing outbox-drain worker; Phase 1 depends on its cron schedule actually running (already fixed to a valid Hobby-plan-compliant daily schedule earlier this session, PR #58) for TASK-006 to observe results without a manual trigger.
- **DEP-004**: Companion branch `agent/marketing-inner-pages-polish` (this session, separate from this plan's CRM work) — Phase 5 depends on its fix wave completing and its PR merging; otherwise independent of Phases 1-4/6.

## 5. Files

- **FILE-001**: New migration file, e.g. `supabase/migrations/0015_project_event_notifications.sql` — Phase 1's RPC changes (TASK-001 through TASK-003).
- **FILE-002**: `lib/crm/projects.js` — `listProjectsForViewer`/`PROJECT_FIELDS` join fix (TASK-007); `clientSafeProject()` if TASK-017 decides to expose budget/currency.
- **FILE-003**: `app/admin/projects/[id]/page.jsx` — new assignee-picker UI (TASK-008).
- **FILE-004**: `app/actions/project-actions.js` — `create_project_task`/`update_project_task` parameter exposure if TASK-016 proceeds; no changes expected for Phase 1 (existing `postMessage`/`assignProject` actions already call the RPCs this plan modifies, unchanged interface).
- **FILE-005**: `lib/email/templates.js` — no new templates needed (all 4 event types already registered in `NOTIFICATION_TEMPLATES`); verify only.
- **FILE-006**: New migration file for TASK-011 (search_path pin) — may be combined with FILE-001 or kept separate.
- **FILE-007**: New migration file `supabase/migrations/0015_fix_handle_new_user_coalesce.sql` (or renumbered appropriately once FILE-001's number is chosen) for TASK-020.
- **FILE-008**: `components/crm/NotesPanel.jsx` and the companies/contacts detail pages — TASK-018, gated on a design decision.
- **FILE-009**: Supabase dashboard Auth settings (not a repo file) — TASK-012, TASK-013.
- **FILE-010** (Phase 5, companion branch): `app/work/page.jsx`, `app/work/[slug]/page.jsx`, `app/reviews/page.jsx`, `app/embroidery-screen-printing-web-design/page.jsx`, `components/marketing/PageHero.jsx`, `app/globals.css` — already-dispatched fix wave, tracked here for completeness only.

## 6. Testing

- **TEST-001**: `pnpm test` — full existing suite must remain passing (157/158 baseline at plan creation; the 1 known failure, `tests/crm/auth-portals.test.mjs`, is confirmed pre-existing/unrelated to any branch in flight and is explicitly out of scope for this plan to fix).
- **TEST-002**: `pnpm build` — clean, zero errors, full route list unchanged, after every phase.
- **TEST-003**: Live `get_advisors(security)` re-run after Phase 1/3 migrations — no new findings introduced beyond the pre-existing, intentional `SECURITY DEFINER`-callable-by-`authenticated` pattern.
- **TEST-004**: Manual RPC-level verification per Phase 1 task (TASK-005/006) — direct `notifications_outbox` query + Resend delivery confirmation, not just "the migration applied without error."
- **TEST-005**: Phase 6's full logged-in three-role click-through (TASK-024 through TASK-027) — the first time this has ever been done for this CRM per `STATUS.md`'s own "known gaps" section.

## 7. Risks & Assumptions

- **RISK-001**: Phase 1/3 modify live `SECURITY DEFINER` functions on a connected, presumably-production-adjacent Supabase project. Migrations must be additive (new `notifications_outbox` inserts, not removal/rewriting of existing validated logic) and reviewed before `apply_migration`, per this session's own safety posture around live database writes.
- **RISK-002**: Once all 4 event types fire instant email, a single active project with several participants could generate meaningful email volume quickly (e.g., a 10-message conversation = up to 10 emails per recipient). Not blocking per the user's confirmed "instant, no digest" decision, but worth monitoring Resend's send volume/rate limits once live.
- **RISK-003**: TASK-013 (Auth Redirect URLs) is an owner-only dashboard action this plan cannot perform directly — Phase 3 cannot be marked fully complete without the account owner's action outside of Claude Code's tool access.
- **ASSUMPTION-001**: Every CRM table currently has 0 rows live (confirmed via `list_tables`) — this plan assumes the connected Supabase project is a dev/staging instance safe for direct migration application and manual test-data creation (TASK-005/010/024-027). If this is actually a live production database with real (currently zero) users about to onboard, the same steps still apply but with correspondingly higher care.
- **ASSUMPTION-002**: The recipient-inclusion fix for the client role (TASK-001/002/003) can correctly resolve "the client" via `company_members`/`profiles.company_id` without a schema change — based on the confirmed `private.can_access_project()` scoping logic already using exactly this join for read access.

## 8. Related Specifications / Further Reading

- `STATUS.md` — the project's own running implementation-status log; this plan's Phase 4 items are carried forward from its "Known gaps carried forward" section verbatim, not rediscovered.
- `docs/CRM-OPERATIONS.md` — portal/role/migration reference.
- `CLAUDE.md` — repo-wide conventions (stack, package manager, no-lint, no-Tailwind rules referenced in Section 1's constraints).
- `C:\Users\moizjmj\.claude\plans\mellow-wiggling-peach.md` — the original prose-form goal/plan this document formalizes, written the same session from the same audit.
- `docs/plans/2026-08-08-inner-pages-entrance-reveals.md` — the companion website plan referenced in Phase 5/DEP-004.
