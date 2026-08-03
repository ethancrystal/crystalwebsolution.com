-- Notes and deliverables write paths. Depends on 0012.
--
-- Two real gaps found during a CRM audit, neither fixable from application
-- code alone:
--
-- 1. NotesPanel.jsx's "Add update" composer posts a standalone note to
--    project_status_history, but INSERT was revoked from `authenticated`
--    in 0009 (only SELECT re-granted) and every write is forced through a
--    validated RPC instead - and no existing RPC can post a note without
--    also transitioning status, because to_status is NOT NULL. Added
--    post_project_note(), which inserts a history row with
--    from_status = to_status = the project's current status, satisfying
--    the table's own constraints while representing "no status change
--    happened, just a note." The composer itself is currently disabled in
--    the app (see components/crm/NotesPanel.jsx) pending this migration;
--    wiring it back up is a follow-up once this is applied.
--
-- 2. publish_project_deliverable() (0010/0011) can only UPDATE an existing
--    project_deliverables row - there has never been an INSERT path for
--    this table: no RLS policy, no RPC, and no storage.objects policy
--    scoped to it. So no deliverable has ever been creatable through the
--    app; ProjectFiles.jsx has no publish affordance yet either. Added
--    create_project_deliverable(), mirroring reserve_project_attachment()'s
--    reserve-then-upload-then-finalize shape - publish_project_deliverable()
--    already serves as the finalize step - plus matching storage.objects
--    read/upload policies scoped to project_deliverables instead of
--    project_attachments. Wiring a server action + upload UI is a
--    follow-up once this is applied.

-- Widen the event_type allow-list for the two new audit event kinds this
-- migration introduces, before any function that would insert them.
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
      'project.notification_enqueued',
      'project.note_posted',
      'project.deliverable_created'
    )
  );

create or replace function public.post_project_note(
  p_project_id uuid,
  p_note text,
  p_visibility text default 'shared'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_status text;
  v_company_id uuid;
  v_history_id uuid;
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

  if p_note is null or char_length(btrim(p_note)) not between 1 and 2000 then
    raise exception 'Note must be 1 to 2000 characters.' using errcode = '22023';
  end if;

  select project.status, project.company_id
  into v_status, v_company_id
  from public.projects as project
  where project.id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

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
    v_status,
    v_status,
    btrim(p_note),
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
    v_company_id,
    'project.note_posted',
    jsonb_build_object('history_id', v_history_id, 'visibility', p_visibility)
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
    'project.note_posted',
    jsonb_build_object('history_id', v_history_id)
  from public.project_assignments as assignment
  where assignment.project_id = p_project_id
    and assignment.user_id <> v_user_id;

  return v_history_id;
end
$function$;

revoke all on function public.post_project_note(uuid, text, text) from public;
revoke all on function public.post_project_note(uuid, text, text) from anon;
grant execute on function public.post_project_note(uuid, text, text) to authenticated;

create or replace function public.create_project_deliverable(
  p_project_id uuid,
  p_title text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_description text default '',
  p_visibility text default 'shared',
  p_version text default '1'
)
returns public.project_deliverables
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
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

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
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

-- Storage policies mirroring the project_attachments ones (0009), scoped to
-- project_deliverables instead, so create_project_deliverable's reserved
-- storage_path can actually be uploaded to and, once published, read back.
-- A deliverable is only readable once publish_project_deliverable() has
-- moved it out of 'draft' - mirrors attachments requiring status = 'ready'.
create policy "Project participants can read published deliverables"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_deliverables as deliverable
    where deliverable.storage_path = name
      and (storage.foldername(name))[1] = deliverable.project_id::text
      and (storage.foldername(name))[2] = deliverable.id::text
      and deliverable.status <> 'draft'
      and private.can_access_project(deliverable.project_id)
      and (
        deliverable.visibility = 'shared'
        or private.can_view_internal(deliverable.project_id)
      )
  )
);

create policy "Deliverable owners can upload draft deliverables"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_deliverables as deliverable
    where deliverable.storage_path = name
      and (storage.foldername(name))[1] = deliverable.project_id::text
      and (storage.foldername(name))[2] = deliverable.id::text
      and deliverable.created_by = (select auth.uid())
      and deliverable.status = 'draft'
      and private.can_access_project(deliverable.project_id)
  )
);
