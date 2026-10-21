-- Behavioural proof for 0050_realtime_project_updates_and_presence.sql:
-- which topic each project change is sent to (internal-only rows never reach
-- the client's `shared` topic), and who may receive and track presence.
-- Fixture idiom as 0047's test.

begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'outsider@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values ('50100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '50000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '50000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '50000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '50000000-0000-0000-0000-000000000001' then '50100000-0000-0000-0000-000000000001'::uuid
  else null
end
where id::text like '50000000-%';

insert into public.company_members (company_id, user_id, role)
values ('50100000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'owner');

create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
insert into ids values
  ('p', public.create_project('50100000-0000-0000-0000-000000000001', 'web_design', 'Website', 'Brief', null, null, '50200000-0000-0000-0000-000000000001'));
reset role;

insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '50000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000005'::uuid from ids where key = 'p';

create temporary table topics (key text primary key, topic text) on commit drop;
grant all on topics to authenticated;
insert into topics
select 'shared', 'project:' || id::text || ':shared' from ids where key = 'p'
union all
select 'internal', 'project:' || id::text || ':internal' from ids where key = 'p';

delete from realtime.messages;

-- ---------- status -------------------------------------------------------

update public.projects set status = 'planned' where id = (select id from ids where key = 'p');

select is(
  (select count(*)::int from realtime.messages where event = 'project_status_changed' and topic = (select topic from topics where key = 'shared')),
  1, 'a status change reaches the client topic once'
);
select is(
  (select count(*)::int from realtime.messages where event = 'project_status_changed' and topic = (select topic from topics where key = 'internal')),
  1, 'and the staff topic once'
);
select is(
  (select payload - 'id' from realtime.messages where event = 'project_status_changed' limit 1),
  pg_catalog.jsonb_build_object('project_id', (select id from ids where key = 'p')),
  'the payload is the project id only'
);

delete from realtime.messages;
update public.projects set title = 'Renamed' where id = (select id from ids where key = 'p');
select is((select count(*)::int from realtime.messages), 0, 'a non-status update sends nothing');

-- ---------- tasks --------------------------------------------------------

delete from realtime.messages;
insert into public.project_tasks (id, project_id, title, created_by, client_visible)
select '50300000-0000-0000-0000-000000000001', id, 'Internal task', '50000000-0000-0000-0000-000000000002', false from ids where key = 'p';

select is(
  (select count(*)::int from realtime.messages where event = 'project_task_changed' and topic = (select topic from topics where key = 'internal')),
  1, 'an internal task reaches the staff topic'
);
select is(
  (select count(*)::int from realtime.messages where topic = (select topic from topics where key = 'shared')),
  0, 'an internal task never reaches the client topic'
);

delete from realtime.messages;
update public.project_tasks set client_visible = true where id = '50300000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from realtime.messages where event = 'project_task_changed' and topic = (select topic from topics where key = 'shared')),
  1, 'a task made client-visible reaches the client topic'
);

delete from realtime.messages;
update public.project_tasks set client_visible = false where id = '50300000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from realtime.messages where event = 'project_task_changed' and topic = (select topic from topics where key = 'shared')),
  1, 'hiding a task tells the client topic once, so the client drops it'
);

-- ---------- approvals ----------------------------------------------------

insert into public.project_deliverables (id, project_id, title, description, file_name, storage_path, mime_type, size_bytes, status, visibility, version, created_by)
select '50400000-0000-0000-0000-000000000001', id, 'Internal draft', '', 'x.png', id::text || '/50400000-0000-0000-0000-000000000001/x.png', 'image/png', 10, 'draft', 'internal', '1', '50000000-0000-0000-0000-000000000002'
from ids where key = 'p';

delete from realtime.messages;
insert into public.project_approvals (project_id, deliverable_id, requested_by)
select id, '50400000-0000-0000-0000-000000000001'::uuid, '50000000-0000-0000-0000-000000000002'::uuid from ids where key = 'p';
select is(
  (select count(*)::int from realtime.messages where event = 'project_approval_changed' and topic = (select topic from topics where key = 'shared')),
  0, 'an approval on an internal deliverable never reaches the client topic'
);
select is(
  (select count(*)::int from realtime.messages where event = 'project_approval_changed' and topic = (select topic from topics where key = 'internal')),
  1, 'it reaches the staff topic'
);

delete from realtime.messages;
insert into public.project_approvals (project_id, deliverable_id, requested_by)
select id, null, '50000000-0000-0000-0000-000000000002'::uuid from ids where key = 'p';
select is(
  (select count(*)::int from realtime.messages where event = 'project_approval_changed' and topic = (select topic from topics where key = 'shared')),
  1, 'a project-level approval reaches the client topic'
);

-- ---------- receiving and presence (realtime.messages RLS) ---------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

select set_config('realtime.topic', (select topic from topics where key = 'shared'), true);
select lives_ok(
  $$ insert into realtime.messages (topic, extension, payload) values (realtime.topic(), 'presence', '{}'::jsonb) $$,
  'a client can track presence on their project''s client topic'
);
select throws_ok(
  $$ insert into realtime.messages (topic, extension, payload, event) values (realtime.topic(), 'broadcast', '{}'::jsonb, 'project_status_changed') $$,
  '42501', null,
  'a client cannot send a broadcast'
);
select ok(
  (select count(*) > 0 from realtime.messages),
  'a client can receive on their project''s client topic'
);

select set_config('realtime.topic', (select topic from topics where key = 'internal'), true);
select throws_ok(
  $$ insert into realtime.messages (topic, extension, payload) values (realtime.topic(), 'presence', '{}'::jsonb) $$,
  '42501', null,
  'a client cannot track presence on the staff topic'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
select set_config('realtime.topic', (select topic from topics where key = 'shared'), true);
select is(
  (select count(*)::int from realtime.messages),
  0, 'someone outside the project receives nothing'
);

reset role;

select * from finish();
rollback;
