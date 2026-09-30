-- 0051_project_proposals.sql
--
-- Proposals area in the project workspace.
--
-- A proposal is one entry on a project: a title, the project manager who
-- posted it, the date, and one replaceable document (PDF or .docx). The tag
-- shown next to it (Web Design, Logo Creation, ...) is the project's own
-- category, so it is not stored here.
--
--   Who sees it   the project's client company, the assigned project manager
--                 and the admin. A client sees a proposal only while it is
--                 posted, and only its current document.
--   Who changes   an admin, or a project manager assigned to that project
--                 (private.can_view_internal, the rule 0047 uses for
--                 deliverables). Every write goes through the RPCs below; the
--                 tables grant `authenticated` select only.
--
-- Lifecycle: create_project_proposal reserves a draft and revision 1 (same
-- reserve-then-upload-then-finalize shape as deliverables); finalize_proposal_document
-- checks the file really reached Storage, makes that revision current and, the
-- first time, posts the proposal and tells the client. Later replacements tell
-- the client again ("proposal updated"). withdraw_project_proposal hides a
-- proposal from the client and keeps the record and files; it sends no email.
--
-- Client notifications go to the project's client members only (email and
-- in_app). Older revisions stay in Storage and in project_proposal_documents
-- for staff; clients can only read the current one.
--
-- Also adds four audit event types (this file restates the full list from
-- 0043), Storage policies for the proposal files, and a Realtime broadcast
-- (`project_proposal_changed`, identifiers only) on the topics from 0050.
--
-- Applying this file to production is a separate owner action; merging the PR
-- deploys the app but does not run SQL. Until it is applied the Proposals
-- area shows "not available yet" and nothing else changes.

-- ---------- tables ---------------------------------------------------------

create table public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  current_document_id uuid,
  created_by uuid not null references public.profiles(id),
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz,
  withdrawn_at timestamptz,
  constraint project_proposals_title_check check (
    char_length(btrim(title)) between 3 and 120
  ),
  constraint project_proposals_status_check check (
    status in ('draft', 'posted', 'withdrawn')
  ),
  constraint project_proposals_author_name_check check (
    char_length(author_name) <= 200
  )
);

create table public.project_proposal_documents (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.project_proposals(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision integer not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'pending',
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint project_proposal_documents_revision_unique unique (proposal_id, revision),
  constraint project_proposal_documents_revision_check check (revision >= 1),
  constraint project_proposal_documents_file_name_check check (
    char_length(btrim(file_name)) between 1 and 255
  ),
  constraint project_proposal_documents_storage_path_check check (
    char_length(storage_path) between 1 and 1024
  ),
  constraint project_proposal_documents_mime_type_check check (
    mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  constraint project_proposal_documents_size_check check (
    size_bytes > 0 and size_bytes <= 10485760
  ),
  constraint project_proposal_documents_status_check check (
    status in ('pending', 'ready')
  )
);

alter table public.project_proposals
  add constraint project_proposals_current_document_fk
  foreign key (current_document_id)
  references public.project_proposal_documents(id)
  on delete set null;

create index project_proposals_project_idx
  on public.project_proposals (project_id, created_at desc);
create index project_proposal_documents_proposal_idx
  on public.project_proposal_documents (proposal_id, revision desc);

alter table public.project_proposals enable row level security;
alter table public.project_proposals force row level security;
alter table public.project_proposal_documents enable row level security;
alter table public.project_proposal_documents force row level security;

revoke all on table public.project_proposals from public, anon, authenticated;
revoke all on table public.project_proposal_documents from public, anon, authenticated;
grant select on table public.project_proposals to authenticated;
grant select on table public.project_proposal_documents to authenticated;

-- Staff (admin, or the project manager assigned to the project) see every
-- proposal and revision. A client sees a posted proposal and its current,
-- finished document; a withdrawn or draft one is invisible to them.
create policy "Project participants can read proposals"
on public.project_proposals
for select
to authenticated
using (
  private.can_view_internal(project_id)
  or (status = 'posted' and private.can_access_project(project_id))
);

create policy "Project participants can read proposal documents"
on public.project_proposal_documents
for select
to authenticated
using (
  private.can_view_internal(project_id)
  or (
    status = 'ready'
    and private.can_access_project(project_id)
    and exists (
      select 1
      from public.project_proposals as proposal
      where proposal.id = project_proposal_documents.proposal_id
        and proposal.status = 'posted'
        and proposal.current_document_id = project_proposal_documents.id
    )
  )
);

-- ---------- audit event types ---------------------------------------------
-- 0043's full list plus the four proposal events (same idiom as 0017/0043).

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
    'project.brief_submitted',
    'project.proposal_created',
    'project.proposal_posted',
    'project.proposal_updated',
    'project.proposal_renamed',
    'project.proposal_withdrawn'
  ]::text[]));

-- ---------- create_project_proposal ----------------------------------------

create or replace function public.create_project_proposal(
  p_project_id uuid,
  p_title text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.project_proposal_documents
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal_id uuid := gen_random_uuid();
  v_document_id uuid := gen_random_uuid();
  v_safe_filename text;
  v_company_id uuid;
  v_author_name text;
  v_document public.project_proposal_documents%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Staff only: an admin, or a project manager assigned to this project.
  if not private.can_view_internal(p_project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 3 and 120 then
    raise exception 'Title must be 3 to 120 characters.' using errcode = '22023';
  end if;

  if p_file_name is null or char_length(btrim(p_file_name)) not between 1 and 255 then
    raise exception 'File name must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_mime_type is null or p_mime_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'A proposal document must be a PDF or a Word (.docx) file.' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'File size must be between 1 byte and 10 MiB.' using errcode = '22023';
  end if;

  v_safe_filename := regexp_replace(btrim(p_file_name), '[^A-Za-z0-9._-]+', '_', 'g');
  v_safe_filename := regexp_replace(v_safe_filename, '^[.]+', '', 'g');
  if v_safe_filename = '' then
    v_safe_filename := 'file';
  end if;

  select project.company_id into v_company_id
  from public.projects as project
  where project.id = p_project_id;

  select btrim(coalesce(profile.full_name, '')) into v_author_name
  from public.profiles as profile
  where profile.id = v_user_id;

  insert into public.project_proposals (id, project_id, title, status, created_by, author_name)
  values (v_proposal_id, p_project_id, btrim(p_title), 'draft', v_user_id, coalesce(v_author_name, ''));

  insert into public.project_proposal_documents (
    id, proposal_id, project_id, revision, file_name, storage_path, mime_type, size_bytes, status, uploaded_by
  )
  values (
    v_document_id,
    v_proposal_id,
    p_project_id,
    1,
    btrim(p_file_name),
    p_project_id::text || '/' || v_document_id::text || '/' || v_safe_filename,
    p_mime_type,
    p_size_bytes,
    'pending',
    v_user_id
  )
  returning * into v_document;

  insert into public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  values (
    v_user_id,
    p_project_id,
    v_company_id,
    'project.proposal_created',
    jsonb_build_object('proposal_id', v_proposal_id, 'document_id', v_document_id)
  );

  return v_document;
end
$function$;

-- ---------- reserve_proposal_document (replacement) ------------------------

create or replace function public.reserve_proposal_document(
  p_proposal_id uuid,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.project_proposal_documents
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal public.project_proposals%rowtype;
  v_document_id uuid := gen_random_uuid();
  v_revision integer;
  v_safe_filename text;
  v_document public.project_proposal_documents%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.project_proposals as proposal
  where proposal.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposal not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(v_proposal.project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if v_proposal.status = 'withdrawn' then
    raise exception 'A withdrawn proposal cannot be changed.' using errcode = '22023';
  end if;

  if p_file_name is null or char_length(btrim(p_file_name)) not between 1 and 255 then
    raise exception 'File name must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_mime_type is null or p_mime_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'A proposal document must be a PDF or a Word (.docx) file.' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'File size must be between 1 byte and 10 MiB.' using errcode = '22023';
  end if;

  v_safe_filename := regexp_replace(btrim(p_file_name), '[^A-Za-z0-9._-]+', '_', 'g');
  v_safe_filename := regexp_replace(v_safe_filename, '^[.]+', '', 'g');
  if v_safe_filename = '' then
    v_safe_filename := 'file';
  end if;

  select coalesce(max(document.revision), 0) + 1 into v_revision
  from public.project_proposal_documents as document
  where document.proposal_id = p_proposal_id;

  insert into public.project_proposal_documents (
    id, proposal_id, project_id, revision, file_name, storage_path, mime_type, size_bytes, status, uploaded_by
  )
  values (
    v_document_id,
    p_proposal_id,
    v_proposal.project_id,
    v_revision,
    btrim(p_file_name),
    v_proposal.project_id::text || '/' || v_document_id::text || '/' || v_safe_filename,
    p_mime_type,
    p_size_bytes,
    'pending',
    v_user_id
  )
  returning * into v_document;

  return v_document;
end
$function$;

-- ---------- finalize_proposal_document -------------------------------------
-- Makes the uploaded revision current. The first finished document posts the
-- proposal; a later one is a replacement. Either way the project's client
-- members get an email and an in-app notification.

create or replace function public.finalize_proposal_document(
  p_document_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_document public.project_proposal_documents%rowtype;
  v_proposal public.project_proposals%rowtype;
  v_company_id uuid;
  v_category text;
  v_first_post boolean;
  v_event text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_document
  from public.project_proposal_documents as document
  where document.id = p_document_id
  for update;

  if not found then
    raise exception 'Proposal document not found.' using errcode = 'P0002';
  end if;

  select * into v_proposal
  from public.project_proposals as proposal
  where proposal.id = v_document.proposal_id
  for update;

  if not private.can_view_internal(v_document.project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if v_document.uploaded_by <> v_user_id or v_document.status <> 'pending' then
    raise exception 'Only the uploader may finalize a pending proposal document.' using errcode = '42501';
  end if;

  if v_proposal.status = 'withdrawn' then
    raise exception 'A withdrawn proposal cannot be changed.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'project-files'
      and object.name = v_document.storage_path
      and object.owner_id = v_user_id::text
  ) then
    raise exception 'Reserved Storage object not found.' using errcode = 'P0002';
  end if;

  v_first_post := v_proposal.current_document_id is null;

  update public.project_proposal_documents
  set status = 'ready'
  where id = p_document_id;

  update public.project_proposals
  set current_document_id = p_document_id,
      status = 'posted',
      posted_at = case when v_first_post then pg_catalog.now() else posted_at end,
      updated_at = pg_catalog.now()
  where id = v_proposal.id;

  select project.company_id, project.category into v_company_id, v_category
  from public.projects as project
  where project.id = v_document.project_id;

  v_event := case when v_first_post then 'project.proposal_posted' else 'project.proposal_updated' end;

  insert into public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  values (
    v_user_id,
    v_document.project_id,
    v_company_id,
    v_event,
    jsonb_build_object(
      'proposal_id', v_proposal.id,
      'document_id', p_document_id,
      'revision', v_document.revision
    )
  );

  -- Client members only: staff posted it, so they do not need the email.
  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    v_document.project_id,
    recipient.user_id,
    channel.value,
    v_event,
    jsonb_build_object(
      'proposal_id', v_proposal.id,
      'proposal_title', v_proposal.title,
      'revision', v_document.revision,
      'project_category', v_category
    )
  from private.project_notification_recipients(v_document.project_id, v_user_id, 'shared') as recipient
  join public.profiles as recipient_profile on recipient_profile.id = recipient.user_id
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value)
  where recipient_profile.role = 'client'::public.user_role;

  return p_document_id;
end
$function$;

-- ---------- rename_project_proposal ----------------------------------------

create or replace function public.rename_project_proposal(
  p_proposal_id uuid,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal public.project_proposals%rowtype;
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.project_proposals as proposal
  where proposal.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposal not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(v_proposal.project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if v_proposal.status = 'withdrawn' then
    raise exception 'A withdrawn proposal cannot be changed.' using errcode = '22023';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 3 and 120 then
    raise exception 'Title must be 3 to 120 characters.' using errcode = '22023';
  end if;

  update public.project_proposals
  set title = btrim(p_title),
      updated_at = pg_catalog.now()
  where id = p_proposal_id;

  select project.company_id into v_company_id
  from public.projects as project
  where project.id = v_proposal.project_id;

  insert into public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  values (
    v_user_id,
    v_proposal.project_id,
    v_company_id,
    'project.proposal_renamed',
    jsonb_build_object('proposal_id', p_proposal_id)
  );

  return p_proposal_id;
end
$function$;

-- ---------- withdraw_project_proposal --------------------------------------
-- Hides the proposal from the client. The row and every file are kept, staff
-- still see it marked withdrawn, and nobody is emailed.

create or replace function public.withdraw_project_proposal(
  p_proposal_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal public.project_proposals%rowtype;
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.project_proposals as proposal
  where proposal.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposal not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(v_proposal.project_id) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if v_proposal.status = 'withdrawn' then
    return p_proposal_id;
  end if;

  update public.project_proposals
  set status = 'withdrawn',
      withdrawn_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_proposal_id;

  select project.company_id into v_company_id
  from public.projects as project
  where project.id = v_proposal.project_id;

  insert into public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  values (
    v_user_id,
    v_proposal.project_id,
    v_company_id,
    'project.proposal_withdrawn',
    jsonb_build_object('proposal_id', p_proposal_id)
  );

  return p_proposal_id;
end
$function$;

revoke all on function public.create_project_proposal(uuid, text, text, text, bigint) from public;
revoke all on function public.create_project_proposal(uuid, text, text, text, bigint) from anon;
grant execute on function public.create_project_proposal(uuid, text, text, text, bigint) to authenticated;

revoke all on function public.reserve_proposal_document(uuid, text, text, bigint) from public;
revoke all on function public.reserve_proposal_document(uuid, text, text, bigint) from anon;
grant execute on function public.reserve_proposal_document(uuid, text, text, bigint) to authenticated;

revoke all on function public.finalize_proposal_document(uuid) from public;
revoke all on function public.finalize_proposal_document(uuid) from anon;
grant execute on function public.finalize_proposal_document(uuid) to authenticated;

revoke all on function public.rename_project_proposal(uuid, text) from public;
revoke all on function public.rename_project_proposal(uuid, text) from anon;
grant execute on function public.rename_project_proposal(uuid, text) to authenticated;

revoke all on function public.withdraw_project_proposal(uuid) from public;
revoke all on function public.withdraw_project_proposal(uuid) from anon;
grant execute on function public.withdraw_project_proposal(uuid) to authenticated;

-- ---------- Storage policies (bucket project-files) ------------------------
-- Same two-folder path as deliverables: <project_id>/<document_id>/<file>.

create policy "Proposal uploaders can upload pending proposal documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and pg_catalog.cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_proposal_documents as document
    where document.storage_path = name
      and (storage.foldername(name))[1] = document.project_id::text
      and (storage.foldername(name))[2] = document.id::text
      and document.uploaded_by = (select auth.uid())
      and document.status = 'pending'
      and private.can_view_internal(document.project_id)
  )
);

-- Staff read any revision. A client reads only the current document of a
-- posted proposal.
create policy "Project participants can read proposal documents in storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and pg_catalog.cardinality(storage.foldername(name)) = 2
  and exists (
    select 1
    from public.project_proposal_documents as document
    join public.project_proposals as proposal on proposal.id = document.proposal_id
    where document.storage_path = name
      and (storage.foldername(name))[1] = document.project_id::text
      and (storage.foldername(name))[2] = document.id::text
      and document.status = 'ready'
      and (
        private.can_view_internal(document.project_id)
        or (
          proposal.status = 'posted'
          and proposal.current_document_id = document.id
          and private.can_access_project(document.project_id)
        )
      )
  )
);

-- ---------- Realtime -------------------------------------------------------
-- Identifiers only. Staff hear every change; the client topic hears it only
-- for a proposal that is, or just was, posted (so a withdraw refreshes the
-- client's page too).

create or replace function private.broadcast_project_proposal_change()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_visible_to_client boolean;
begin
  v_visible_to_client := NEW.status = 'posted'
    or (TG_OP = 'UPDATE' and OLD.status = 'posted');

  perform realtime.send(
    pg_catalog.jsonb_build_object('project_id', NEW.project_id, 'proposal_id', NEW.id),
    'project_proposal_changed',
    'project:' || NEW.project_id::text || ':internal',
    true
  );

  if v_visible_to_client then
    perform realtime.send(
      pg_catalog.jsonb_build_object('project_id', NEW.project_id, 'proposal_id', NEW.id),
      'project_proposal_changed',
      'project:' || NEW.project_id::text || ':shared',
      true
    );
  end if;

  return null;
end;
$function$;

revoke all on function private.broadcast_project_proposal_change() from public, anon, authenticated;

drop trigger if exists broadcast_project_proposal_changed on public.project_proposals;
create trigger broadcast_project_proposal_changed
after insert or update on public.project_proposals
for each row execute function private.broadcast_project_proposal_change();
