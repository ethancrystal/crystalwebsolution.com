-- 0028_transition_project_status_visibility_recipients.sql
--
-- RENUMBERED from 0024 on 2026-08-15. It was authored as 0024 but never
-- merged, and 0025/0026/0027 have since been applied live -- keeping 0024
-- would have made the applied list read out of chronological order. Nothing
-- in 0025-0027 touches transition_project_status, so the reordering is
-- functionally inert on a fresh rebuild.
--
-- ALREADY LIVE, UNTRACKED. Verified 2026-08-15 against the production
-- database: transition_project_status already forwards p_visibility to
-- private.project_notification_recipients, i.e. the leak below is already
-- closed in production -- but no migration row records it (supabase_migrations
-- .schema_migrations has no 0024 entry). This file is therefore a drift
-- reconciliation in the same spirit as 0009b/0014b (PR #72): re-applying it
-- is a harmless no-op CREATE OR REPLACE that brings tracked history back in
-- line with live state, and its test locks in behavior that currently exists
-- only as untracked live state.
--
-- transition_project_status validates and stores its own p_visibility
-- (project_status_history.visibility, the audit_events metadata) but never
-- forwarded it to private.project_notification_recipients(), so that call
-- resolved via the function's default 'shared' regardless of what the caller
-- actually passed. An 'internal'-only status-transition note therefore still
-- notified every client-company profile on the project -- the same leak
-- class 0023 fixed for post_project_message/update_project_message/
-- publish_project_deliverable, missed for this 4th caller.
--
-- Fix: forward p_visibility through to project_notification_recipients, same
-- as the other three callers. Body is otherwise byte-identical to 0020's
-- live definition.
--
-- Found during a multi-agent review of main.

begin;

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
  from private.project_notification_recipients(p_project_id, v_user_id, p_visibility) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  if p_to_status = 'delivered' then
    insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
    select
      p_project_id,
      profile.id,
      'email',
      'project.delivered',
      pg_catalog.jsonb_build_object('project_name', v_project.title)
    from public.profiles as profile
    where profile.company_id = v_project.company_id;
  end if;

  return v_history_id;
end
$function$;

-- ---------------------------------------------------------------------
-- Restore the repo's established ACL convention (DROP/CREATE OR REPLACE
-- discards prior grants only on an actual DROP; CREATE OR REPLACE preserves
-- existing grants, but re-asserting explicitly keeps this migration
-- self-verifying regardless of drift, matching 0023's convention).
-- ---------------------------------------------------------------------
revoke all on function public.transition_project_status(uuid, text, text, text) from public, anon;
grant execute on function public.transition_project_status(uuid, text, text, text) to authenticated;

commit;
