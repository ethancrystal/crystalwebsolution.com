begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

-- Behavioural proof for 0043_project_briefs.sql. Same fixture idiom as
-- 0041_client_read_scope.test.sql: stable UUIDs, the admin row uses
-- pinned_admin_email() so 0014's single-admin trigger accepts it.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a1@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'client-a2@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'assigned@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values
  ('20000000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000002', 'Company B', 'b@example.test', '10000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '10000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '10000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '10000000-0000-0000-0000-000000000001' then '20000000-0000-0000-0000-000000000001'::uuid
  when '10000000-0000-0000-0000-000000000002' then '20000000-0000-0000-0000-000000000001'::uuid
  when '10000000-0000-0000-0000-000000000004' then '20000000-0000-0000-0000-000000000002'::uuid
  else null
end
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

set local role authenticated;

-- Client A1 starts a logo draft.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.project_briefs (id, company_id, created_by, brief_type, title, answers)
     values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000001', 'logo', 'Logo design — A', '{"brand_name":"A"}') $$,
  'client can start a draft for their own company'
);
select throws_ok(
  $$ insert into public.project_briefs (company_id, created_by, brief_type)
     values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'logo') $$,
  '42501', null,
  'client cannot start a draft for another company'
);
select throws_ok(
  $$ update public.project_briefs set status = 'submitted', submitted_at = now()
     where id = '50000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'client cannot flip a draft to submitted without the RPC'
);

-- Drafts are private to their author.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.project_briefs), 0::bigint, 'teammate cannot see another user''s draft');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.project_briefs), 0::bigint, 'admin cannot see unsent drafts');
select throws_ok(
  $$ select public.submit_project_brief('50000000-0000-0000-0000-000000000001', 'x', null, 'Hijack', null) $$,
  '42501', null,
  'staff cannot submit a client brief'
);

-- Submit creates a project.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
create temporary table brief_test_ids (key text primary key, id uuid) on commit drop;
insert into brief_test_ids
values ('project', public.submit_project_brief('50000000-0000-0000-0000-000000000001', 'Logo design brief', null, 'A rebrand', null));

select is(
  (select category from public.projects where id = (select id from brief_test_ids where key = 'project')),
  'logo_creation',
  'a logo brief creates a logo_creation project'
);
select is(
  public.submit_project_brief('50000000-0000-0000-0000-000000000001', 'again', null, 'Other', null),
  (select id from brief_test_ids where key = 'project'),
  'resubmitting returns the same project'
);
select is(
  (select count(*) from public.projects where company_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'resubmitting does not create a second project'
);
update public.project_briefs set answers = '{}' where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select answers ->> 'brand_name' from public.project_briefs where id = '50000000-0000-0000-0000-000000000001'),
  'A',
  'a submitted brief is read-only to its author'
);

-- Visibility after submit.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.project_briefs), 1::bigint, 'teammate sees the submitted brief');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.project_briefs), 0::bigint, 'another company cannot see it');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.project_briefs), 0::bigint, 'an unassigned PM cannot see it');

reset role;
insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005'
from brief_test_ids where key = 'project';

select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.brief_submitted'
     and user_id = '10000000-0000-0000-0000-000000000005'),
  2::bigint,
  'the admin gets an in-app and an email notification'
);
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.brief_submitted'
     and user_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the submitting client is not notified about their own brief'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.project_briefs), 1::bigint, 'the assigned PM sees the submitted brief');

-- A second brief attaches to the same project.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.project_briefs (id, company_id, created_by, brief_type, title, answers)
values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', 'website', 'Website — A', '{"business_name":"A"}');
select is(
  public.submit_project_brief('50000000-0000-0000-0000-000000000002', 'Website brief',
    (select id from brief_test_ids where key = 'project'), null, null),
  (select id from brief_test_ids where key = 'project'),
  'a second brief attaches to the existing project'
);
select is(
  (select count(*) from public.project_briefs where project_id = (select id from brief_test_ids where key = 'project')),
  2::bigint,
  'the project now carries two briefs'
);

-- Company B cannot attach a brief to company A's project.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
insert into public.project_briefs (id, company_id, created_by, brief_type, answers)
values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000004', 'ppc', '{"offer":"x"}');
select throws_ok(
  format(
    'select public.submit_project_brief(%L, %L, %L, null, null)',
    '50000000-0000-0000-0000-000000000003', 'PPC brief',
    (select id from brief_test_ids where key = 'project')
  ),
  'P0002', null,
  'a client cannot attach a brief to another company''s project'
);

-- A draft cannot be re-keyed, and a client-chosen id that collides with an
-- existing project key is refused instead of attaching to that project.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.project_briefs (id, company_id, created_by, brief_type, answers)
values ('50000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', 'seo', '{"site_url":"https://a.test"}');
update public.project_briefs set id = '50000000-0000-0000-0000-00000000000a'
where id = '50000000-0000-0000-0000-000000000009';
select is(
  (select count(*) from public.project_briefs where id = '50000000-0000-0000-0000-000000000009'),
  1::bigint,
  'a draft id cannot be changed'
);

reset role;
update public.projects set client_generated_id = '50000000-0000-0000-0000-000000000009'
where id = (select id from brief_test_ids where key = 'project');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select public.submit_project_brief('50000000-0000-0000-0000-000000000009', 'SEO brief', null, 'Collide', null) $$,
  '22023', null,
  'a brief id that collides with an existing project key is refused'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.project_briefs $$,
  '42501', null,
  'anon cannot read briefs'
);

select * from finish();
rollback;
