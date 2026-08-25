# Crystal Web Solution Completion Roadmap

**Date:** 2026-08-24  
**Assessment:** Core CRM foundation implemented; platform is **not yet release-complete** against the attached App Flow Creator/CRM definition of done.

## Executive decision

Do not start by rebuilding the CRM or by adding more visual features. The current repository has the principal three-role project workspace, protected mutations, RLS-backed tables, private storage, Realtime foundations, and notification plumbing. The remaining work is release confidence, operational completeness, and product-surface completion.

The attached archive is also not an App Flow Creator implementation. It contains planning contracts, skills, flow-analysis scripts, and generated/stale project-flow artifacts. The local repository contains no workflow graph editor, node/edge persistence, workflow validation API, execution runner, run-event stream, or flow-creator UI. If “App Flow Creator” is a separate product requirement, it still needs to be designed and built; the current CRM is a different product surface.

## Prioritized next steps

| Priority | Workstream | Current evidence | Required next step | Exit test |
|---|---|---|---|---|
| P0 | Migration parity | Live ledger reaches `0037`; local checkout reaches `0035`; live names are partly non-numeric and there is no numeric `0024` row | Reconcile the exact live ledger and function definitions. Add tracked equivalents for live-only `0036_blog_taxonomy` and `0037_blog_posts_anon_write_revoke` only after reviewing their exact SQL. Update the migration ledger and do not apply guessed rollback/DDL | A clean database and the live project have an explained, commit-pinned migration mapping |
| P0 | Local database reproducibility | `supabase/config.toml` references `./seed.sql`, but `supabase/seed.sql` is absent; `pnpm test:db` could not connect to `127.0.0.1:54322` | Start Docker/Supabase locally, add a safe disposable seed strategy if intended, and run `supabase db reset` plus `pnpm test:db` | Clean local reset and SQL tests pass from the repository alone |
| P0 | Three-role authorization E2E | Static tests pass; the preview harness exists but requires four disposable accounts and preview variables; `tests/e2e` is absent and `pnpm test:e2e` reports no tests | Provision disposable preview fixtures and run independent client A/client B/employee/admin sessions through auth, middleware, RLS, RPC/actions, storage, Realtime, and notifications | Client/company isolation, employee assignment isolation, admin control, and all negative UUID-known access attempts pass |
| P0 | Full client journey | Core intake, workspace, messages, files, tasks, deliverables, approvals, and notifications exist in code | Exercise signup/onboarding → brief → message → upload → deliverable review → approval/change request → delivery using disposable data | No manual database intervention is needed for the full journey |
| P1 | Storage hardening | `project-files` is private and has object policies, but live bucket `file_size_limit` is `NULL` | Configure a bucket-level size limit and approved MIME policy consistent with the server action. Verify pending/ready/failed/cleanup/download behavior | Direct/bypassed storage access and invalid files fail closed; signed URLs are short-lived |
| P1 | Notification operations | Cron, leases, retries, templates, cleanup RPC, and an active five-minute live job exist | Add the planned admin exception view for pending/failed/leased/exhausted rows and audited retry controls. Verify Vercel `CRON_SECRET`/`CRM_CRON_SECRET` parity without exposing values | An operator can discover, retry, and verify a failed notification from the app |
| P1 | Admin operational surface | `/admin` currently provides basic counts and links; admin notifications and audit routes are planned, not present | Add `/admin/notifications`, `/admin/audit`, and operational queues for failures, stale uploads, pending approvals, and unassigned projects | Admin can operate without direct Supabase dashboard/database access |
| P1 | Client and employee surface completion | Client and employee project pages exist, but planned profile/company/notification/support/task surfaces are absent | Decide which planned routes are required for launch; implement the highest-value attention queue, notification center, focused task view, and profile/settings surfaces | Each role can complete its daily workflow from the application |
| P1 | Task edit completeness | Task creation supports priority and `client_visible`; the update action/RPC does not accept either field, and the project task component is display-only | Add an authorized update contract for priority and visibility if product policy requires post-creation edits; add UI and regression tests | Task fields remain consistent across UI, action, RPC, RLS, and audit history |
| P1 | Deployment verification | Build succeeds and health/cron routes exist; authenticated preview and Vercel settings are not verified in this audit | Run preview deployment checks, authenticated role smoke tests, health check, cron auth check, storage config check, and rollback rehearsal | Release checklist passes without relying on an unverified environment assumption |
| P2 | Documentation/source truth | Archived flow output says frontend-only and Next 14/React 18; current repo is Next 15/React 19 with CRM and 56 routes. `STATUS.md` and `docs/CRM-MASTER-PLAN.md` contain older baseline statements | Regenerate the flow output from the current commit, update status timestamps and migration references, and keep one authoritative current-state report | No planning document contradicts the checked-out code or live migration ledger |
| P2 | Working-tree hygiene | Local `main` is ahead of origin by one commit but has modified WebGL files plus untracked generated files | Review or stash/commit these changes deliberately before release verification; do not mix them into CRM fixes | Candidate commit has a clean diff and reproducible build/test evidence |

## What is already substantially implemented

The following areas are present and have strong code/database evidence: three canonical roles (`client`, `project_manager`, `admin`); role-aware middleware and safe auth redirects; client onboarding and project intake; project-scoped read model; protected project mutations; message edit and idempotency support; project status history and transitions; private project storage with reservation/finalization; tasks with client visibility; deliverables and approvals; notifications outbox with read state; Realtime foundations; server-side email draining with leases/retries; audit events; admin CRM CRUD pages; and a blog authoring surface.

Local verification is also strong at the static/build level: `pnpm test` passed 381 tests, `pnpm test:crm` passed 243 tests, and `pnpm build` completed successfully with 56 routes. These results establish code and import health; they do not prove live RLS, storage, cross-session Realtime, or production deployment correctness.

## Definition of “complete” for the next release

The platform should not be marked complete until all of the following are simultaneously true:

1. The current source commit, local migrations, and live migration ledger are reconciled.
2. A clean local Supabase reset works, including the configured seed/test setup.
3. Independent preview sessions prove all three role journeys and cross-scope denials.
4. Storage, Realtime, notifications, and cleanup pass negative and retry tests.
5. Admin exception/audit operations are available in the application, or explicitly accepted as a launch non-goal.
6. Required client and employee operational pages are implemented or explicitly removed from scope.
7. The working tree is clean, tests/build pass, and a reviewed preview deployment is spot-checked.

## Recommended execution order

First complete migration reconciliation and local database reproducibility. Then run the preview authorization and full client journey tests before changing feature code. Next harden bucket limits and implement notification/audit operations. Finish the selected client/employee pages, then run the deployment and rollback gates. Keep the App Flow Creator itself as a separate product track unless the intent is to turn the existing CRM project workspace into a workflow-graph product.

## References

[1]: ./app-flow-creator-live-evidence-2026-08-24.md "Audit evidence ledger"
[2]: ../CRM-GATE1-MIGRATION-RECONCILIATION.md "Migration and preview authorization gate"
[3]: ../CRM-MASTER-PLAN.md "CRM master plan and definition of done"
[4]: ../../lib/auth/roles.mjs "Role and portal definitions"
[5]: ../../middleware.js "Role-aware middleware"
[6]: ../../lib/crm/projects.js "Central project read model"
[7]: ../../app/actions/project-actions.js "Protected CRM server actions"
[8]: ../../app/api/cron/crm-notifications/route.js "Notification worker"
[9]: ../../supabase/config.toml "Local Supabase configuration"
[10]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[11]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control"
[12]: https://supabase.com/docs/guides/database/database-linter "Supabase database security advisors"
