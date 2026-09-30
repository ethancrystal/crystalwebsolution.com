-- Behavioural proof for 0051_project_proposals.sql: only an admin or the
-- project manager assigned to the project can create, replace, rename or
-- withdraw a proposal; a client sees a posted proposal (current document
-- only) and never a draft or a withdrawn one; another company's client and an
-- unassigned project manager see nothing; posting and replacing notify the
-- project's client members (in-app and email) and nobody else; withdrawing
-- notifies no one. Fixture idiom as 0047's test.

begin;

create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other-pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values
  ('51100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '51000000-0000-0000-0000-000000000005'),
  ('51100000-0000-0000-0000-000000000002', 'Company B', 'b@example.test', '51000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '51000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '51000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '51000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '51000000-0000-0000-0000-000000000001' then '51100000-0000-0000-0000-000000000001'::uuid
  when '51000000-0000-0000-0000-000000000004' then '51100000-0000-0000-0000-000000000002'::uuid
  else null
end
where id::text like '51000000-%';

insert into public.company_members (company_id, user_id, role)
values
  ('51100000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'owner'),
  ('51100000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000004', 'owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids values
  ('p', public.create_project('51100000-0000-0000-0000-000000000001', 'logo_creation', 'Logo job', 'Brief', null, null, '51200000-0000-0000-0000-000000000001'));
reset role;

insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000005'
from ids where key = 'p';

-- ---------- who can create -------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.create_project_proposal(%L, %L, %L, %L, %s)', (select id from ids where key = 'p'), 'Client proposal', 'a.pdf', 'application/pdf', 10),
  '42501', 'Staff access required.',
  'a client cannot create a proposal'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000003', true);
select throws_ok(
  format('select public.create_project_proposal(%L, %L, %L, %L, %s)', (select id from ids where key = 'p'), 'Other PM proposal', 'a.pdf', 'application/pdf', 10),
  '42501', 'Staff access required.',
  'a project manager on another project cannot create a proposal here'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select throws_ok(
  format('select public.create_project_proposal(%L, %L, %L, %L, %s)', (select id from ids where key = 'p'), 'Hi', 'a.pdf', 'application/pdf', 10),
  '22023', 'Title must be 3 to 120 characters.',
  'a title under 3 characters is refused'
);
select throws_ok(
  format('select public.create_project_proposal(%L, %L, %L, %L, %s)', (select id from ids where key = 'p'), 'Logo proposal', 'a.png', 'image/png', 10),
  '22023', 'A proposal document must be a PDF or a Word (.docx) file.',
  'only a PDF or Word document is accepted'
);

insert into ids
select 'd1', (public.create_project_proposal((select id from ids where key = 'p'), 'Logo proposal', 'Proposal v1.pdf', 'application/pdf', 2048)).id;
insert into ids
select 'prop', proposal_id from public.project_proposal_documents where id = (select id from ids where key = 'd1');
select isnt(
  (select id from ids where key = 'd1'),
  null,
  'the assigned project manager can create a proposal'
);

-- ---------- drafts are staff-only -----------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.project_proposals),
  0::bigint,
  'a client cannot see a draft proposal'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*) from public.project_proposals),
  1::bigint,
  'the admin can see a draft proposal'
);

-- ---------- posting --------------------------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select throws_ok(
  format('select public.finalize_proposal_document(%L)', (select id from ids where key = 'd1')),
  'P0002', 'Reserved Storage object not found.',
  'a proposal cannot be posted before its file is uploaded'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.finalize_proposal_document(%L)', (select id from ids where key = 'd1')),
  '42501', 'Staff access required.',
  'a client cannot finalize a proposal document'
);
reset role;

-- The browser would upload the file; here the object is planted as the
-- project manager.
insert into storage.objects (bucket_id, name, owner_id)
select 'project-files', storage_path, '51000000-0000-0000-0000-000000000002'
from public.project_proposal_documents
where id = (select id from ids where key = 'd1');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select lives_ok(
  format('select public.finalize_proposal_document(%L)', (select id from ids where key = 'd1')),
  'the project manager who uploaded it can post the proposal'
);
reset role;

select is(
  (select status from public.project_proposals where id = (select id from ids where key = 'prop')),
  'posted',
  'the proposal is posted'
);
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.proposal_posted'
     and user_id = '51000000-0000-0000-0000-000000000001'),
  2::bigint,
  'posting notified the project''s client (in-app and email), once'
);
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.proposal_posted'
     and user_id is distinct from '51000000-0000-0000-0000-000000000001'),
  0::bigint,
  'posting notified nobody else: not staff, not another company''s client'
);

-- ---------- visibility once posted ----------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.project_proposals),
  1::bigint,
  'the client sees the posted proposal'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*) from public.project_proposals) + (select count(*) from public.project_proposal_documents),
  0::bigint,
  'another company''s client sees nothing'
);

-- ---------- a client cannot change anything -------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.rename_project_proposal(%L, %L)', (select id from ids where key = 'prop'), 'Client rename'),
  '42501', 'Staff access required.',
  'a client cannot rename a proposal'
);
select throws_ok(
  format('select public.withdraw_project_proposal(%L)', (select id from ids where key = 'prop')),
  '42501', 'Staff access required.',
  'a client cannot withdraw a proposal'
);
select throws_ok(
  format('select public.reserve_proposal_document(%L, %L, %L, %s)', (select id from ids where key = 'prop'), 'x.pdf', 'application/pdf', 10),
  '42501', 'Staff access required.',
  'a client cannot replace a proposal document'
);
select throws_ok(
  format('insert into public.project_proposals (project_id, title, created_by) values (%L, %L, %L)', (select id from ids where key = 'p'), 'Direct insert', '51000000-0000-0000-0000-000000000001'),
  '42501', null,
  'the tables take no direct writes'
);

-- ---------- replacing the document ----------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
insert into ids
select 'd2', (public.reserve_proposal_document((select id from ids where key = 'prop'), 'Proposal v2.pdf', 'application/pdf', 4096)).id;
select is(
  (select revision from public.project_proposal_documents where id = (select id from ids where key = 'd2')),
  2,
  'a replacement is revision 2'
);
reset role;

insert into storage.objects (bucket_id, name, owner_id)
select 'project-files', storage_path, '51000000-0000-0000-0000-000000000002'
from public.project_proposal_documents
where id = (select id from ids where key = 'd2');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select lives_ok(
  format('select public.finalize_proposal_document(%L)', (select id from ids where key = 'd2')),
  'the project manager can finish the replacement'
);
reset role;

select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.proposal_updated'
     and user_id = '51000000-0000-0000-0000-000000000001'),
  2::bigint,
  'the replacement notified the client again, as an update'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is(
  (select revision from public.project_proposal_documents),
  2,
  'the client sees only the current document'
);

-- ---------- withdrawing ----------------------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000005', true);
select lives_ok(
  format('select public.withdraw_project_proposal(%L)', (select id from ids where key = 'prop')),
  'the admin can withdraw a proposal'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.project_proposals),
  0::bigint,
  'a withdrawn proposal disappears for the client'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select is(
  (select status from public.project_proposals),
  'withdrawn',
  'staff still see it, marked withdrawn'
);
select throws_ok(
  format('select public.reserve_proposal_document(%L, %L, %L, %s)', (select id from ids where key = 'prop'), 'x.pdf', 'application/pdf', 10),
  '22023', 'A withdrawn proposal cannot be changed.',
  'a withdrawn proposal cannot be replaced'
);
reset role;

select is(
  (select count(*) from public.notifications_outbox
   where event_type in ('project.proposal_posted', 'project.proposal_updated')),
  4::bigint,
  'withdrawing notified no one'
);
select is(
  (select count(*) from public.audit_events where event_type like 'project.proposal_%'),
  4::bigint,
  'created, posted, updated and withdrawn were each audited'
);

select * from finish();
rollback;
