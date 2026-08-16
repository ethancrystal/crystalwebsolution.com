-- 0032_project_asset_lifecycle_hardening.sql
--
-- Extend identifiers-only project Realtime events to message edits and remove
-- abandoned, unlinked pending message attachments after a bounded retention
-- period. Ready or message-linked attachments are never eligible.

create or replace function private.broadcast_project_message_updated()
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

  if v_project_id is null then
    return new;
  end if;

  perform realtime.send(
    pg_catalog.jsonb_build_object(
      'message_id', new.id,
      'project_id', v_project_id,
      'visibility', new.visibility,
      'edited_at', new.edited_at
    ),
    'project_message_updated',
    'project:' || v_project_id::text || ':' || new.visibility,
    true
  );

  return new;
end
$function$;

revoke all on function private.broadcast_project_message_updated()
  from public, anon, authenticated;

create trigger broadcast_project_message_updated
after update of body, edited_at on public.project_messages
for each row execute function private.broadcast_project_message_updated();

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
  v_existing_project_id uuid;
  v_attachment_ids uuid[] := coalesce(p_attachment_ids, '{}'::uuid[]);
  v_attachment_count bigint;
  v_author_name text;
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
  on conflict (sender_id, client_generated_id) do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select message.id, thread.project_id
    into v_message_id, v_existing_project_id
    from public.project_messages as message
    join public.project_threads as thread on thread.id = message.thread_id
    where message.sender_id = v_user_id
      and message.client_generated_id = p_client_generated_id;

    if not found or v_existing_project_id <> p_project_id then
      raise exception 'Message attempt belongs to another project.' using errcode = '42501';
    end if;

    return v_message_id;
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

  select full_name into v_author_name from public.profiles where id = v_user_id;

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    p_project_id,
    recipient.user_id,
    channel.value,
    'project.message_posted',
    pg_catalog.jsonb_build_object(
      'author_name', v_author_name,
      'excerpt', pg_catalog.left(pg_catalog.btrim(p_body), 200)
    )
  from private.project_notification_recipients(p_project_id, v_user_id, p_visibility) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_message_id;
end
$function$;

create or replace function public.cleanup_stale_project_attachments(
  p_before timestamptz default now() - interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_deleted integer := 0;
begin
  p_before := coalesce(p_before, pg_catalog.now() - interval '24 hours');

  with stale as materialized (
    select attachment.id, attachment.storage_path
    from public.project_attachments as attachment
    where attachment.status = 'pending'
      and attachment.message_id is null
      and attachment.created_at < p_before
    for update skip locked
  ), removed_objects as (
    delete from storage.objects as object
    using stale
    where object.bucket_id = 'project-files'
      and object.name = stale.storage_path
    returning stale.id
  ), removed_rows as (
    delete from public.project_attachments as attachment
    using stale
    where attachment.id = stale.id
      and attachment.status = 'pending'
      and attachment.message_id is null
    returning attachment.id
  ), counts as (
    select
      (select pg_catalog.count(*) from removed_rows) as deleted_rows,
      (select pg_catalog.count(*) from removed_objects) as deleted_objects
  )
  select deleted_rows::integer
  into v_deleted
  from counts;

  return v_deleted;
end
$function$;

revoke all on function public.cleanup_stale_project_attachments(timestamptz)
  from public, anon, authenticated;
grant execute on function public.cleanup_stale_project_attachments(timestamptz)
  to service_role, postgres;
