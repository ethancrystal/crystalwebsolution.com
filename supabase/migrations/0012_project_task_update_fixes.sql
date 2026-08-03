-- Additive fix migration: correct update_project_task() authorization and
-- partial-update semantics without editing the already-applied 0010.
--
-- 1. When a task is UNASSIGNED (assignee_id is null), allow any project
--    participant to update it (claim/act), instead of raising because
--    (null <> v_user_id) evaluates to null/false.
-- 2. Only overwrite assignee_id / due_date when the caller actually passes
--    a value; a partial update that changes only status no longer silently
--    clears the assignee and due date.

create or replace function public.update_project_task(
  p_task_id uuid,
  p_title text default null,
  p_description text default null,
  p_status text default null,
  p_assignee_id uuid default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_project_id uuid;
  v_task public.project_tasks%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_task
  from public.project_tasks as task
  where task.id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found.' using errcode = 'P0002';
  end if;

  if not private.can_access_project(v_task.project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  -- Unassigned tasks can be updated by any project participant.
  if v_task.assignee_id is not null and v_task.assignee_id <> v_user_id then
    raise exception 'Only the assignee may update this task.' using errcode = '42501';
  end if;

  select project_id into v_project_id
  from public.project_tasks
  where id = p_task_id;

  if p_title is not null then
    if char_length(btrim(p_title)) not between 1 and 255 then
      raise exception 'Task title must be 1 to 255 characters.' using errcode = '22023';
    end if;
    v_task.title := btrim(p_title);
  end if;

  if p_description is not null then
    if char_length(p_description) > 10000 then
      raise exception 'Task description must be at most 10000 characters.' using errcode = '22023';
    end if;
    v_task.description := btrim(p_description);
  end if;

  if p_status is not null then
    if p_status not in ('todo', 'in_progress', 'review', 'done', 'blocked') then
      raise exception 'Invalid task status.' using errcode = '22023';
    end if;
    v_task.status := p_status;
  end if;

  -- Only overwrite when a value is explicitly provided.
  if p_assignee_id is not null then
    v_task.assignee_id := p_assignee_id;
  end if;
  if p_due_date is not null then
    v_task.due_date := p_due_date;
  end if;
  v_task.updated_at := now();

  update public.project_tasks
  set
    title = v_task.title,
    description = v_task.description,
    status = v_task.status,
    assignee_id = v_task.assignee_id,
    due_date = v_task.due_date,
    updated_at = v_task.updated_at
  where id = p_task_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_project_id,
    'project.task_updated',
    jsonb_build_object('task_id', p_task_id)
  );

  return p_task_id;
end
$function$;

grant execute on function public.update_project_task(uuid, text, text, text, uuid, date) to authenticated;
