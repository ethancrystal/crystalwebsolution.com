-- 0046_client_notifications_and_hardening.sql
--
-- Makes sure a message from a client always reaches someone, tells clients
-- and the admin what they need to know at the start of a project, and closes
-- two ways a signed-in user could misuse existing functions. Five changes:
--
-- 1. private.project_notification_recipients: when nobody on the studio
--    side is assigned to a project yet, the admin is a recipient. Until now a
--    client's message, file or status event on a project with no project
--    manager notified no staff at all (the recipients were assigned staff
--    plus the client's own company). Once a project manager is assigned the
--    admin drops off again, as before: that is intended, not an oversight.
--
-- 2. public.submit_project_brief: also queues 'project.brief_received'
--    (email + in-app) for the client who submitted, so they get a "we have
--    your brief" email. Only reached on the first submission; a retry returns
--    early, as before. Otherwise identical to 0043.
--
-- 3. public.onboard_client_company(text, text, text): also queues a
--    'client.onboarded' email for the admin when a new client finishes
--    onboarding (company, contact name, sign-in email, phone). No project
--    exists yet, so project_id is null, as for lead.created. Otherwise
--    identical to the live definition (0008, coalesce fix in 0016).
--
-- 4. public.prevent_unauthorized_profile_changes: also protects
--    requested_staff_access and created_at. The own-row UPDATE policy let any
--    user set requested_staff_access on themselves (and backdate created_at),
--    which put them in the admin's "pending employee requests" list. Only
--    validated commands owned by the migration role may change these now
--    (admin_resolve_staff_request and admin_set_user_role run as that owner;
--    handle_new_user sets the flag on INSERT, which this UPDATE trigger does
--    not see).
--
-- 5. public.enqueue_project_notification: staff only (can_view_internal),
--    and the recipient must be on the project (assigned staff, a member of
--    the client company, or the admin). It used to accept any participant,
--    clients included, and any existing profile as recipient, so a client
--    could queue an email with their own text to any user of the portal. The
--    app never calls it from the client side; every producer is SQL.
--
-- Templates for the two new event types ship in the same release
-- (lib/email/templates.js). Applying this file to production is a separate
-- owner action; merging the PR deploys the app but does not run SQL. The app
-- works unchanged without it (the new events simply never occur).

-- ---------- 1. recipients: admin while nobody is assigned -----------------

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
  union
  -- Nobody on the studio side is assigned yet: the admin hears about it.
  select profile.id
  from public.profiles as profile
  where profile.role = 'admin'::public.user_role
    and profile.id <> p_exclude_user_id
    and not exists (
      select 1
      from public.project_assignments as assignment
      where assignment.project_id = p_project_id
    )
$$;

revoke all on function private.project_notification_recipients(uuid, uuid, text)
  from public, anon, authenticated;

-- ---------- 2. submit_project_brief: acknowledge the client ---------------

create or replace function public.submit_project_brief(
  p_brief_id uuid,
  p_summary text,
  p_project_id uuid default null,
  p_project_title text default null,
  p_target_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_company_id uuid;
  v_brief public.project_briefs%rowtype;
  v_project_id uuid;
  v_project_status text;
  v_category text;
  v_summary text;
  v_created boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profile.role::text, profile.company_id
  into v_role, v_company_id
  from public.profiles as profile
  where profile.id = v_user_id;

  if v_role is distinct from 'client' or v_company_id is null then
    raise exception 'Brief submission is not allowed.' using errcode = '42501';
  end if;

  select brief.*
  into v_brief
  from public.project_briefs as brief
  where brief.id = p_brief_id
  for update;

  if not found or v_brief.created_by <> v_user_id then
    raise exception 'Brief not found.' using errcode = 'P0002';
  end if;

  if v_brief.company_id <> v_company_id then
    raise exception 'Brief submission is not allowed.' using errcode = '42501';
  end if;

  -- Idempotent retry: a brief that is already submitted returns its project.
  if v_brief.status = 'submitted' then
    return v_brief.project_id;
  end if;

  v_summary := pg_catalog.btrim(coalesce(p_summary, ''));
  if pg_catalog.char_length(v_summary) not between 1 and 10000 then
    raise exception 'Brief summary must be 1 to 10000 characters.' using errcode = '22023';
  end if;

  if v_brief.answers = '{}'::jsonb then
    raise exception 'Answer the brief before submitting it.' using errcode = '22023';
  end if;

  v_project_id := coalesce(v_brief.project_id, p_project_id);

  if v_project_id is null then
    v_category := case v_brief.brief_type
      when 'logo' then 'logo_creation'
      when 'website' then 'web_design'
      else 'marketing'
    end;

    -- create_project validates the title and is idempotent on
    -- (created_by, client_generated_id); the brief id is that key. A draft
    -- is never submitted twice (the early return above), so an existing
    -- project under this key means a colliding id chosen by the client:
    -- refuse rather than attach to that (possibly cancelled) project.
    if exists (
      select 1
      from public.projects as project
      where project.created_by = v_user_id
        and project.client_generated_id = v_brief.id
    ) then
      raise exception 'This brief cannot be submitted.' using errcode = '22023';
    end if;

    v_project_id := public.create_project(
      v_company_id,
      v_category,
      p_project_title,
      v_summary,
      p_target_date,
      null,
      v_brief.id
    );
    v_created := true;
  else
    select project.status::text
    into v_project_status
    from public.projects as project
    where project.id = v_project_id
      and project.company_id = v_company_id;

    if v_project_status is null or not private.can_access_project(v_project_id) then
      raise exception 'Project not found.' using errcode = 'P0002';
    end if;

    if v_project_status = 'cancelled' then
      raise exception 'Briefs cannot be added to a cancelled project.' using errcode = '22023';
    end if;
  end if;

  update public.project_briefs
  set status = 'submitted',
      submitted_at = now(),
      project_id = v_project_id
  where id = v_brief.id;

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
    v_company_id,
    'project.brief_submitted',
    pg_catalog.jsonb_build_object(
      'brief_id', v_brief.id,
      'brief_type', v_brief.brief_type,
      'created_project', v_created
    )
  );

  -- Tell the studio: the admin plus any staff assigned to the project.
  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_project_id,
    staff.user_id,
    channel.value,
    'project.brief_submitted',
    pg_catalog.jsonb_build_object(
      'brief_id', v_brief.id,
      'brief_type', v_brief.brief_type,
      'brief_title', v_brief.title,
      'created_project', v_created
    )
  from (
    select profile.id as user_id
    from public.profiles as profile
    where profile.role = 'admin'::public.user_role
    union
    select assignment.user_id
    from public.project_assignments as assignment
    where assignment.project_id = v_project_id
  ) as staff
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value)
  where staff.user_id <> v_user_id;

  -- Tell the client we have it (0046). Its own event type, so the studio
  -- alert above and this acknowledgement never share a template.
  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_project_id,
    v_user_id,
    channel.value,
    'project.brief_received',
    pg_catalog.jsonb_build_object(
      'brief_id', v_brief.id,
      'brief_type', v_brief.brief_type,
      'brief_title', v_brief.title,
      'created_project', v_created
    )
  from pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return v_project_id;
end
$function$;

revoke all on function public.submit_project_brief(uuid, text, uuid, text, date) from public;
revoke all on function public.submit_project_brief(uuid, text, uuid, text, date) from anon;
grant execute on function public.submit_project_brief(uuid, text, uuid, text, date) to authenticated;

-- ---------- 3. onboard_client_company: tell the admin ---------------------

create or replace function public.onboard_client_company(
  p_company_name text,
  p_contact_name text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_email text;
  v_company_id uuid;
  v_contact_name text := pg_catalog.btrim(p_contact_name);
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found or v_profile.role::text <> 'client' then
    raise exception 'Client profile required.' using errcode = '42501';
  end if;

  if v_profile.company_id is not null then
    raise exception 'You are already linked to a company.' using errcode = '23505';
  end if;

  if p_company_name is null or pg_catalog.btrim(p_company_name) = '' then
    raise exception 'Company name is required.' using errcode = '22023';
  end if;

  if p_contact_name is null or v_contact_name = '' then
    raise exception 'Contact name is required.' using errcode = '22023';
  end if;

  select email
  into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null or pg_catalog.btrim(v_email) = '' then
    raise exception 'An account email is required for onboarding.' using errcode = '23502';
  end if;

  insert into public.companies (name, email, phone, created_by)
  values (pg_catalog.btrim(p_company_name), v_email, p_phone, v_user_id)
  returning id into v_company_id;

  insert into public.contacts (
    company_id,
    first_name,
    last_name,
    email,
    phone,
    status,
    created_by
  )
  values (
    v_company_id,
    v_contact_name,
    '',
    v_email,
    p_phone,
    'client',
    v_user_id
  );

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  update public.profiles
  set company_id = v_company_id
  where id = v_user_id;

  -- A new client just finished signing up (0046). Email only: the admin has
  -- no in-app feed yet. No project exists, so project_id is null.
  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    null,
    profile.id,
    'email',
    'client.onboarded',
    pg_catalog.jsonb_build_object(
      'company_id', v_company_id,
      'company_name', pg_catalog.btrim(p_company_name),
      'contact_name', v_contact_name,
      'client_email', v_email,
      'phone', p_phone
    )
  from public.profiles as profile
  where profile.role = 'admin'::public.user_role;

  return v_company_id;
end;
$function$;

revoke all on function public.onboard_client_company(text, text, text) from public;
revoke all on function public.onboard_client_company(text, text, text) from anon;
grant execute on function public.onboard_client_company(text, text, text) to authenticated;

-- ---------- 4. profile guard: staff request flag and created_at -----------

create or replace function public.prevent_unauthorized_profile_changes()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_command_owner name;
begin
  if old.role is distinct from new.role
     or old.company_id is distinct from new.company_id
     or old.requested_staff_access is distinct from new.requested_staff_access
     or old.created_at is distinct from new.created_at then
    select pg_catalog.pg_get_userbyid(proc.proowner)
    into v_command_owner
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.admin_set_user_role(uuid,text)'::pg_catalog.regprocedure;

    if v_command_owner is null or current_user <> v_command_owner then
      raise exception 'Protected profile fields must be changed through a validated command.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_unauthorized_profile_changes() from public, anon, authenticated;

-- ---------- 5. enqueue_project_notification: staff, on-project recipients -

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
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_notification_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_view_internal(p_project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
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

  if p_user_id is not null
     and not exists (
       select 1
       from public.project_assignments as assignment
       where assignment.project_id = p_project_id
         and assignment.user_id = p_user_id
       union all
       select 1
       from public.projects as project
       join public.profiles as profile on profile.company_id = project.company_id
       where project.id = p_project_id
         and profile.id = p_user_id
       union all
       select 1
       from public.profiles as profile
       where profile.id = p_user_id
         and profile.role = 'admin'::public.user_role
     ) then
    raise exception 'Notification recipient is not on this project.' using errcode = '42501';
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

revoke all on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) from public;
revoke all on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) from anon;
grant execute on function public.enqueue_project_notification(uuid, text, text, jsonb, uuid) to authenticated;
