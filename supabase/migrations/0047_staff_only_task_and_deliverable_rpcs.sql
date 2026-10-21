-- 0047_staff_only_task_and_deliverable_rpcs.sql
--
-- Task and deliverable writes are staff work. Three SECURITY DEFINER RPCs
-- checked only private.can_access_project, which is true for a member of the
-- client's company, and all three are granted to `authenticated`, so a client
-- could call them straight from the browser (supabase.rpc) whatever the UI
-- showed:
--
--   create_project_task          a client could create tasks on their project,
--                                including client_visible ones with any
--                                assignee and due date;
--   create_project_deliverable   a client could reserve deliverables (storage
--                                paths included) on their project;
--   publish_project_deliverable  a client could publish a deliverable they had
--                                created that way, emailing everyone on the
--                                project "a new deliverable is ready".
--
-- Each now requires private.can_view_internal(project_id): an admin, or a
-- project manager assigned to that project. The check runs before any read of
-- the input or any write. Everything else in each body is the live definition
-- unchanged (0019/0021 for tasks, 0013 for deliverable creation, 0023 for
-- publishing), and so are the signatures and the `authenticated` grants, which
-- are re-stated only after the bodies enforce the new rule.
--
-- Client workflows are untouched: shared messages and attachments
-- (post_project_message, reserve/finalize_project_attachment), brief
-- submission (submit_project_brief) and approvals keep their own rules.
--
-- enqueue_project_notification got the same treatment in 0046 (staff only;
-- the recipient must be on the project). It is not redefined here.
--
-- Applying this file to production is a separate owner action; merging the PR
-- deploys the app but does not run SQL.

-- ---------- create_project_task --------------------------------------------

create or replace function public.create_project_task(
  p_project_id uuid,
  p_title text,
  p_description text default ''::text,
  p_status text default 'todo'::text,
  p_assignee_id uuid default null::uuid,
  p_due_date date default null::date,
  p_priority text default 'medium'::text,
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

  -- Staff only (0047): an admin, or a project manager on this project.
  if not private.can_view_internal(p_project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
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

revoke all on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) from public;
revoke all on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) from anon;
grant execute on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) to authenticated;

-- ---------- create_project_deliverable -------------------------------------

create or replace function public.create_project_deliverable(
  p_project_id uuid,
  p_title text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_description text default ''::text,
  p_visibility text default 'shared'::text,
  p_version text default '1'::text
)
returns public.project_deliverables
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_deliverable_id uuid := gen_random_uuid();
  v_safe_filename text;
  v_company_id uuid;
  v_deliverable public.project_deliverables%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Staff only (0047): an admin, or a project manager on this project.
  if not private.can_view_internal(p_project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if p_visibility is null
     or p_visibility not in ('shared', 'internal')
     or (p_visibility = 'internal' and not private.can_view_internal(p_project_id)) then
    raise exception 'Invalid visibility.' using errcode = '42501';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 255 then
    raise exception 'Title must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_description is not null and char_length(p_description) > 10000 then
    raise exception 'Description must be at most 10000 characters.' using errcode = '22023';
  end if;

  if p_file_name is null or char_length(btrim(p_file_name)) not between 1 and 255 then
    raise exception 'File name must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_mime_type is null or char_length(btrim(p_mime_type)) not between 1 and 255 then
    raise exception 'MIME type must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 52428800 then
    raise exception 'File size must be between 1 byte and 50 MiB.' using errcode = '22023';
  end if;

  if p_version is null or char_length(btrim(p_version)) not between 1 and 32 then
    raise exception 'Version must be 1 to 32 characters.' using errcode = '22023';
  end if;

  v_safe_filename := regexp_replace(btrim(p_file_name), '[^A-Za-z0-9._-]+', '_', 'g');
  v_safe_filename := regexp_replace(v_safe_filename, '^[.]+', '', 'g');
  if v_safe_filename = '' then
    v_safe_filename := 'file';
  end if;

  select project.company_id into v_company_id
  from public.projects as project
  where project.id = p_project_id;

  insert into public.project_deliverables (
    id,
    project_id,
    title,
    description,
    file_name,
    storage_path,
    mime_type,
    size_bytes,
    status,
    visibility,
    version,
    created_by
  )
  values (
    v_deliverable_id,
    p_project_id,
    btrim(p_title),
    btrim(coalesce(p_description, '')),
    btrim(p_file_name),
    p_project_id::text || '/' || v_deliverable_id::text || '/' || v_safe_filename,
    btrim(p_mime_type),
    p_size_bytes,
    'draft',
    p_visibility,
    btrim(p_version),
    v_user_id
  )
  returning * into v_deliverable;

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
    'project.deliverable_created',
    jsonb_build_object('deliverable_id', v_deliverable_id, 'visibility', p_visibility)
  );

  return v_deliverable;
end
$function$;

revoke all on function public.create_project_deliverable(uuid, text, text, text, bigint, text, text, text) from public;
revoke all on function public.create_project_deliverable(uuid, text, text, text, bigint, text, text, text) from anon;
grant execute on function public.create_project_deliverable(uuid, text, text, text, bigint, text, text, text) to authenticated;

-- ---------- publish_project_deliverable ------------------------------------

create or replace function public.publish_project_deliverable(
  p_deliverable_id uuid,
  p_status text default 'submitted'::text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
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

  -- Staff only (0047), checked before the owner check so a client learns
  -- nothing about who created the row. The update and the notifications
  -- below still run only for staff.
  if not private.can_view_internal(v_deliverable.project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if v_deliverable.created_by <> v_user_id then
    raise exception 'Only the deliverable owner may publish it.' using errcode = '42501';
  end if;

  v_project_id := v_deliverable.project_id;

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

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_project_id,
    recipient.user_id,
    channel.value,
    'project.deliverable_published',
    jsonb_build_object(
      'deliverable_id', p_deliverable_id,
      'status', p_status,
      'deliverable_name', v_deliverable.title,
      'version', v_deliverable.version
    )
  from private.project_notification_recipients(v_project_id, v_user_id, v_deliverable.visibility) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_deliverable_id;
end
$function$;

revoke all on function public.publish_project_deliverable(uuid, text) from public;
revoke all on function public.publish_project_deliverable(uuid, text) from anon;
grant execute on function public.publish_project_deliverable(uuid, text) to authenticated;
