-- Versioned, project-scoped brief submissions.
-- Writes are mediated by submit_project_brief so ownership and versioning are
-- established from auth.uid() and the project row, never from client claims.

begin;

create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  version integer not null,
  responses jsonb not null default '{}'::jsonb,
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  constraint project_briefs_category_check check (
    category in (
      'web_design',
      'web_development',
      'logo_creation',
      'branding',
      'marketing',
      'animation',
      'ai_automation',
      'workflow_automation'
    )
  ),
  constraint project_briefs_version_check check (version >= 1),
  constraint project_briefs_responses_object_check check (jsonb_typeof(responses) = 'object'),
  unique (project_id, version)
);

create index project_briefs_project_submitted_idx
  on public.project_briefs(project_id, version desc, submitted_at desc);
create index project_briefs_submitted_by_idx
  on public.project_briefs(submitted_by);

alter table public.project_briefs enable row level security;
alter table public.project_briefs force row level security;

create policy "Project participants can view briefs"
  on public.project_briefs
  for select
  to authenticated
  using (private.can_access_project(project_id));

revoke all on table public.project_briefs from anon;
revoke insert, update, delete, truncate, references, trigger on table public.project_briefs from authenticated;
grant select on table public.project_briefs to authenticated;

create or replace function public.submit_project_brief(
  p_project_id uuid,
  p_category text,
  p_responses jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_project_category text;
  v_version integer;
  v_brief_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access is not allowed.' using errcode = '42501';
  end if;

  if p_responses is null or pg_catalog.jsonb_typeof(p_responses) <> 'object' then
    raise exception 'Brief responses must be a JSON object.' using errcode = '22023';
  end if;

  select project.category
  into v_project_category
  from public.projects as project
  where project.id = p_project_id;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  if p_category is null or p_category <> v_project_category then
    raise exception 'Brief category does not match the project.' using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.project_briefs
  where project_id = p_project_id;

  insert into public.project_briefs (
    project_id,
    category,
    version,
    responses,
    submitted_by
  )
  values (
    p_project_id,
    v_project_category,
    v_version,
    p_responses,
    v_user_id
  )
  returning id into v_brief_id;

  return v_brief_id;
end
$function$;

revoke all on function public.submit_project_brief(uuid, text, jsonb) from public, anon;
grant execute on function public.submit_project_brief(uuid, text, jsonb) to authenticated;

drop function if exists public.create_project(uuid, text, text, text, date, uuid);

create or replace function public.create_project(
  p_company_id uuid,
  p_category text,
  p_title text,
  p_brief text,
  p_target_date date default null,
  p_source_deal_id uuid default null,
  p_brief_responses jsonb default '{}'::jsonb
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

  if p_category is null
     or p_category not in (
       'web_design',
       'web_development',
       'logo_creation',
       'branding',
       'marketing',
       'animation',
       'ai_automation',
       'workflow_automation'
     ) then
    raise exception 'Invalid project category.' using errcode = '22023';
  end if;

  if p_brief_responses is null or pg_catalog.jsonb_typeof(p_brief_responses) <> 'object' then
    raise exception 'Brief responses must be a JSON object.' using errcode = '22023';
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
    select 1 from public.companies as company where company.id = p_company_id
  ) then
    raise exception 'Company not found.' using errcode = 'P0002';
  end if;

  if p_source_deal_id is not null
     and not exists (
       select 1
       from public.deals as deal
       where deal.id = p_source_deal_id
         and deal.company_id = p_company_id
     ) then
    raise exception 'Source deal does not belong to the project company.' using errcode = '23503';
  end if;

  insert into public.projects (
    company_id,
    source_deal_id,
    category,
    title,
    brief,
    target_date,
    created_by
  )
  values (
    p_company_id,
    p_source_deal_id,
    p_category,
    v_title,
    pg_catalog.btrim(p_brief),
    p_target_date,
    v_user_id
  )
  returning id into v_project_id;

  insert into public.project_threads (project_id)
  values (v_project_id);

  insert into public.project_briefs (
    project_id,
    category,
    version,
    responses,
    submitted_by
  )
  values (
    v_project_id,
    p_category,
    1,
    p_brief_responses,
    v_user_id
  );

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
    p_company_id,
    'project.created',
    pg_catalog.jsonb_build_object(
      'category', p_category,
      'source_deal_id', p_source_deal_id,
      'brief_version', 1
    )
  );

  return v_project_id;
end
$function$;

revoke all on function public.create_project(uuid, text, text, text, date, uuid, jsonb) from public, anon;
grant execute on function public.create_project(uuid, text, text, text, date, uuid, jsonb) to authenticated;

commit;
