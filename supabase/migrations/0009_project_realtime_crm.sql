-- UUID project aggregate, command boundary, and private collaboration channels.
-- This migration converges the legacy deal-based delivery schema after 0008.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Never silently discard collaboration rows created through the legacy channel.
do $guard$
begin
  if exists (select 1 from public.project_messages limit 1)
     or exists (select 1 from public.project_files limit 1) then
    raise exception '0009 requires an explicit legacy project message/file data migration';
  end if;
end
$guard$;

drop policy if exists "Deal participants can view messages" on public.project_messages;
drop policy if exists "Deal participants can send messages" on public.project_messages;
drop policy if exists "Staff can delete messages" on public.project_messages;
drop policy if exists "Admin can delete messages" on public.project_messages;
drop policy if exists "Deal participants can view files" on public.project_files;
drop policy if exists "Deal participants can upload files" on public.project_files;
drop policy if exists "Staff can delete files" on public.project_files;
drop policy if exists "Admin can delete files" on public.project_files;

revoke all on table public.project_messages from public, anon, authenticated;
revoke all on table public.project_files from public, anon, authenticated;

alter table public.project_messages rename to legacy_project_messages;
alter table public.project_files rename to legacy_project_files;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  source_deal_id uuid unique references public.deals(id),
  category text not null,
  title text not null,
  brief text not null,
  status text not null default 'brief_submitted',
  target_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_category_check check (
    category in ('web_design', 'logo_creation', 'branding', 'marketing', 'ai_automation')
  ),
  constraint projects_title_check check (char_length(btrim(title)) between 3 and 120),
  constraint projects_brief_check check (char_length(btrim(brief)) between 1 and 10000),
  constraint projects_status_check check (
    status in (
      'brief_submitted',
      'planned',
      'in_progress',
      'client_review',
      'changes_requested',
      'approved',
      'delivered',
      'on_hold',
      'cancelled'
    )
  )
);

create table public.project_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table public.project_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.project_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  visibility text not null default 'shared',
  body text not null,
  client_generated_id uuid not null,
  created_at timestamptz not null default now(),
  unique(sender_id, client_generated_id),
  constraint project_messages_visibility_check check (
    visibility in ('shared', 'internal')
  ),
  constraint project_messages_body_check check (
    char_length(btrim(body)) between 1 and 10000
  )
);

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message_id uuid references public.project_messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  visibility text not null default 'shared',
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint project_attachments_visibility_check check (
    visibility in ('shared', 'internal')
  ),
  constraint project_attachments_file_name_check check (
    char_length(btrim(file_name)) between 1 and 255
  ),
  constraint project_attachments_storage_path_check check (
    char_length(storage_path) between 1 and 1024
  ),
  constraint project_attachments_mime_type_check check (
    char_length(btrim(mime_type)) between 1 and 255
  ),
  constraint project_attachments_size_check check (
    size_bytes > 0 and size_bytes <= 52428800
  ),
  constraint project_attachments_status_check check (
    status in ('pending', 'ready')
  )
);

create table public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  visibility text not null default 'shared',
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint project_status_history_from_status_check check (
    from_status is null
    or from_status in (
      'brief_submitted',
      'planned',
      'in_progress',
      'client_review',
      'changes_requested',
      'approved',
      'delivered',
      'on_hold',
      'cancelled'
    )
  ),
  constraint project_status_history_to_status_check check (
    to_status in (
      'brief_submitted',
      'planned',
      'in_progress',
      'client_review',
      'changes_requested',
      'approved',
      'delivered',
      'on_hold',
      'cancelled'
    )
  ),
  constraint project_status_history_note_check check (
    note is null or char_length(note) <= 2000
  ),
  constraint project_status_history_visibility_check check (
    visibility in ('shared', 'internal')
  )
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_check check (
    event_type in (
      'project.created',
      'project.user_assigned',
      'project.assignment_removed',
      'project.status_transitioned',
      'project.attachment_reserved',
      'project.message_posted',
      'project.attachment_finalized'
    )
  ),
  constraint audit_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index projects_company_created_idx
  on public.projects(company_id, created_at desc);
create index projects_status_created_idx
  on public.projects(status, created_at desc);
create index projects_source_deal_idx
  on public.projects(source_deal_id) where source_deal_id is not null;
create index projects_created_by_idx
  on public.projects(created_by);
create index project_assignments_user_project_idx
  on public.project_assignments(user_id, project_id);
create index project_assignments_project_idx
  on public.project_assignments(project_id);
create index project_assignments_assigned_by_idx
  on public.project_assignments(assigned_by);
create index project_messages_thread_created_idx
  on public.project_messages(thread_id, created_at, id);
create index project_messages_sender_idx
  on public.project_messages(sender_id);
create index project_attachments_project_status_idx
  on public.project_attachments(project_id, status);
create index project_attachments_message_idx
  on public.project_attachments(message_id) where message_id is not null;
create index project_attachments_uploaded_by_idx
  on public.project_attachments(uploaded_by);
create index project_status_history_project_created_idx
  on public.project_status_history(project_id, created_at, id);
create index project_status_history_changed_by_idx
  on public.project_status_history(changed_by);
create index audit_events_project_created_idx
  on public.audit_events(project_id, created_at desc);
create index audit_events_company_idx
  on public.audit_events(company_id);
create index audit_events_actor_idx
  on public.audit_events(actor_id);

alter table public.projects enable row level security;
alter table public.projects force row level security;
alter table public.project_threads enable row level security;
alter table public.project_threads force row level security;
alter table public.project_assignments enable row level security;
alter table public.project_assignments force row level security;
alter table public.project_messages enable row level security;
alter table public.project_messages force row level security;
alter table public.project_attachments enable row level security;
alter table public.project_attachments force row level security;
alter table public.project_status_history enable row level security;
alter table public.project_status_history force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create or replace function private.current_profile_role()
returns text
language sql
security definer
stable
set search_path = pg_catalog, public, private, storage
as $function$
  select profile.role::text
  from public.profiles as profile
  where profile.id = (select auth.uid())
$function$;

create or replace function private.can_access_project(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public, private, storage
as $function$
  select case private.current_profile_role()
    when 'admin' then true
    when 'client' then exists (
      select 1
      from public.projects as project
      join public.profiles as profile
        on profile.id = (select auth.uid())
       and profile.company_id = project.company_id
      where project.id = p_project_id
    )
    when 'project_manager' then exists (
      select 1
      from public.project_assignments as assignment
      where assignment.project_id = p_project_id
        and assignment.user_id = (select auth.uid())
    )
    else false
  end
$function$;

create or replace function private.can_view_internal(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public, private, storage
as $function$
  select private.current_profile_role() = 'admin'
    or (
      private.current_profile_role() = 'project_manager'
      and exists (
        select 1
        from public.project_assignments as assignment
        where assignment.project_id = p_project_id
          and assignment.user_id = (select auth.uid())
      )
    )
$function$;

create or replace function private.can_subscribe_project_topic(p_topic text)
returns boolean
language plpgsql
security definer
stable
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_project_id uuid;
  v_visibility text;
begin
  if (select auth.uid()) is null
     or p_topic is null
     or p_topic !~ '^project:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(shared|internal)$' then
    return false;
  end if;

  v_project_id := pg_catalog.split_part(p_topic, ':', 2)::uuid;
  v_visibility := pg_catalog.split_part(p_topic, ':', 3);

  return private.can_access_project(v_project_id)
    and (v_visibility = 'shared' or private.can_view_internal(v_project_id));
end
$function$;

revoke all on function private.current_profile_role() from public, anon;
revoke all on function private.can_access_project(uuid) from public, anon;
revoke all on function private.can_view_internal(uuid) from public, anon;
revoke all on function private.can_subscribe_project_topic(text) from public, anon;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;
grant execute on function private.can_view_internal(uuid) to authenticated;
grant execute on function private.can_subscribe_project_topic(text) to authenticated;

create policy "Project participants can view projects"
on public.projects
for select
to authenticated
using (private.can_access_project(id));

create policy "Project participants can view threads"
on public.project_threads
for select
to authenticated
using (private.can_access_project(project_id));

create policy "Internal project participants can view assignments"
on public.project_assignments
for select
to authenticated
using (private.can_view_internal(project_id));

create policy "Project participants can view shared messages"
on public.project_messages
for select
to authenticated
using (
  visibility = 'shared'
  and exists (
    select 1
    from public.project_threads as thread
    where thread.id = project_messages.thread_id
      and private.can_access_project(thread.project_id)
  )
);

create policy "Internal project participants can view internal messages"
on public.project_messages
for select
to authenticated
using (
  visibility = 'internal'
  and exists (
    select 1
    from public.project_threads as thread
    where thread.id = project_messages.thread_id
      and private.can_view_internal(thread.project_id)
  )
);

create policy "Project participants can view shared attachments"
on public.project_attachments
for select
to authenticated
using (
  visibility = 'shared'
  and private.can_access_project(project_id)
);

create policy "Internal project participants can view internal attachments"
on public.project_attachments
for select
to authenticated
using (
  visibility = 'internal'
  and private.can_view_internal(project_id)
);

create policy "Project participants can view shared status history"
on public.project_status_history
for select
to authenticated
using (
  visibility = 'shared'
  and private.can_access_project(project_id)
);

create policy "Internal project participants can view internal status history"
on public.project_status_history
for select
to authenticated
using (
  visibility = 'internal'
  and private.can_view_internal(project_id)
);

create policy "Admins can view project audit events"
on public.audit_events
for select
to authenticated
using (private.current_profile_role() = 'admin');

revoke all on table public.projects from anon;
revoke all on table public.project_threads from anon;
revoke all on table public.project_assignments from anon;
revoke all on table public.project_messages from anon;
revoke all on table public.project_attachments from anon;
revoke all on table public.project_status_history from anon;
revoke all on table public.audit_events from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.projects,
    public.project_threads,
    public.project_assignments,
    public.project_messages,
    public.project_attachments,
    public.project_status_history,
    public.audit_events
  from authenticated;

grant select
  on table public.projects,
    public.project_threads,
    public.project_assignments,
    public.project_messages,
    public.project_attachments,
    public.project_status_history,
    public.audit_events
  to authenticated;

create or replace function public.create_project(
  p_company_id uuid,
  p_category text,
  p_title text,
  p_brief text,
  p_target_date date default null,
  p_source_deal_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_profile_company_id uuid;
  v_project_id uuid;
  v_title text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profile.role::text, profile.company_id
  into v_role, v_profile_company_id
  from public.profiles as profile
  where profile.id = v_user_id;

  if v_role is null
     or not (
       v_role = 'admin'
       or (v_role = 'client' and v_profile_company_id = p_company_id)
     ) then
    raise exception 'Project creation is not allowed.' using errcode = '42501';
  end if;

  if p_category is null
     or p_category not in ('web_design', 'logo_creation', 'branding', 'marketing', 'ai_automation') then
    raise exception 'Invalid project category.' using errcode = '22023';
  end if;

  v_title := pg_catalog.regexp_replace(pg_catalog.btrim(p_title), '\s+', ' ', 'g');
  if p_title is null or pg_catalog.char_length(v_title) not between 3 and 120 then
    raise exception 'Project title must be 3 to 120 characters.' using errcode = '22023';
  end if;

  if p_brief is null
     or pg_catalog.char_length(pg_catalog.btrim(p_brief)) not between 1 and 10000 then
    raise exception 'Project brief must be 1 to 10000 characters.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.companies as company where company.id = p_company_id
  ) then
    raise exception 'Company not found.' using errcode = 'P0002';
  end if;

  if p_source_deal_id is not null
     and not exists (
       select 1
       from public.deals as deal
       where deal.id = p_source_deal_id
         and deal.company_id = p_company_id
     ) then
    raise exception 'Source deal does not belong to the project company.' using errcode = '23503';
  end if;

  insert into public.projects (
    company_id,
    source_deal_id,
    category,
    title,
    brief,
    target_date,
    created_by
  )
  values (
    p_company_id,
    p_source_deal_id,
    p_category,
    v_title,
    pg_catalog.btrim(p_brief),
    p_target_date,
    v_user_id
  )
  returning id into v_project_id;

  insert into public.project_threads (project_id)
  values (v_project_id);

  insert into public.project_status_history (
    project_id,
    from_status,
    to_status,
    visibility,
    changed_by
  )
  values (
    v_project_id,
    null,
    'brief_submitted',
    'shared',
    v_user_id
  );

  insert into public.audit_events (
    actor_id,
    project_id,
    company_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_project_id,
    p_company_id,
    'project.created',
    pg_catalog.jsonb_build_object(
      'category', p_category,
      'source_deal_id', p_source_deal_id
    )
  );

  return v_project_id;
end
$function$;

create or replace function public.assign_project_user(
  p_project_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_assignment_id uuid;
begin
  if v_user_id is null or private.current_profile_role() <> 'admin' then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select project.company_id
  into v_company_id
  from public.projects as project
  where project.id = p_project_id;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
      and profile.role::text in ('project_manager', 'admin')
  ) then
    raise exception 'Only a project manager or admin may be assigned.' using errcode = '22023';
  end if;

  insert into public.project_assignments (
    project_id,
    user_id,
    assigned_by
  )
  values (
    p_project_id,
    p_user_id,
    v_user_id
  )
  on conflict (project_id, user_id) do update
    set assigned_by = excluded.assigned_by
  returning id into v_assignment_id;

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
    v_company_id,
    'project.user_assigned',
    pg_catalog.jsonb_build_object(
      'assignment_id', v_assignment_id,
      'assigned_user_id', p_user_id
    )
  );

  return v_assignment_id;
end
$function$;

create or replace function public.remove_project_assignment(
  p_project_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_assignment_id uuid;
begin
  if v_user_id is null or private.current_profile_role() <> 'admin' then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select project.company_id
  into v_company_id
  from public.projects as project
  where project.id = p_project_id;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  delete from public.project_assignments as assignment
  where assignment.project_id = p_project_id
    and assignment.user_id = p_user_id
  returning assignment.id into v_assignment_id;

  if not found then
    raise exception 'Project assignment not found.' using errcode = 'P0002';
  end if;

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
    v_company_id,
    'project.assignment_removed',
    pg_catalog.jsonb_build_object(
      'assignment_id', v_assignment_id,
      'removed_user_id', p_user_id
    )
  );

  return v_assignment_id;
end
$function$;

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

  return v_history_id;
end
$function$;

create or replace function public.reserve_project_attachment(
  p_project_id uuid,
  p_visibility text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.project_attachments
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_attachment_id uuid := gen_random_uuid();
  v_safe_filename text;
  v_attachment public.project_attachments%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_visibility is null
     or p_visibility not in ('shared', 'internal')
     or (p_visibility = 'internal' and not private.can_view_internal(p_project_id)) then
    raise exception 'Invalid visibility.' using errcode = '42501';
  end if;

  if p_file_name is null
     or pg_catalog.char_length(pg_catalog.btrim(p_file_name)) not between 1 and 255 then
    raise exception 'File name must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_mime_type is null
     or pg_catalog.char_length(pg_catalog.btrim(p_mime_type)) not between 1 and 255 then
    raise exception 'MIME type must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 52428800 then
    raise exception 'File size must be between 1 byte and 50 MiB.' using errcode = '22023';
  end if;

  v_safe_filename := pg_catalog.regexp_replace(
    pg_catalog.btrim(p_file_name),
    '[^A-Za-z0-9._-]+',
    '_',
    'g'
  );
  v_safe_filename := pg_catalog.regexp_replace(v_safe_filename, '^[.]+', '', 'g');
  if v_safe_filename = '' then
    v_safe_filename := 'file';
  end if;

  select project.company_id
  into v_company_id
  from public.projects as project
  where project.id = p_project_id;

  insert into public.project_attachments (
    id,
    project_id,
    uploaded_by,
    visibility,
    file_name,
    storage_path,
    mime_type,
    size_bytes,
    status
  )
  values (
    v_attachment_id,
    p_project_id,
    v_user_id,
    p_visibility,
    pg_catalog.btrim(p_file_name),
    p_project_id::text || '/' || v_attachment_id::text || '/' || v_safe_filename,
    pg_catalog.btrim(p_mime_type),
    p_size_bytes,
    'pending'
  )
  returning * into v_attachment;

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
    v_company_id,
    'project.attachment_reserved',
    pg_catalog.jsonb_build_object(
      'attachment_id', v_attachment_id,
      'visibility', p_visibility,
      'size_bytes', p_size_bytes
    )
  );

  return v_attachment;
end
$function$;

create or replace function public.post_project_message(
  p_project_id uuid,
  p_body text,
  p_visibility text,
  p_client_generated_id uuid,
  p_attachment_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_thread_id uuid;
  v_message_id uuid;
  v_attachment_ids uuid[] := pg_catalog.coalesce(p_attachment_ids, '{}'::uuid[]);
  v_attachment_count bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_visibility is null
     or p_visibility not in ('shared', 'internal')
     or (p_visibility = 'internal' and not private.can_view_internal(p_project_id)) then
    raise exception 'Invalid visibility.' using errcode = '42501';
  end if;

  if p_body is null
     or pg_catalog.char_length(pg_catalog.btrim(p_body)) not between 1 and 10000 then
    raise exception 'Message body must be 1 to 10000 characters.' using errcode = '22023';
  end if;

  if p_client_generated_id is null then
    raise exception 'Client-generated message id is required.' using errcode = '22023';
  end if;

  if pg_catalog.cardinality(v_attachment_ids) <> (
    select count(distinct attachment_id)
    from pg_catalog.unnest(v_attachment_ids) as attachment_id
  ) then
    raise exception 'Attachment ids must be unique.' using errcode = '22023';
  end if;

  select project.company_id, thread.id
  into v_company_id, v_thread_id
  from public.projects as project
  join public.project_threads as thread on thread.project_id = project.id
  where project.id = p_project_id;

  if not found then
    raise exception 'Project thread not found.' using errcode = 'P0002';
  end if;

  if pg_catalog.cardinality(v_attachment_ids) > 0 then
    perform 1
    from public.project_attachments as attachment
    where attachment.id = any (v_attachment_ids)
    order by attachment.id
    for update;

    select count(*)
    into v_attachment_count
    from public.project_attachments as attachment
    where attachment.id = any (v_attachment_ids)
      and attachment.status = 'ready'
      and attachment.uploaded_by = v_user_id
      and attachment.project_id = p_project_id
      and attachment.message_id is null
      and attachment.visibility = p_visibility;

    if v_attachment_count <> pg_catalog.cardinality(v_attachment_ids) then
      raise exception 'Attachments must be ready reservations owned by the caller for this project and visibility.'
        using errcode = '42501';
    end if;
  end if;

  insert into public.project_messages (
    thread_id,
    sender_id,
    visibility,
    body,
    client_generated_id
  )
  values (
    v_thread_id,
    v_user_id,
    p_visibility,
    pg_catalog.btrim(p_body),
    p_client_generated_id
  )
  returning id into v_message_id;

  if pg_catalog.cardinality(v_attachment_ids) > 0 then
    update public.project_attachments
    set message_id = v_message_id
    where id = any (v_attachment_ids);
  end if;

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
    v_company_id,
    'project.message_posted',
    pg_catalog.jsonb_build_object(
      'message_id', v_message_id,
      'visibility', p_visibility,
      'attachment_ids', pg_catalog.to_jsonb(v_attachment_ids)
    )
  );

  return v_message_id;
end
$function$;

create or replace function public.finalize_project_attachment(
  p_attachment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_attachment public.project_attachments%rowtype;
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_attachment
  from public.project_attachments
  where id = p_attachment_id
  for update;

  if not found then
    raise exception 'Attachment reservation not found.' using errcode = 'P0002';
  end if;

  if v_attachment.uploaded_by <> v_user_id
     or v_attachment.status <> 'pending'
     or not private.can_access_project(v_attachment.project_id) then
    raise exception 'Only the reservation owner may finalize a pending attachment.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'project-files'
      and object.name = v_attachment.storage_path
      and object.owner_id = v_user_id::text
  ) then
    raise exception 'Reserved Storage object not found.' using errcode = 'P0002';
  end if;

  update public.project_attachments
  set status = 'ready'
  where id = p_attachment_id;

  select project.company_id
  into v_company_id
  from public.projects as project
  where project.id = v_attachment.project_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    company_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_attachment.project_id,
    v_company_id,
    'project.attachment_finalized',
    pg_catalog.jsonb_build_object('attachment_id', p_attachment_id)
  );

  return p_attachment_id;
end
$function$;

revoke all on function public.create_project(uuid, text, text, text, date, uuid) from public;
revoke all on function public.create_project(uuid, text, text, text, date, uuid) from anon;
revoke all on function public.assign_project_user(uuid, uuid) from public;
revoke all on function public.assign_project_user(uuid, uuid) from anon;
revoke all on function public.remove_project_assignment(uuid, uuid) from public;
revoke all on function public.remove_project_assignment(uuid, uuid) from anon;
revoke all on function public.transition_project_status(uuid, text, text, text) from public;
revoke all on function public.transition_project_status(uuid, text, text, text) from anon;
revoke all on function public.reserve_project_attachment(uuid, text, text, text, bigint) from public;
revoke all on function public.reserve_project_attachment(uuid, text, text, text, bigint) from anon;
revoke all on function public.post_project_message(uuid, text, text, uuid, uuid[]) from public;
revoke all on function public.post_project_message(uuid, text, text, uuid, uuid[]) from anon;
revoke all on function public.finalize_project_attachment(uuid) from public;
revoke all on function public.finalize_project_attachment(uuid) from anon;

grant execute on function public.create_project(uuid, text, text, text, date, uuid) to authenticated;
grant execute on function public.assign_project_user(uuid, uuid) to authenticated;
grant execute on function public.remove_project_assignment(uuid, uuid) to authenticated;
grant execute on function public.transition_project_status(uuid, text, text, text) to authenticated;
grant execute on function public.reserve_project_attachment(uuid, text, text, text, bigint) to authenticated;
grant execute on function public.post_project_message(uuid, text, text, uuid, uuid[]) to authenticated;
grant execute on function public.finalize_project_attachment(uuid) to authenticated;

-- Replace the deal-based Storage policies with reservation-backed paths:
-- {project_id}/{attachment_id}/{safe_filename}.
drop policy if exists "Deal participants can read project files" on storage.objects;
drop policy if exists "Deal participants can upload project files" on storage.objects;
drop policy if exists "Staff can delete project files from storage" on storage.objects;
drop policy if exists "Admin can delete project files from storage" on storage.objects;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update
set public = false;

create policy "Project participants can read ready reserved files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and pg_catalog.cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_attachments as attachment
    where attachment.storage_path = name
      and (storage.foldername(name))[1] = attachment.project_id::text
      and (storage.foldername(name))[2] = attachment.id::text
      and attachment.status = 'ready'
      and private.can_access_project(attachment.project_id)
      and (
        attachment.visibility = 'shared'
        or private.can_view_internal(attachment.project_id)
      )
  )
);

create policy "Reservation owners can upload pending project files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and pg_catalog.cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_attachments as attachment
    where attachment.storage_path = name
      and (storage.foldername(name))[1] = attachment.project_id::text
      and (storage.foldername(name))[2] = attachment.id::text
      and attachment.uploaded_by = (select auth.uid())
      and attachment.status = 'pending'
      and private.can_access_project(attachment.project_id)
  )
);

create or replace function private.broadcast_project_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_project_id uuid;
begin
  if (select auth.uid()) is null
     or new.sender_id <> (select auth.uid()) then
    return new;
  end if;

  select thread.project_id
  into v_project_id
  from public.project_threads as thread
  where thread.id = new.thread_id;

  perform realtime.send(
    pg_catalog.jsonb_build_object(
      'message_id', new.id,
      'project_id', v_project_id,
      'visibility', new.visibility,
      'created_at', new.created_at
    ),
    'project_message_created',
    'project:' || v_project_id::text || ':' || new.visibility,
    true
  );

  return new;
end
$function$;

revoke all on function private.broadcast_project_message() from public, anon, authenticated;

create trigger broadcast_project_message_created
after insert on public.project_messages
for each row execute function private.broadcast_project_message();

drop policy if exists "Project participants can receive project broadcasts"
  on realtime.messages;

create policy "Project participants can receive project broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and private.can_subscribe_project_topic(realtime.topic())
);
