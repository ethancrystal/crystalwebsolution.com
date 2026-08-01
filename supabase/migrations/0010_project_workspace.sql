-- Phase 1: project workspace tables, bounded commands, and notification outbox.
-- Depends on 0009.

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_tasks_status_check check (
    status in ('todo', 'in_progress', 'review', 'done', 'blocked')
  ),
  constraint project_tasks_title_check check (char_length(btrim(title)) between 1 and 255),
  constraint project_tasks_description_check check (char_length(description) <= 10000)
);

create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'draft',
  visibility text not null default 'shared',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint project_deliverables_status_check check (
    status in ('draft', 'submitted', 'approved', 'rejected')
  ),
  constraint project_deliverables_visibility_check check (
    visibility in ('shared', 'internal')
  ),
  constraint project_deliverables_title_check check (char_length(btrim(title)) between 1 and 255),
  constraint project_deliverables_file_name_check check (char_length(btrim(file_name)) between 1 and 255),
  constraint project_deliverables_storage_path_check check (char_length(storage_path) between 1 and 1024),
  constraint project_deliverables_mime_type_check check (char_length(btrim(mime_type)) between 1 and 255),
  constraint project_deliverables_size_check check (size_bytes > 0 and size_bytes <= 52428800)
);

create table public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_id uuid references public.project_deliverables(id) on delete set null,
  status text not null default 'pending',
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_approvals_status_check check (
    status in ('pending', 'approved', 'rejected')
  ),
  constraint project_approvals_note_check check (note is null or char_length(note) <= 2000)
);

create table public.notifications_outbox (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_outbox_channel_check check (
    channel in ('email', 'in_app', 'realtime')
  ),
  constraint notifications_outbox_event_type_check check (char_length(btrim(event_type)) between 1 and 120),
  constraint notifications_outbox_payload_check check (jsonb_typeof(payload) = 'object')
);

-- 0009's audit_events_event_type_check only allowed the aggregate-lifecycle
-- event types it shipped with; extend it with the Phase 1 workspace events
-- these new commands log, or every insert below violates the constraint.
alter table public.audit_events
  drop constraint audit_events_event_type_check;
alter table public.audit_events
  add constraint audit_events_event_type_check check (
    event_type in (
      'project.created',
      'project.user_assigned',
      'project.assignment_removed',
      'project.status_transitioned',
      'project.attachment_reserved',
      'project.message_posted',
      'project.attachment_finalized',
      'project.task_created',
      'project.task_updated',
      'project.approval_requested',
      'project.approval_updated',
      'project.deliverable_published',
      'project.notification_enqueued'
    )
  );

create index project_tasks_project_idx on public.project_tasks(project_id);
create index project_tasks_assignee_idx on public.project_tasks(assignee_id);
create index project_tasks_project_status_idx on public.project_tasks(project_id, status);
create index project_approvals_project_idx on public.project_approvals(project_id);
create index project_approvals_deliverable_idx on public.project_approvals(deliverable_id);
create index project_deliverables_project_idx on public.project_deliverables(project_id);
create index project_deliverables_project_status_idx on public.project_deliverables(project_id, status);
create index notifications_outbox_project_created_idx on public.notifications_outbox(project_id, created_at desc);
create index notifications_outbox_user_created_idx on public.notifications_outbox(user_id, created_at desc);

alter table public.project_tasks enable row level security;
alter table public.project_tasks force row level security;
alter table public.project_approvals enable row level security;
alter table public.project_approvals force row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_deliverables force row level security;
alter table public.notifications_outbox enable row level security;
alter table public.notifications_outbox force row level security;

create policy "Project participants can view shared tasks"
on public.project_tasks
for select
to authenticated
using (private.can_access_project(project_id));

create policy "Assigned project participants can update shared tasks"
on public.project_tasks
for update
to authenticated
using (
  private.can_access_project(project_id)
  and assignee_id = (select auth.uid())
);

create policy "Project participants can view shared approvals"
on public.project_approvals
for select
to authenticated
using (private.can_access_project(project_id));

create policy "Project participants can view shared deliverables"
on public.project_deliverables
for select
to authenticated
using (
  visibility = 'shared'
  and private.can_access_project(project_id)
);

create policy "Internal project participants can view internal deliverables"
on public.project_deliverables
for select
to authenticated
using (
  visibility = 'internal'
  and private.can_view_internal(project_id)
);

create policy "Project participants can view own notifications"
on public.notifications_outbox
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.project_tasks from anon;
revoke all on table public.project_approvals from anon;
revoke all on table public.project_deliverables from anon;
revoke all on table public.notifications_outbox from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.project_tasks,
    public.project_approvals,
    public.project_deliverables,
    public.notifications_outbox
  from authenticated;

grant select
  on table public.project_tasks,
    public.project_approvals,
    public.project_deliverables,
    public.notifications_outbox
  to authenticated;

create or replace function public.create_project_task(
  p_project_id uuid,
  p_title text,
  p_description text default '',
  p_status text default 'todo',
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

  insert into public.project_tasks (
    project_id,
    title,
    description,
    status,
    assignee_id,
    created_by,
    due_date
  )
  values (
    p_project_id,
    btrim(p_title),
    btrim(coalesce(p_description, '')),
    p_status,
    p_assignee_id,
    v_user_id,
    p_due_date
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
    jsonb_build_object('task_id', v_task_id)
  );

  return v_task_id;
end
$function$;

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

create or replace function public.create_project_approval(
  p_project_id uuid,
  p_deliverable_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_approval_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Approval note must be at most 2000 characters.' using errcode = '22023';
  end if;

  if p_deliverable_id is not null
     and not exists (
       select 1
       from public.project_deliverables as deliverable
       where deliverable.id = p_deliverable_id
         and deliverable.project_id = p_project_id
     ) then
    raise exception 'Deliverable not found for project.' using errcode = 'P0002';
  end if;

  insert into public.project_approvals (
    project_id,
    deliverable_id,
    requested_by,
    note
  )
  values (
    p_project_id,
    p_deliverable_id,
    v_user_id,
    btrim(coalesce(p_note, ''))
  )
  returning id into v_approval_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    'project.approval_requested',
    jsonb_build_object('approval_id', v_approval_id, 'deliverable_id', p_deliverable_id)
  );

  return v_approval_id;
end
$function$;

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

  return p_approval_id;
end
$function$;

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

  return p_deliverable_id;
end
$function$;

create or replace function public.enqueue_project_notification(
  p_project_id uuid,
  p_channel text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_notification_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_channel is null or p_channel not in ('email', 'in_app', 'realtime') then
    raise exception 'Invalid notification channel.' using errcode = '22023';
  end if;

  if p_event_type is null or char_length(btrim(p_event_type)) not between 1 and 120 then
    raise exception 'Event type must be 1 to 120 characters.' using errcode = '22023';
  end if;

  if p_user_id is not null
     and not exists (
       select 1
       from public.profiles as profile
       where profile.id = p_user_id
     ) then
    raise exception 'Notification recipient not found.' using errcode = 'P0002';
  end if;

  insert into public.notifications_outbox (
    project_id,
    user_id,
    channel,
    event_type,
    payload
  )
  values (
    p_project_id,
    p_user_id,
    p_channel,
    btrim(p_event_type),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_notification_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    'project.notification_enqueued',
    jsonb_build_object('notification_id', v_notification_id, 'channel', p_channel)
  );

  return v_notification_id;
end
$function$;

revoke all on function public.create_project_task(uuid, text, text, text, uuid, date) from public;
revoke all on function public.create_project_task(uuid, text, text, text, uuid, date) from anon;
revoke all on function public.update_project_task(uuid, text, text, text, uuid, date) from public;
revoke all on function public.update_project_task(uuid, text, text, text, uuid, date) from anon;
revoke all on function public.create_project_approval(uuid, uuid, text) from public;
revoke all on function public.create_project_approval(uuid, uuid, text) from anon;
revoke all on function public.update_project_approval(uuid, text, text) from public;
revoke all on function public.update_project_approval(uuid, text, text) from anon;
revoke all on function public.publish_project_deliverable(uuid, text) from public;
revoke all on function public.publish_project_deliverable(uuid, text) from anon;
revoke all on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) from public;
revoke all on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) from anon;

grant execute on function public.create_project_task(uuid, text, text, text, uuid, date) to authenticated;
grant execute on function public.update_project_task(uuid, text, text, text, uuid, date) to authenticated;
grant execute on function public.create_project_approval(uuid, uuid, text) to authenticated;
grant execute on function public.update_project_approval(uuid, text, text) to authenticated;
grant execute on function public.publish_project_deliverable(uuid, text) to authenticated;
grant execute on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) to authenticated;
