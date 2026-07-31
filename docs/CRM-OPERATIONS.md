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
- Notification delivery uses `app/api/cron/crm-notifications`.
- Protect the route with `CRM_CRON_SECRET`.

## Test Users
- Run dry-run: `pnpm crm:provision-test-users -- --dry-run`
- Run execute: `pnpm crm:provision-test-users -- --execute`

## Migrations
- Apply `0008` then `0009`.
- Review migrations before applying to production.

## Verification
- `pnpm test:crm`
- `pnpm build`
