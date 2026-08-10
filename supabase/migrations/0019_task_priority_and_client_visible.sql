-- 0019_task_priority_and_client_visible.sql
--
-- Exposes project_tasks.priority and .client_visible (both existed since
-- migration 0011, neither ever settable via any RPC or UI). Two decisions
-- recorded in docs/superpowers/specs/2026-08-09-crm-remaining-decisions-design.md:
--
-- 1. create_project_task's live signature already defaults 4 of its 6
--    params. Postgres identifies a function by its full parameter *type*
--    list, not by name or defaults -- appending two new trailing params
--    via a plain `create or replace` would create a second, distinct
--    8-arg overload alongside the existing 6-arg one, not replace it.
--    Drop the exact live signature first.
--
-- 2. client_visible defaults to false at the column level, but nothing
--    has ever filtered on it, so today's actual behaviour is "every
--    client sees every task". Flipping on a filter without backfilling
--    existing rows would make every task created before this migration
--    vanish from every client's view. Backfill first; the column default
--    for *new* rows stays false (unchanged), matching the schema's
--    original intent that a task is staff-only until a PM opts it in.

begin;

update public.project_tasks
set client_visible = true
where client_visible = false;

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
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_task_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 255 then
    raise exception 'Task title must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_description is null or char_length(p_description) > 10000 then
    raise exception 'Task description must be at most 10000 characters.' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('todo', 'in_progress', 'review', 'done', 'blocked') then
    raise exception 'Invalid task status.' using errcode = '22023';
  end if;

  if p_priority is null or p_priority not in ('low', 'medium', 'high') then
    raise exception 'Invalid task priority.' using errcode = '22023';
  end if;

  insert into public.project_tasks (
    project_id,
    title,
    description,
    status,
    assignee_id,
    created_by,
    due_date,
    priority,
    client_visible
  )
  values (
    p_project_id,
    btrim(p_title),
    btrim(coalesce(p_description, '')),
    p_status,
    p_assignee_id,
    v_user_id,
    p_due_date,
    p_priority,
    p_client_visible
  )
  returning id into v_task_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    'project.task_created',
    jsonb_build_object('task_id', v_task_id, 'priority', p_priority, 'client_visible', p_client_visible)
  );

  return v_task_id;
end
$function$;

grant execute on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) to authenticated;
revoke all on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) from anon;

commit;
