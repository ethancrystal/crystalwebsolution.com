# CRM Messaging and Asset Hardening Rollout

## Scope and current state

This runbook covers the isolated messaging and project-asset hardening slice on branch `agent/crm-messaging-hardening`. The slice protects private download authorization, removes private storage paths from browser-facing read models, makes staged attachment uploads retryable, adds cursor pagination and project-switch isolation to the thread, converts message refreshes to identifiers-only Realtime broadcasts, makes message posting idempotent, and adds bounded cleanup for abandoned pending attachments.

Migration `0032_project_asset_lifecycle_hardening.sql` is staged in this branch and has **not** been applied to production. The application change and the database migration must be reviewed as one compatibility unit. No production Supabase mutation is authorized by this document.

## Production prerequisites verified

The production Supabase project is `wmnjosiikehsuaqucvja` in `us-west-1`. A read-only catalog query confirmed that the prerequisite uniqueness constraint already exists on `public.project_messages`:

| Constraint | Definition | Why it matters |
|---|---|---|
| `project_messages_pkey` | `PRIMARY KEY (id)` | Existing message identity |
| `project_messages_sender_id_client_generated_id_key` | `UNIQUE (sender_id, client_generated_id)` | Required by migration 0032 idempotent `ON CONFLICT` handling |

The live migration ledger does not contain migration 0032. The live message and attachment RPC signatures match the function signatures replaced by the staged migration. The full evidence record is maintained at `/home/ubuntu/crm-messaging-live-contracts-2026-08-16.md`.

## Required deployment order

First, merge the reviewed application and migration changes through the repository pull request. The production branch is `main`, which deploys through the existing Vercel integration. Do not run `vercel --prod` and do not manually mutate the production database as part of application deployment.

Second, after the application deployment is available, apply migration 0032 through the approved Supabase migration workflow. The migration must remain blocked until the owner gives explicit approval for this specific production application. Before applying it, fetch and archive the live definitions of `public.post_project_message(uuid,text,text,uuid,uuid[])`, `private.broadcast_project_message()`, and the relevant attachment routines using `pg_get_functiondef`. Compare those definitions with the migration’s replacement scope and confirm that no unexpected production drift is being overwritten.

Third, verify the migration ledger and function privileges immediately after application. The cleanup function must be executable only by `service_role` and `postgres`; `public`, `anon`, and `authenticated` must not have execute privileges. The existing message and attachment RPC grants must remain compatible with the application’s authenticated action path.

## Application verification

Run the following commands from the hardening worktree before merge:

```bash
pnpm test
pnpm build
git diff --check
```

The focused contracts are:

```bash
node --test tests/crm/messaging-asset-hardening.test.mjs tests/crm/messaging-asset-migration.test.mjs
```

If local Supabase is available, also run `pnpm test:db`. Source-contract tests do not replace database verification. If local Docker or Postgres is unavailable, record that limitation in the pull request and keep production migration approval separate.

## Post-migration read-only verification

Run these read-only checks against production after the owner-approved migration application. Every catalog read must select only the needed columns and include an explicit limit.

```sql
select routine_schema, routine_name, data_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in ('post_project_message', 'cleanup_stale_project_attachments')
order by routine_schema, routine_name
limit 20;
```

```sql
select routine_schema, routine_name, routine_type, security_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in ('post_project_message', 'cleanup_stale_project_attachments')
order by routine_schema, routine_name
limit 20;
```

```sql
select grantee, routine_schema, routine_name, privilege_type
from information_schema.routine_privileges
where routine_schema in ('public', 'private')
  and routine_name in ('post_project_message', 'cleanup_stale_project_attachments')
order by routine_name, grantee
limit 100;
```

The cleanup function should be exercised only through a controlled preview or staging environment unless the owner separately approves a production cleanup test. Do not insert synthetic production attachments merely to test cleanup.

## Functional smoke checks

As a client, confirm that only shared messages and ready shared attachments appear in the client project thread. As an assigned project manager, confirm that shared and internal messages appear only for assigned projects. As an admin, confirm that authorized project access still works through the existing protected workspace paths. For each role, confirm that downloading an authorized ready attachment or non-draft deliverable opens a short-lived signed URL, while an unauthorized project, draft deliverable, or missing asset produces a generic failure.

Confirm that a failed upload remains staged with a retry action, that a successful retry can be attached to a message, and that a failed message request preserves the draft and reuses its client-generated id on retry. Confirm that switching projects while a load or upload is in flight does not display the old project’s data in the new project’s thread.

Confirm that editing a message causes a refresh through the authorized read model and does not expose message bodies through the Realtime payload. Confirm that loading older messages merges by message ID without duplicates.

## Rollback and recovery

If the application deployment must be rolled back before migration 0032 is applied, revert the application pull request or deploy the previous reviewed commit. The pre-migration application remains compatible with the existing database functions; the cleanup endpoint will not be invoked by the reverted application.

If migration 0032 has already been applied, do not attempt to roll back by manually editing production functions or by re-running an older migration. Prepare a new corrective migration from the archived pre-migration `pg_get_functiondef` output, explicitly restore the intended prior definitions, remove the update trigger if necessary, and preserve the existing unique constraint and security grants. Review and approve that corrective migration before application.

If stale cleanup reports an error, the notification worker treats cleanup failure as non-fatal and continues its existing email/outbox behavior. Investigate the function definition, storage-object policy, and service-role permissions before retrying. Do not broaden cleanup grants to API roles as a workaround.

## Explicit approval gate

The following actions require explicit owner approval at the time of execution: applying migration 0032 to production, running any production cleanup mutation, and applying any corrective rollback migration. Until that approval is provided, this branch may be tested, reviewed, pushed, and opened as a pull request, but the production database must remain unchanged.
