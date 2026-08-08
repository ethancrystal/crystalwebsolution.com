-- 0015_project_notifications_and_message_editing.sql
--
-- Closes two verified gaps against the full-completion CRM spec:
--
-- 1. No project event (message posted, status transitioned, approval
--    updated, deliverable published, user assigned) ever reached an
--    inbox. The four existing fan-out functions only ever inserted
--    channel='in_app' rows, and only ever addressed public.project_assignments
--    (assigned staff) -- never the client, who is scoped by
--    profiles.company_id instead. post_project_message and
--    assign_project_user never inserted into notifications_outbox at all,
--    despite email templates for both already existing and being
--    registered in lib/email/templates.js's NOTIFICATION_TEMPLATES map.
--
-- 2. Project messages had no edit capability at all -- no edited_at/
--    edited_by columns, no update RPC. The spec requires an edited
--    message to update in place and trigger its own email notification.
--
-- private.project_notification_recipients() centralises "who gets
-- notified about this project, excluding the actor" so every event
-- producer uses one consistent definition: every assigned
-- project_assignments row, plus every profile whose company_id matches
-- the project's company_id (the client side) -- the same company_id
-- join private.can_access_project() already uses for client read access,
-- so recipients exactly track who can already see the project.

begin;

-- ---------------------------------------------------------------------
-- Helper: centralised recipient resolution (assigned staff + client
-- company), used by every event producer below.
-- ---------------------------------------------------------------------
create or replace function private.project_notification_recipients(
  p_project_id uuid,
  p_exclude_user_id uuid
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
$$;

-- ---------------------------------------------------------------------
-- Fix 1: pin pinned_admin_email()'s search_path (SEC-001 advisory).
-- Trivial constant-returning function; no schema-qualified references,
-- so an empty search_path is safe and simplest.
-- ---------------------------------------------------------------------
create or replace function public.pinned_admin_email()
returns text
language sql
immutable
set search_path to ''
as $$
  SELECT 'ethan@crystalwebsolution.com'::TEXT
$$;

-- ---------------------------------------------------------------------
-- Fix 2: post_project_message now fans out both channels to every
-- other project participant (was: no notification at all).
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
  v_attachment_ids uuid[] := pg_catalog.coalesce(p_attachment_ids, '{}'::uuid[]);
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
  from private.project_notification_recipients(p_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_message_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 3 (new capability): message editing. Adds edited_at/edited_by to
-- project_messages and a sender-only update RPC that notifies the same
-- way post_project_message does, under its own event type.
-- ---------------------------------------------------------------------
alter table public.project_messages
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.profiles(id);

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
  from private.project_notification_recipients(v_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_message_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 4: transition_project_status now fans out both channels to the
-- centralised recipient set (was: in_app only, assigned staff only).
-- ---------------------------------------------------------------------
create or replace function public.transition_project_status(
  p_project_id uuid,
  p_to_status text,
  p_note text default null::text,
  p_visibility text default 'shared'::text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_history_id uuid;
  v_allowed boolean := false;
  v_from_status text;
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

  v_from_status := v_project.status;

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
    v_from_status,
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
      'from_status', v_from_status,
      'to_status', p_to_status,
      'visibility', p_visibility
    )
  );

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    p_project_id,
    recipient.user_id,
    channel.value,
    'project.status_transitioned',
    pg_catalog.jsonb_build_object('from_status', v_from_status, 'to_status', p_to_status)
  from private.project_notification_recipients(p_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_history_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 5: update_project_approval now fans out both channels to the
-- centralised recipient set.
-- ---------------------------------------------------------------------
create or replace function public.update_project_approval(
  p_approval_id uuid,
  p_status text,
  p_note text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
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

  v_project_id := v_approval.project_id;

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

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_project_id,
    recipient.user_id,
    channel.value,
    'project.approval_updated',
    jsonb_build_object('approval_id', p_approval_id, 'status', p_status, 'note', v_approval.note)
  from private.project_notification_recipients(v_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_approval_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 6: publish_project_deliverable now fans out both channels to the
-- centralised recipient set, and enriches the payload with the
-- deliverable's title/version (previously omitted -- the email template
-- needs deliverableName/version but only deliverable_id/status were ever
-- provided, so every prior send of this template rendered them blank).
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
  from private.project_notification_recipients(v_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_deliverable_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 7: assign_project_user now actually notifies the assigned user
-- (previously: audit event only, the project.user_assigned email
-- template existed but nothing ever triggered it). Assignment
-- notifications go to the newly assigned user only, not the full
-- recipient set -- everyone else already knows who's on the project.
-- ---------------------------------------------------------------------
create or replace function public.assign_project_user(
  p_project_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_assignment_id uuid;
  v_role text;
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

  select profile.role::text
  into v_role
  from public.profiles as profile
  where profile.id = p_user_id
    and profile.role::text in ('project_manager', 'admin');

  if not found then
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

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select p_project_id, p_user_id, channel.value, 'project.user_assigned', pg_catalog.jsonb_build_object('role', v_role)
  from pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_assignment_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Fix 8: enable Supabase Realtime on project_messages so ProjectThread.jsx
-- can subscribe to postgres_changes and reflect new/edited messages from
-- other participants live, instead of only on next manual page load.
-- Verified missing: `select * from pg_publication_tables where
-- pubname = 'supabase_realtime' and tablename = 'project_messages'`
-- returned zero rows before this migration.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.project_messages;

commit;
