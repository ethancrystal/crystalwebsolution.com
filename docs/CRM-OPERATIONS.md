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
- The notification route may run the existing stale-attachment cleanup RPC, but it does not clean or requeue historical notification rows.

## Notifications

The CRM writes notification rows to `public.notifications_outbox`. The queue keeps three statuses—`pending`, `sent`, and `failed`—and three channels—`email`, `in_app`, and `realtime`. The email worker must never claim or modify `in_app` or `realtime` rows.

`app/api/cron/crm-notifications/route.js` is a protected Node.js worker. It accepts Vercel's `Authorization: Bearer` credential or the explicit `x-cron-secret` header, fails closed when no secret is configured, claims at most 25 due email rows through `claim_notification_email_batch`, and records outcomes only through lease-owned completion RPCs. It returns counts only; it never returns recipients, payloads, provider responses, lease tokens, or secrets.

The worker uses a stable provider idempotency key, `outbox-{id}`. Delivery is **at least once** at the queue boundary: if a provider response is ambiguous or a completion update loses its lease, the row may be reclaimed after expiry, but the stable provider key prevents a duplicate provider send. A completion affected-row count of zero is a lease conflict, not a successful delivery.

## Scheduler and Secrets

Supabase `pg_cron` is the primary scheduler. The live `drain-crm-outbox` job runs every five minutes and calls the production route through `pg_net`, loading the `x-cron-secret` value from Vault secret `crm_cron_secret`. Vercel Cron is the daily backstop at `0 13 * * *` for `/api/cron/crm-notifications`. Both paths may overlap; database claim leases, not scheduler timing assumptions, provide ownership.

The owner-controlled secret must be synchronized between Supabase Vault `crm_cron_secret` and the Vercel `CRON_SECRET`/`CRM_CRON_SECRET` environment value. Keep secret values out of git, logs, issue comments, test fixtures, and audit exports. Rotate by updating the receiving environment and then the scheduler source, verifying an authorized smoke request and an unauthorized request without printing the secret.

## Safe Smoke Test

Use only a controlled preview recipient and a verified Resend sender. Never use a client or personal inbox for a queue smoke test. A safe smoke test has these steps:

1. Confirm the preview environment points at a disposable or explicitly approved Supabase database and uses a controlled email recipient.
2. Insert or create one synthetic email notification through the approved test path; do not replay historical production rows.
3. Invoke the route with the configured secret through the approved scheduler path and inspect only the JSON counts.
4. Confirm the row transitions through the lease-owned path and that the provider idempotency key is `outbox-{id}`.
5. Confirm that an `in_app` test row remains untouched by the email worker.
6. Confirm a wrong or missing secret returns `401` and that no provider call occurs.
7. Confirm a stale lease can be reclaimed and that a wrong lease token cannot mark the row sent or failed.

The route response and operational logs must not include raw payloads, recipient email addresses, provider response bodies, cron secrets, or lease tokens. Error details stored in the queue are bounded and classified with an allowlisted `failure_code`.

## Historical Rows and No-Spam Policy

Do not bulk-replay or delete historical notification rows as part of the lease migration. Before any cleanup, run a bounded aggregate count by channel, status, event type, and cutoff. Historical `in_app` rows are read-state data and may be shown to their owners; they are not email work. Historical failed email rows remain terminal unless the owner separately approves a new audited notification event with verified recipient and template context.

Any unread cleanup must use an explicit owner-selected cutoff, update only `in_app` rows through an owner-scoped or explicitly approved audited path, and verify afterward that no email rows changed. Admin retry or terminalization is not part of the first reliability slice; if later approved, every action requires a reason, authorization, and audit event.

## Migrations

The checked-in migration directory currently contains the CRM chain through `0033_notification_claim_leases.sql`, with historical numbering gaps. `0033` is additive: it adds lease and failure metadata, a bounded claim index, atomic claim/reclaim behavior, lease-owned success/failure transitions, fixed `search_path` functions, and trusted-worker grants. It intentionally does not introduce a `processing` status.

Repository numeric filenames are not proof of production application. The live Supabase migration ledger uses timestamped versions and has previously diverged from the checked-in chain. Before applying `0033`, reconcile the live ledger, inspect exact live function definitions with `pg_get_functiondef`, verify grants and scheduler state, run the migration on an isolated database, and rehearse the old-worker/new-worker cutover. Do not edit or replay historical migration files.

**No production migration, scheduler change, historical-row update, or email replay is authorized by this runbook without explicit owner approval for the exact reviewed operation.**

## Verification

- `node --test tests/crm/notification-claim-lease.test.mjs tests/crm/notification-coverage.test.mjs tests/crm/notification-scheduler.test.mjs`
- `pnpm test:crm`
- `pnpm test`
- `pnpm build`
- `pnpm test:db` when a local Supabase stack is available
- `git diff --check`

The source-level test suite is not a substitute for database verification. A green `pnpm test` does not prove that RLS, grants, function signatures, concurrent claims, or the production migration ledger are correct.
