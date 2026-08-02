# CRM Operations

## Portals and Roles
- `/login/client` — client portal
- `/login/employee` — project manager portal
- `/login/admin` — admin portal
- `/dashboard` — client home
- `/team` — employee home
- `/admin` — admin home

## Invitations and Cleanup
- Invite through `app/admin/users/actions.js`.
- Role is provisioned through the authoritative database path.
- If email delivery or role assignment fails, the newly created auth user is deleted.

## Project Lifecycle
- Status transitions are validated by `lib/crm/project-contract.mjs`.
- Writes use bounded server actions in `app/actions/project-actions.js`.

## Storage and Cleanup
- Uploads go through `reserve_project_attachment`.
- Finalize uploads through `finalize_project_attachment`.

## Notifications
- Project actions enqueue rows in `notifications_outbox`.
- `app/api/cron/crm-notifications/route.js` is currently a protected stub and
  does not send queued notifications. `CRM_CRON_SECRET` protects the route,
  but a delivery worker still needs to be implemented before claiming email
  delivery is operational.

## Test Users
- Run dry-run: `pnpm crm:provision-test-users -- --dry-run`
- Run execute: `pnpm crm:provision-test-users -- --execute`

## Migrations
- The canonical checked-in chain is `0001` through `0011` with exactly one
  numeric version per file. `0009_project_realtime_crm.sql`,
  `0010_project_workspace.sql`, and `0011_workspace_hardening_from_main.sql`
  are the current project/workspace schema.
- Live migration history intentionally skipped historical `0007`; `0008`
  supersedes its notes-policy intent. Do not edit or replay historical files
  without reconciling the target database first.
- Review migrations and RLS against an isolated database before production.

## Verification
- `pnpm test:crm`
- `pnpm test`
- `pnpm build`
- `pnpm test:db` when a local Supabase stack is available
