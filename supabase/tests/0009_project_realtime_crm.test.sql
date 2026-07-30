begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

-- Stable fixture UUIDs make failures readable and avoid provisioning users.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'assigned@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'unassigned@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'admin@example.test', '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values
  ('20000000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000002', 'Company B', 'b@example.test', '10000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '10000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '10000000-0000-0000-0000-000000000004' then 'project_manager'::public.user_role
  when '10000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '10000000-0000-0000-0000-000000000001' then '20000000-0000-0000-0000-000000000001'::uuid
  when '10000000-0000-0000-0000-000000000002' then '20000000-0000-0000-0000-000000000002'::uuid
  else null
end
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into public.company_members (company_id, user_id, role)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'owner');

insert into public.projects (id, company_id, category, title, brief, status, created_by)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'web_design', 'Company A Site', 'Build a new site.', 'planned', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'branding', 'Company B Brand', 'Refresh the brand.', 'planned', '10000000-0000-0000-0000-000000000002');

insert into public.project_threads (id, project_id)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002');

insert into public.project_assignments (project_id, user_id, assigned_by)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005');

insert into public.project_messages (
  id,
  thread_id,
  sender_id,
  visibility,
  body,
  client_generated_id
)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'shared', 'Shared message', '51000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'internal', 'Internal message', '51000000-0000-0000-0000-000000000002');

insert into public.project_attachments (
  id,
  project_id,
  uploaded_by,
  visibility,
  file_name,
  storage_path,
  mime_type,
  size_bytes,
  status
)
values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'shared', 'shared.pdf', '30000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/shared.pdf', 'application/pdf', 100, 'ready'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'internal', 'internal.pdf', '30000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000002/internal.pdf', 'application/pdf', 100, 'ready');

insert into public.project_status_history (
  project_id,
  from_status,
  to_status,
  note,
  visibility,
  changed_by
)
values
  ('30000000-0000-0000-0000-000000000001', 'brief_submitted', 'planned', 'Shared plan', 'shared', '10000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000001', 'brief_submitted', 'planned', 'Internal plan', 'internal', '10000000-0000-0000-0000-000000000005');

set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.projects), 1::bigint, 'client A sees only its company project');
select is((select count(*) from public.project_threads), 1::bigint, 'client A sees its project thread');
select is((select count(*) from public.project_messages), 1::bigint, 'client A sees only shared messages');
select is((select count(*) from public.project_attachments), 1::bigint, 'client A sees only shared attachments');
select is((select count(*) from public.project_status_history), 1::bigint, 'client A sees only shared history');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.projects where id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'client B cannot see company A projects'
);
select is(
  (select count(*) from public.project_messages where thread_id = '40000000-0000-0000-0000-000000000001'),
  0::bigint,
  'client B cannot see company A messages'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.projects), 1::bigint, 'assigned employee sees assigned project');
select is((select count(*) from public.project_messages), 2::bigint, 'assigned employee sees shared and internal messages');
select is((select count(*) from public.project_attachments), 2::bigint, 'assigned employee sees shared and internal attachments');
select is((select count(*) from public.project_status_history), 2::bigint, 'assigned employee sees shared and internal history');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*) from public.projects where id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'unassigned employee cannot see company A project'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.projects), 2::bigint, 'admin sees every project');
select is((select count(*) from public.project_messages), 2::bigint, 'admin sees shared and internal messages');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$insert into public.project_messages (thread_id, sender_id, visibility, body, client_generated_id)
    values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'internal', 'blocked', '51000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'client cannot directly insert an internal message'
);
select throws_ok(
  $$select public.assign_project_user('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004')$$,
  '42501',
  'Admin access required.',
  'client cannot assign users through the command'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$select public.assign_project_user('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004')$$,
  '42501',
  'Admin access required.',
  'employee cannot self-assign'
);
select throws_ok(
  $$update public.projects
    set company_id = '20000000-0000-0000-0000-000000000002'
    where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'employee cannot change a project company'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$update public.projects set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'client direct status updates are denied'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$update public.projects set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'assigned employee direct status updates are denied'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select throws_ok(
  $$update public.projects set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'admin direct status updates are denied'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select ok(
  private.can_subscribe_project_topic('project:30000000-0000-0000-0000-000000000001:shared'),
  'client can subscribe to its shared topic'
);
select ok(
  not private.can_subscribe_project_topic('project:30000000-0000-0000-0000-000000000001:internal'),
  'client cannot subscribe to an internal topic'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select ok(
  private.can_subscribe_project_topic('project:30000000-0000-0000-0000-000000000001:internal'),
  'assigned employee can subscribe to an internal topic'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select ok(
  not private.can_subscribe_project_topic('project:30000000-0000-0000-0000-000000000001:shared'),
  'unassigned employee cannot subscribe to the project topic'
);

select * from finish();
rollback;
