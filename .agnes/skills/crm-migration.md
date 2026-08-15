# CRM Migration Skill

Use this skill to create safe, reversible Supabase migrations for the CRM.

## When to Use
- Adding new tables or columns
- Modifying RPC function signatures
- Changing RLS policies
- Backfilling data
- Fixing schema drift

## Migration Template

```sql
-- MIGRATION_NAME.sql
--
-- Description: What this migration does and why
--
-- Affected tables: table1, table2
-- Rollback: DROP TABLE / REVERT changes
-- Verified: Yes/No

begin;

-- Your migration SQL here

commit;
```

## Rules

1. **Always use transactions** — `begin; commit;`
2. **Set search_path** — In SECURITY DEFINER functions:
   ```sql
   set search_path to 'pg_catalog', 'public', 'private', 'storage';
   ```
3. **Revoke public execution** — After creating functions:
   ```sql
   revoke all on function ... from public;
   revoke all on function ... from anon;
   grant execute on function ... to authenticated;
   ```
4. **Include rollback instructions** — Document how to reverse changes
5. **Test locally first** — Run `pnpm test:db` before applying live
6. **Never modify applied migrations** — Create new migration files

## Migration Numbering

- Check live migrations: `supabase migration list`
- Create next number: `0024_`, `0025_`, etc.
- Document gaps in STATUS.md

## Common Patterns

### Add Column with Default
```sql
alter table project_tasks
add column priority text not null default 'medium';
```

### Add Function with Drop First
```sql
-- Must drop by exact signature to avoid overload ambiguity
drop function if exists public.create_project_task(uuid, text, text, text, uuid, date);

create function public.create_project_task(
  p_project_id uuid,
  p_title text,
  p_description text default '',
  p_status text default 'todo',
  p_assignee_id uuid default null,
  p_due_date date default null,
  p_priority text default 'medium',
  p_client_visible boolean default false
) returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
-- function body
$function$;

grant execute on function ... to authenticated;
revoke all on function ... from anon;
```

### Backfill Data
```sql
-- Backfill existing rows before changing default
update project_tasks
set client_visible = true
where client_visible = false;

-- Then change default for new rows
alter table project_tasks
alter column client_visible set default true;
```

### Add RLS Policy
```sql
create policy "Assigned employees can view tasks"
on project_tasks for select
to authenticated
using (
  exists (
    select 1 from project_assignments
    where project_assignments.project_id = project_tasks.project_id
    and project_assignments.user_id = auth.uid()
  )
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
```

## Commands

```bash
# Initialize Supabase locally
pnpm exec supabase init

# Test migration locally
pnpm test:db

# Apply to live project
# Use Supabase MCP apply_migration tool
```

## Verification Checklist

After creating migration:
- [ ] `pnpm test:crm` passes
- [ ] `pnpm test:db` passes (if local DB available)
- [ ] `pnpm build` passes
- [ ] Migration file includes rollback instructions
- [ ] Function signatures verified with `pg_get_function_arguments`
- [ ] RLS policies verified with `pg_policies`

## Common Mistakes to Avoid

1. **Forgetting to drop function before recreate** — Creates ambiguous overload
2. **Using `pg_catalog.coalesce()`** — Should be just `coalesce()`
3. **Missing audit event insertion** — All mutations must log to audit_events
4. **Not revoking public execution** — Security regression
5. **Hardcoding UUIDs** — Use `gen_random_uuid()`
