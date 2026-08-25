# App Flow Creator Audit Evidence Ledger

**Date:** 2026-08-24  
**Repository:** `ethancrystal/crystalwebsolution.com`  
**Local checkout:** `main` at `bb2a6e0772c12fd6c74c72cc0a8a2de7d98908fa`  
**Purpose:** Sanitized, read-only evidence captured while comparing the attached App Flow Creator requirements with the local repository and its configured Supabase project.

> This file contains no credentials, message bodies, storage tokens, or private user data. Live database observations were read-only metadata checks.

## Local repository state

| Check | Result |
|---|---|
| Framework | Next.js 15.5.23, React 19.2.8, JSX, plain CSS |
| CRM portal routes | `/dashboard`, `/team`, `/admin` plus project detail routes |
| API routes | Contact, health, and CRM notification cron endpoints |
| Local migrations | `0001`–`0023`, `0025`–`0035`; no local `0024` file |
| Local Supabase seed | Missing, although `supabase/config.toml` references `./seed.sql` |
| Working tree | Dirty: modified WebGL files and several untracked audit/build/generated files |
| `pnpm test` | **PASS — 381 tests, 0 failures** |
| `pnpm test:crm` | **PASS — 243 tests, 0 failures** |
| `pnpm build` | **PASS — production build; 56 routes generated** |
| `pnpm test:e2e` | **FAIL/BLOCKED — Playwright reports “No tests found” because `tests/e2e` is absent** |
| `pnpm test:db` | **BLOCKED — local Postgres at `127.0.0.1:54322` was not running** |

## Live Supabase migration ledger

The connected live project reports migrations through version `20260821234114`, including the following named entries after the early numeric history:

| Live version | Live name | Local comparison |
|---|---|---|
| `20260815101611` | `schedule_notification_drain` | Local `0025_schedule_notification_drain.sql` |
| `20260815101705` | `create_lead_from_contact` | Local `0026_create_lead_from_contact.sql` |
| `20260815135817` | `lead_capture_review_followups` | Local `0029_lead_capture_review_followups.sql` |
| `20260816111053` | `security_and_notification_hardening` | Local `0027_security_and_notification_hardening.sql` |
| `20260816112535` | `notification_read_grant_hardening` | Local `0028_notification_read_grant_hardening.sql` |
| `20260817072447` | `notification_claim_leases` | Local `0033_notification_claim_leases.sql` |
| `20260817103824` | `notification_attachment_cleanup_rpc` | Local `0034_notification_attachment_cleanup_rpc.sql` |
| `20260820063457` | `0035_blog_posts` | Local `0035_blog_posts.sql` |
| `20260820063550` | `0036_blog_taxonomy` | **No local equivalent found** |
| `20260821234114` | `0037_blog_posts_anon_write_revoke` | **No local equivalent found** |

The live ledger also contains the tracked/reconciled history through the project workspace series, but uses non-uniform migration names and has no numeric `0024` entry. The repository’s own Gate 1 document records that migration history requires deliberate reconciliation before further production DDL.

## Live database metadata

The live public schema currently exposes **19 tables**, and the read-only catalog check reported `RLS enabled = true` for all of them:

`audit_events`, `blog_posts`, `companies`, `company_members`, `contacts`, `deals`, `notes`, `notifications_outbox`, `profiles`, `project_approvals`, `project_assignments`, `project_attachments`, `project_deliverables`, `project_messages`, `project_status_history`, `project_tasks`, `project_threads`, `projects`, and `tasks`.

Core live procedures were present for authentication/RBAC, onboarding, project creation, assignment, status transitions, messages, attachments, tasks, deliverables, approvals, notifications, cleanup, and blog maintenance. The primary project mutation procedures are `SECURITY DEFINER` and have authenticated execution grants where the application calls them; service-role-only grants were observed for notification claiming and stale-attachment cleanup.

The live Supabase security advisor still reports generic GraphQL exposure warnings for public-schema tables and generic warnings for authenticated execution of several `SECURITY DEFINER` RPCs. These are not automatically proof of an exploitable bypass because the application RPCs contain role/project checks, but they must be reviewed and either accepted with evidence or reduced through an explicit grant/schema policy.

## Storage and operations metadata

| Area | Live result | Meaning |
|---|---|---|
| `project-files` bucket | Present and private | Correct baseline for protected project assets |
| Bucket-level file-size limit | `NULL` | App-level action limits files to 10 MiB, but the storage bucket itself has no configured limit |
| Storage object policies | Four project/reservation/deliverable policies present | Core path is implemented; negative upload/download tests are still required |
| `pg_cron` | Installed, version 1.6.4 | Scheduler available |
| `pg_net` / Vault | Installed | HTTP callback and secret storage available |
| `drain-crm-outbox` | Active, `*/5 * * * *` | Live scheduler exists and is enabled |
| `public."Payments"` | Foreign table exists; RLS disabled | No `anon` or `authenticated` table grants observed; `postgres` and `service_role` retain privileges. Ownership and long-term disposition remain an explicit decision |

## Interpretation

The evidence supports the conclusion that the repository is **not frontend-only** and that the core project-centric CRM foundation is implemented. It does **not** support declaring the platform fully complete: production migration parity, clean local database reproducibility, real role-based E2E, storage-limit hardening, and the planned admin/client/employee operational surfaces remain incomplete or unverified.

## Source references

[1]: ../../README.md "Repository overview and commands"
[2]: ../../package.json "Local scripts and dependency versions"
[3]: ../../supabase/config.toml "Local Supabase configuration"
[4]: ../../middleware.js "Role-gated middleware"
[5]: ../../lib/auth/roles.mjs "Role and portal definitions"
[6]: ../../lib/crm/projects.js "Central project read model"
[7]: ../../app/actions/project-actions.js "Protected CRM server actions"
[8]: ../CRM-GATE1-MIGRATION-RECONCILIATION.md "Migration and preview authorization gate"
[9]: ../CRM-MASTER-PLAN.md "CRM definition of done and acceptance matrix"
[10]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[11]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control"
[12]: https://supabase.com/docs/guides/database/database-linter "Supabase database security advisors"

**Live metadata note:** Live migration, table, function, storage, scheduler, and grant observations in this ledger were collected through the configured Supabase connection during this audit on 2026-08-24. They are not copied from the stale archived flow output.
