-- 0031_idempotent_client_project_intake.sql
-- Make client project intake retry-safe without introducing a second
-- project-creation path. Reconciled from the unmerged onboarding branch after
-- production 0027/0028 security migrations occupied the prior numeric slots.
-- The existing company argument remains for the admin-assisted path; clients
-- must match it to their profile company and the effective company is derived
-- from the authenticated profile.

alter table public.projects
  add column if not exists client_generated_id uuid;

create unique index if not exists projects_client_generated_idx
  on public.projects (created_by, client_generated_id)
  where client_generated_id is not null;

drop function if exists public.create_project(uuid, text, text, text, date, uuid);

create or replace function public.create_project(
  p_company_id uuid,
  p_category text,
  p_title text,
  p_brief text,
  p_target_date date default null,
  p_source_deal_id uuid default null,
  p_client_generated_id uuid default null
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
  v_company_id uuid;
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

  v_company_id := case
    when v_role = 'client' then v_profile_company_id
    else p_company_id
  end;

  if p_client_generated_id is not null
     and p_client_generated_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Invalid project submission key.' using errcode = '22023';
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
    select 1 from public.companies as company where company.id = v_company_id
  ) then
    raise exception 'Company not found.' using errcode = 'P0002';
  end if;

  if p_source_deal_id is not null
     and not exists (
       select 1
       from public.deals as deal
       where deal.id = p_source_deal_id
         and deal.company_id = v_company_id
     ) then
    raise exception 'Source deal does not belong to the project company.' using errcode = '23503';
  end if;

  if p_client_generated_id is not null then
    select project.id
    into v_project_id
    from public.projects as project
    where project.created_by = v_user_id
      and project.client_generated_id = p_client_generated_id
    for update;

    if found then
      return v_project_id;
    end if;
  end if;

  insert into public.projects (
    company_id,
    source_deal_id,
    category,
    title,
    brief,
    target_date,
    created_by,
    client_generated_id
  )
  values (
    v_company_id,
    p_source_deal_id,
    p_category,
    v_title,
    pg_catalog.btrim(p_brief),
    p_target_date,
    v_user_id,
    p_client_generated_id
  )
  on conflict (created_by, client_generated_id)
    where client_generated_id is not null
    do nothing
  returning id into v_project_id;

  if v_project_id is null then
    select project.id
    into v_project_id
    from public.projects as project
    where project.created_by = v_user_id
      and project.client_generated_id = p_client_generated_id
    for update;
  end if;

  -- A duplicate idempotent request returns the already committed project and
  -- does not create a second thread, history entry, or audit event.
  if exists (
    select 1
    from public.project_threads as thread
    where thread.project_id = v_project_id
  ) then
    return v_project_id;
  end if;

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
    v_company_id,
    'project.created',
    pg_catalog.jsonb_build_object(
      'category', p_category,
      'source_deal_id', p_source_deal_id,
      'client_generated_id', p_client_generated_id
    )
  );

  return v_project_id;
end
$function$;

revoke all on function public.create_project(uuid, text, text, text, date, uuid, uuid) from public;
revoke all on function public.create_project(uuid, text, text, text, date, uuid, uuid) from anon;
grant execute on function public.create_project(uuid, text, text, text, date, uuid, uuid) to authenticated;
