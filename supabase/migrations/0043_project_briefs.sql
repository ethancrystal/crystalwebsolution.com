-- 0043_project_briefs.sql
--
-- Structured, service-specific client briefs (logo, website, SEO, PPC).
--
-- A client starts a brief as a private draft, answers a guided
-- questionnaire (lib/crm/brief-templates.mjs) with autosave, then submits
-- it. Submission either creates a new project (through the existing
-- idempotent create_project(), 0031) or attaches the brief to one of the
-- client's existing projects, so one project can carry several briefs
-- (e.g. a logo brief, then a website brief, then an SEO brief).
--
-- Access model:
--   * Drafts are private to their author. Staff never see unsent drafts.
--   * Submitted briefs are readable by every participant of the project
--     (private.can_access_project: admin, assigned PMs, the client company).
--   * Clients write drafts directly under RLS (insert/update/delete of their
--     own draft rows only). Nobody can UPDATE a submitted brief; the only
--     draft -> submitted path is submit_project_brief().
--
-- Answers are stored as jsonb validated in the app layer against the
-- template; the database enforces shape (object) and size.

-- ---------- helper --------------------------------------------------------

create or replace function private.current_profile_company_id()
returns uuid
language sql
security definer
stable
set search_path = pg_catalog, public, private, storage
as $function$
  select profile.company_id
  from public.profiles as profile
  where profile.id = (select auth.uid())
$function$;

revoke all on function private.current_profile_company_id() from public, anon;
grant execute on function private.current_profile_company_id() to authenticated;

-- ---------- table ---------------------------------------------------------

create table if not exists public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  brief_type text not null,
  title text not null default '',
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  template_version integer not null default 1,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_briefs_type_check
    check (brief_type in ('logo', 'website', 'seo', 'ppc')),
  constraint project_briefs_status_check
    check (status in ('draft', 'submitted')),
  constraint project_briefs_title_length_check
    check (char_length(title) <= 120),
  constraint project_briefs_answers_object_check
    check (jsonb_typeof(answers) = 'object'),
  constraint project_briefs_answers_size_check
    check (octet_length(answers::text) <= 60000),
  constraint project_briefs_template_version_check
    check (template_version between 1 and 1000),
  -- A submitted brief always belongs to a project and has a timestamp; a
  -- draft never has a submission timestamp.
  constraint project_briefs_submission_state_check
    check (
      (status = 'submitted' and submitted_at is not null and project_id is not null)
      or (status = 'draft' and submitted_at is null)
    )
);

create index if not exists project_briefs_project_idx
  on public.project_briefs (project_id, submitted_at desc)
  where project_id is not null;

create index if not exists project_briefs_author_idx
  on public.project_briefs (created_by, status, updated_at desc);

create index if not exists project_briefs_company_idx
  on public.project_briefs (company_id);

create or replace function private.touch_project_brief()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

revoke all on function private.touch_project_brief() from public, anon, authenticated;

drop trigger if exists project_briefs_touch on public.project_briefs;
create trigger project_briefs_touch
  before update on public.project_briefs
  for each row execute function private.touch_project_brief();

-- ---------- RLS -----------------------------------------------------------

alter table public.project_briefs enable row level security;
alter table public.project_briefs force row level security;

drop policy if exists "Authors and project participants can view briefs"
  on public.project_briefs;
create policy "Authors and project participants can view briefs"
on public.project_briefs
for select
to authenticated
using (
  created_by = (select auth.uid())
  or (
    status = 'submitted'
    and project_id is not null
    and private.can_access_project(project_id)
  )
);

drop policy if exists "Clients can start draft briefs for their company"
  on public.project_briefs;
create policy "Clients can start draft briefs for their company"
on public.project_briefs
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and submitted_at is null
  and private.current_profile_role() = 'client'
  and company_id = private.current_profile_company_id()
  and (project_id is null or private.can_access_project(project_id))
);

drop policy if exists "Authors can edit their draft briefs"
  on public.project_briefs;
create policy "Authors can edit their draft briefs"
on public.project_briefs
for update
to authenticated
using (
  created_by = (select auth.uid())
  and status = 'draft'
)
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and submitted_at is null
  and private.current_profile_role() = 'client'
  and company_id = private.current_profile_company_id()
  and (project_id is null or private.can_access_project(project_id))
);

drop policy if exists "Authors can delete their draft briefs"
  on public.project_briefs;
create policy "Authors can delete their draft briefs"
on public.project_briefs
for delete
to authenticated
using (
  created_by = (select auth.uid())
  and status = 'draft'
);

revoke all on table public.project_briefs from anon;
revoke truncate, references, trigger on table public.project_briefs from authenticated;
grant select, insert, update, delete on table public.project_briefs to authenticated;

-- ---------- audit event type ---------------------------------------------
-- Same full-list replacement idiom as 0017; this list is 0017's plus
-- 'project.brief_submitted'.

alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type = any (array[
    'project.created',
    'project.user_assigned',
    'project.assignment_removed',
    'project.status_transitioned',
    'project.attachment_reserved',
    'project.message_posted',
    'project.message_edited',
    'project.attachment_finalized',
    'project.task_created',
    'project.task_updated',
    'project.approval_requested',
    'project.approval_updated',
    'project.deliverable_published',
    'project.notification_enqueued',
    'project.note_posted',
    'project.deliverable_created',
    'project.brief_submitted'
  ]::text[]));

-- ---------- submit RPC ----------------------------------------------------

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
    -- (created_by, client_generated_id); the brief id is that key.
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

  -- Tell the studio: the admin plus any staff assigned to the project. The
  -- submitting client is never notified about their own brief.
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

  return v_project_id;
end
$function$;

revoke all on function public.submit_project_brief(uuid, text, uuid, text, date) from public;
revoke all on function public.submit_project_brief(uuid, text, uuid, text, date) from anon;
grant execute on function public.submit_project_brief(uuid, text, uuid, text, date) to authenticated;
