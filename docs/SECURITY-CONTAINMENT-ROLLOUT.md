# Security Containment Migration 0027 Rollout Runbook

## Scope and safety gate

Migration `0027_security_and_notification_hardening.sql` is staged for review only. **Do not execute it against production until the repository owner explicitly approves the reviewed pull request and the live migration state is reconciled.** The migration does not delete the live `public."Payments"` foreign table; it removes direct API-role privileges conditionally if that table exists.

The change contains four security controls: client task reads require `client_visible = true` unless the caller is internal staff/admin; authenticated users can mark only their own in-app notifications as read; API execution is revoked from four internal/configuration helpers; and direct `anon`/`authenticated` table privileges are revoked from the Stripe-backed `public."Payments"` foreign table.

## Preflight: record state and reconcile migration drift

Run the following read-only checks using the production Supabase project selected in the owner-approved session. Save the output with the deployment record before applying anything.

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;

select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('private', 'project_notification_recipients'),
  ('private', 'shares_project_with'),
  ('public', 'pinned_admin_email'),
  ('public', 'rls_auto_enable')
)
order by n.nspname, p.proname, arguments;

select c.relname as relation_name,
       c.relkind,
       c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('Payments', 'project_tasks', 'notifications_outbox');
```

If the migration ledger contains a different migration with version `0027`, or if the ledger and checked-in migration names are out of sync, **stop**. Do not force the migration with `supabase db push`. Reconcile the live `lead_capture_review_followups` drift and migration numbering in a separate reviewed change, or apply the exact reviewed SQL manually after the owner confirms that the SQL is equivalent to the intended containment slice.

Before execution, also save the current grants and task policy:

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'Payments'
order by grantee, privilege_type;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'project_tasks';
```

## Apply the reviewed migration

Use the exact contents of `supabase/migrations/0027_security_and_notification_hardening.sql` from the approved commit. Prefer the Supabase SQL editor or an owner-controlled `psql` session so the operator can inspect the SQL and keep the transaction boundary visible.

```sql
begin;
-- Paste the reviewed migration 0027 contents here exactly.
-- Do not substitute an unreviewed copy or alter the grant targets.
commit;
```

If the migration raises any error, issue `rollback;`, preserve the error output, and stop. Do not retry with edited SQL during the same production change window. The migration is designed to be rerunnable for its `if not exists` and `create or replace` operations, but a failed transaction must still be diagnosed before another attempt.

## Post-apply verification

All checks below must return the expected result. Run them in the same owner-controlled session and attach the output to the deployment record.

### Task visibility policy

The policy must contain both the project-access predicate and the client-visible predicate, while retaining the internal bypass:

```sql
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'project_tasks'
  and policyname = 'Project participants can view visible tasks';
```

Expected: one row whose `qual` includes `client_visible = true` and `private.can_view_internal(project_id)`.

### Notification read state and RPC grants

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications_outbox'
  and column_name = 'read_at';

select has_function_privilege(
  'anon',
  'public.mark_notifications_read(uuid[])',
  'execute'
) as anon_can_mark_read,
has_function_privilege(
  'authenticated',
  'public.mark_notifications_read(uuid[])',
  'execute'
) as authenticated_can_mark_read;
```

Expected: `read_at` exists, `anon_can_mark_read` is `false`, and `authenticated_can_mark_read` is `true`. The function itself must continue to require `auth.uid()` and scope updates by `user_id = auth.uid()`.

### Internal/configuration helper grants

```sql
select has_function_privilege(
  'anon',
  'private.project_notification_recipients(uuid, uuid, text)',
  'execute'
) as anon_can_call_recipients,
has_function_privilege(
  'authenticated',
  'private.project_notification_recipients(uuid, uuid, text)',
  'execute'
) as authenticated_can_call_recipients,
has_function_privilege(
  'anon',
  'private.shares_project_with(uuid)',
  'execute'
) as anon_can_call_share_helper,
has_function_privilege(
  'authenticated',
  'private.shares_project_with(uuid)',
  'execute'
) as authenticated_can_call_share_helper,
has_function_privilege(
  'anon',
  'public.pinned_admin_email()',
  'execute'
) as anon_can_call_admin_email,
has_function_privilege(
  'authenticated',
  'public.pinned_admin_email()',
  'execute'
) as authenticated_can_call_admin_email,
has_function_privilege(
  'anon',
  'public.rls_auto_enable()',
  'execute'
) as anon_can_call_rls_helper,
has_function_privilege(
  'authenticated',
  'public.rls_auto_enable()',
  'execute'
) as authenticated_can_call_rls_helper;
```

Expected: every returned value is `false`. `postgres` and `service_role` ownership or trusted execution is not changed by this containment slice.

### Payments foreign-table privileges

Run this only if the preflight confirmed that the relation exists:

```sql
select has_table_privilege('anon', 'public."Payments"', 'select') as anon_can_select,
has_table_privilege('anon', 'public."Payments"', 'insert') as anon_can_insert,
has_table_privilege('authenticated', 'public."Payments"', 'select') as authenticated_can_select,
has_table_privilege('authenticated', 'public."Payments"', 'insert') as authenticated_can_insert;
```

Expected: all returned values are `false`. Do not delete or alter the foreign table until the billing dependency is separately identified and approved.

## Rollback and incident handling

If verification fails before `commit`, issue `rollback;` and retain the session output. No production change should be considered applied.

After a successful commit, do not run an automatic down migration. First capture the post-apply catalog state and identify which objects or privileges were pre-existing. The safe rollback decision depends on the recorded preflight: the `read_at` column and indexes should remain unless the owner confirms they were created only by this migration and are unused; restoring `Payments` privileges requires explicit billing-owner approval and the minimum required privileges; and reverting the task policy would knowingly reintroduce the client-visible-task exposure. Any post-commit reversal must be a new reviewed SQL change with its own verification plan.

If the migration partially appears to have applied despite an error, stop all retries, preserve the database error and catalog outputs, and escalate for owner review. Never compensate by granting broad `public`, `anon`, or `authenticated` privileges.

## Evidence checklist

The rollout record should include the approved commit SHA, preflight migration ledger, function definitions, preflight grant/policy snapshots, execution timestamp and operator, complete SQL-editor result, post-apply verification results, and any rollback or incident notes. The branch is ready for review only; applying this runbook remains an owner-controlled production action.
