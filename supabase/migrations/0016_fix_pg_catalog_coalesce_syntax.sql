-- 0016_fix_pg_catalog_coalesce_syntax.sql
--
-- COALESCE and NULLIF are special SQL-standard syntactic forms, not regular
-- catalogued functions -- unlike char_length/btrim/cardinality/jsonb_build_object
-- etc., they cannot be schema-qualified. `pg_catalog.coalesce(...)` /
-- `pg_catalog.nullif(...)` both raise 42883 ("function ... does not exist")
-- at call time, because Postgres tries to resolve them as an actual
-- catalogued function and finds none.
--
-- Discovered live during Phase 1 CRM verification (2026-08-09): posting a
-- project message via the real post_project_message RPC (through PostgREST,
-- not a direct SQL call) failed with exactly this error. The bug has been
-- present since post_project_message's original definition in migration
-- 0009 (`v_attachment_ids uuid[] := pg_catalog.coalesce(...)`) and was
-- carried forward unchanged by 0015's `create or replace` -- meaning no
-- project message has ever been postable through the live RPC endpoint.
-- Every prior verification pass was code review + pnpm test's regex-over-
-- SQL-text contract checks, neither of which executes against a real
-- database or goes through PostgREST, so this was never caught.
--
-- The same pattern also breaks onboard_client_company(p_name, p_email)
-- (migration 0008), which resolves a fallback contact name via
-- pg_catalog.coalesce(pg_catalog.nullif(...), pg_catalog.nullif(...), ...).
--
-- Fix: re-declare both functions identically except with bare coalesce()/
-- nullif() (no pg_catalog. prefix). No other behavior changes.

begin;

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
  from private.project_notification_recipients(p_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_message_id;
end
$function$;

create or replace function public.onboard_client_company(p_name text, p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_contact_name text;
begin
  select coalesce(
    nullif(pg_catalog.btrim(profile.full_name), ''),
    nullif(pg_catalog.split_part(auth_user.email, '@', 1), ''),
    'Client'
  )
  into v_contact_name
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  where profile.id = auth.uid();

  return public.onboard_client_company(
    p_company_name => p_name,
    p_contact_name => v_contact_name,
    p_phone => null
  );
end;
$$;

commit;
