---
goal: Automatic lead capture from the contact form into the CRM, plus a 5-minute email-notification drain
version: 1.0
date_created: 2026-08-15
owner: ethancrystal
status: 'In progress'
tags: [feature, crm, migration]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Implements the two remaining phases of `CRM-IMPLEMENTATION-PLAN.md` that were skipped when the session jumped straight to Phase 3 (launch): Phase 1 (5-minute email-notification drain via `pg_cron`) and Phase 2 (contact-form submissions auto-create a contact + company + deal in the CRM, with an admin notification). The CRM is now live in production with the launch prerequisites already satisfied (Supabase Auth redirect allow-list, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CRM_ENABLED`) — this plan covers what's still missing: the mission's headline feature ("every inquiry becomes a contact + company + deal") does not exist yet, and notification delivery still runs on a 24h cron cadence instead of the intended 5 minutes.

This plan was written after auditing the live schema directly (Supabase MCP `list_tables`/`execute_sql`), not from the original plan document's assumptions alone — several of the original plan's specifics (the `deals.stage` vocabulary, in particular) do not match what's actually deployed, and this plan normalizes to reality rather than fighting the existing UI. See REQ-010 and ALT-001.

# 1. Requirements & Constraints

- **REQ-001**: A contact-form submission that passes validation (not spam-rejected) creates or matches a `companies` row (by name, or by email domain skipping free-mail domains), a `contacts` row (matched by `lower(email)`), and either appends a note to an existing **open** deal for that contact or creates a new `deals` row.
- **REQ-002**: The write path must be a single `SECURITY DEFINER` Postgres RPC (`create_lead_from_contact`), never a direct table write from the `anon`/`authenticated` role — confirmed necessary: RLS on `deals`/`contacts`/`companies` only permits `is_admin()` or a company-member-scoped insert, neither of which applies to an anonymous visitor.
- **REQ-003**: The RPC is callable only via the service-role admin client (`lib/supabase/admin.js`'s `createAdminClient()`), never granted to `anon`/`authenticated`/`PUBLIC`.
- **REQ-004**: Calling the RPC must never block or fail the visitor's existing contact-form response (webhook + direct email) — CRM failure is logged and swallowed, not surfaced to the visitor.
- **REQ-005**: Honeypot-rejected submissions must create nothing in the CRM (validation happens before the RPC is ever called).
- **REQ-006**: The admin gets a "New lead" notification via the `notifications_outbox` (channel `email`), in addition to the contact route's existing direct email, which gains a "View in CRM" link.
- **REQ-007**: `/admin/deals` needs no redesign; new leads must be identifiable by the existing UI without user confusion (see REQ-010).
- **REQ-008**: Email-notification delivery moves from a 24h cron cadence to ~5 minutes via `pg_cron` + `pg_net` calling the existing `/api/cron/crm-notifications` endpoint, per the already-locked decision in `CRM-IMPLEMENTATION-PLAN.md` §2.4. The daily Vercel cron stays as a backstop.
- **REQ-009**: The drain endpoint's shared secret is stored in Supabase Vault, not embedded as plaintext in migration SQL.
- **REQ-010 (normalization)**: The original plan specified a lead stage vocabulary (`new_lead → contacted → qualified → proposal → won → lost`) that does not exist anywhere in the deployed schema or UI. The live `deals.stage` column (no DB CHECK constraint, enforced only at the app layer) has a hardcoded 6-value enum already wired through `STAGE_LABELS`/`STAGE_COLORS` in `app/admin/deals/page.jsx` and a `STAGES`/`normalizeStage()` array in `app/admin/deals/pipeline/page.jsx` that silently buckets any unrecognized value into `prospecting`. New leads use the **existing** `stage = 'prospecting'` default rather than introducing an unrecognized value that the Kanban board would misrender. "Impossible to miss" (plan's own Task 2.3 language) is achieved via the deal title convention (`Website inquiry — {name/company}`) and newest-first ordering, not a new stage enum — see ALT-001.
- **SEC-001**: Never trust the caller's `company` field for automated company matching beyond exact-name or verified email-domain match; do not fuzzy-match on similar names (spam/typo risk of merging into the wrong company).
- **SEC-002**: Length-bound every RPC input field to the same limits `lib/contactForm.mjs` already enforces (name 100, email 254, company 160, brief 4000) — the RPC is a second line of defense, not the only one, but must not trust the caller.
- **CON-001**: Migration numbering: live tops out at `0023`; PR #69 (open, unmerged) claims `0024`. This plan's migrations use `0025` and `0026` — re-verify via `list_migrations` immediately before each `apply_migration` call, not from this document, in case PR #69 or another session has landed in the meantime.
- **CON-002**: `pg_cron` is not currently installed on the live project (`pg_net` and `supabase_vault` already are). `CREATE EXTENSION pg_cron` may require dashboard-level enabling on some Supabase tiers if the SQL path is permission-denied — documented as a fallback, not assumed to fail.
- **CON-003**: `deals.owner_id`, `contacts.created_by`, `companies.created_by` are all `NOT NULL`. Auto-created leads have no human actor. Resolved by attributing all three to the pinned admin's profile id (`public.pinned_admin_email()` → `auth.users.email` → `profiles.id`), consistent with the plan's own framing that the admin owns/is notified about every new lead.
- **GUD-001**: Follow the existing `SECURITY DEFINER` / `SET search_path = pg_catalog, public` / explicit `REVOKE ALL FROM PUBLIC, anon, authenticated` convention already used by `handle_new_user()` (migration `0014b`) for functions that must never be PostgREST-reachable.
- **GUD-002**: Follow the existing migration file header/comment convention (`-- NNNN_description.sql`, dated context comment) used throughout `supabase/migrations/`.
- **PAT-001**: Follow the `notifications_outbox` insert pattern from `0015_project_notifications_and_message_editing.sql` (`insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload) select ...`) for the new-lead notification row, with `project_id = NULL`.

# 2. Implementation Steps

### Implementation Phase 1 — 5-minute email drain

- GOAL-001: Notification emails deliver within ~5 minutes instead of up to 24 hours, without weakening the drain endpoint's existing auth.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Audit `app/api/cron/crm-notifications/route.js`'s `isAuthorised()` — confirm it already accepts `x-cron-secret` header auth with constant-time comparison and fails closed with no secret configured (already true as of this session's earlier review; no code change needed here). | ✅ | 2026-08-15 |
| TASK-002 | Re-run `list_migrations` to confirm the next free migration number is still `0025` (not consumed by another session since this plan was written). | | |
| TASK-003 | Write `supabase/migrations/0025_schedule_notification_drain.sql`: `CREATE EXTENSION IF NOT EXISTS pg_cron;` (schema `pg_catalog` or default), then `SELECT vault.create_secret(...)` to store the drain secret (reusing the existing `CRM_CRON_SECRET` value already configured in Vercel — do not invent a new secret name), then `SELECT cron.schedule('drain-crm-outbox', '*/5 * * * *', $$ SELECT net.http_post(url := '<PROD_APP_URL>/api/cron/crm-notifications', headers := jsonb_build_object('x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_cron_secret')), timeout_milliseconds := 8000) $$);`. | | |
| TASK-004 | Apply the migration live via `apply_migration` — **requires owner confirmation immediately before this call**, per `CRM-IMPLEMENTATION-PLAN.md` guardrail "Live DDL needs explicit owner approval per migration" and Phase 0.2. | | |
| TASK-005 | Verify: `SELECT * FROM cron.job;` shows the scheduled job; after ~5-10 min, `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` shows successful runs; confirm a real outbox row (if any pending) drains within the window. | | |
| TASK-006 | Update `STATUS.md` and this plan's task table with the outcome. | | |

### Implementation Phase 2 — Lead capture RPC

- GOAL-002: The `create_lead_from_contact` RPC exists, is correctly scoped, and is covered by contract tests before anything calls it.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Re-run `list_migrations` to confirm `0026` is still free. | | |
| TASK-008 | Write `supabase/migrations/0026_create_lead_from_contact.sql`: the RPC per REQ-001–REQ-010, CON-003, GUD-001, PAT-001. Signature: `create_lead_from_contact(p_name text, p_email text, p_company text, p_brief text, p_budget text, p_source text default 'website_contact_form') RETURNS jsonb`. Returns `{lead_created: bool, deal_id: uuid, contact_id: uuid, company_id: uuid, note_appended: bool}` so the caller can log outcome without a second query. | | |
| TASK-009 | Add `'lead.created'` to `lib/email/templates.js`'s `NOTIFICATION_TEMPLATES` map with a new `leadCreatedEmail({ leadName, leadCompany, leadEmail, dealUrl })` template, following the existing template factory pattern (`emailLayout`, `detailRows`, `PALETTE`). | | |
| TASK-010 | Extend `templateContextFor()` in `app/api/cron/crm-notifications/route.js` to map the new payload shape (`lead_name`, `lead_company`, `lead_email`, `deal_id`) into the template's props, and extend `projectUrlFor`-equivalent logic so a `null` `project_id` with a `deal_id` in the payload links to `${APP_URL}/admin/deals/${deal_id}` instead of the `/dashboard` fallback. | | |
| TASK-011 | Write `tests/crm/migration-0026-create-lead-from-contact.test.mjs` (regex-over-SQL-text contract tests, matching this repo's existing `tests/crm/migration-00NN-*.test.mjs` convention) asserting: function is `SECURITY DEFINER`; grants revoke `PUBLIC`/`anon`/`authenticated`; the RLS-bypass write targets (`companies`, `contacts`, `deals`, `notes`, `notifications_outbox`) all appear; the open-deal dedupe logic references `stage <> ALL (ARRAY['closed_won','closed_lost'])` or equivalent. | | |
| TASK-012 | Apply the migration live via `apply_migration` — **requires owner confirmation immediately before this call**, same guardrail as TASK-004. Low risk: purely additive, the function isn't reachable by anything until Phase 2's next tasks wire it up. | | |
| TASK-013 | Manually verify via `execute_sql` (as `service_role`, matching how the app will call it): call the RPC directly with a test payload, confirm the expected rows land, then call it again with the same email to confirm the dedupe path appends a note instead of creating a second deal. Clean up the test rows afterward (`DELETE ... WHERE email = 'plan-test@example.com'` cascade, documented, not silent). | | |

### Implementation Phase 3 — Wire the contact route + admin visibility

- GOAL-003: A real contact-form submission on the live site creates CRM records and notifies the admin, without changing the visitor-facing behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | In `app/api/contact/route.js`, after `validation.valid` passes (never on `rejectedAsSpam`), call `createAdminClient().rpc('create_lead_from_contact', {...})` **after** the existing webhook/email delivery block, wrapped in try/catch that only `console.error`s — never affects `webhookDelivered`/`emailDelivered`/the visitor's response. | | |
| TASK-015 | Add the "View in CRM" link to `contactSubmissionEmail()` in `lib/email/templates.js` (new optional `dealUrl` param, rendered only when present — keeps the function's existing signature backward compatible for any other caller). | | |
| TASK-016 | Pass `dealUrl` from the route once the RPC returns a `deal_id`; if the RPC call fails or is skipped, the email still sends exactly as it does today (REQ-004). | | |
| TASK-017 | `/admin/deals` (`app/admin/deals/page.jsx`): confirm default sort is newest-first (`created_at desc`); if not already, add it — this plus the `Website inquiry —` title prefix satisfies REQ-007 without new UI. | | |
| TASK-018 | Add `tests/crm/contact-route-lead-capture.test.mjs`: assert the route file calls the RPC only inside the non-spam, validation-passed branch, and that RPC failure paths don't touch the response-status logic (regex-over-source contract test, matching this repo's convention for route-level tests). | | |
| TASK-019 | Run `pnpm test` (full suite) and `pnpm build`; both must be clean before commit. | | |
| TASK-020 | Commit on a new branch off `main`, push, open a PR with a test plan documenting the manual RPC verification from TASK-013 and a live contact-form submission test against the PR's preview deployment. | | |
| TASK-021 | **Do not merge without a real end-to-end check**: submit the live contact form (preview or, after merge, production) and confirm a contact/company/deal appears in `/admin/deals` and the admin notification arrives. | | |

# 3. Alternatives

- **ALT-001**: Introduce the plan's original `new_lead` stage value and extend `STAGE_LABELS`/`STAGE_COLORS`/pipeline `STAGES` in both admin UI files to render it distinctly. Rejected for v1: touches more files, requires a product decision on where `new_lead` sits relative to `prospecting` in the pipeline order, and isn't necessary to satisfy "impossible to miss" — the title-prefix + sort-order approach (REQ-010) achieves the same outcome with a smaller, lower-risk diff. Revisit if the admin finds `prospecting`-bucketed leads insufficiently distinct in practice.
- **ALT-002**: Call the lead-capture RPC synchronously and block the contact-form response on it. Rejected — REQ-004 and the original plan both require CRM failure to never break the existing, already-working email/webhook delivery; blocking couples an optional internal side-effect to the visitor-facing response.
- **ALT-003**: Skip the `notifications_outbox` row entirely and only add the CRM link to the existing direct admin email (Task 2.2's literal ask). Considered because it avoids the redundant-email risk noted in Risks below, but the original plan explicitly specifies both (Task 2.1 *and* 2.2) — implemented as specified; flagged in Risks rather than silently dropped.

# 4. Dependencies

- **DEP-001**: `pg_cron` extension (not yet installed) — CON-002.
- **DEP-002**: `pg_net`, `supabase_vault` — already installed, confirmed via `list_extensions`.
- **DEP-003**: Existing `CRM_CRON_SECRET` env var (already configured for the daily Vercel cron) — reused, not replaced.
- **DEP-004**: `lib/supabase/admin.js`'s `createAdminClient()` — already exists, already used elsewhere in this codebase (signup, cron drain).

# 5. Files

- **FILE-001**: `supabase/migrations/0025_schedule_notification_drain.sql` — new.
- **FILE-002**: `supabase/migrations/0026_create_lead_from_contact.sql` — new.
- **FILE-003**: `lib/email/templates.js` — add `leadCreatedEmail`, extend `NOTIFICATION_TEMPLATES`, extend `contactSubmissionEmail` with optional `dealUrl`.
- **FILE-004**: `app/api/cron/crm-notifications/route.js` — extend `templateContextFor` for the new payload shape and CRM-link URL.
- **FILE-005**: `app/api/contact/route.js` — call the RPC post-validation, non-blocking.
- **FILE-006**: `app/admin/deals/page.jsx` — confirm/add newest-first default sort.
- **FILE-007**: `tests/crm/migration-0026-create-lead-from-contact.test.mjs` — new.
- **FILE-008**: `tests/crm/contact-route-lead-capture.test.mjs` — new.
- **FILE-009**: `STATUS.md` — update with outcome, matching this repo's established practice of logging every CRM change there.

# 6. Testing

- **TEST-001**: `tests/crm/migration-0026-create-lead-from-contact.test.mjs` — contract test on the migration SQL text (grants, SECURITY DEFINER, dedupe logic present).
- **TEST-002**: `tests/crm/contact-route-lead-capture.test.mjs` — contract test on the route's call ordering and error-isolation.
- **TEST-003**: Manual live-database verification of the RPC (TASK-013) — direct `execute_sql` calls, not automatable against production data.
- **TEST-004**: `pnpm test` full suite must stay green (225+ tests as of this session).
- **TEST-005**: `pnpm build` must stay clean.
- **TEST-006**: End-to-end manual check (TASK-021) — an actual contact-form submission against a live deployment, checked against `/admin/deals`.
- **TEST-007** (Phase 1): `cron.job_run_details` shows successful runs within the first 10 minutes after TASK-004.

# 7. Risks & Assumptions

- **RISK-001**: Task 2.1 (outbox notification) and Task 2.2 (existing direct email + CRM link) together mean the admin receives two separate "new lead" emails per submission — one instant (direct Resend send from the contact route), one within ~5 minutes (outbox drain, once Phase 1 lands) or up to 24h (if Phase 1 hasn't landed yet). Implemented exactly as the original plan specifies (ALT-003); flag to the owner post-implementation in case a single consolidated email is preferred instead.
- **RISK-002**: `CREATE EXTENSION pg_cron` may be permission-denied depending on the Supabase project's tier/configuration (CON-002) — if so, TASK-004 fails and the fallback is dashboard-level enabling (Database → Extensions → pg_cron), which is an owner action, not something `apply_migration` can do.
- **RISK-003**: Company-matching by exact name or email domain (REQ-001) can still misfire for two unrelated companies sharing a generic domain pattern that isn't in the free-mail-domain skip list, or for genuine near-duplicate company names. Accepted for v1 per the original plan's own scope; not a blocking risk since it only affects grouping, not data loss — worst case is a lead attached to a slightly-wrong existing company, correctable by an admin.
- **ASSUMPTION-001**: The single pinned admin (`ethan@crystalwebsolution.com`) is the correct default `owner_id`/`created_by` for auto-created leads (CON-003) — reasonable given the admin is also who gets notified, but not explicitly stated in the original plan; flagged here rather than assumed silently.
- **ASSUMPTION-002**: `deals.value` (numeric) is left `NULL` for auto-created leads — the contact form's `budget` field is a range string ("$5–15k"), not a number, and the original plan doesn't ask for it to be parsed into `value`. It's included in the deal's `description` text instead.

# 8. Related Specifications / Further Reading

- `CRM-IMPLEMENTATION-PLAN.md` (repo root) — the source plan this implements Phases 1 and 2 of.
- `STATUS.md` — running log of CRM changes; update on completion.
- `docs/CRM-OPERATIONS.md` — CRM portal/role/migration operational guidance.
- `supabase/migrations/0015_project_notifications_and_message_editing.sql` — notifications_outbox insert pattern (PAT-001).
- `supabase/migrations/0014_signup_account_type_and_single_admin.sql` — `pinned_admin_email()`, SECURITY DEFINER convention (GUD-001).
