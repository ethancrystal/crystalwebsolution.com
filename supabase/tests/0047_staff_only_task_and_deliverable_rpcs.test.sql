-- Behavioural proof for 0047_staff_only_task_and_deliverable_rpcs.sql: a
-- client calling the RPCs directly (as supabase.rpc from a browser would) is
-- refused; the assigned project manager and the admin are not; a project
-- manager on a different project is refused. Fixture idiom as 0046's test.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '47000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '47000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '47000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other-pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '47000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values ('47100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '47000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '47000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '47000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '47000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '47000000-0000-0000-0000-000000000001' then '47100000-0000-0000-0000-000000000001'::uuid
  else null
end
where id::text like '47000000-%';

insert into public.company_members (company_id, user_id, role)
values ('47100000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', 'owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000001', true);
create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids values
  ('p', public.create_project('47100000-0000-0000-0000-000000000001', 'web_design', 'Website', 'Brief', null, null, '47200000-0000-0000-0000-000000000001'));
reset role;

insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '47000000-0000-0000-0000-000000000002', '47000000-0000-0000-0000-000000000005'
from ids where key = 'p';

-- A deliverable row a client created before 0047 (possible through the old
-- create_project_deliverable), to show publishing it is now refused.
insert into public.project_deliverables (id, project_id, title, description, file_name, storage_path, mime_type, size_bytes, status, visibility, version, created_by)
select '47300000-0000-0000-0000-000000000001', id, 'Planted', '', 'x.png', id::text || '/47300000-0000-0000-0000-000000000001/x.png', 'image/png', 10, 'draft', 'shared', '1', '47000000-0000-0000-0000-000000000001'
from ids where key = 'p';

-- ---------- create_project_task ------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.create_project_task(%L, %L)', (select id from ids where key = 'p'), 'Client task'),
  '42501', 'Staff access required.',
  'a client cannot create a task on their own project'
);

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000003', true);
select throws_ok(
  format('select public.create_project_task(%L, %L)', (select id from ids where key = 'p'), 'Other PM task'),
  '42501', 'Staff access required.',
  'a project manager on another project cannot create a task here'
);

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000002', true);
select lives_ok(
  format('select public.create_project_task(%L, %L)', (select id from ids where key = 'p'), 'PM task'),
  'the assigned project manager can create a task'
);

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000005', true);
select lives_ok(
  format('select public.create_project_task(%L, %L)', (select id from ids where key = 'p'), 'Admin task'),
  'the admin can create a task'
);
reset role;

select is(
  (select count(*) from public.project_tasks
   where project_id = (select id from ids where key = 'p')
     and created_by = '47000000-0000-0000-0000-000000000001'),
  0::bigint,
  'no task was written by the client'
);

-- ---------- create_project_deliverable -----------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.create_project_deliverable(%L, %L, %L, %L, %s)', (select id from ids where key = 'p'), 'Client deliverable', 'a.png', 'image/png', 10),
  '42501', 'Staff access required.',
  'a client cannot reserve a deliverable'
);

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000002', true);
insert into ids
select 'd', (public.create_project_deliverable((select id from ids where key = 'p'), 'Logo v1', 'logo.png', 'image/png', 10)).id;
select isnt(
  (select id from ids where key = 'd'),
  null,
  'the assigned project manager can reserve a deliverable'
);

-- ---------- publish_project_deliverable ----------------------------------

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select public.publish_project_deliverable('47300000-0000-0000-0000-000000000001', 'submitted') $$,
  '42501', 'Staff access required.',
  'a client cannot publish even a deliverable row they created'
);
select throws_ok(
  format('select public.publish_project_deliverable(%L, %L)', (select id from ids where key = 'd'), 'submitted'),
  '42501', 'Staff access required.',
  'a client cannot publish a staff deliverable'
);

select set_config('request.jwt.claim.sub', '47000000-0000-0000-0000-000000000002', true);
select lives_ok(
  format('select public.publish_project_deliverable(%L, %L)', (select id from ids where key = 'd'), 'submitted'),
  'the project manager who reserved it can publish it'
);
reset role;

select is(
  (select status from public.project_deliverables where id = '47300000-0000-0000-0000-000000000001'),
  'draft',
  'the planted client deliverable stayed unpublished'
);
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.deliverable_published'
     and user_id = '47000000-0000-0000-0000-000000000001'),
  2::bigint,
  'the staff publish notified the client (in-app and email), once'
);

select * from finish();
rollback;
