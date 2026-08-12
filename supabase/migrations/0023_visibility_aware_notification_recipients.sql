-- 0023_visibility_aware_notification_recipients.sql
--
-- private.project_notification_recipients() has always returned the union of
-- assigned staff (project_assignments) and every profile on the client side
-- (profiles.company_id = projects.company_id), with no awareness of message
-- or deliverable visibility. post_project_message, update_project_message,
-- and publish_project_deliverable all fan out notifications_outbox rows (both
-- in_app and email channels) to every one of those recipients regardless of
-- the event's own visibility.
--
-- Concretely: when a staff member posts an internal-only message
-- (p_visibility = 'internal'), every client-company profile on the project
-- still gets an in_app notification AND an email containing a 200-character
-- excerpt of that internal message. The client-facing read path
-- (lib/crm/projects.js's sharedOnly filter) already hides internal messages
-- in the UI -- only the notification/email pipeline bypassed that boundary.
--
-- Fix: project_notification_recipients gains a third parameter,
-- p_visibility, defaulting to 'shared' (preserving today's behavior for
-- every caller that doesn't pass it). When the caller passes 'internal', the
-- client-company branch of the union is excluded, leaving only assigned
-- staff. post_project_message and publish_project_deliverable pass their own
-- visibility value through; update_project_message has no visibility param
-- of its own (visibility is immutable after creation), so it passes the
-- message's existing v_message.visibility instead.
--
-- Found during a multi-agent review of preview vs main ahead of promoting
-- preview -> main via PR #59.

begin;

drop function if exists private.project_notification_recipients(uuid, uuid);

create or replace function private.project_notification_recipients(
  p_project_id uuid,
  p_exclude_user_id uuid,
  p_visibility text default 'shared'::text
)
returns table (user_id uuid)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $$
  select assignment.user_id
  from public.project_assignments as assignment
  where assignment.project_id = p_project_id
    and assignment.user_id <> p_exclude_user_id
  union
  select profile.id
  from public.projects as project
  join public.profiles as profile on profile.company_id = project.company_id
  where project.id = p_project_id
    and profile.id <> p_exclude_user_id
    and p_visibility is distinct from 'internal'
$$;

-- ---------------------------------------------------------------------
-- post_project_message: forward its own p_visibility to the recipient call.
-- Body is otherwise byte-identical to the live definition.
-- ---------------------------------------------------------------------
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
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_thread_id uuid;
  v_message_id uuid;
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

-- ---------------------------------------------------------------------
-- update_project_message: no visibility param of its own (visibility is
-- immutable after creation), so pass the message's existing
-- v_message.visibility to the recipient call instead. Body is otherwise
-- byte-identical to the live definition.
-- ---------------------------------------------------------------------
create or replace function public.update_project_message(
  p_message_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_message public.project_messages%rowtype;
  v_project_id uuid;
  v_author_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_body is null
     or pg_catalog.char_length(pg_catalog.btrim(p_body)) not between 1 and 10000 then
    raise exception 'Message body must be 1 to 10000 characters.' using errcode = '22023';
  end if;

  select message.*
  into v_message
  from public.project_messages as message
  where message.id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;

  if v_message.sender_id <> v_user_id then
    raise exception 'Only the message author may edit it.' using errcode = '42501';
  end if;

  select thread.project_id
  into v_project_id
  from public.project_threads as thread
  where thread.id = v_message.thread_id;

  if not found then
    raise exception 'Project thread not found.' using errcode = 'P0002';
  end if;

  -- Re-check current access (covers the case where access was revoked
  -- between posting and editing).
  if not private.can_access_project(v_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  update public.project_messages
  set body = pg_catalog.btrim(p_body),
      edited_at = pg_catalog.now(),
      edited_by = v_user_id
  where id = p_message_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    v_project_id,
    'project.message_edited',
    pg_catalog.jsonb_build_object('message_id', p_message_id)
  );

  select full_name into v_author_name from public.profiles where id = v_user_id;

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_project_id,
    recipient.user_id,
    channel.value,
    'project.message_edited',
    pg_catalog.jsonb_build_object(
      'author_name', v_author_name,
      'excerpt', pg_catalog.left(pg_catalog.btrim(p_body), 200)
    )
  from private.project_notification_recipients(v_project_id, v_user_id, v_message.visibility) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_message_id;
end
$function$;

-- ---------------------------------------------------------------------
-- publish_project_deliverable: forward the deliverable's own visibility
-- (already read into v_deliverable) to the recipient call. Body is
-- otherwise byte-identical to the live definition.
-- ---------------------------------------------------------------------
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

  if v_deliverable.created_by <> v_user_id then
    raise exception 'Only the deliverable owner may publish it.' using errcode = '42501';
  end if;

  if not private.can_access_project(v_deliverable.project_id) then
    raise exception 'Project access required.' using errcode = '42501';
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

-- ---------------------------------------------------------------------
-- Restore the repo's established ACL convention on all three recreated
-- public functions (DROP FUNCTION discards prior grants; see 0021's note on
-- the same class of regression). update_project_message's live ACL had
-- drifted to include a bare PUBLIC grant and an explicit anon grant -- lock
-- all three down to authenticated only, matching every other project RPC.
-- ---------------------------------------------------------------------
revoke all on function public.post_project_message(uuid, text, text, uuid, uuid[]) from public, anon;
grant execute on function public.post_project_message(uuid, text, text, uuid, uuid[]) to authenticated;

revoke all on function public.update_project_message(uuid, text) from public, anon;
grant execute on function public.update_project_message(uuid, text) to authenticated;

revoke all on function public.publish_project_deliverable(uuid, text) from public, anon;
grant execute on function public.publish_project_deliverable(uuid, text) to authenticated;

commit;
