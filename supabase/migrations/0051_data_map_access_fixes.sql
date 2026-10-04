-- 0051_data_map_access_fixes.sql
--
-- Six authorization and data-leak fixes found by the 2026-09-30 data map
-- (docs/data-map/). Each one replaces a function with its CURRENT final
-- definition plus the smallest change the fix needs: same signature, same
-- SECURITY DEFINER, same pinned search_path, same grants, same error messages
-- and error codes the app already maps, except where a fix needs a new one
-- (named below). No table, column, index, policy or audit event type changes.
--
-- D1. public.update_project_approval (0015). A decision on an approval for an
--     INTERNAL deliverable queued email and in-app notifications for the
--     client, because the recipient helper was called without a visibility
--     and defaulted to 'shared'. 0041 already hides those approvals from
--     client reads, so the notification disclosed what the read policy
--     withholds. The helper is now called with the deliverable's visibility
--     (an approval with no deliverable keeps notifying everyone, matching
--     that read policy). The payload's note was also the OLD requester note
--     (v_approval.note, read before the update); it is now the decision note
--     being written.
--
-- D2. private.project_notification_recipients (0046). Two role leaks:
--     * the assignment branch returned every project_assignments row whatever
--       the user's CURRENT role, so a demoted user kept receiving excerpts of
--       internal messages. It now returns only users who are currently a
--       project_manager or the admin.
--     * the company branch returned every profile carrying the project's
--       company_id, including a client later approved as staff. It now
--       returns only profiles whose role is client.
--     The "nobody assigned, so the admin hears about it" fallback now
--     considers only assignments of current staff, so a stale assignment no
--     longer suppresses it.
--
-- D3. public.update_project_task (0012). A client could update any unassigned
--     task on their project, including staff-only (client_visible = false)
--     tasks, and could set assignee_id to any profile. Now:
--     * a client can only update a client_visible task (otherwise the same
--       "Task not found." P0002 a missing id gives, matching the SELECT
--       policy that hides the row), and cannot change assignee_id (42501);
--     * a new assignee must be the admin or a project manager assigned to
--       this project (22023). Leaving the assignee unchanged is not checked,
--       so existing assignments keep working.
--     * completed_at is maintained again (0011 did, 0012 dropped it): set
--       when the status becomes done, cleared when it leaves done.
--     The existing "only the assignee may update an assigned task" rule is
--     unchanged. create_project_task (0047) does not validate its assignee
--     either; it is staff-only and is not part of this fix.
--
-- D4. public.create_lead_from_contact (0029). It matched an existing company
--     by the visitor-supplied company name or by email domain, with LIMIT 1
--     and no ORDER BY, so any visitor could attach a contact (and a deal) to
--     an existing CLIENT company, and that client could then read the contact
--     through "Clients can view company contacts". A company with any client
--     account linked (a profile with company_id = the company and role
--     client, or any company_members row) is never matched now: the lead
--     gets a new company instead. The remaining match is deterministic
--     (ORDER BY created_at, id). The per-email lock and everything else are
--     unchanged. A visitor whose email is already a contact still resolves to
--     that contact, as before.
--
-- D6. public.onboard_client_company(text, text, text). If the account's email
--     already existed as a contact (a previous contact-form lead, or one an
--     admin added), the contact insert hit contacts_lower_email_unique_idx
--     and raised 23505, the same errcode as "You are already linked to a
--     company.", so onboarding was blocked and the app could not tell the two
--     apart. The new company is still created, but the contact insert now
--     skips (ON CONFLICT DO NOTHING on that index, which also covers a
--     concurrent lead). The existing contact is NOT moved and its company is
--     NOT joined: the new account only ever gets the company it just
--     created. (Open PR #233 links the account to the existing contact's
--     company instead; combined with D4 that could hand a new account access
--     to another client's company, so it is not copied.) The 2-argument
--     overload from 0016 only delegates to this function and is unchanged.
--
-- D7. public.admin_resolve_staff_request (0014). It had no self-change or
--     last-admin guard: approving a staff request flagged on the admin's own
--     profile demoted the only admin, and only a migration could recover.
--     The role of an admin is never changed through this function now. For an
--     admin target (which includes the caller, since only an admin can call
--     it) the request flag is cleared and the role is left alone, rather than
--     raising, so the stale request leaves the pending queue. Approving any
--     other account still grants project_manager; declining still changes
--     only the flag.
--
-- Applying this file to the live project is a separate owner action after
-- review: merging the PR deploys the app but does not run SQL. Each fix is
-- independent of the app code and the app works unchanged without it.

-- ---------- D2. recipients: current staff, clients only -------------------

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
  -- Staff assigned to the project, while they are still staff.
  select assignment.user_id
  from public.project_assignments as assignment
  join public.profiles as staff on staff.id = assignment.user_id
  where assignment.project_id = p_project_id
    and assignment.user_id <> p_exclude_user_id
    and staff.role in ('project_manager'::public.user_role, 'admin'::public.user_role)
  union
  -- The client company's own accounts, never staff who carry a company_id.
  select profile.id
  from public.projects as project
  join public.profiles as profile on profile.company_id = project.company_id
  where project.id = p_project_id
    and profile.id <> p_exclude_user_id
    and profile.role = 'client'::public.user_role
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
      join public.profiles as staff on staff.id = assignment.user_id
      where assignment.project_id = p_project_id
        and staff.role in ('project_manager'::public.user_role, 'admin'::public.user_role)
    )
$$;

revoke all on function private.project_notification_recipients(uuid, uuid, text)
  from public, anon, authenticated;

-- ---------- D1. update_project_approval: visibility and decision note -----

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
  v_visibility text;
  v_note text;
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
  v_note := btrim(coalesce(p_note, ''));

  -- Who hears about the decision follows the deliverable it decides on: 0041
  -- hides approvals on an internal deliverable from clients, so their
  -- notifications must not name them either. An approval with no deliverable
  -- is visible to every participant, so it notifies them too.
  select deliverable.visibility
  into v_visibility
  from public.project_deliverables as deliverable
  where deliverable.id = v_approval.deliverable_id;

  v_visibility := coalesce(v_visibility, 'shared');

  update public.project_approvals
  set
    status = p_status,
    reviewed_by = v_user_id,
    note = v_note,
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
    jsonb_build_object('approval_id', p_approval_id, 'status', p_status, 'note', v_note)
  from private.project_notification_recipients(v_project_id, v_user_id, v_visibility) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  return p_approval_id;
end
$function$;

revoke all on function public.update_project_approval(uuid, text, text) from public;
revoke all on function public.update_project_approval(uuid, text, text) from anon;
grant execute on function public.update_project_approval(uuid, text, text) to authenticated;

-- ---------- D3. update_project_task: client scope, assignee, completed_at -

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
  v_is_staff boolean;
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

  v_is_staff := coalesce(private.can_view_internal(v_task.project_id), false);

  -- A client works only with tasks the studio shared with them (the SELECT
  -- policy hides the rest, so they get the same answer as a missing id), and
  -- never decides who a task is assigned to.
  if not v_is_staff then
    if v_task.client_visible is not true then
      raise exception 'Task not found.' using errcode = 'P0002';
    end if;

    if p_assignee_id is not null and p_assignee_id is distinct from v_task.assignee_id then
      raise exception 'Only staff can assign a task.' using errcode = '42501';
    end if;
  end if;

  -- Unassigned tasks can be updated by any project participant.
  if v_task.assignee_id is not null and v_task.assignee_id <> v_user_id then
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
    -- Set when the task becomes done, cleared when it leaves done (0011).
    v_task.completed_at := case
      when p_status = 'done' then coalesce(v_task.completed_at, now())
      else null
    end;
  end if;

  -- Only overwrite when a value is explicitly provided. A new assignee must be
  -- the admin or a project manager assigned to this project; an unchanged
  -- assignee is not re-checked, so existing assignments keep working.
  if p_assignee_id is not null and p_assignee_id is distinct from v_task.assignee_id then
    if not (
      exists (
        select 1
        from public.profiles as profile
        where profile.id = p_assignee_id
          and profile.role = 'admin'::public.user_role
      )
      or exists (
        select 1
        from public.project_assignments as assignment
        join public.profiles as profile on profile.id = assignment.user_id
        where assignment.project_id = v_task.project_id
          and assignment.user_id = p_assignee_id
          and profile.role = 'project_manager'::public.user_role
      )
    ) then
      raise exception 'Task assignee must be an admin or a project manager assigned to this project.'
        using errcode = '22023';
    end if;
    v_task.assignee_id := p_assignee_id;
  end if;
  if p_due_date is not null then
    v_task.due_date := p_due_date;
  end if;
  v_task.updated_at := now();

  update public.project_tasks
  set
    title = v_task.title,
    description = v_task.description,
    status = v_task.status,
    assignee_id = v_task.assignee_id,
    due_date = v_task.due_date,
    completed_at = v_task.completed_at,
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

revoke all on function public.update_project_task(uuid, text, text, text, uuid, date) from public;
revoke all on function public.update_project_task(uuid, text, text, text, uuid, date) from anon;
grant execute on function public.update_project_task(uuid, text, text, text, uuid, date) to authenticated;

-- ---------- D4. create_lead_from_contact: never join a client's company ---

CREATE OR REPLACE FUNCTION public.create_lead_from_contact(
  p_name TEXT,
  p_email TEXT,
  p_company TEXT DEFAULT NULL,
  p_brief TEXT DEFAULT NULL,
  p_budget TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'website_contact_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $fn$
DECLARE
  v_name TEXT := btrim(coalesce(p_name, ''));
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_company_input TEXT := nullif(btrim(coalesce(p_company, '')), '');
  v_brief TEXT := left(btrim(coalesce(p_brief, '')), 4000);
  v_budget TEXT := left(btrim(coalesce(p_budget, '')), 50);
  -- Finding #3: bounded like every other input.
  v_source TEXT := left(btrim(coalesce(p_source, 'website_contact_form')), 50);
  v_first_name TEXT;
  v_last_name TEXT;
  v_space_pos INT;
  v_domain TEXT;
  v_admin_id UUID;
  v_company_id UUID;
  v_company_name TEXT;
  v_contact_id UUID;
  v_deal_id UUID;
  v_note_appended BOOLEAN := false;
  v_lead_created BOOLEAN := false;
  v_deal_title TEXT;
  v_deal_description TEXT;
  -- Matches this repo's contact-form limits (lib/contactForm.mjs
  -- CONTACT_FIELD_LIMITS) as a second line of defense -- the RPC does not
  -- trust the caller even though only the service role can reach it.
  FREE_MAIL_DOMAINS CONSTANT TEXT[] := ARRAY[
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'msn.com', 'protonmail.com', 'mail.com',
    'me.com', 'yandex.com', 'gmx.com'
  ];
BEGIN
  IF v_name = '' OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Invalid lead name.' USING ERRCODE = '22023';
  END IF;

  IF v_email = '' OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid lead email.' USING ERRCODE = '22023';
  END IF;

  IF v_company_input IS NOT NULL AND length(v_company_input) > 160 THEN
    v_company_input := left(v_company_input, 160);
  END IF;

  -- Finding #1: serialize concurrent calls for this exact address. Namespaced
  -- by the function name so the key space can't collide with another
  -- advisory-lock user. Transaction-scoped: released on commit or rollback,
  -- so a failure mid-function can never strand the lock. Calls for different
  -- addresses take different keys and stay fully concurrent.
  PERFORM pg_advisory_xact_lock(hashtext('create_lead_from_contact'), hashtext(v_email));

  SELECT au.id INTO v_admin_id
  FROM auth.users au
  WHERE lower(au.email) = lower(public.pinned_admin_email())
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin profile found for lead attribution.' USING ERRCODE = 'P0002';
  END IF;

  v_space_pos := position(' ' in v_name);
  IF v_space_pos > 0 THEN
    v_first_name := left(v_name, v_space_pos - 1);
    v_last_name := btrim(substring(v_name from v_space_pos + 1));
  ELSE
    v_first_name := v_name;
    v_last_name := '';
  END IF;

  -- Finding #2: computed unconditionally now (0026 assigned it only inside the
  -- new-contact branch), so every path can reason about the sender's domain.
  v_domain := split_part(v_email, '@', 2);

  -- ---------- Contact match/create ----------

  SELECT c.id, c.company_id INTO v_contact_id, v_company_id
  FROM public.contacts c
  WHERE lower(c.email) = v_email
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    -- ---------- Company match/create (only needed for a new contact) ----------
    -- 0051: the company is matched from text the visitor typed (a name) or
    -- from their email domain, so it must never be a company that has a client
    -- account: that client can read its company's contacts. Such a company is
    -- skipped and the lead gets a new one. The match is deterministic.
    IF v_company_input IS NOT NULL THEN
      SELECT co.id INTO v_company_id
      FROM public.companies co
      WHERE lower(co.name) = lower(v_company_input)
        AND NOT EXISTS (
          SELECT 1
          FROM public.profiles client_profile
          WHERE client_profile.company_id = co.id
            AND client_profile.role = 'client'::public.user_role
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.company_members member
          WHERE member.company_id = co.id
        )
      ORDER BY co.created_at, co.id
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, email, created_by)
        VALUES (v_company_input, v_email, v_admin_id)
        RETURNING id INTO v_company_id;
      END IF;
    ELSIF v_domain != '' AND NOT (v_domain = ANY (FREE_MAIL_DOMAINS)) THEN
      SELECT co.id INTO v_company_id
      FROM public.companies co
      WHERE lower(split_part(co.email, '@', 2)) = v_domain
        AND NOT EXISTS (
          SELECT 1
          FROM public.profiles client_profile
          WHERE client_profile.company_id = co.id
            AND client_profile.role = 'client'::public.user_role
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.company_members member
          WHERE member.company_id = co.id
        )
      ORDER BY co.created_at, co.id
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, email, created_by)
        VALUES (v_domain, v_email, v_admin_id)
        RETURNING id INTO v_company_id;
      END IF;
    ELSE
      -- Free-mail domain and no company name given: an individual lead
      -- still needs a company row (contacts.company_id/deals.company_id
      -- are NOT NULL) -- named after the person rather than left blank.
      INSERT INTO public.companies (name, email, created_by)
      VALUES (v_name, v_email, v_admin_id)
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.contacts (company_id, first_name, last_name, email, created_by)
    VALUES (v_company_id, v_first_name, v_last_name, v_email, v_admin_id)
    RETURNING id INTO v_contact_id;
  END IF;

  -- Finding #2: the company actually attached to the deal is the single
  -- source of truth for both the deal title and the notification payload,
  -- rather than re-deriving a guess in each place. Correct on every path:
  -- explicit company name, domain-matched company, free-mail company named
  -- after the person, and an existing contact whose company predates this call.
  SELECT co.name INTO v_company_name
  FROM public.companies co
  WHERE co.id = v_company_id;

  v_company_name := nullif(btrim(coalesce(v_company_name, '')), '');

  -- ---------- Open-deal dedupe ----------

  SELECT d.id INTO v_deal_id
  FROM public.deals d
  WHERE d.contact_id = v_contact_id
    AND d.stage NOT IN ('closed_won', 'closed_lost')
  ORDER BY d.created_at DESC
  LIMIT 1;

  v_deal_description := trim(both E'\n' FROM
    coalesce(nullif(v_budget, ''), '') ||
    CASE WHEN v_budget != '' AND v_brief != '' THEN E'\n\n' ELSE '' END ||
    coalesce(nullif(v_brief, ''), '')
  );

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO public.notes (company_id, contact_id, deal_id, content, created_by, visibility)
    VALUES (
      v_company_id,
      v_contact_id,
      v_deal_id,
      'New website inquiry (' || v_source || '):' || E'\n' || v_deal_description,
      v_admin_id,
      'internal'
    );
    v_note_appended := true;
  ELSE
    v_deal_title := left('Website inquiry — ' || coalesce(v_company_name, v_name), 200);

    INSERT INTO public.deals (company_id, contact_id, title, description, owner_id, stage)
    VALUES (v_company_id, v_contact_id, v_deal_title, nullif(v_deal_description, ''), v_admin_id, 'prospecting')
    RETURNING id INTO v_deal_id;

    v_lead_created := true;
  END IF;

  -- ---------- Admin notification (outbox; drained by the pg_cron/pg_net
  -- schedule from 0025, with the daily Vercel cron as a backstop) ----------

  INSERT INTO public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  VALUES (
    NULL,
    v_admin_id,
    'email',
    'lead.created',
    jsonb_build_object(
      'lead_name', v_name,
      'lead_email', v_email,
      'lead_company', v_company_name,
      'deal_id', v_deal_id,
      'note_appended', v_note_appended
    )
  );

  RETURN jsonb_build_object(
    'lead_created', v_lead_created,
    'note_appended', v_note_appended,
    'deal_id', v_deal_id,
    'contact_id', v_contact_id,
    'company_id', v_company_id
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- ---------- D6. onboard_client_company: tolerate an existing contact ------

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

  -- 0051: contact emails are unique across all companies. If this address is
  -- already a contact (a contact-form lead, or one an admin added), leave that
  -- contact alone: it is not moved here, and this account does not join its
  -- company. Only the company created above is linked to the account.
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
  )
  on conflict (lower(email)) where email is not null do nothing;

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

-- ---------- D7. admin_resolve_staff_request: never change an admin --------

CREATE OR REPLACE FUNCTION public.admin_resolve_staff_request(
  p_user_id UUID,
  p_approve BOOLEAN
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'An approve or decline decision is required.'
      USING ERRCODE = '22023';
  END IF;

  -- Approval only ever grants project_manager. The admin role is not
  -- reachable from this path at all, and (0051) neither is leaving it: an
  -- admin target (the caller is always one, so this covers acting on your own
  -- request) only has the request flag cleared. The CASE reads the role as
  -- the row is updated, so a concurrent change cannot slip past the guard.
  UPDATE public.profiles
  SET role = CASE
               WHEN p_approve AND role <> 'admin'::public.user_role
                 THEN 'project_manager'::public.user_role
               ELSE role
             END,
      requested_staff_access = false
  WHERE id = p_user_id
    AND requested_staff_access
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending staff request for this account.'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) TO authenticated;
