-- Cherry-picked hardening from the competing origin/main implementation
-- (commit 5b90c3c "feat(crm): add secure project delivery aggregate (Task 3)",
-- file supabase/migrations/0009_project_workspace.sql). That file was never
-- applied to any database in this project's history: it defines
-- public.can_access_project() calling public.is_project_manager(), a
-- function 0008 never creates, so it would have failed on first invocation.
-- Its schema and table names (project_members, create_delivery_project, ...)
-- are superseded here by this branch's already-applied 0009_project_realtime_crm.sql
-- and 0010_project_workspace.sql (project_assignments, create_project, ...).
--
-- What follows are the parts of that file that were genuinely stronger and
-- are worth keeping, ported additively onto the schema that is actually live:
--   1. projects.budget_amount / projects.currency
--   2. project_tasks.priority / .client_visible / .completed_at
--   3. project_deliverables.version
--   4. notifications_outbox as a retryable queue (status/attempts/available_at/
--      last_error) instead of a fire-and-forget sent_at timestamp
--   5. Automatic notification fan-out to every other assigned project
--      participant on status transition, approval decision, and deliverable
--      publish -- ported from main's transition_project_status /
--      record_project_approval / publish_project_deliverable, adapted to this
--      branch's project_assignments table and channel/event_type columns.
--      This closes the gap recorded in STATUS.md: enqueue_project_notification
--      existed but nothing ever called it.
--
-- Deliberately NOT ported: priority/client_visible are not exposed as new
-- create_project_task/update_project_task parameters in this migration --
-- see STATUS.md. They exist with defaults but are not yet settable through
-- the RPC surface.

alter table public.projects
  add column if not exists budget_amount numeric(15, 2),
  add column if not exists currency text not null default 'USD';

alter table public.projects
  add constraint projects_budget_amount_check check (budget_amount is null or budget_amount >= 0),
  add constraint projects_currency_check check (char_length(btrim(currency)) between 0 and 8);

alter table public.project_tasks
  add column if not exists priority text not null default 'medium',
  add column if not exists client_visible boolean not null default false,
  add column if not exists completed_at timestamptz;

alter table public.project_tasks
  add constraint project_tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.project_deliverables
  add column if not exists version text not null default '1';

alter table public.project_deliverables
  add constraint project_deliverables_version_check check (char_length(btrim(version)) between 1 and 32);

alter table public.notifications_outbox
  add column if not exists status text not null default 'pending',
  add column if not exists attempts int not null default 0,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists last_error text;

alter table public.notifications_outbox
  add constraint notifications_outbox_status_check check (status in ('pending', 'sent', 'failed')),
  add constraint notifications_outbox_attempts_check check (attempts >= 0 and attempts <= 25);

-- update_project_task: track completed_at automatically off p_status, no new
-- parameters, so the RPC signature and its existing revoke/grant are untouched.
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

  if v_task.assignee_id <> v_user_id then
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

  v_task.assignee_id := p_assignee_id;
  v_task.due_date := p_due_date;
  v_task.updated_at := now();
  v_task.completed_at := case when v_task.status = 'done' then coalesce(v_task.completed_at, now()) else null end;

  update public.project_tasks
  set
    title = v_task.title,
    description = v_task.description,
    status = v_task.status,
    assignee_id = v_task.assignee_id,
    due_date = v_task.due_date,
    completed_at = v_task.completed_at,
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

-- transition_project_status: identical to the 0009 version, plus a fan-out
-- notification to every other assigned participant.
create or replace function public.transition_project_status(
  p_project_id uuid,
  p_to_status text,
  p_note text default null,
  p_visibility text default 'shared'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_history_id uuid;
  v_allowed boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(p_project_id) then
    raise exception 'Project assignment required.' using errcode = '42501';
  end if;

  if p_visibility is null or p_visibility not in ('shared', 'internal') then
    raise exception 'Invalid visibility.' using errcode = '22023';
  end if;

  if p_note is not null and pg_catalog.char_length(p_note) > 2000 then
    raise exception 'Status note must be at most 2000 characters.' using errcode = '22023';
  end if;

  v_allowed := case v_project.status
    when 'brief_submitted' then p_to_status = any (array['planned', 'cancelled']::text[])
    when 'planned' then p_to_status = any (array['in_progress', 'on_hold', 'cancelled']::text[])
    when 'in_progress' then p_to_status = any (array['client_review', 'on_hold', 'cancelled']::text[])
    when 'client_review' then p_to_status = any (array['changes_requested', 'approved', 'on_hold', 'cancelled']::text[])
    when 'changes_requested' then p_to_status = any (array['in_progress', 'on_hold', 'cancelled']::text[])
    when 'approved' then p_to_status = any (array['delivered', 'on_hold', 'cancelled']::text[])
    when 'on_hold' then p_to_status = any (array['planned', 'in_progress', 'cancelled']::text[])
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid project status transition.' using errcode = '22023';
  end if;

  update public.projects
  set status = p_to_status,
      updated_at = pg_catalog.now()
  where id = p_project_id;

  insert into public.project_status_history (
    project_id,
    from_status,
    to_status,
    note,
    visibility,
    changed_by
  )
  values (
    p_project_id,
    v_project.status,
    p_to_status,
    p_note,
    p_visibility,
    v_user_id
  )
  returning id into v_history_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    company_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    v_project.company_id,
    'project.status_transitioned',
    pg_catalog.jsonb_build_object(
      'history_id', v_history_id,
      'from_status', v_project.status,
      'to_status', p_to_status,
      'visibility', p_visibility
    )
  );

  insert into public.notifications_outbox (
    project_id,
    user_id,
    channel,
    event_type,
    payload
  )
  select
    p_project_id,
    assignment.user_id,
    'in_app',
    'project.status_transitioned',
    pg_catalog.jsonb_build_object('from_status', v_project.status, 'to_status', p_to_status)
  from public.project_assignments as assignment
  where assignment.project_id = p_project_id
    and assignment.user_id <> v_user_id;

  return v_history_id;
end
$function$;

-- update_project_approval: identical to the 0010 version, plus fan-out.
create or replace function public.update_project_approval(
  p_approval_id uuid,
  p_status text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_approval public.project_approvals%rowtype;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Approval status must be approved or rejected.' using errcode = '22023';
  end if;

  select * into v_approval
  from public.project_approvals as approval
  where approval.id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(v_approval.project_id) then
    raise exception 'Project assignment required.' using errcode = '42501';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'Approval is no longer pending.' using errcode = '22023';
  end if;

  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Approval note must be at most 2000 characters.' using errcode = '22023';
  end if;

  select project_id into v_project_id
  from public.project_approvals
  where id = p_approval_id;

  update public.project_approvals
  set
    status = p_status,
    reviewed_by = v_user_id,
    note = btrim(coalesce(p_note, '')),
    updated_at = now()
  where id = p_approval_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_project_id,
    'project.approval_updated',
    jsonb_build_object('approval_id', p_approval_id, 'status', p_status)
  );

  insert into public.notifications_outbox (
    project_id,
    user_id,
    channel,
    event_type,
    payload
  )
  select
    v_project_id,
    assignment.user_id,
    'in_app',
    'project.approval_updated',
    jsonb_build_object('approval_id', p_approval_id, 'status', p_status)
  from public.project_assignments as assignment
  where assignment.project_id = v_project_id
    and assignment.user_id <> v_user_id;

  return p_approval_id;
end
$function$;

-- publish_project_deliverable: identical to the 0010 version, plus fan-out.
create or replace function public.publish_project_deliverable(
  p_deliverable_id uuid,
  p_status text default 'submitted'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_deliverable public.project_deliverables%rowtype;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('submitted', 'approved', 'rejected') then
    raise exception 'Invalid deliverable status.' using errcode = '22023';
  end if;

  select * into v_deliverable
  from public.project_deliverables as deliverable
  where deliverable.id = p_deliverable_id
  for update;

  if not found then
    raise exception 'Deliverable not found.' using errcode = 'P0002';
  end if;

  if v_deliverable.created_by <> v_user_id then
    raise exception 'Only the deliverable owner may publish it.' using errcode = '42501';
  end if;

  if not private.can_access_project(v_deliverable.project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  select project_id into v_project_id
  from public.project_deliverables
  where id = p_deliverable_id;

  update public.project_deliverables
  set status = p_status
  where id = p_deliverable_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_project_id,
    'project.deliverable_published',
    jsonb_build_object('deliverable_id', p_deliverable_id, 'status', p_status)
  );

  insert into public.notifications_outbox (
    project_id,
    user_id,
    channel,
    event_type,
    payload
  )
  select
    v_project_id,
    assignment.user_id,
    'in_app',
    'project.deliverable_published',
    jsonb_build_object('deliverable_id', p_deliverable_id, 'status', p_status)
  from public.project_assignments as assignment
  where assignment.project_id = v_project_id
    and assignment.user_id <> v_user_id;

  return p_deliverable_id;
end
$function$;
